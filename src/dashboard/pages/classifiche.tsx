import { useEffect, useRef, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ArrowLeftIcon, ArrowSquareOutIcon, CaretRightIcon, TrophyIcon, WarningOctagonIcon } from "@phosphor-icons/react";
import { EmptyState, RELEASED_CLASSES, fmt } from "../ui";
import { Av, clock, getFights, isBoss } from "./combat/parts";
import "./combat/combat.css";
import type { PageProps } from "./types";

/** GET /api/rankings (PowerMeter-server) over the community's public boss logs. */
type Kind = "hit" | "time" | "party";
type Member = { name: string | null; cls: string; dps: number };
type Row = {
  rank: number;
  logId: string;
  url: string;
  boss: { mobCode: number; name: string | null };
  startedAt: string;
  region: "EU" | "NA" | null;
  // kind "hit"
  name?: string | null;
  cls?: string;
  hit?: number;
  skill?: string | null;
  // kind "time" / "party"
  durationMs?: number;
  partyDps?: number;
  party?: Member[];
};
type Page = { hasMore: boolean; rows: Row[] };
type Filters = { period: string; region: string; cls: string; boss: string; attempt: number };

const KINDS: Kind[] = ["hit", "time", "party"];
const PERIODS = ["week", "month", "season"] as const;
const REGIONS = ["EU", "NA"];
const PREVIEW = 10; // card: the leader + 9 more
const PAGE = 20; // detail view page size

/**
 * One leaderboard. Filters reset it to the first page; `more` appends the next one.
 * `cls` only reaches the server for "hit" (the contract rejects it elsewhere).
 */
function useRanking(kind: Kind, f: Filters, limit: number) {
  const [page, setPage] = useState<Page>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const gen = useRef(0);
  const cls = kind === "hit" ? f.cls : "";
  const args = (offset: number) => ({ kind, period: f.period, region: f.region || null, cls: cls || null, boss: f.boss ? Number(f.boss) : null, limit, offset });

  useEffect(() => {
    const id = ++gen.current;
    setPage(undefined);
    setError("");
    invoke<Page>("pm_rankings", args(0)).then(
      (p) => id === gen.current && setPage(p),
      (e) => id === gen.current && setError(String(e)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, f.period, f.region, cls, f.boss, f.attempt, limit]);

  const more = () => {
    if (!page || busy) return;
    const id = gen.current;
    setBusy(true);
    invoke<Page>("pm_rankings", args(page.rows.length))
      .then(
        (p) => id === gen.current && setPage({ hasMore: p.hasMore, rows: [...page.rows, ...p.rows] }),
        (e) => id === gen.current && setError(String(e)),
      )
      .finally(() => setBusy(false));
  };
  return { page, error, busy, more };
}

export default function Classifiche({ t, lang, run }: PageProps) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("week");
  const [region, setRegion] = useState("");
  const [cls, setCls] = useState("");
  const [picked, setPicked] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState<Kind>();
  // undefined while loading; `error` when the server is unreachable.
  const [bosses, setBosses] = useState<{ mobCode: number; name: string }[]>();
  const [bossesError, setBossesError] = useState("");
  // The boss of your latest boss fight in the local history; null when there is none.
  const [last, setLast] = useState<{ mobCode: number; name: string } | null>();

  // The boss list comes from the class stats aggregate.
  useEffect(() => {
    setBossesError("");
    invoke<{ bosses: { mobCode: number; name: string }[] }>("pm_class_stats", { boss: null, region: null, period: "all" }).then(
      (s) => setBosses(s.bosses),
      (e) => setBossesError(String(e)),
    );
  }, [attempt]);
  useEffect(() => {
    getFights().then(
      (fs) => {
        const b = fs.find((x) => isBoss(x) && x.mobCode);
        setLast(b ? { mobCode: b.mobCode, name: b.bossName } : null);
      },
      () => setLast(null),
    );
  }, []);

  // Always one boss: the picked one, else your latest, else the first on the server.
  const boss = picked || (last === undefined ? "" : String(last?.mobCode ?? bosses?.[0]?.mobCode ?? ""));
  const options = last && !bosses?.some((b) => b.mobCode === last.mobCode) ? [last, ...(bosses ?? [])] : (bosses ?? []);
  const bossName = options.find((b) => String(b.mobCode) === boss)?.name || `#${boss}`;
  const f: Filters = { period, region, cls, boss, attempt };
  const retry = () => setAttempt(attempt + 1);

  const openLog = (url: string) => run(() => invoke("open_url", { url }));
  const ctx: Ctx = { t, lang, openLog };
  const clsSelect = (
    <select className="cbSelect" aria-label={t("combat.col.class")} value={cls} onChange={(e) => setCls(e.target.value)} onClick={(e) => e.stopPropagation()}>
      <option value="">{t("combat.allClasses")}</option>
      {RELEASED_CLASSES.map((c) => (
        <option key={c}>{c}</option>
      ))}
    </select>
  );

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {open && (
          <button type="button" className="btn" onClick={() => setOpen(undefined)} style={{ marginRight: 4 }}>
            <ArrowLeftIcon aria-hidden="true" />
            {t("rankings.back")}
          </button>
        )}
        <div className="cbSeg" role="group" aria-label={t("combat.period")}>
          {PERIODS.map((p) => (
            <button key={p} type="button" aria-pressed={p === period} onClick={() => setPeriod(p)}>
              {t(`combat.${p}`)}
            </button>
          ))}
        </div>
        <select className="cbSelect" aria-label={t("combat.region")} value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">{t("combat.stats.allRegions")}</option>
          {REGIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select className="cbSelect" aria-label="Boss" value={boss} onChange={(e) => setPicked(e.target.value)} disabled={!boss}>
          {options.map((b) => (
            <option key={b.mobCode} value={b.mobCode}>
              {b.name}
            </option>
          ))}
        </select>
        {open === "hit" && clsSelect}
      </div>

      {boss ? (
        <>
          <h2 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2, marginBottom: 12 }}>{bossName}</h2>
          {open ? <Detail kind={open} f={f} ctx={ctx} retry={retry} /> : <Overview f={f} ctx={ctx} clsSelect={clsSelect} onOpen={setOpen} retry={retry} />}
        </>
      ) : bossesError ? (
        <ErrorState t={t} error={bossesError} retry={retry} />
      ) : bosses && last !== undefined ? (
        <EmptyState icon={<TrophyIcon aria-hidden="true" />} title={t("combat.rankEmptyTitle")} text={t("rankings.emptyText")} />
      ) : (
        <div className="skeleton" style={{ height: 260 }} />
      )}
    </>
  );
}

