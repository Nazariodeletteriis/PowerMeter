import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowsDownUpIcon,
  ArrowUpIcon,
  CalendarCheckIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  ScrollIcon,
  ShieldWarningIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useEntitlement } from "../entitlement";
import { ClassAvatar, EmptyState, ProfileAvatar } from "../ui";
import {
  AccessCell,
  ACCESS_ERRORS,
  ActionLabel,
  AuditTable,
  callAdmin,
  cadenceName,
  errText,
  formats,
  LoadError,
  Pager,
  Panel,
  query,
  PersonLink,
  rankName,
  RoleBadges,
  Skeleton,
  statusName,
  tierName,
  useLoad,
  When,
  type Api,
  type AuditEntry,
  type Ctx,
  type Me,
  type Method,
  type UserRow,
  type View,
} from "./admin/lib";
import { UserPage } from "./admin/User";
import "./characters/characters.css";
import "./organizer/organizer.css";
import "./system/system.css";
import "./admin/admin.css";
import type { PageProps } from "./types";

// Admin panel (was the web panel at /admin): KPIs, users, one account, Patreon members, audit log.
// Contract: PowerMeter-server/docs/admin-api.md. Reached from Settings → Account, only for admins.

const TABS = [
  ["dashboard", "admin.tab.dashboard"],
  ["users", "admin.tab.users"],
  ["patreon", "admin.tab.patreon"],
  ["audit", "admin.tab.audit"],
] as const;

type Filters = { q: string; role: string; access: string; banned: string; active: string; expiring: string; sort: string; dir: string; page: number };
const NO_FILTERS: Filters = { q: "", role: "", access: "", banned: "", active: "", expiring: "", sort: "last_seen_at", dir: "desc", page: 1 };

export default function Admin({ t, lang, go, setHeader, onError }: PageProps) {
  const entitlement = useEntitlement();
  const [denied, setDenied] = useState<string>();
  const [view, setView] = useState<View>({ tab: "dashboard" });
  const [filters, setFilters] = useState(NO_FILTERS);
  const [notice, setNotice] = useState<string>();
  const [userName, setUserName] = useState<string>();

  // Any call answered unauthorized / forbidden / mfa_required swaps the panel for that state.
  const api: Api = <R,>(method: Method, path: string, body?: object) =>
    callAdmin<R>(method, path, body).catch((e) => {
      if (ACCESS_ERRORS.includes(String(e))) setDenied(String(e));
      throw e;
    });
  const admin = entitlement?.admin;
  const me = useLoad(() => (admin ? api<Me>("GET", "/me") : Promise.resolve(undefined)), [admin]);

  const title = view.tab === "user" && userName ? userName : t("nav.admin");
  useEffect(() => setHeader({ title, crumb: view.tab === "user" ? t("nav.admin") : undefined }), [title, view.tab]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!notice) return;
    const h = setTimeout(() => setNotice(undefined), 4500);
    return () => clearTimeout(h);
  }, [notice]);

  if (!entitlement) return <Skeleton rows={4} />;
  const reason = !admin ? "forbidden" : denied;
  if (reason) {
    return (
      <section className="card admDenied" role="alert">
        <EmptyState icon={<ShieldWarningIcon aria-hidden="true" />} title={t(`admin.denied.${reason}.title`)} text={t(`admin.denied.${reason}.text`)}>
          {reason !== "forbidden" && (
            <button type="button" className="btn" onClick={() => go("impostazioni")}>
              {t("nav.settings")}
            </button>
          )}
        </EmptyState>
      </section>
    );
  }
  if (me.error) return <section className="card"><LoadError t={t} e={me.error} retry={me.reload} /></section>;
  if (!me.data) return <Skeleton rows={4} />;

  const x: Ctx = {
    t,
    lang,
    api,
    me: me.data,
    open: (v) => {
      setUserName(undefined);
      setView(v);
    },
    done: setNotice,
    fail: (e) => onError(errText(t, e)),
  };
  const showUsers = (f: Partial<Filters>) => {
    setFilters({ ...NO_FILTERS, ...f });
    x.open({ tab: "users" });
  };
  const active = view.tab === "user" ? "users" : view.tab;

  return (
    <div className="admRoot">
      <div className="admTop">
        <div className="orgTabs" role="tablist" aria-label={t("nav.admin")}>
          {TABS.map(([id, label]) => (
            <button key={id} type="button" role="tab" className="orgTab" aria-selected={active === id} onClick={() => x.open({ tab: id })}>
              {t(label)}
            </button>
          ))}
        </div>
        <div className="admMe">
          <ProfileAvatar size={24} src={me.data.avatarUrl ?? undefined} name={me.data.name} />
          <span>{me.data.name}</span>
          <span className="badge admBadgeAdmin">{me.data.bootstrap ? t("admin.founder") : "Admin"}</span>
        </div>
      </div>
      <p className="admNotice" role="status">
        {notice}
      </p>
      {view.tab === "dashboard" && <Dashboard x={x} showUsers={showUsers} />}
      {view.tab === "users" && <Users x={x} filters={filters} setFilters={setFilters} />}
      {view.tab === "user" && <UserPage key={view.id} x={x} id={view.id} onName={setUserName} back={() => x.open({ tab: "users" })} />}
      {view.tab === "patreon" && <Patreon x={x} />}
      {view.tab === "audit" && <Audit key={view.target ?? ""} x={x} initialTarget={view.target ?? ""} />}
    </div>
  );
}

