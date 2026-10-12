import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CaretLeftIcon, CaretRightIcon, WarningCircleIcon, XIcon } from "@phosphor-icons/react";
import type { T } from "../../i18n";
import { EmptyState } from "../../ui";
import { Modal } from "../system/Modal";
import "../shared/shared.css";

// Shared pieces of the admin panel (admin.tsx). Contract: PowerMeter-server/admin-ui/API.md, sections 4-6.
// The server is reached only through the pm_admin command (src-tauri), with the app's own token.

export type Method = "GET" | "POST" | "PUT" | "DELETE";
export type Api = <R>(method: Method, path: string, body?: object) => Promise<R>;

/** Raw call: rejects with the server's `error` string. Writes always carry a body. */
export const callAdmin = <R,>(method: Method, path: string, body?: object) =>
  invoke<R>("pm_admin", { method, path: `/admin/api${path}`, ...(method === "GET" ? {} : { body: body ?? {} }) });

/** Query string pm_admin accepts (its path filter allows only [A-Za-z0-9/_-?=&.%]): the rest percent-encoded. */
export const query = (params: [string, string][]) =>
  params.map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/[!'()*~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`).join("&");

/** Errors that mean "you can't use the panel": shown as a full state, not a banner. */
export const ACCESS_ERRORS = ["unauthorized", "forbidden", "mfa_required"];

export type Me = { id: string; discordId: string; name: string; avatarUrl: string | null; bootstrap: boolean };
export type Person = { id: string; name: string | null } | null;
export type Tier = "free" | "trial" | "recluta" | "daeva" | "empyrean";
export type Rank = "player" | "recluta" | "daeva" | "empyrean" | "debugger";
export type Ban = { active: boolean; bannedAt: string; until: string | null; reason: string | null; by: Person };
export type UserRow = {
  id: string;
  discordId: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  appVersion: string | null;
  discordCreatedAt: string | null;
  logs: number;
  ban: Ban | null;
  admin: boolean;
  bootstrapAdmin: boolean;
  rank: Rank;
  developer: boolean;
  access: { tier: Tier; source: string; until: string | null };
  grant: { tier: Tier; expiresAt: string | null; note: string | null; grantedAt: string; active: boolean } | null;
  trial: { startedAt: string | null; endsAt: string | null; running: boolean; eligible: boolean };
  patreon: { linked: boolean; tier: Tier; status: string | null; nextChargeAt: string | null; cadence: number | null };
  devices: { recent: number; max: number };
};
export type AuditEntry = {
  id: string;
  action: string;
  createdAt: string;
  admin: Person;
  target: Person;
  details: Record<string, unknown> | null;
};
export type View =
  | { tab: "dashboard" }
  | { tab: "users" }
  | { tab: "user"; id: string }
  | { tab: "patreon" }
  | { tab: "audit"; target?: string };

/** What every admin view receives from admin.tsx. */
export type Ctx = {
  t: T;
  lang: string;
  api: Api;
  me: Me;
  open: (view: View) => void;
  /** Success line under the tabs. */
  done: (message: string) => void;
  /** Shell error banner, already translated. */
  fail: (e: unknown) => void;
};

// ---------- vocabulary ----------
export const RANKS: Rank[] = ["player", "recluta", "daeva", "empyrean", "debugger"];
export const PAID: Rank[] = ["recluta", "daeva", "empyrean"];
/** Ranks and plans are proper names, the same in every language (entitlement.ts PLANS). */
export const rankName = (r: string) => r.charAt(0).toUpperCase() + r.slice(1);
export const tierName = (t: T, tier: string) => (tier === "free" || tier === "trial" ? t(`admin.tier.${tier}`) : rankName(tier));
export const statusName = (t: T, s: string | null) =>
  s === "active_patron" || s === "declined_patron" || s === "former_patron" ? t(`admin.patreon.${s}`) : t("admin.patreon.unknown");
export const cadenceName = (t: T, c: number | null) => (c === 1 ? t("admin.cadence.monthly") : c === 12 ? t("admin.cadence.yearly") : c ? t("admin.cadence.months", { n: c }) : "");

// Server error → admin.err.<key>; anything else is shown as it came.
const ERR: Record<string, string> = {
  "not found": "notFound",
  "internal error": "internal",
  "invalid rank": "invalidRank",
  "invalid note": "invalidNote",
  "days must be 1-3650 or null, only for recluta, daeva and empyrean": "rankDays",
  "days must be 1-3650 or null": "banDays",
  "days must be 1-365": "trialDays",
  "reason must be 1-500 characters": "reason",
  "body must be 1-2000 characters": "noteBody",
  "bootstrap admin required": "bootstrapRequired",
  "cannot change yourself": "changeSelf",
  "bootstrap admin": "bootstrapAdmin",
  "account suspended": "suspended",
  "confirm must be the Discord id": "confirm",
  "cannot ban yourself": "banSelf",
  "cannot ban an admin": "banAdmin",
  "not banned": "notBanned",
  "developer has no trial": "developerTrial",
  "no running trial": "noTrial",
  "cannot delete yourself": "deleteSelf",
  "cannot delete an admin": "deleteAdmin",
  "invalid target": "invalidTarget",
};
export const errText = (t: T, e: unknown) => {
  const m = String(e);
  return ERR[m] ? t(`admin.err.${ERR[m]}`) : t("common.error", { message: m });
};

/** Loads on mount and when `deps` change; `reload` keeps the old data on screen meanwhile. */
export function useLoad<R>(load: () => Promise<R>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: R; error?: unknown; busy: boolean }>({ busy: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, busy: true, error: undefined }));
    load().then(
      (data) => live && setState({ data, busy: false }),
      (error) => live && setState((s) => ({ ...s, error, busy: false })),
    );
    return () => {
      live = false;
    };
  }, [...deps, n]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: () => setN((v) => v + 1) };
}