type Ctx = { t: PageProps["t"]; lang: string; openLog: (url: string) => void };

/** Three boards side by side: the leader on top, the rest of the preview below. */
function Overview({ f, ctx, clsSelect, onOpen, retry }: { f: Filters; ctx: Ctx; clsSelect: ReactNode; onOpen: (k: Kind) => void; retry: () => void }) {
  const boards = { hit: useRanking("hit", f, PREVIEW), time: useRanking("time", f, PREVIEW), party: useRanking("party", f, PREVIEW) };
  // Without the server every board fails the same way: one error state, not three.
  const error = KINDS.map((k) => boards[k].error).find(Boolean);
  if (error) return <ErrorState t={ctx.t} error={error} retry={retry} />;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, alignItems: "start" }}>
      {KINDS.map((kind) => {
        const rows = boards[kind].page?.rows;
        return (
          <section key={kind} className="card rkCard" onClick={() => onOpen(kind)} style={{ display: "flex", flexDirection: "column", gap: 12, padding: 0 }}>
            <div className="cardHead" style={{ padding: "14px 16px 0", alignItems: "center" }}>
              <h2 className="kicker">{ctx.t(`rankings.${kind}.title`)}</h2>
              {kind === "hit" && clsSelect}
            </div>
            {!rows ? (
              <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="skeleton" style={{ height: 108 }} />
                {[0, 1, 2].map((k) => (
                  <div key={k} className="skeleton" style={{ height: 30 }} />
                ))}
              </div>
            ) : !rows.length ? (
              <div style={{ padding: "0 16px 16px" }}>
                <EmptyState icon={<TrophyIcon aria-hidden="true" />} title={ctx.t("combat.rankEmptyTitle")} text={ctx.t("rankings.emptyText")} />
              </div>
            ) : (
              <>
                <Leader kind={kind} row={rows[0]} ctx={ctx} />
                {rows.length > 1 && (
                  <ol style={{ listStyle: "none", margin: 0, padding: "0 8px" }}>
                    {rows.slice(1).map((r) => (
                      <li key={r.logId} style={{ display: "grid", gridTemplateColumns: "28px minmax(0, 1fr) auto", gap: 8, alignItems: "center", minHeight: 34, padding: "0 8px", borderTop: "1px solid var(--pm-line)" }}>
                        <span className="mono" style={{ fontSize: 12, color: "var(--pm-t3)" }}>
                          {r.rank}
                        </span>
                        <Who kind={kind} row={r} ctx={ctx} compact />
                        <span className="num" style={{ fontSize: 12 }}>
                          {value(kind, r, ctx.lang)}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </>
            )}
            <button type="button" className="cbPlain rkMore" onClick={() => onOpen(kind)}>
              {ctx.t("rankings.full")}
              <CaretRightIcon aria-hidden="true" />
            </button>
          </section>
        );
      })}
    </div>
  );
}

/** The record holder: the value large, then who set it and where. */
function Leader({ kind, row, ctx }: { kind: Kind; row: Row; ctx: Ctx }) {
  return (
    <div style={{ margin: "0 16px", padding: 14, borderRadius: 8, background: "var(--pm-s2)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--pm-warn)" }}>
          <TrophyIcon aria-hidden="true" weight="fill" />#1
        </span>
        <span className="num" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1 }}>
          {value(kind, row, ctx.lang)}
        </span>
      </div>
      <Who kind={kind} row={row} ctx={ctx} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12, color: "var(--pm-t3)" }}>
        <span style={clip}>{meta(row, ctx)}</span>
        <LogButton row={row} ctx={ctx} />
      </div>
    </div>
  );
}

