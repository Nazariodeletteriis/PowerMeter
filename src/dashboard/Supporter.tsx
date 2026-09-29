import { invoke } from "@tauri-apps/api/core";
import { CheckIcon, HeartIcon, WifiSlashIcon } from "@phosphor-icons/react";
import { useEffect, useState, type FormEvent } from "react";
import { PLANS, refreshEntitlement, useEntitlement, type Entitlement, type PaidTier, type Tier } from "./entitlement";
import type { Key, T } from "./i18n";
import { PATREON_URL } from "./Shell";

const A2TOOLS_URL = "https://github.com/taengu/A2Tools-DPS-Meter";
const MANAGE_URL = "https://www.patreon.com/settings/memberships";
const DAY = 86_400_000;

const tierName = (t: T, tier: Tier) => (tier === "free" || tier === "trial" ? t(`subs.tier.${tier}`) : PLANS[tier].name);

// What each plan adds to the one before (notes/patreon-tiers-plan.md, section 0).
const PERKS: ["free" | PaidTier, Key[]][] = [
  ["free", ["subs.free.meter", "subs.free.rest"]],
  ["recluta", ["subs.wholeDatabase", "nav.report", "nav.onlineLogs", "nav.rankings", "subs.discordRole"]],
  ["daeva", ["nav.party", "nav.crafting", "nav.calculators", "subs.discordChat"]],
  ["empyrean", ["subs.customFeature", "subs.privateChannel", "subs.directSupport"]],
];

/** Where the current tier comes from. */
function origin(t: T, e: Entitlement, signedIn: boolean, fmt: (ms: number) => string) {
  switch (e.source) {
    case "patreon":
      return e.until ? t("subs.source.patreonUntil", { date: fmt(e.until) }) : t("subs.source.patreon");
    case "trial":
      return t("subs.source.trial", { n: Math.max(0, Math.ceil(((e.trialEndsAt ?? 0) - Date.now()) / DAY)) });
    case "grant":
      return e.until ? t("subs.source.grantUntil", { date: fmt(e.until) }) : t("subs.source.grantForever");
    case "admin":
    case "dev":
      return t("subs.source.dev");
    default:
      return signedIn ? t("subs.source.free") : t("subs.source.signedOut");
  }
}