// ---------- dashboard ----------
type Kpi = {
  users: { total: number; new7: number; new30: number; active7: number; active30: number };
  trials: { active: number; ended: number; ineligible: number };
  patreon: { activeLinked: number; activeUnlinked: number };
  expiring: { kind: string; at: string; user: { id: string; name: string | null } | null; patreonUserId: string | null }[];
  fights: { total: number; public: number; last30: number; perDay: { day: string; n: number }[] };
  appVersions: { version: string; users: number }[];
  classes: { cls: string | null; characters: number; logs: number }[];
  bansActive: number;
  recentAudit: AuditEntry[];
};

function Dashboard({ x, showUsers }: { x: Ctx; showUsers: (f: Partial<Filters>) => void }) {
  const { t, lang, api, open } = x;
  const kpi = useLoad(() => api<Kpi>("GET", "/kpi"), []);
  if (kpi.error && !kpi.data) return <section className="card"><LoadError t={t} e={kpi.error} retry={kpi.reload} /></section>;
  const k = kpi.data;
  if (!k) return <Skeleton rows={6} />;
  const f = formats(lang);
  const tile = (label: string, value: number, sub: string, onClick: () => void) => (
    <button type="button" className="card admKpi" onClick={onClick}>
      <span className="kicker">
        {label}
        <ArrowRightIcon aria-hidden="true" />
      </span>
      <span className="admKpiValue mono">{f.num(value)}</span>
      <span className="admSub">{sub}</span>
    </button>
  );
  const patrons = k.patreon.activeLinked + k.patreon.activeUnlinked;
  const versionsTotal = k.appVersions.reduce((a, r) => a + r.users, 0) || 1;
  return (
    <div className="admStack">
      <div className="admKpis">
        {tile(t("admin.kpi.users"), k.users.total, t("admin.kpi.usersSub", { n7: f.num(k.users.new7), n30: f.num(k.users.new30) }), () =>
          showUsers({ sort: "created_at" }),
        )}
        {tile(t("admin.kpi.active"), k.users.active7, t("admin.kpi.activeSub", { n: f.num(k.users.active30) }), () => showUsers({ active: "7" }))}
        {tile(
          t("admin.kpi.trials"),
          k.trials.active,
          t("admin.kpi.trialsSub", { ended: f.num(k.trials.ended), ineligible: f.num(k.trials.ineligible) }),
          () => showUsers({ access: "trial" }),
        )}
        {tile(
          t("admin.kpi.patrons"),
          patrons,
          k.patreon.activeUnlinked ? t("admin.kpi.patronsUnlinked", { n: f.num(k.patreon.activeUnlinked) }) : t("admin.kpi.patronsAllLinked"),
          () => open({ tab: "patreon" }),
        )}
        {tile(t("admin.kpi.bans"), k.bansActive, k.bansActive ? t("admin.kpi.bansSub") : t("admin.kpi.bansNone"), () => showUsers({ banned: "1" }))}
      </div>

      <div className="admGrid2">
        <Panel title={t("admin.fights.title")}>
          <div className="admFightNums">
            <div>
              <b className="mono">{f.num(k.fights.last30)}</b>
              <span className="admSub">{t("admin.fights.last30")}</span>
            </div>
            <div>
              <b className="mono">{f.num(k.fights.total)}</b>
              <span className="admSub">{t("admin.fights.total")}</span>
            </div>
            <div>
              <b className="mono">{f.num(k.fights.public)}</b>
              <span className="admSub">{t("admin.fights.public")}</span>
            </div>
          </div>
          <Bars t={t} lang={lang} data={k.fights.perDay} />
        </Panel>
        <Panel
          title={`${t("admin.expiring.title")} (${f.num(k.expiring.length)})`}
          aside={
            k.expiring.length > 0 && (
              <button type="button" className="linkBtn" onClick={() => showUsers({ expiring: "7" })}>
                {t("admin.expiring.seeUsers")}
              </button>
            )
          }
        >
          {k.expiring.length ? (
            <ul className="admList admScroll">
              {k.expiring.map((e, i) => (
                <li key={i}>
                  <div className="admListMain">
                    {e.user ? (
                      <PersonLink t={t} p={{ id: e.user.id, name: e.user.name ?? `#${e.user.id}` }} open={open} />
                    ) : (
                      <span>
                        {t("admin.expiring.unlinked")} <span className="mono admMuted">{e.patreonUserId}</span>
                      </span>
                    )}
                    <span className="admSub">{t(`admin.expiring.${e.kind}`)}</span>
                  </div>
                  <div className="admListEnd">
                    <When iso={e.at} lang={lang} />
                    <span className="admSub">{f.dateTime(e.at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<CalendarCheckIcon aria-hidden="true" />} title={t("admin.expiring.none")} text={t("admin.expiring.noneText")} />
          )}
        </Panel>
      </div>

      <div className="admGrid3">
        <Panel title={t("admin.versions.title")}>
          <Ranked
            t={t}
            rows={k.appVersions.map((r) => ({
              key: r.version,
              label: <span className="mono">{r.version}</span>,
              value: r.users,
              text: t("admin.versions.row", { n: f.num(r.users), pct: Math.round((r.users / versionsTotal) * 100) }),
            }))}
            empty={t("admin.versions.empty")}
          />
        </Panel>
        <Panel title={t("admin.classes.title")}>
          <Ranked
            t={t}
            rows={k.classes.map((r) => ({
              key: r.cls ?? "?",
              label: (
                <>
                  <ClassAvatar cls={r.cls ?? undefined} size={20} />
                  {r.cls ?? t("admin.unknown")}
                </>
              ),
              value: r.characters,
              text: t("admin.classes.row", { chars: f.num(r.characters), logs: f.num(r.logs) }),
            }))}
            empty={t("admin.classes.empty")}
          />
        </Panel>
        <Panel
          title={t("admin.recent.title")}
          aside={
            <button type="button" className="linkBtn" onClick={() => open({ tab: "audit" })}>
              {t("admin.recent.all")}
            </button>
          }
        >
          {k.recentAudit.length ? (
            <ul className="admList">
              {k.recentAudit.slice(0, 8).map((e) => (
                <li key={e.id}>
                  <div className="admListMain">
                    <ActionLabel t={t} a={e.action} />
                    <span className="admSub">
                      {e.admin?.name ?? "-"}
                      {e.target && ` → ${e.target.name ?? `#${e.target.id}`}`}
                    </span>
                  </div>
                  <div className="admListEnd">
                    <When iso={e.createdAt} lang={lang} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<ScrollIcon aria-hidden="true" />} title={t("admin.audit.empty")} />
          )}
        </Panel>
      </div>
    </div>
  );
}

/** Fights per day: one bar per day (hover for the value), the same numbers as a table below. */
function Bars({ t, lang, data }: { t: Ctx["t"]; lang: string; data: { day: string; n: number }[] }) {
  const f = formats(lang);
  const day = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", timeZone: "UTC" });
  const label = (d: string) => day.format(new Date(`${d}T00:00:00Z`));
  const max = Math.max(0, ...data.map((d) => d.n));
  return (
    <div>
      <div className="admBarsWrap">
        <span className="admBarsMax mono">{f.num(max)}</span>
        <div className="admBars" aria-hidden="true">
          {data.map((d) => (
            <span key={d.day} title={`${label(d.day)}: ${f.num(d.n)}`}>
              <i style={{ height: max ? `${(d.n / max) * 100}%` : 0 }} />
            </span>
          ))}
        </div>
      </div>
      {data.length > 0 && (
        <div className="admBarsAxis admSub">
          <span>{label(data[0].day)}</span>
          <span>{t("admin.today")}</span>
        </div>
      )}
      {!max && <p className="admSub">{t("admin.fights.none")}</p>}
      <details className="admDetails">
        <summary>{t("admin.fights.asTable")}</summary>
        <table className="admTable">
          <thead>
            <tr>
              <th>{t("admin.col.day")}</th>
              <th className="r">{t("admin.col.fights")}</th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((d) => (
              <tr key={d.day}>
                <td>{label(d.day)}</td>
                <td className="num">{f.num(d.n)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function Ranked({ t, rows, empty }: { t: Ctx["t"]; rows: { key: string; label: ReactNode; value: number; text: string }[]; empty: string }) {
  if (!rows.length) return <EmptyState icon={<ChartBarIcon aria-hidden="true" />} title={t("admin.noData")} text={empty} />;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="admRanked">
      {rows.map((r) => (
        <div key={r.key}>
          <span className="admRankedLabel">{r.label}</span>
          <span className="admSub">{r.text}</span>
          <span className="admMeter" aria-hidden="true">
            <i style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------- users ----------
const ROLE = ["admin", "developer", "debugger", "player", "recluta", "daeva", "empyrean"];
const ACCESS = ["trial", "trial_ended", "no_trial", "ineligible", "grant", "patreon"];
const SORTABLE = { name: "asc", last_seen_at: "desc", created_at: "desc", logs: "desc" } as Record<string, string>;
type UserList = { page: number; pageSize: number; total: number; users: UserRow[] };

function Users({ x, filters: st, setFilters }: { x: Ctx; filters: Filters; setFilters: (f: Filters) => void }) {
  const { t, lang, api, open } = x;
  const [q, setQ] = useState(st.q);
  const set = (patch: Partial<Filters>) => setFilters({ ...st, page: 1, ...patch });
  useEffect(() => {
    if (q.trim() === st.q) return;
    const h = setTimeout(() => set({ q: q.trim() }), 300);
    return () => clearTimeout(h);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const qs = query(
    Object.entries(st)
      .filter(([k, v]) => v && !(k === "sort" && v === "last_seen_at") && !(k === "dir" && v === "desc") && !(k === "page" && v === 1))
      .map(([k, v]) => [k, String(v)]),
  );
  const list = useLoad(() => api<UserList>("GET", `/users?${qs}`), [qs]);
  const filtered = !!(st.q || st.role || st.access || st.banned || st.active || st.expiring);
  const reset = () => {
    setQ("");
    setFilters({ ...NO_FILTERS, sort: st.sort, dir: st.dir });
  };
  const f = formats(lang);

  const select = (key: "role" | "access" | "banned" | "active", label: string, options: [string, string][]) => (
    <label className="field">
      {label}
      <select className="input" value={st[key]} onChange={(e) => set({ [key]: e.target.value })}>
        <option value="">{t("admin.all")}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
  const th = (label: string, key?: string, cls?: string) => {
    if (!key) return <th className={cls}>{label}</th>;
    const on = st.sort === key;
    return (
      <th className={cls} aria-sort={on ? (st.dir === "asc" ? "ascending" : "descending") : undefined}>
        <button type="button" className="admSort" onClick={() => set({ sort: key, dir: on ? (st.dir === "asc" ? "desc" : "asc") : SORTABLE[key] })}>
          {label}
          {on ? st.dir === "asc" ? <ArrowUpIcon aria-hidden="true" /> : <ArrowDownIcon aria-hidden="true" /> : <ArrowsDownUpIcon aria-hidden="true" />}
        </button>
      </th>
    );
  };

  return (
    <div className="admStack">
      <div className="admToolbar" role="search">
        <label className="field admGrow">
          {t("admin.users.search")}
          <span className="admSearch">
            <MagnifyingGlassIcon aria-hidden="true" />
            <input className="input" type="search" maxLength={64} autoComplete="off" placeholder={t("admin.users.searchHint")} value={q} onChange={(e) => setQ(e.target.value)} />
          </span>
        </label>
        {select("role", t("admin.users.role"), ROLE.map((r) => [r, rankName(r)]))}
        {select("access", t("admin.users.access"), ACCESS.map((a) => [a, t(`admin.filter.${a}`)]))}
        {select("banned", "Ban", [["1", t("admin.filter.banned")], ["0", t("admin.filter.notBanned")]])}
        {select("active", t("admin.users.active"), [["7", t("admin.filter.days", { n: 7 })], ["30", t("admin.filter.days", { n: 30 })]])}
        <label className="check admCheck">
          <input type="checkbox" checked={st.expiring === "7"} onChange={(e) => set({ expiring: e.target.checked ? "7" : "" })} />
          {t("admin.users.expiring")}
        </label>
        {filtered && (
          <button type="button" className="btn" onClick={reset}>
            <XIcon aria-hidden="true" />
            {t("admin.users.reset")}
          </button>
        )}
      </div>

      <section className="card admPanel" aria-label={t("admin.tab.users")} aria-busy={list.busy}>
        {list.error ? (
          <LoadError t={t} e={list.error} retry={list.reload} />
        ) : !list.data ? (
          <Skeleton rows={8} />
        ) : !list.data.users.length ? (
          <EmptyState
            icon={<UsersIcon aria-hidden="true" />}
            title={filtered ? t("admin.users.noneFiltered") : t("admin.users.none")}
            text={filtered ? t("admin.users.noneFilteredText") : undefined}
          >
            {filtered && (
              <button type="button" className="btn" onClick={reset}>
                {t("admin.users.reset")}
              </button>
            )}
          </EmptyState>
        ) : (
          <>
            <div className={list.busy ? "admTableWrap admDim" : "admTableWrap"}>
              <table className="admTable admRows">
                <thead>
                  <tr>
                    {th(t("admin.col.user"), "name")}
                    {th(t("admin.users.role"))}
                    {th(t("admin.users.access"))}
                    {th("Patreon")}
                    {th("App")}
                    {th(t("admin.col.lastSeen"), "last_seen_at")}
                    {th(t("admin.col.created"), "created_at")}
                    {th("Log", "logs", "r")}
                  </tr>
                </thead>
                <tbody>
                  {list.data.users.map((u) => (
                    // The whole row opens the account; the name button is the keyboard path.
                    <tr key={u.id} onClick={(e) => !(e.target as HTMLElement).closest("button") && !getSelection()?.toString() && open({ tab: "user", id: u.id })}>
                      <td>
                        <div className="admUserCell">
                          <ProfileAvatar size={28} src={u.avatarUrl ?? undefined} name={u.name} />
                          <div>
                            <button type="button" className="linkBtn admLink" onClick={() => open({ tab: "user", id: u.id })}>
                              {u.name}
                            </button>
                            <div className="admSub mono">#{u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <RoleBadges t={t} lang={lang} u={u} />
                      </td>
                      <td>
                        <AccessCell t={t} lang={lang} a={u.access} />
                      </td>
                      <td>
                        {!u.patreon.status && u.patreon.tier === "free" ? (
                          <span className="admMuted">-</span>
                        ) : (
                          <>
                            <div>{u.patreon.tier === "free" ? "Free" : tierName(t, u.patreon.tier)}</div>
                            <div className="admSub">
                              {statusName(t, u.patreon.status)}
                              {u.patreon.nextChargeAt && `, ${t("admin.charge", { date: f.date(u.patreon.nextChargeAt) })}`}
                            </div>
                          </>
                        )}
                      </td>
                      <td className="mono">{u.appVersion ?? <span className="admMuted">-</span>}</td>
                      <td>
                        <When iso={u.lastSeenAt} lang={lang} />
                      </td>
                      <td>
                        <When iso={u.createdAt} lang={lang} />
                      </td>
                      <td className="num">{f.num(u.logs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager t={t} lang={lang} page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} shown={list.data.users.length} go={(page) => setFilters({ ...st, page })} />
          </>
        )}
      </section>
    </div>
  );
}

// ---------- patreon ----------
type Member = {
  patreonUserId: string;
  tier: string;
  status: string | null;
  lastChargeAt: string | null;
  nextChargeAt: string | null;
  cadence: number | null;
  firstPaidAt: string | null;
  updatedAt: string | null;
  user: { id: string; name: string; discordId: string; linkedAt: string } | null;
};
const MEMBER_FILTERS: [string, (m: Member) => boolean][] = [
  ["all", () => true],
  ["active", (m) => m.status === "active_patron"],
  ["declined", (m) => m.status === "declined_patron"],
  ["former", (m) => m.status === "former_patron"],
  ["unlinked", (m) => !m.user],
];

function Patreon({ x }: { x: Ctx }) {
  const { t, lang, api, open } = x;
  const list = useLoad(() => api<{ members: Member[] }>("GET", "/patreon"), []);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const f = formats(lang);
  if (list.error) return <section className="card"><LoadError t={t} e={list.error} retry={list.reload} /></section>;
  if (!list.data) return <Skeleton rows={6} />;
  const members = list.data.members;
  if (!members.length) {
    return (
      <section className="card">
        <EmptyState icon={<UsersIcon aria-hidden="true" />} title={t("admin.patreon.none")} text={t("admin.patreon.noneText")} />
      </section>
    );
  }
  const term = q.trim().toLowerCase();
  const rows = members
    .filter(MEMBER_FILTERS.find(([k]) => k === filter)![1])
    .filter((m) => !term || [m.user?.name, m.user?.discordId, m.patreonUserId].some((v) => v?.toLowerCase().includes(term)));
  return (
    <div className="admStack">
      <div className="admToolbar">
        <label className="field admGrow">
          {t("admin.users.search")}
          <span className="admSearch">
            <MagnifyingGlassIcon aria-hidden="true" />
            <input className="input" type="search" autoComplete="off" placeholder={t("admin.patreon.searchHint")} value={q} onChange={(e) => setQ(e.target.value)} />
          </span>
        </label>
        <div className="admChips" role="group" aria-label={t("admin.patreon.filter")}>
          {MEMBER_FILTERS.map(([k, fn]) => (
            <button key={k} type="button" className="chChip" aria-pressed={filter === k} onClick={() => setFilter(k)}>
              {t(`admin.patreon.f.${k}`)} <span className="mono admMuted">{members.filter(fn).length}</span>
            </button>
          ))}
        </div>
      </div>
      <section className="card admPanel" aria-label="Patreon">
        {rows.length ? (
          <div className="admTableWrap">
            <table className="admTable">
              <thead>
                <tr>
                  <th>{t("admin.col.member")}</th>
                  <th>Tier</th>
                  <th>{t("admin.col.status")}</th>
                  <th>{t("admin.col.lastCharge")}</th>
                  <th>{t("admin.col.nextCharge")}</th>
                  <th>{t("admin.col.firstPaid")}</th>
                  <th>{t("admin.col.updated")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.patreonUserId}>
                    <td className="admWide">
                      {m.user ? (
                        <PersonLink t={t} p={m.user} open={open} />
                      ) : (
                        <span>{t("admin.patreon.notLinked")}</span>
                      )}
                      <div className="admSub">
                        Patreon <span className="mono">{m.patreonUserId}</span>
                        {m.user && `, ${t("admin.patreon.linkedOn", { date: f.date(m.user.linkedAt) })}`}
                      </div>
                    </td>
                    <td>{m.tier === "free" ? <span className="admMuted">Free</span> : <span className="badge admBadgePlan">{tierName(t, m.tier)}</span>}</td>
                    <td>
                      <span className={m.status === "active_patron" ? "badge admBadgeOk" : m.status === "declined_patron" ? "badge admBadgeWarn" : "badge"}>{statusName(t, m.status)}</span>
                    </td>
                    <td>{f.date(m.lastChargeAt)}</td>
                    <td>
                      {m.nextChargeAt ? (
                        <>
                          <When iso={m.nextChargeAt} lang={lang} />
                          <div className="admSub">
                            {f.date(m.nextChargeAt)}
                            {m.cadence ? `, ${cadenceName(t, m.cadence)}` : ""}
                          </div>
                        </>
                      ) : (
                        <span className="admMuted">-</span>
                      )}
                    </td>
                    <td>{f.date(m.firstPaidAt)}</td>
                    <td>
                      <When iso={m.updatedAt} lang={lang} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<MagnifyingGlassIcon aria-hidden="true" />} title={t("admin.noResults")} text={t("admin.patreon.noResults")} />
        )}
      </section>
    </div>
  );
}

// ---------- audit ----------
type AuditPage = { page: number; pageSize: number; total: number; entries: AuditEntry[] };

function Audit({ x, initialTarget }: { x: Ctx; initialTarget: string }) {
  const { t, lang, api, open } = x;
  const [input, setInput] = useState(initialTarget);
  const [target, setTarget] = useState(initialTarget);
  const [page, setPage] = useState(1);
  const qs = `page=${page}${target ? `&target=${target}` : ""}`;
  const list = useLoad(() => api<AuditPage>("GET", `/audit?${qs}`), [qs]);
  const invalid = input.trim() !== "" && !/^\d{1,19}$/.test(input.trim());
  const apply = (v: string) => {
    setInput(v);
    setTarget(v);
    setPage(1);
  };
  const name = list.data?.entries.find((e) => e.target?.id === target)?.target?.name;
  return (
    <div className="admStack">
      <form
        className="admToolbar"
        onSubmit={(e) => {
          e.preventDefault();
          if (!invalid) apply(input.trim());
        }}
      >
        <label className="field">
          {t("admin.audit.filter")}
          <input className="input mono" inputMode="numeric" autoComplete="off" placeholder="1096" value={input} aria-invalid={invalid} onChange={(e) => setInput(e.target.value)} />
          <span className="admHint">{t("admin.audit.filterHint")}</span>
        </label>
        <button type="submit" className="btn fill" disabled={invalid}>
          {t("admin.audit.apply")}
        </button>
        {target && (
          <button type="button" className="btn" onClick={() => apply("")}>
            <XIcon aria-hidden="true" />
            {t("admin.all")}
          </button>
        )}
      </form>
      <section className="card admPanel" aria-label={t("admin.tab.audit")} aria-busy={list.busy}>
        {target && (
          <div className="cardHead">
            <h2 className="kicker">
              {t("admin.audit.on")} <PersonLink t={t} p={{ id: target, name: name ?? `#${target}` }} open={open} />
            </h2>
          </div>
        )}
        {list.error ? (
          <LoadError t={t} e={list.error} retry={list.reload} />
        ) : !list.data ? (
          <Skeleton rows={6} />
        ) : list.data.entries.length ? (
          <div className={list.busy ? "admDim" : undefined}>
            <AuditTable x={x} entries={list.data.entries} />
            <Pager t={t} lang={lang} page={list.data.page} pageSize={list.data.pageSize} total={list.data.total} shown={list.data.entries.length} go={setPage} />
          </div>
        ) : (
          <EmptyState icon={<ScrollIcon aria-hidden="true" />} title={t("admin.audit.empty")} text={target ? t("admin.audit.emptyTarget") : undefined} />
        )}
      </section>
    </div>
  );
}