/** Hit: the player and the skill. Time / party: the party's classes (the boss is the page's). */
function Who({ kind, row, ctx, compact }: { kind: Kind; row: Row; ctx: Ctx; compact?: boolean }) {
  if (kind === "hit")
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <Av cls={row.cls ?? ""} size={compact ? 20 : 28} font={8} />
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ ...clip, fontSize: compact ? 12 : 13 }}>{row.name || ctx.t("rankings.anon")}</span>
          {!compact && <span style={{ ...clip, fontSize: 12, color: "var(--pm-t3)" }}>{row.skill || row.cls}</span>}
        </span>
      </span>
    );
  return <Party party={row.party ?? []} ctx={ctx} size={compact ? 16 : 22} />;
}

/** Party as class squares, strongest first; names live in the tooltip (and in the detail view). */
function Party({ party, ctx, size }: { party: Member[]; ctx: Ctx; size: number }) {
  return (
    <span style={{ display: "flex", gap: 3, flexWrap: "wrap" }} aria-label={party.map((m) => `${m.name || ctx.t("rankings.anon")} (${m.cls})`).join(", ")} role="img">
      {party.map((m, i) => (
        <span key={i} title={`${m.name || ctx.t("rankings.anon")} · ${m.cls} · ${fmt(m.dps, ctx.lang)} DPS`}>
          <Av cls={m.cls} size={size} radius={4} font={7} />
        </span>
      ))}
    </span>
  );
}

function LogButton({ row, ctx }: { row: Row; ctx: Ctx }) {
  return (
    <button
      type="button"
      className="btn sm"
      title={ctx.t("combat.openLog")}
      aria-label={ctx.t("combat.openLog")}
      onClick={(e) => {
        e.stopPropagation();
        ctx.openLog(row.url);
      }}
    >
      <ArrowSquareOutIcon aria-hidden="true" />
    </button>
  );
}