// ---------- formatting (operator's language, local time zone) ----------
const cache = new Map<string, ReturnType<typeof make>>();
function make(lang: string) {
  const dt = new Intl.DateTimeFormat(lang, { dateStyle: "short", timeStyle: "short" });
  const d = new Intl.DateTimeFormat(lang, { dateStyle: "short" });
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  const nf = new Intl.NumberFormat(lang);
  const cf = new Intl.NumberFormat(lang, { notation: "compact", maximumFractionDigits: 1 });
  return {
    dateTime: (iso: string | null | undefined) => (iso ? dt.format(new Date(iso)) : "-"),
    date: (iso: string | null | undefined) => (iso ? d.format(new Date(iso)) : "-"),
    num: (n: number | null | undefined) => (n == null ? "-" : nf.format(n)),
    compact: (n: number | null | undefined) => (n == null ? "-" : cf.format(n)),
    rel(iso: string) {
      const s = (new Date(iso).getTime() - Date.now()) / 1000;
      const a = Math.abs(s);
      if (a < 60) return rtf.format(0, "second");
      if (a < 3600) return rtf.format(Math.round(s / 60), "minute");
      if (a < 86400) return rtf.format(Math.round(s / 3600), "hour");
      if (a < 86400 * 45) return rtf.format(Math.round(s / 86400), "day");
      if (a < 86400 * 365) return rtf.format(Math.round(s / (86400 * 30)), "month");
      return rtf.format(Math.round(s / (86400 * 365)), "year");
    },
  };
}
export const formats = (lang: string) => cache.get(lang) ?? (cache.set(lang, make(lang)), cache.get(lang)!);

/** Relative time, exact date on hover. */
export function When({ iso, lang }: { iso: string | null | undefined; lang: string }) {
  if (!iso) return <span className="admMuted">-</span>;
  const f = formats(lang);
  return (
    <time dateTime={iso} title={f.dateTime(iso)}>
      {f.rel(iso)}
    </time>
  );
}

// ---------- shared bits ----------
export function Panel({ title, aside, children, className }: { title: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className ? `card admPanel ${className}` : "card admPanel"}>
      <div className="cardHead">
        <h2 className="kicker">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function LoadError({ t, e, retry }: { t: T; e: unknown; retry: () => void }) {
  return (
    <div role="alert">
      <EmptyState icon={<WarningCircleIcon aria-hidden="true" />} title={t("admin.loadFailed")} text={errText(t, e)}>
        <button type="button" className="btn" onClick={retry}>
          {t("organizer.diag.retry")}
        </button>
      </EmptyState>
    </div>
  );
}

/** Rows of grey bars while a table loads. */
export const Skeleton = ({ rows = 6 }: { rows?: number }) => (
  <div className="admSkeleton" aria-hidden="true">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="skeleton" />
    ))}
  </div>
);

