import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  DesktopTowerIcon,
  DownloadSimpleIcon,
  ProhibitIcon,
  SignOutIcon,
  SwordIcon,
  TrashIcon,
  UserCircleMinusIcon,
} from "@phosphor-icons/react";
import { ClassAvatar, EmptyState, ProfileAvatar } from "../../ui";
import {
  AccessCell,
  AuditTable,
  cadenceName,
  Confirm,
  DiscordIdField,
  formats,
  LoadError,
  PAID,
  Panel,
  rankName,
  RANKS,
  RoleBadges,
  Skeleton,
  statusName,
  tierName,
  useLoad,
  When,
  type AuditEntry,
  type Ctx,
  type Method,
  type Rank,
  type UserRow,
} from "./lib";

// One account and every staff action on it (API.md sections 5-6). After each write the page re-reads GET /users/:id.

type Log = {
  id: string;
  url: string | null;
  bossName: string | null;
  mobCode: number | null;
  durationMs: number | null;
  totalDamage: number | null;
  createdAt: string | null;
  visibility: string | null;
  views: number | null;
  region: string | null;
  uploaderName: string | null;
  appVersion: string | null;
  killed: boolean | null;
};
type Full = Omit<UserRow, "logs"> & {
  patreonLink: {
    patreonUserId: string;
    linkedAt: string | null;
    tier: string | null;
    status: string | null;
    lastChargeAt: string | null;
    nextChargeAt: string | null;
    cadence: number | null;
    firstPaidAt: string | null;
  } | null;
  pcs: { id: string; firstSeen: string; lastSeen: string; recent: boolean }[];
  sessions: { createdAt: string; lastUsedAt: string | null }[];
  logs: { total: number; public: number; unlisted: number; private: number; lastAt: string | null };
  characters: { name: string; cls: string | null; region: string | null; logs: number; lastAt: string | null }[];
  recentLogs: Log[];
  notes: { id: string; body: string; createdAt: string; author: { id: string; name: string | null } }[];
  audit: AuditEntry[];
};
const MAX_NOTE = 2000;
const DAY = 864e5;
const intIn = (v: string, min: number, max: number) => /^\d+$/.test(v) && +v >= min && +v <= max;