const clip = { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;
const value = (kind: Kind, r: Row, lang: string) => (kind === "hit" ? fmt(r.hit ?? 0, lang) : kind === "time" ? clock((r.durationMs ?? 0) / 1000) : fmt(r.partyDps ?? 0, lang));
const day = (iso: string, lang: string) => new Date(iso).toLocaleDateString(lang, { day: "2-digit", month: "2-digit", year: "numeric" });
const meta = (r: Row, ctx: Ctx) => [r.region, day(r.startedAt, ctx.lang)].filter(Boolean).join(" · ");

/** Full board (hall-of-champions style): every column, paged with "load more". */
function Detail({ kind, f, ctx, retry }: { kind: Kind; f: Filters; ctx: Ctx; retry: () => void }) {
  const { page, error, busy, more } = useRanking(kind, f, PAGE);
  const { t, lang } = ctx;
  if (error && !page) return <ErrorState t={t} error={error} retry={retry} />;

  const party = kind !== "hit";
  const cols = party ? "44px minmax(0, 2.4fr) 90px 110px 48px 96px 40px" : "44px minmax(0, 1.4fr) minmax(0, 1.2fr) 48px 96px 110px 40px";
  const head = party
    ? ["#", t("rankings.party"), t("combat.duration"), t("rankings.partyDps"), t("combat.region"), t("rankings.date"), ""]
    : ["#", t("rankings.player"), t("rankings.skill"), t("combat.region"), t("rankings.date"), t("rankings.hit.value"), ""];
  const right = party ? [2, 3] : [5];

  return (
    <section className="card" style={{ padding: "12px 8px" }}>
      <div className="cardHead" style={{ padding: "0 8px 10px" }}>
        <h2 style={{ fontSize: 15, fontWeight: 500 }}>{t(`rankings.${kind}.title`)}</h2>
      </div>
      <div role="table" aria-label={t(`rankings.${kind}.title`)}>
        <div role="row" style={{ display: "grid", gridTemplateColumns: cols, gap: 10, padding: "8px", fontSize: 11, color: "var(--pm-t3)", borderBottom: "1px solid var(--pm-line)" }}>
          {head.map((h, i) => (
            <span key={i} role="columnheader" style={{ textAlign: right.includes(i) ? "right" : undefined }}>
              {h}
            </span>
          ))}
        </div>
        {!page ? (
          [0, 1, 2, 3, 4].map((k) => <div key={k} className="skeleton" style={{ height: 40, margin: "6px 8px" }} />)
        ) : !page.rows.length ? (
          <div style={{ padding: 16 }}>
            <EmptyState icon={<TrophyIcon aria-hidden="true" />} title={t("combat.rankEmptyTitle")} text={t("rankings.emptyText")} />
          </div>
        ) : (
          page.rows.map((r) => (
            <div key={r.logId} role="row" style={{ display: "grid", gridTemplateColumns: cols, gap: 10, alignItems: "center", minHeight: 44, padding: "6px 8px", borderBottom: "1px solid var(--pm-line)" }}>
              <span role="cell" className="mono" style={{ fontSize: 12, color: r.rank === 1 ? "var(--pm-warn)" : "var(--pm-t3)" }}>
                {r.rank}
              </span>
              {party ? (
                <>
                  <span role="cell" style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px" }}>
                    {(r.party ?? []).map((m, i) => (
                      <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }} title={`${m.cls} · ${fmt(m.dps, lang)} DPS`}>
                        <Av cls={m.cls} size={18} radius={4} font={7} />
                        {m.name || t("rankings.anon")}
                      </span>
                    ))}
                  </span>
                  <span role="cell" className="num" style={{ fontWeight: kind === "time" ? 600 : undefined }}>
                    {clock((r.durationMs ?? 0) / 1000)}
                  </span>
                  <span role="cell" className="num" style={{ fontWeight: kind === "party" ? 600 : undefined }}>
                    {fmt(r.partyDps ?? 0, lang)}
                  </span>
                </>
              ) : (
                <>
                  <span role="cell" style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <Av cls={r.cls ?? ""} size={22} radius={4} font={8} />
                    <span style={clip} title={r.cls}>
                      {r.name || t("rankings.anon")}
                    </span>
                  </span>
                  <span role="cell" style={{ ...clip, color: "var(--pm-t2)" }}>
                    {r.skill || "-"}
                  </span>
                </>
              )}
              <span role="cell" style={{ fontSize: 12, color: "var(--pm-t2)" }}>
                {r.region ?? "-"}
              </span>
              <span role="cell" className="mono" style={{ fontSize: 12, color: "var(--pm-t2)" }}>
                {day(r.startedAt, lang)}
              </span>
              {!party && (
                <span role="cell" className="num" style={{ fontWeight: 600 }}>
                  {fmt(r.hit ?? 0, lang)}
                </span>
              )}
              <span role="cell" style={{ display: "flex", justifyContent: "flex-end" }}>
                <LogButton row={r} ctx={ctx} />
              </span>
            </div>
          ))
        )}
      </div>
      {error && (
        <div role="alert" style={{ padding: "10px 8px 0", fontSize: 12, color: "var(--pm-err)" }}>
          {error}
        </div>
      )}
      {page?.hasMore && (
        <div style={{ padding: "12px 8px 0", display: "flex", justifyContent: "center" }}>
          <button type="button" className="btn" disabled={busy} onClick={more}>
            {t("rankings.loadMore")}
          </button>
        </div>
      )}
    </section>
  );
}

function ErrorState({ t, error, retry }: { t: PageProps["t"]; error: string; retry: () => void }) {
  return (
    <section className="card cbState" style={{ maxWidth: 544 }} role="alert">
      <WarningOctagonIcon aria-hidden="true" style={{ color: "var(--pm-err)" }} />
      <div style={{ fontSize: 15 }}>{t("combat.states.errorTitle")}</div>
      <div className="cbStateText">{t("rankings.errorText")}</div>
      <div className="mono" style={{ fontSize: 11, color: "var(--pm-t3)" }}>
        {error}
      </div>
      <div>
        <button type="button" className="btn" onClick={retry}>
          {t("combat.retry")}
        </button>
      </div>
    </section>
  );
}