/** Admin, rank, Developer and ban badges of an account. */
export function RoleBadges({ t, lang, u }: { t: T; lang: string; u: Pick<UserRow, "admin" | "bootstrapAdmin" | "rank" | "developer" | "ban"> }) {
  return (
    <span className="admBadges">
      {u.admin && <span className="badge admBadgeAdmin">{u.bootstrapAdmin ? t("admin.founder") : "Admin"}</span>}
      {u.rank === "debugger" ? (
        <span className="badge">Debugger</span>
      ) : PAID.includes(u.rank) ? (
        <span className="badge admBadgePlan">{rankName(u.rank)}</span>
      ) : (
        !u.admin && <span className="badge">Player</span>
      )}
      {u.developer && <span className="badge">Developer</span>}
      {u.ban?.active && (
        <span className="badge admBadgeBan">
          {u.ban.until ? t("admin.bannedUntil", { date: formats(lang).date(u.ban.until) }) : t("admin.bannedForever")}
        </span>
      )}
    </span>
  );
}

/** "Daeva, manual grant" + when it ends. */
export function AccessCell({ t, lang, a }: { t: T; lang: string; a: UserRow["access"] }) {
  const src = a.tier === "trial" || a.source === "free" ? "" : t(`admin.source.${a.source}`);
  return (
    <div>
      <div>
        {tierName(t, a.tier)}
        {src && <span className="admMuted">, {src}</span>}
      </div>
      <div className="admSub">
        {a.tier === "free" ? t("admin.access.none") : a.until ? t("admin.until", { date: formats(lang).date(a.until) }) : t("admin.noEnd")}
      </div>
    </div>
  );
}

/** Admin who did it / account it was done on. Deleted accounts keep only their id. */
export function PersonLink({ t, p, open }: { t: T; p: Person; open: Ctx["open"] }) {
  if (!p) return <span className="admMuted">-</span>;
  if (!p.name) return <span className="admMuted">{t("admin.deletedAccount", { id: p.id })}</span>;
  return (
    <button type="button" className="linkBtn admLink" onClick={() => open({ tab: "user", id: p.id })}>
      {p.name}
    </button>
  );
}

/**
 * Confirmation dialog on the app's Modal. `run` does the write: if it throws, the dialog stays
 * open with the message; if it resolves, the dialog closes.
 */