/** Prototype pg.supporter: plan, Patreon link, plan comparison, and the admin grants. */
export function Supporter({ t, lang, onError }: { t: T; lang: string; onError: (e: unknown) => void }) {
  const e = useEntitlement();
  const [account, setAccount] = useState<unknown>(); // undefined until pm_account answers
  useEffect(() => {
    invoke("pm_account").then(setAccount, onError);
  }, []);
  const open = (url: string) => invoke("open_url", { url }).catch(onError);
  const signIn = () => invoke("pm_login").then(setAccount).then(refreshEntitlement).catch(onError);
  const unlink = () => confirm(t("subs.unlinkConfirm")) && invoke("pm_patreon_unlink").then(refreshEntitlement).catch(onError);
  const date = new Intl.DateTimeFormat(lang, { dateStyle: "medium" });
  const fmt = (ms: number) => date.format(ms);
  // The trial unlocks what Daeva unlocks.
  const current = e && (e.tier === "trial" ? "daeva" : e.tier);
  const [before, after] = t("about.a2tools").split("{link}");
  return (
    <div style={{ maxWidth: 960, display: "grid", gap: 12 }}>
      <div
        style={{
          position: "relative",
          borderRadius: 10,
          padding: 28,
          background: "var(--pm-band)",
          border: "1px solid var(--pm-line)",
          overflow: "hidden",
          marginBottom: 4,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0 0 auto 0",
            height: 2,
            background: "linear-gradient(90deg,transparent,#DB0000 25%,#DB0000 75%,transparent)",
          }}
        />
        <HeartIcon weight="fill" style={{ fontSize: 26, color: "#FF4D4D" }} aria-hidden="true" />
        <h2 style={{ fontSize: 24, fontWeight: 500, margin: "10px 0 8px", letterSpacing: "-.015em", color: "#FAF7F7" }}>
          {t("supporter.title")}
        </h2>
        <p style={{ lineHeight: 1.6, maxWidth: 600, color: "#E8E1E1" }}>{t("subs.heroText")}</p>
      </div>

      {e && (
        <section
          className="card"
          style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}
        >
          <div style={{ minWidth: 0 }}>
            <h3 className="kicker">{t("subs.status")}</h3>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, margin: "6px 0 2px" }}>
              <span style={{ fontSize: 20, fontWeight: 500 }}>{tierName(t, e.tier)}</span>
              {e.founder && (
                <span className="badge" style={{ borderColor: "#DB000088", color: "#FF6B6B" }}>
                  <HeartIcon weight="fill" aria-hidden="true" />
                  Founder
                </span>
              )}
              {e.offline && (
                <span className="badge" title={t("subs.offlineHint")}>
                  <WifiSlashIcon aria-hidden="true" />
                  {t("subs.offline")}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: "var(--pm-t2)" }}>{origin(t, e, account != null, fmt)}</div>
            {e.patreon?.linked && <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("subs.patreonLinked")}</div>}
          </div>
          {account !== undefined && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {account === null ? (
                <button type="button" className="btn fill lg" onClick={signIn}>
                  {t("subs.signIn")}
                </button>
              ) : e.patreon?.linked ? (
                <>
                  <button type="button" className="btn lg" onClick={unlink}>
                    {t("subs.unlink")}
                  </button>
                  <button type="button" className="btn fill lg" onClick={() => open(MANAGE_URL)}>
                    {t("subs.manage")}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="btn lg" onClick={() => open(PATREON_URL)}>
                    {t("subs.subscribe")}
                  </button>
                  <button type="button" className="btn fill lg" onClick={() => invoke("pm_patreon_link").catch(onError)}>
                    {t("subs.link")}
                  </button>
                </>
              )}
            </div>
          )}
        </section>
      )}

      <section className="card">
        <h3 className="kicker">{t("subs.plans")}</h3>
        <div className="subsPlans">
          {PERKS.map(([tier, perks], i) => (
            <div key={tier} className="subsPlan" aria-current={tier === current || undefined}>
              <h4>
                {tierName(t, tier)}
                {tier === current && <span className="badge">{e?.tier === "trial" ? tierName(t, "trial") : t("subs.current")}</span>}
              </h4>
              <div className="mono" style={{ color: "var(--pm-t3)" }}>
                {t("subs.perMonth", { price: tier === "free" ? 0 : PLANS[tier].price })}
              </div>
              <ul>
                {i > 0 && <li>{t("subs.everythingIn", { tier: tierName(t, PERKS[i - 1][0]) })}</li>}
                {perks.map((k) => (
                  <li key={k}>
                    <CheckIcon aria-hidden="true" />
                    {t(k)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {e?.admin && <Admin t={t} fmt={fmt} onError={onError} />}

      <p style={{ marginTop: 4, fontSize: 12, color: "var(--pm-t3)" }}>
        {before}
        <button type="button" className="linkBtn" onClick={() => open(A2TOOLS_URL)}>
          A2Tools DPS Meter
        </button>
        {after}
      </p>
    </div>
  );
}

/** pm_admin_users row (src-tauri/src/pm_account.rs). */
type AdminUser = {
  id: string;
  discordId: string;
  name: string;
  lastLoginAt: number | null;
  grant: { tier: PaidTier; expiresAt: number | null; note: string | null } | null;
  patreonTier: Tier | null;
  trialEndsAt: number | null;
};

const DURATIONS = [7, 30, 90, 365];

/** Admin only (the server checks too): who gets which tier by hand. */
function Admin({ t, fmt, onError }: { t: T; fmt: (ms: number) => string; onError: (e: unknown) => void }) {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<AdminUser[]>();
  const [busy, setBusy] = useState(false);
  const load = (query = q) => invoke<{ users: AdminUser[] }>("pm_admin_users", { q: query }).then((r) => setUsers(r.users), onError);
  useEffect(() => {
    void load("");
  }, []);
  const act = (cmd: string, args: Record<string, unknown>) => {
    setBusy(true);
    invoke(cmd, args)
      .then(() => Promise.all([load(), refreshEntitlement()]), onError)
      .finally(() => setBusy(false));
  };
  const grant = (u: AdminUser) => (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const f = new FormData(ev.currentTarget);
    const days = String(f.get("days"));
    const note = String(f.get("note")).trim();
    act("pm_admin_grant", { userId: u.id, tier: f.get("tier"), days: days ? Number(days) : null, note: note || null });
  };
  const revoke = (u: AdminUser) => confirm(t("subs.admin.revokeConfirm", { name: u.name })) && act("pm_admin_revoke", { userId: u.id });

  return (
    <section className="card">
      <h3 className="kicker">{t("subs.admin.title")}</h3>
      <form
        style={{ display: "flex", gap: 8, margin: "10px 0 4px" }}
        onSubmit={(ev) => {
          ev.preventDefault();
          void load();
        }}
      >
        <input
          className="input sm"
          type="search"
          style={{ flex: 1 }}
          value={q}
          onChange={(ev) => setQ(ev.target.value)}
          aria-label={t("subs.admin.search")}
          placeholder={t("subs.admin.search")}
        />
        <button type="submit" className="btn lg">
          {t("subs.admin.searchBtn")}
        </button>
      </form>
      <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("subs.admin.hint")}</div>
      {users && !users.length && <p style={{ marginTop: 12, color: "var(--pm-t3)" }}>{t("subs.admin.empty")}</p>}
      <ul>
        {users?.map((u) => {
          const patreon = u.patreonTier !== "free" && u.patreonTier;
          const trial = !!u.trialEndsAt && u.trialEndsAt > Date.now();
          return (
            <li key={u.id} className="subsUser">
              <div style={{ minWidth: 0 }}>
                <div>
                  {u.name}{" "}
                  <span className="mono" style={{ fontSize: 12, color: "var(--pm-t3)" }}>
                    {u.discordId}
                  </span>
                </div>
                <div className="meta">
                  {t("subs.admin.lastLogin", { date: u.lastLoginAt ? fmt(u.lastLoginAt) : "-" })}
                  {u.grant && (
                    <span className="badge" style={{ borderColor: "#DB000088", color: "#FF6B6B" }} title={u.grant.note ?? undefined}>
                      {u.grant.expiresAt
                        ? t("subs.admin.grantUntil", { tier: PLANS[u.grant.tier].name, date: fmt(u.grant.expiresAt) })
                        : t("subs.admin.grantForever", { tier: PLANS[u.grant.tier].name })}
                    </span>
                  )}
                  {patreon && <span className="badge">Patreon {tierName(t, patreon)}</span>}
                  {trial && <span className="badge">{t("subs.admin.trialUntil", { date: fmt(u.trialEndsAt!) })}</span>}
                  {!u.grant && !patreon && !trial && <span className="badge">{tierName(t, "free")}</span>}
                </div>
              </div>
              <form className="subsGrant" onSubmit={grant(u)}>
                <select className="input" name="tier" defaultValue={u.grant?.tier ?? "recluta"} aria-label={t("subs.admin.tier")}>
                  {(Object.keys(PLANS) as PaidTier[]).map((k) => (
                    <option key={k} value={k}>
                      {PLANS[k].name}
                    </option>
                  ))}
                </select>
                <select className="input" name="days" defaultValue="30" aria-label={t("subs.admin.duration")}>
                  {DURATIONS.map((n) => (
                    <option key={n} value={n}>
                      {t("subs.admin.days", { n })}
                    </option>
                  ))}
                  <option value="">{t("subs.admin.forever")}</option>
                </select>
                <input
                  className="input"
                  name="note"
                  maxLength={200}
                  style={{ width: 150 }}
                  aria-label={t("subs.admin.note")}
                  placeholder={t("subs.admin.note")}
                />
                <button type="submit" className="btn fill sm" disabled={busy}>
                  {t("subs.admin.grant")}
                </button>
                {u.grant && (
                  <button type="button" className="btn sm" disabled={busy} onClick={() => revoke(u)}>
                    {t("subs.admin.revoke")}
                  </button>
                )}
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