export function UserPage({ x, id, onName, back }: { x: Ctx; id: string; onName: (name: string) => void; back: () => void }) {
  const { t, lang, api, me, done, fail } = x;
  const user = useLoad(() => api<Full>("GET", `/users/${id}`), [id]);
  const [dialog, setDialog] = useState<ReactNode>(null);
  const u = user.data;
  useEffect(() => {
    if (u) onName(u.name);
  }, [u?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const backLink = (
    <button type="button" className="linkBtn admBack" onClick={back}>
      <ArrowLeftIcon aria-hidden="true" />
      {t("admin.tab.users")}
    </button>
  );
  if (!u) {
    if (!user.error) return <Skeleton rows={8} />;
    return (
      <div className="admStack">
        {backLink}
        <section className="card">
          {String(user.error) === "not found" ? (
            <EmptyState icon={<UserCircleMinusIcon aria-hidden="true" />} title={t("admin.u.notFound")} text={t("admin.u.notFoundText")} />
          ) : (
            <LoadError t={t} e={user.error} retry={user.reload} />
          )}
        </section>
      </div>
    );
  }

  const f = formats(lang);
  const close = () => setDialog(null);
  /** A write from a dialog: errors stay in the dialog (thrown), success shows the notice and re-reads the account. */
  const write = (method: Method, path: string, body: object, ok: string) => async () => {
    await api(method, `/users/${id}${path}`, body);
    done(ok);
    user.reload();
  };
  const ask = (title: string, confirm: string, text: string, run: () => Promise<unknown>, danger = false) =>
    setDialog(
      <Confirm t={t} title={title} confirm={confirm} danger={danger} run={run} onClose={close}>
        <p>{text}</p>
      </Confirm>,
    );
  const self = u.id === me.id;
  const banned = !!u.ban?.active;
  async function exportData() {
    try {
      const data = await api("GET", `/users/${id}/export`);
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `powermeter-account-${id}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      done(t("admin.u.exported"));
    } catch (e) {
      fail(e);
    }
  }

  // ---------- rank, trial, admin ----------
  const t0 = u.trial;
  const trialState = u.developer
    ? t("admin.u.trialDeveloper")
    : !t0.startedAt
      ? `${t("admin.u.trialNever")} ${t(t0.eligible ? "admin.u.eligible" : "admin.u.ineligible")}`
      : t0.running
        ? t("admin.u.trialRunning", { date: f.dateTime(t0.endsAt) })
        : t("admin.u.trialEnded", { date: f.dateTime(t0.endsAt) });
  const adminWhy = !me.bootstrap
    ? t("admin.err.bootstrapRequired")
    : u.bootstrapAdmin
      ? t("admin.u.adminBootstrap")
      : self
        ? t("admin.err.changeSelf")
        : !u.admin && banned
          ? t("admin.err.suspended")
          : null;
  const g = u.grant;

  const accessPanel = (
    <Panel title={t("admin.u.rankAccess")}>
      <div className="admFacts admFactsInline">
        <span className="admMuted">{t("admin.u.effective")}</span>
        <AccessCell t={t} lang={lang} a={u.access} />
      </div>
      {g && (
        <p className="admSub">
          {g.active
            ? t(g.expiresAt ? "admin.u.grantUntil" : "admin.u.grantForever", { tier: tierName(t, g.tier), date: f.dateTime(g.expiresAt) })
            : t("admin.u.grantExpired", { tier: tierName(t, g.tier), date: f.date(g.expiresAt) })}
          {g.active && g.note && ` (${g.note})`}
        </p>
      )}
      <RankForm key={`${u.rank}${g?.grantedAt ?? ""}`} x={x} u={u} confirm={(to, days, note) => {
        const lines: string[] = [];
        if (PAID.includes(to)) lines.push(days ? t("admin.u.rankDays", { n: days, date: f.date(new Date(Date.now() + days * DAY).toISOString()) }) : t("admin.noEnd"));
        if (g?.active && !PAID.includes(to)) lines.push(t("admin.u.rankDropsGrant", { tier: tierName(t, g.tier) }));
        if (u.rank === "debugger" && to !== "debugger") lines.push(t("admin.u.rankDropsDebugger"));
        if (to === "debugger") lines.push(t("admin.u.rankDebugger"));
        if (to === "player") lines.push(t("admin.u.rankPlayer"));
        setDialog(
          <Confirm t={t} title={t("admin.u.rankTitle")} confirm={t("admin.u.rankConfirm")} onClose={close}
            run={write("PUT", "/rank", { rank: to, days, ...(note ? { note } : {}) }, t("admin.u.rankDone", { name: u.name, rank: rankName(to) }))}>
            <p>{t(to === u.rank ? "admin.u.rankRenew" : "admin.u.rankFromTo", { name: u.name, from: rankName(u.rank), to: rankName(to) })}</p>
            {lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </Confirm>,
        );
      }} />

      <div className="admDivider" />
      <h3 className="admSubHead">
        {t("admin.u.trial")}
        {t0.running && t0.endsAt && <span className="badge admBadgeOk">{t("admin.u.daysLeft", { n: Math.max(1, Math.ceil((Date.parse(t0.endsAt) - Date.now()) / DAY)) })}</span>}
      </h3>
      <p className="admMuted">{trialState}</p>
      <div className="admActions" role="group" aria-label={t("admin.u.trial")}>
        <button type="button" className="btn" disabled={u.developer} onClick={() => setDialog(<ExtendDialog x={x} onClose={close} run={(days) => write("POST", "/trial", { action: "extend", days }, t("admin.u.extended", { name: u.name, n: days }))()} />)}>
          {t("admin.u.extend")}
        </button>
        <button type="button" className="btn" disabled={u.developer || !t0.running} onClick={() => ask(t("admin.u.endTitle"), t("admin.u.endConfirm"), t("admin.u.endText", { name: u.name }), write("POST", "/trial", { action: "end" }, t("admin.u.ended", { name: u.name })), true)}>
          {t("admin.u.end")}
        </button>
        <button type="button" className="btn" disabled={u.developer} onClick={() => ask(t("admin.u.restartTitle"), t("admin.u.restartConfirm"), t("admin.u.restartText", { name: u.name }), write("POST", "/trial", { action: "restart" }, t("admin.u.restarted", { name: u.name })))}>
          {t("admin.u.restart")}
        </button>
      </div>
      {!u.developer && !t0.running && <p className="admHint">{t("admin.u.endOnlyRunning")}</p>}

      <div className="admDivider" />
      <div className="admSwitchRow">
        <button
          type="button"
          role="switch"
          className="switch"
          aria-checked={u.admin}
          aria-labelledby="adm-admin-l"
          aria-describedby="adm-admin-d"
          disabled={!!adminWhy}
          onClick={() =>
            setDialog(
              u.admin ? (
                <Confirm t={t} title={t("admin.u.revokeTitle")} confirm={t("admin.u.revokeConfirm")} danger onClose={close}
                  run={write("DELETE", "/admin", {}, t("admin.u.revoked", { name: u.name }))}>
                  <p>{t("admin.u.revokeText", { name: u.name })}</p>
                </Confirm>
              ) : (
                <IdConfirm x={x} discordId={u.discordId} title={t("admin.u.grantTitle")} confirm={t("admin.u.grantConfirm")} onClose={close}
                  run={write("PUT", "/admin", { confirm: u.discordId }, t("admin.u.granted", { name: u.name }))}>
                  <p>{t("admin.u.grantText", { name: u.name })}</p>
                </IdConfirm>
              ),
            )
          }
        >
          <span />
        </button>
        <div>
          <div id="adm-admin-l">
            Admin{u.bootstrapAdmin && <span className="admMuted"> ({t("admin.founder")})</span>}
          </div>
          <p className="admHint" id="adm-admin-d">
            {adminWhy ?? t(u.admin ? "admin.u.adminOn" : "admin.u.adminOff")}
          </p>
        </div>
      </div>
    </Panel>
  );

  // ---------- characters, logs, notes, history ----------
  const charactersPanel = (
    <Panel title={t("admin.u.characters")}>
      {u.characters.length ? (
        <div className="admTableWrap">
          <table className="admTable">
            <thead>
              <tr>
                <th>{t("admin.col.character")}</th>
                <th>{t("admin.col.class")}</th>
                <th>{t("admin.col.region")}</th>
                <th className="r">{t("admin.col.fights")}</th>
                <th>{t("admin.col.last")}</th>
              </tr>
            </thead>
            <tbody>
              {u.characters.map((p) => (
                <tr key={`${p.name}${p.region}`}>
                  <td className="admWide">
                    <strong>{p.name}</strong>
                  </td>
                  <td>
                    {p.cls ? (
                      <span className="admCls">
                        <ClassAvatar cls={p.cls} size={20} />
                        {p.cls}
                      </span>
                    ) : (
                      <span className="admMuted">-</span>
                    )}
                  </td>
                  <td>{p.region ?? "-"}</td>
                  <td className="num">{f.num(p.logs)}</td>
                  <td>
                    <When iso={p.lastAt} lang={lang} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<SwordIcon aria-hidden="true" />} title={t("admin.u.noCharacters")} text={t("admin.u.noCharactersText")} />
      )}
    </Panel>
  );

  const notesPanel = (
    <Panel title={t("admin.u.notes")}>
      {u.notes.map((n) => (
        <div key={n.id} className="admNote">
          <div className="admGrow">
            <p className="admNoteBody">{n.body}</p>
            <p className="admSub">
              {n.author.name ?? `#${n.author.id}`}, {f.dateTime(n.createdAt)}
            </p>
          </div>
          <button
            type="button"
            className="shareClose"
            title={t("admin.u.deleteNote")}
            aria-label={t("admin.u.deleteNote")}
            onClick={() =>
              ask(t("admin.u.deleteNoteTitle"), t("admin.u.deleteNote"), n.body.length > 200 ? `${n.body.slice(0, 200)}…` : n.body, async () => {
                await api("DELETE", `/notes/${n.id}`, {});
                done(t("admin.u.noteDeleted"));
                user.reload();
              }, true)
            }
          >
            <TrashIcon aria-hidden="true" />
          </button>
        </div>
      ))}
      <NoteForm x={x} add={async (body) => {
        await api("POST", `/users/${id}/notes`, { body });
        done(t("admin.u.noteAdded"));
        user.reload();
      }} />
    </Panel>
  );

  // ---------- facts ----------
  const dated = (iso: string | null) =>
    iso ? (
      <>
        {f.dateTime(iso)}
        <div className="admSub">
          <When iso={iso} lang={lang} />
        </div>
      </>
    ) : (
      <span className="admMuted">-</span>
    );
  const facts = (rows: (false | null | [string, ReactNode])[]) => (
    <dl className="admFacts">
      {rows.filter((r): r is [string, ReactNode] => !!r).map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
  const pastBan = u.ban && !u.ban.active ? u.ban : null;
  const p = u.patreonLink;
  const banWhy = self ? t("admin.err.banSelf") : u.admin ? t("admin.err.banAdmin") : null;
  const delWhy = self ? t("admin.err.deleteSelf") : u.admin ? t("admin.err.deleteAdmin") : null;
  const dangerItem = (title: string, text: string, button: ReactNode) => (
    <div className="admDangerItem">
      <div>
        <strong>{title}</strong>
        <p className="admHint">{text}</p>
      </div>
      {button}
    </div>
  );

  return (
    <div className="admStack">
      {backLink}
      <div className="admProfile">
        <ProfileAvatar size={56} src={u.avatarUrl ?? undefined} name={u.name} />
        <div>
          <h2 className="admProfileName">{u.name}</h2>
          <div className="admSub">
            {t("admin.u.account")} <span className="mono">#{u.id}</span>, Discord <span className="mono">{u.discordId}</span>
          </div>
          <div className="admBadges">
            <RoleBadges t={t} lang={lang} u={u} />
            {u.patreon.status === "active_patron" && u.patreon.tier !== "free" && <span className="badge admBadgeOk">Patreon {tierName(t, u.patreon.tier)}</span>}
          </div>
        </div>
      </div>
      {banned && u.ban && (
        <div className="admBanned" role="status">
          <ProhibitIcon aria-hidden="true" />
          <div>
            <strong>{u.ban.until ? t("admin.u.suspendedUntil", { date: f.dateTime(u.ban.until) }) : t("admin.u.suspendedForever")}</strong>
            <div>
              {t("admin.key.reason")}: {u.ban.reason ?? "-"}
            </div>
            <div className="admSub">
              {t("admin.u.bannedOn", { date: f.dateTime(u.ban.bannedAt) })}
              {u.ban.by && ` (${u.ban.by.name ?? `#${u.ban.by.id}`})`}
            </div>
          </div>
        </div>
      )}

      <div className="admUserGrid">
        <div className="admStack">
          {accessPanel}
          {charactersPanel}
          <LogsPanel key={u.logs.total} x={x} id={id} u={u} />
          {notesPanel}
          <Panel
            title={t("admin.u.history")}
            aside={
              u.audit.length > 0 && (
                <button type="button" className="linkBtn" onClick={() => x.open({ tab: "audit", target: u.id })}>
                  {t("admin.u.historyAll")}
                </button>
              )
            }
          >
            {u.audit.length ? <AuditTable x={x} entries={u.audit} showTarget={false} /> : <p className="admMuted">{t("admin.u.noHistory")}</p>}
          </Panel>
        </div>

        <div className="admStack">
          <Panel title={t("admin.u.account")}>
            {facts([
              [t("admin.col.created"), dated(u.createdAt)],
              [t("admin.u.lastLogin"), dated(u.lastLoginAt)],
              [t("admin.col.lastSeen"), dated(u.lastSeenAt)],
              [t("admin.u.appVersion"), u.appVersion ? <span className="mono">{u.appVersion}</span> : <span className="admMuted">{t("admin.u.noVersion")}</span>],
              [
                t("admin.u.discordAccount"),
                u.discordCreatedAt ? (
                  <>
                    {t("admin.u.createdOn", { date: f.date(u.discordCreatedAt) })}
                    <div className="admSub">
                      <When iso={u.discordCreatedAt} lang={lang} />
                    </div>
                  </>
                ) : (
                  "-"
                ),
              ],
              pastBan && [
                t("admin.u.pastBan"),
                <>
                  {pastBan.reason ?? "-"}
                  <div className="admSub">{t("admin.u.fromTo", { from: f.date(pastBan.bannedAt), to: f.date(pastBan.until) })}</div>
                </>,
              ],
            ])}
          </Panel>

          <Panel title="Patreon">
            {p ? (
              facts([
                [t("admin.col.status"), p.status ? statusName(t, p.status) : <span className="admMuted">{t("admin.u.noMembership")}</span>],
                ["Tier", p.tier ? tierName(t, p.tier) : "-"],
                ["Id Patreon", <span className="mono">{p.patreonUserId}</span>],
                [t("admin.u.linked"), f.dateTime(p.linkedAt)],
                [t("admin.col.lastCharge"), f.dateTime(p.lastChargeAt)],
                [
                  t("admin.col.nextCharge"),
                  p.nextChargeAt ? (
                    <>
                      {f.dateTime(p.nextChargeAt)}
                      <div className="admSub">{cadenceName(t, p.cadence)}</div>
                    </>
                  ) : (
                    "-"
                  ),
                ],
                [t("admin.col.firstPaid"), f.date(p.firstPaidAt)],
              ])
            ) : (
              <p className="admMuted">{t("admin.u.noPatreon")}</p>
            )}
          </Panel>

          <Panel title={t("admin.u.pcs")}>
            <p className="admSub">{t("admin.u.pcsCount", { n: u.devices.recent, max: u.devices.max })}</p>
            {u.pcs.length > 0 && (
              <ul className="admList">
                {u.pcs.map((pc) => (
                  <li key={pc.id}>
                    <DesktopTowerIcon aria-hidden="true" className="admListIcon" />
                    <div className="admListMain">
                      <span className="mono">{pc.id}</span>
                      <span className="admSub">{t("admin.u.firstSeen", { date: f.date(pc.firstSeen) })}</span>
                    </div>
                    <div className="admListEnd">
                      <span className={pc.recent ? "badge admBadgeOk" : "badge"}>{t(pc.recent ? "admin.u.recent" : "admin.u.inactive")}</span>
                      <span className="admSub">
                        <When iso={pc.lastSeen} lang={lang} />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="admActions">
              <button type="button" className="btn" disabled={!u.pcs.length} onClick={() => ask(t("admin.u.resetPcsTitle"), t("admin.u.resetPcs"), t("admin.u.resetPcsText", { name: u.name }), write("DELETE", "/devices", {}, t("admin.u.pcsReset", { name: u.name })), true)}>
                {t("admin.u.resetPcs")}
              </button>
            </div>
          </Panel>

          <Panel title={`${t("admin.u.sessions")} (${u.sessions.length})`}>
            {u.sessions.length ? (
              <ul className="admList">
                {u.sessions.slice(0, 5).map((s, i) => (
                  <li key={i}>
                    <div className="admListMain">
                      <span>
                        {t("admin.u.lastUsed")} <When iso={s.lastUsedAt} lang={lang} />
                      </span>
                      <span className="admSub">{t("admin.u.openedOn", { date: f.dateTime(s.createdAt) })}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="admSub">{t("admin.u.noSessions")}</p>
            )}
            {u.sessions.length > 5 && <p className="admHint">{t("admin.u.moreSessions", { n: u.sessions.length - 5 })}</p>}
            <div className="admActions">
              <button type="button" className="btn" disabled={!u.sessions.length} onClick={() => ask(t("admin.u.closeSessionsTitle"), t("admin.u.closeSessions"), t("admin.u.closeSessionsText", { name: u.name, n: u.sessions.length }), write("DELETE", "/sessions", {}, t("admin.u.sessionsClosed", { name: u.name })), true)}>
                <SignOutIcon aria-hidden="true" />
                {t("admin.u.closeSessions")}
              </button>
            </div>
          </Panel>

          <Panel title={t("admin.u.actions")} className="admDangerZone">
            {banned
              ? dangerItem(t("admin.u.unban"), t("admin.u.unbanText"),
                  <button type="button" className="btn" onClick={() => ask(t("admin.u.unbanTitle"), t("admin.u.unban"), t("admin.u.unbanConfirmText", { name: u.name }), write("DELETE", "/ban", {}, t("admin.u.unbanned", { name: u.name })))}>
                    {t("admin.u.unban")}
                  </button>)
              : dangerItem(t("admin.u.ban"), banWhy ?? t("admin.u.banText"),
                  <button type="button" className="btn admDanger" disabled={!!banWhy} onClick={() => setDialog(<BanDialog x={x} name={u.name} onClose={close} run={(reason, days) => write("POST", "/ban", { reason, days }, days ? t("admin.u.bannedDays", { name: u.name, n: days }) : t("admin.u.bannedPerm", { name: u.name }))()} />)}>
                    <ProhibitIcon aria-hidden="true" />
                    {t("admin.u.ban")}
                  </button>)}
            {dangerItem(t("admin.u.export"), t("admin.u.exportText"),
              <button type="button" className="btn" onClick={exportData}>
                <DownloadSimpleIcon aria-hidden="true" />
                {t("admin.u.exportBtn")}
              </button>)}
            {dangerItem(t("admin.u.delete"), delWhy ?? t("admin.u.deleteText"),
              <button type="button" className="btn admDanger" disabled={!!delWhy} onClick={() =>
                setDialog(
                  <IdConfirm x={x} discordId={u.discordId} title={t("admin.u.deleteTitle")} confirm={t("admin.u.deleteConfirm")} onClose={close}
                    extra={
                      <button type="button" className="btn" onClick={exportData}>
                        <DownloadSimpleIcon aria-hidden="true" />
                        {t("admin.u.exportFirst")}
                      </button>
                    }
                    run={async () => {
                      await api("DELETE", `/users/${id}`, { confirm: u.discordId });
                      done(t("admin.u.deleted", { name: u.name }));
                      back();
                    }}>
                    <p>{t("admin.u.deleteBody", { name: u.name, n: f.num(u.logs.total) })}</p>
                    <p className="admHint">{t("admin.u.deleteExportHint")}</p>
                  </IdConfirm>,
                )
              }>
                <TrashIcon aria-hidden="true" />
                {t("admin.u.deleteBtn")}
              </button>)}
          </Panel>
        </div>
      </div>
      {dialog}
    </div>
  );
}

/** Rank menu + duration and note for the paid plans; Apply opens the confirmation. */
function RankForm({ x, u, confirm }: { x: Ctx; u: Full; confirm: (to: Rank, days: number | null, note: string) => void }) {
  const { t } = x;
  const [rank, setRank] = useState<Rank>(u.rank);
  const [days, setDays] = useState("");
  const [note, setNote] = useState("");
  const paid = PAID.includes(rank);
  const daysOk = !days || intIn(days, 1, 3650);
  const changed = rank !== u.rank || (paid && (days !== "" || note.trim() !== ""));
  return (
    <form
      className="admRankForm"
      onSubmit={(e) => {
        e.preventDefault();
        if (daysOk && changed) confirm(rank, paid && days ? +days : null, paid ? note.trim() : "");
      }}
    >
      <label className="field">
        Rank
        <select className="input" value={rank} onChange={(e) => setRank(e.target.value as Rank)}>
          {RANKS.map((r) => (
            <option key={r} value={r}>
              {rankName(r)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {t("admin.u.days")}
        <input className="input" type="number" min={1} max={3650} step={1} inputMode="numeric" placeholder={t("admin.noEnd")} disabled={!paid} value={paid ? days : ""} aria-invalid={!daysOk} onChange={(e) => setDays(e.target.value)} />
      </label>
      <label className="field admGrow">
        {t("admin.u.planNote")}
        <input className="input" maxLength={200} autoComplete="off" disabled={!paid} value={paid ? note : ""} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button type="submit" className="btn fill" disabled={!daysOk || !changed}>
        {t("admin.u.apply")}
      </button>
    </form>
  );
}

function ExtendDialog({ x, run, onClose }: { x: Ctx; run: (days: number) => Promise<unknown>; onClose: () => void }) {
  const { t } = x;
  const [days, setDays] = useState("7");
  return (
    <Confirm t={t} title={t("admin.u.extendTitle")} confirm={t("admin.u.extend")} valid={intIn(days, 1, 365)} run={() => run(+days)} onClose={onClose}>
      <label className="field">
        {t("admin.u.extendDays")}
        <input className="input" type="number" min={1} max={365} step={1} inputMode="numeric" autoFocus value={days} onChange={(e) => setDays(e.target.value)} />
        <span className="admHint">{t("admin.u.extendHint")}</span>
      </label>
    </Confirm>
  );
}

function BanDialog({ x, name, run, onClose }: { x: Ctx; name: string; run: (reason: string, days: number | null) => Promise<unknown>; onClose: () => void }) {
  const { t } = x;
  const [reason, setReason] = useState("");
  const [perm, setPerm] = useState(false);
  const [days, setDays] = useState("7");
  const r = reason.trim();
  const valid = r.length >= 1 && r.length <= 500 && (perm || intIn(days, 1, 3650));
  return (
    <Confirm t={t} title={t("admin.u.banTitle", { name })} confirm={t("admin.u.ban")} danger valid={valid} run={() => run(r, perm ? null : +days)} onClose={onClose}>
      <label className="field">
        {t("admin.u.banReason")}
        <textarea className="input admTextarea" maxLength={500} rows={3} autoFocus value={reason} onChange={(e) => setReason(e.target.value)} />
        <span className="admHint mono">{reason.length} / 500</span>
      </label>
      <fieldset className="admFieldset">
        <legend className="field">{t("admin.u.banLength")}</legend>
        <label className="check">
          <input type="radio" name="adm-ban" checked={!perm} onChange={() => setPerm(false)} />
          {t("admin.u.banTimed")}
        </label>
        <label className="check">
          <input type="radio" name="adm-ban" checked={perm} onChange={() => setPerm(true)} />
          {t("admin.u.banPerm")}
        </label>
      </fieldset>
      <label className="field">
        {t("admin.u.banDays")}
        <input className="input" type="number" min={1} max={3650} step={1} inputMode="numeric" disabled={perm} value={days} onChange={(e) => setDays(e.target.value)} />
        <span className="admHint">{t("admin.u.banDaysHint")}</span>
      </label>
      <p className="admHint">{t("admin.u.banEffect")}</p>
    </Confirm>
  );
}

/** Destructive confirmation the operator unlocks by typing the target's Discord id. */
function IdConfirm({
  x,
  discordId,
  title,
  confirm,
  run,
  onClose,
  extra,
  children,
}: {
  x: Ctx;
  discordId: string;
  title: string;
  confirm: string;
  run: () => Promise<unknown>;
  onClose: () => void;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const [typed, setTyped] = useState("");
  return (
    <Confirm t={x.t} title={title} confirm={confirm} danger valid={typed.trim() === discordId} run={run} onClose={onClose} extra={extra}>
      {children}
      <DiscordIdField t={x.t} discordId={discordId} value={typed} set={setTyped} />
    </Confirm>
  );
}

function NoteForm({ x, add }: { x: Ctx; add: (body: string) => Promise<void> }) {
  const { t, fail } = x;
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="admNoteForm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim() || busy) return;
        setBusy(true);
        add(body.trim()).then(
          () => (setBody(""), setBusy(false)),
          (err) => (fail(err), setBusy(false)),
        );
      }}
    >
      <label className="field">
        {t("admin.u.newNote")}
        <textarea className="input admTextarea" maxLength={MAX_NOTE} rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      <div className="admActions">
        <button type="submit" className="btn fill" disabled={!body.trim() || busy}>
          {t("admin.u.addNote")}
        </button>
        <span className="admHint mono">
          {body.length} / {MAX_NOTE}
        </span>
      </div>
    </form>
  );
}

/** The 10 latest fights; "Load more" restarts from page 1 of the paged endpoint (50 a page) and appends. */
function LogsPanel({ x, id, u }: { x: Ctx; id: string; u: Full }) {
  const { t, lang, api, fail } = x;
  const f = formats(lang);
  const [logs, setLogs] = useState(u.recentLogs);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const l = u.logs;
  const more = () => {
    setBusy(true);
    api<{ total: number; logs: Log[] }>("GET", `/users/${id}/logs?page=${page}`)
      .then((d) => {
        setLogs((old) => (page === 1 ? d.logs : [...old, ...d.logs]));
        setPage(page + 1);
      }, fail)
      .finally(() => setBusy(false));
  };
  if (!l.total) {
    return (
      <Panel title={t("admin.u.fights")}>
        <p className="admMuted">{t("admin.u.noFights")}</p>
      </Panel>
    );
  }
  const duration = (ms: number | null) => {
    if (ms == null) return "-";
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  return (
    <Panel title={t("admin.u.fights")}>
      <p className="admSub">
        {t("admin.u.fightsSummary", { total: f.num(l.total), pub: f.num(l.public), unlisted: f.num(l.unlisted), priv: f.num(l.private) })}
        {l.lastAt && ` ${t("admin.u.lastUpload", { date: f.date(l.lastAt) })}`}
      </p>
      <div className="admTableWrap">
        <table className="admTable">
          <thead>
            <tr>
              <th>Boss</th>
              <th>{t("admin.col.result")}</th>
              <th>{t("admin.col.duration")}</th>
              <th className="r">{t("admin.col.damage")}</th>
              <th>{t("admin.col.visibility")}</th>
              <th>{t("admin.col.uploaded")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {logs.map((g) => {
              const canOpen = g.visibility !== "private" && !u.ban?.active && /^https?:\/\//.test(g.url ?? "");
              return (
                <tr key={g.id}>
                  <td className="admWide">
                    <strong>{g.bossName ?? (g.mobCode ? `Mob ${g.mobCode}` : t("admin.unknown"))}</strong>
                    <div className="admSub">{[g.uploaderName, g.region, g.appVersion && `app ${g.appVersion}`].filter(Boolean).join(", ")}</div>
                  </td>
                  <td>{g.killed == null ? "-" : t(g.killed ? "admin.u.killed" : "admin.u.notKilled")}</td>
                  <td className="mono">{duration(g.durationMs)}</td>
                  <td className="num" title={f.num(g.totalDamage)}>
                    {f.compact(g.totalDamage)}
                  </td>
                  <td>
                    {g.visibility ? t(`admin.vis.${g.visibility}`) : "-"}
                    <div className="admSub">{t("admin.u.views", { n: f.num(g.views ?? 0) })}</div>
                  </td>
                  <td>
                    <When iso={g.createdAt} lang={lang} />
                  </td>
                  <td>
                    {canOpen && (
                      <button type="button" className="shareClose" title={t("admin.u.openLog")} aria-label={t("admin.u.openLog")} onClick={() => invoke("open_url", { url: g.url }).catch(fail)}>
                        <ArrowSquareOutIcon aria-hidden="true" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {l.total > logs.length && (
        <div className="admActions">
          <button type="button" className="btn" disabled={busy} aria-busy={busy} onClick={more}>
            {t("admin.u.loadMore")}
          </button>
        </div>
      )}
    </Panel>
  );
}