export function Confirm({
  t,
  title,
  danger,
  confirm,
  valid = true,
  run,
  onClose,
  extra,
  children,
}: {
  t: T;
  title: string;
  danger?: boolean;
  confirm: string;
  valid?: boolean;
  run: () => Promise<unknown>;
  onClose: () => void;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await run();
      onClose();
    } catch (err) {
      setError(errText(t, err));
      setBusy(false);
    }
  };
  return (
    <Modal
      width={480}
      gap={14}
      onClose={onClose}
      title={(id) => (
        <div style={{ display: "flex", alignItems: "center" }}>
          <h2 id={id} style={{ fontSize: 17, fontWeight: 500, flex: 1 }}>
            {title}
          </h2>
          <button type="button" className="shareClose" onClick={onClose} title={t("window.close")} aria-label={t("window.close")}>
            <XIcon aria-hidden="true" />
          </button>
        </div>
      )}
    >
      <form className="admDialog" onSubmit={submit} noValidate>
        {children}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="admDialogFoot">
          {extra}
          <span style={{ flex: 1 }} />
          <button type="button" className="btn" onClick={onClose}>
            {t("admin.cancel")}
          </button>
          <button type="submit" className={danger ? "btn admDanger" : "btn fill"} disabled={!valid || busy} aria-busy={busy}>
            {confirm}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** Field the operator fills with the target's Discord id to confirm (admin switch, delete). */
export function DiscordIdField({ t, discordId, value, set }: { t: T; discordId: string; value: string; set: (v: string) => void }) {
  return (
    <label className="field">
      {t("admin.typeId")}
      <input
        className="input mono"
        autoFocus
        autoComplete="off"
        spellCheck={false}
        inputMode="numeric"
        value={value}
        onChange={(e) => set(e.target.value)}
        aria-invalid={value !== "" && value.trim() !== discordId}
      />
      <span className="admHint">
        {t("admin.idIs")} <span className="mono">{discordId}</span>
      </span>
    </label>
  );
}

// ---------- audit ----------
const ACTIONS = [
  "admin.login", "rank.set", "grant.set", "grant.remove", "role.add", "role.remove", "trial.extend", "trial.end", "trial.restart",
  "devices.reset", "sessions.revoke", "ban", "unban", "admin.add", "admin.remove", "note.add", "note.delete", "export", "user.delete",
];
const HOT = new Set(["ban", "admin.add", "admin.remove", "user.delete"]);
/** admin.action.<action with dots as underscores>; unknown actions show as they come. */
export const actionName = (t: T, a: string) => (ACTIONS.includes(a) ? t(`admin.action.${a.replace(".", "_")}`) : a);
export const ActionLabel = ({ t, a }: { t: T; a: string }) => <span className={HOT.has(a) ? "admHot" : undefined}>{actionName(t, a)}</span>;

const DETAIL_KEYS = ["reason", "days", "until", "from", "to", "tier", "note", "role", "removed", "noteId", "discordId", "name", "endsAt", "mfa", "expiresAt"];
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
function detailValue(t: T, lang: string, k: string, v: unknown): string {
  if (v == null) return k === "days" || k === "until" ? t("admin.noEnd") : "-";
  if (typeof v === "boolean") return t(v ? "admin.yes" : "admin.no");
  if (typeof v === "string" && ISO.test(v)) return formats(lang).dateTime(v);
  if (typeof v === "string" && (RANKS as string[]).includes(v)) return rankName(v);
  if (v === "free" || v === "trial") return tierName(t, v);
  if (v === "developer" || v === "admin") return rankName(v);
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}
/** "Reason: ..., Days: 7": generic, so new detail keys still show. */
export function AuditDetails({ t, lang, d }: { t: T; lang: string; d: AuditEntry["details"] }) {
  const parts = Object.entries(d ?? {}).filter(([k, v]) => !(v === null && (k === "note" || k === "from")));
  if (!parts.length) return <span className="admMuted">-</span>;
  return (
    <span>
      {parts.map(([k, v], i) => (
        <span key={k}>
          {i > 0 && ", "}
          <b>{DETAIL_KEYS.includes(k) ? t(`admin.key.${k}`) : k}: </b>
          {detailValue(t, lang, k, v)}
        </span>
      ))}
    </span>
  );
}

export function AuditTable({ x, entries, showTarget = true }: { x: Ctx; entries: AuditEntry[]; showTarget?: boolean }) {
  const { t, lang, open } = x;
  return (
    <div className="admTableWrap">
      <table className="admTable">
        <thead>
          <tr>
            <th>{t("admin.col.when")}</th>
            <th>{t("admin.col.action")}</th>
            <th>Admin</th>
            {showTarget && <th>{t("admin.col.account")}</th>}
            <th>{t("admin.col.details")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>
                <When iso={e.createdAt} lang={lang} />
                <div className="admSub mono">{formats(lang).dateTime(e.createdAt)}</div>
              </td>
              <td>
                <ActionLabel t={t} a={e.action} />
              </td>
              <td>
                <PersonLink t={t} p={e.admin} open={open} />
              </td>
              {showTarget && (
                <td>
                  {e.action === "user.delete" && typeof e.details?.name === "string" ? (
                    <>
                      {e.details.name}
                      <div className="admSub">{t("admin.deleted")}</div>
                    </>
                  ) : (
                    <PersonLink t={t} p={e.target} open={open} />
                  )}
                </td>
              )}
              <td className="admWide">
                <AuditDetails t={t} lang={lang} d={e.details} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "1-50 of 120" + previous / next. */
export function Pager({ t, lang, page, pageSize, total, shown, go }: { t: T; lang: string; page: number; pageSize: number; total: number; shown: number; go: (page: number) => void }) {
  const f = formats(lang);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav className="admPager" aria-label={t("admin.pages")}>
      <span>{t("admin.range", { from: f.num((page - 1) * pageSize + 1), to: f.num((page - 1) * pageSize + shown), total: f.num(total) })}</span>
      {pages > 1 && (
        <span className="admPagerBtns">
          <button type="button" className="btn sm" disabled={page <= 1} onClick={() => go(page - 1)}>
            <CaretLeftIcon aria-hidden="true" />
            {t("admin.prev")}
          </button>
          <span className="mono">
            {page} / {pages}
          </span>
          <button type="button" className="btn sm" disabled={page >= pages} onClick={() => go(page + 1)}>
            {t("admin.next")}
            <CaretRightIcon aria-hidden="true" />
          </button>
        </span>
      )}
    </nav>
  );
}
