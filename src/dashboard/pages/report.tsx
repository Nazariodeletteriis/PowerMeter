import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import {
  ArrowsLeftRightIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ColumnsIcon,
  ExportIcon,
  ShareNetworkIcon,
  SwordIcon,
  WarningOctagonIcon,
} from "@phosphor-icons/react";
import { fmt } from "../ui";
import { invoke } from "@tauri-apps/api/core";
import { usePoll } from "../usePoll";
import { ab, Av, Chart, classColor, clock, fightParty, fightSeries, getFights, pc, REPORT_FIGHT_KEY, uploadedUrl, useFight, type FightRecord, type FightRow, type FightSummary, type Skill } from "./combat/parts";
import { SkillIcon } from "../skills";
import { ShareModal } from "./shared/ShareModal";
import type { PageProps } from "./types";

// The latest saved fight; its attempts are the saved fights on the same boss, oldest first.
const TABS = ["overview", "skill", "tl", "taken", "heal"] as const;
type Tab = (typeof TABS)[number];
const OVERVIEW_COLS = "30px minmax(160px,1fr) 90px minmax(200px,1.4fr) 70px 64px";
const SKILL_COLS = "minmax(220px,1.6fr) repeat(12,minmax(58px,1fr))";
// Sort keys; labels are combat.col.<key>, tooltips combat.tip.<key>.
const SKILL_HEAD: (keyof Skill)[] = ["n", "dmg", "pct", "hits", "crit", "min", "max", "avg", "back", "parry", "perfect", "double", "multi"];

export default function Report(props: PageProps) {
  const { t, setHeader, onError } = props;
  const fights = usePoll(getFights, 10000);
  const [pick, setPick] = useState(() => {
    const id = sessionStorage.getItem(REPORT_FIGHT_KEY) ?? undefined;
    sessionStorage.removeItem(REPORT_FIGHT_KEY);
    return id;
  });
  const all = fights.data ?? [];
  const cur = all.find((f) => f.id === pick) ?? all[0];
  const attempts = cur ? all.filter((f) => f.bossName === cur.bossName).reverse() : [];
  const att = attempts.findIndex((f) => f.id === cur?.id);
  const rec = useFight(cur?.id, onError);
  const crumb = cur ? `${cur.bossName || "—"} → ${t("shell.attempt", { n: att + 1 })}` : undefined;
  useEffect(() => setHeader(cur ? { title: cur.bossName || "—", crumb } : {}), [setHeader, cur?.bossName, crumb]);

  if (fights.error)
    return (
      <section className="card cbState" style={{ maxWidth: 544 }} role="alert">
        <WarningOctagonIcon aria-hidden="true" style={{ color: "var(--pm-err)" }} />
        <div style={{ fontSize: 15 }}>{t("combat.states.errorTitle")}</div>
        <div className="cbStateText">{fights.error}</div>
      </section>
    );
  if (fights.data && !cur)
    return (
      <section className="card cbState" style={{ maxWidth: 544 }}>
        <SwordIcon aria-hidden="true" style={{ color: "var(--pm-t3)" }} />
        <div style={{ fontSize: 15 }}>{t("combat.noFights")}</div>
        <div className="cbStateText">{t("home.emptyText")}</div>
      </section>
    );
  if (!rec) return <div className="skeleton" style={{ height: 260 }} />;
  return <FightView key={rec.id} {...props} rec={rec} attempts={attempts} att={att} onPick={setPick} />;
}

function FightView({ t, lang, run, onError, name, rec, attempts, att, onPick }: PageProps & { rec: FightRecord; attempts: FightSummary[]; att: number; onPick: (id: string) => void }) {
  const dur = rec.durationMs / 1000;
  const [cmp, setCmp] = useState<string | null>(null);
  const other = useFight(cmp ?? undefined, onError);
  const [sel, setSel] = useState<number>();
  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useState<[number, number] | null>(null);
  const drag = useRef<number | null>(null);
  const [sort, setSort] = useState<[keyof Skill, number]>(["dmg", -1]);
  const [mine, setMine] = useState(true);
  const [share, setShare] = useState(false);

  const full = fightParty(rec, name);
  // Stats below the chart follow the dragged window; the whole fight when there is none.
  const win: [number, number] | null = range && Math.abs(range[1] - range[0]) >= 0.01 ? [Math.min(...range), Math.max(...range)] : null;
  const t0 = win ? win[0] * dur : 0;
  const secs = win ? (win[1] - win[0]) * dur : dur;
  const party = win ? fightParty(rec, name, [t0, t0 + secs]) : full;
  // Bars are on the whole fight's scale, so a short window reads shorter.
  const dmgMax = Math.max(1, ...full.map((r) => r.dmg));
  const p = party.find((r) => r.key === sel) ?? party.find((r) => r.me) ?? party[0];
  const skills = p ? [...p.skills].sort((a, b) => (a[sort[0]]! > b[sort[0]]! ? 1 : -1) * sort[1]) : [];
  // Timelines below zoom to the window: % position of second `s` in it, and its axis.
  const px = (s: number) => ((s - t0) / secs) * 100;
  const ticks = [0, 1, 2, 3, 4, 5].map((k) => clock(t0 + (k * secs) / 5));
  const date = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(rec.startTimeMs);
  const others = attempts.filter((_, k) => k !== att);
  const nOf = (id: string) => attempts.findIndex((f) => f.id === id) + 1;

  // Taken and healing have no timestamps: they are always the whole fight.
  const heals = new Map<number, { v: number; top: string; topV: number }>();
  for (const s of rec.details.healSkills ?? []) {
    const h = heals.get(s.actorId) ?? { v: 0, top: "", topV: 0 };
    heals.set(s.actorId, { v: h.v + s.dmg, ...(s.dmg > h.topV ? { top: s.name, topV: s.dmg } : { top: h.top, topV: h.topV }) });
  }
  const list = (k: "taken" | "heal") =>
    rec.actors
      .map((a) => (k === "taken" ? { a: a.nickname, b: `${t("combat.col.hits")} ${fmt(a.hitsReceived, lang)}`, v: a.damageReceived } : { a: a.nickname, b: heals.get(a.actorId)?.top ?? "", v: heals.get(a.actorId)?.v ?? 0 }))
      .filter((r) => r.v > 0)
      .sort((x, y) => y.v - x.v);

  // The same file Storico's Export writes (an array of fight records), so Storico → Upload → From file takes it.
  const exportJson = () => {
    const file = `powermeter-${(rec.bossName || "fight").toLowerCase().replace(/\W+/g, "-")}-attempt-${att + 1}.json`;
    run(() => invoke("save_to_downloads", { name: file, contents: JSON.stringify([rec], null, 2) }));
  };

  const pos = (e: MouseEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - b.left) / b.width));
  };
  const endDrag = () => {
    drag.current = null;
    if (range && Math.abs(range[1] - range[0]) < 0.01) setRange(null);
  };
  const at = (f: number) => clock(f * dur);
  const outline = { height: 30, padding: "0 12px" };
  const noData = <div style={{ padding: "12px 8px", fontSize: 12, color: "var(--pm-t3)" }}>{t("combat.noData")}</div>;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "-6px 0 14px", flexWrap: "wrap" }}>
        {[-1, 0, 1].map((d) => {
          if (!d)
            return (
              <span key={d} style={{ fontSize: 12, color: "var(--pm-t2)" }}>
                {t("combat.attemptOf", { total: attempts.length })
                  .split("{n}")
                  .flatMap((part, k) => (k ? [<b key={k} style={{ color: "var(--pm-t1)", fontWeight: 500 }}>{att + 1}</b>, part] : [part]))}
              </span>
            );
          const next = attempts[att + d];
          const label = t(d < 0 ? "combat.prevAttempt" : "combat.nextAttempt");
          return (
            <button
              key={d}
              type="button"
              className="btn"
              disabled={!next}
              title={label}
              aria-label={label}
              onClick={() => next && onPick(next.id)}
              style={{ width: 30, height: 30, padding: 0, ...(!next ? { color: "var(--pm-t3)", opacity: 0.45, cursor: "default" } : {}) }}
            >
              {d < 0 ? <CaretLeftIcon aria-hidden="true" /> : <CaretRightIcon aria-hidden="true" />}
            </button>
          );
        })}
        <span style={{ fontSize: 12, color: "var(--pm-t2)" }}>
          {t("combat.duration")}{" "}
          <span className="mono" style={{ color: "var(--pm-t1)" }}>
            {clock(dur)}
          </span>{" "}
          · {date}
        </span>
        <div style={{ display: "flex", gap: 3, marginLeft: 4 }}>
          {full.map((q) => (
            <span key={q.key} title={`${q.n} · ${q.cls}`} style={{ display: "flex" }}>
              <Av cls={q.cls} size={22} radius={5} font={8} />
            </span>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn fill" style={outline} onClick={() => setShare(true)}>
          <ShareNetworkIcon aria-hidden="true" />
          {t("combat.share")}
        </button>
        <button
          type="button"
          className="btn"
          style={outline}
          disabled={!others.length}
          aria-pressed={cmp != null}
          onClick={() => setCmp(cmp == null ? (attempts[att - 1] ?? attempts[att + 1]).id : null)}
        >
          <ColumnsIcon aria-hidden="true" />
          {t("combat.compare")}
        </button>
        <button type="button" className="btn" style={outline} onClick={exportJson}>
          <ExportIcon aria-hidden="true" />
          {t("combat.export")}
        </button>
      </div>

      {cmp != null && (
        <Compare t={t} lang={lang} a={full} aDur={dur} aN={att + 1} b={other && fightParty(other, name)} bDur={other ? other.durationMs / 1000 : 0} bId={cmp} bN={nOf(cmp)} options={others.map((f) => [f.id, t("shell.attempt", { n: nOf(f.id) })])} onPick={setCmp} />
      )}

      <section className="card" style={{ padding: "14px 16px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <h2 className="kicker">{t("combat.dpsOverTime")}</h2>
          <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t("combat.dragHint")}</span>
          <div style={{ flex: 1 }} />
          {range && (
            <>
              <span className="mono" style={{ fontSize: 12, color: "var(--pm-redt)" }}>
                {t("combat.range", { a: at(Math.min(...range)), b: at(Math.max(...range)) })}
              </span>
              <button
                type="button"
                onClick={() => setRange(null)}
                style={{ height: 24, padding: "0 8px", borderRadius: 5, border: "1px solid var(--pm-line)", background: "transparent", color: "var(--pm-t2)", cursor: "pointer", fontSize: 11 }}
              >
                {t("combat.clear")}
              </button>
            </>
          )}
        </div>
        <Chart
          lines={fightSeries(full, rec.durationMs)}
          sel={p?.key ?? -1}
          label={t("combat.dpsOverTime")}
          style={{ cursor: "crosshair", userSelect: "none" }}
          onMouseDown={(e) => {
            const f = pos(e);
            drag.current = f;
            setRange([f, f]);
          }}
          onMouseMove={(e) => drag.current != null && setRange([drag.current, pos(e)])}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          over={
            range && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${Math.min(...range) * 100}%`,
                  width: `${Math.abs(range[1] - range[0]) * 100}%`,
                  background: "var(--pm-tint)",
                  borderLeft: "1px solid var(--pm-red)",
                  borderRight: "1px solid var(--pm-red)",
                  pointerEvents: "none",
                }}
              />
            )
          }
        />
        <div className="cbTicks" style={{ marginTop: 6 }}>
          {[0, 1, 2, 3, 4, 5].map((k) => clock((k * dur) / 5)).map((x, k) => (
            <span key={k}>{x}</span>
          ))}
        </div>
      </section>

      <div className="cbTabs" role="tablist">
        {TABS.map((id) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {t(`combat.tab.${id}`)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="card" style={{ padding: "6px 8px", overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: OVERVIEW_COLS, gap: 10, padding: "8px 10px", fontSize: 11, color: "var(--pm-t3)", borderBottom: "1px solid var(--pm-line)", minWidth: 720 }}>
            <span />
            <span>{t("combat.col.player")}</span>
            <span style={{ textAlign: "right" }}>DPS</span>
            <span>{t("combat.col.totalDmg")}</span>
            <span style={{ textAlign: "right" }}>%</span>
            <span style={{ textAlign: "right" }}>{t("combat.col.hits")}</span>
          </div>
          {!party.length && noData}
          {party.map((q) => (
            <button
              key={q.key}
              type="button"
              aria-pressed={q.key === p?.key}
              className="cbPlain cbHover"
              onClick={() => setSel(q.key)}
              style={
                {
                  "--bg": q.key === p?.key ? "var(--pm-s3)" : q.me ? "var(--pm-tint)" : "transparent",
                  display: "grid",
                  gridTemplateColumns: OVERVIEW_COLS,
                  gap: 10,
                  alignItems: "center",
                  minHeight: 40,
                  padding: "0 10px",
                  borderBottom: "1px solid var(--pm-line)",
                  minWidth: 720,
                } as CSSProperties
              }
            >
              <Av cls={q.cls} size={26} font={9} />
              <div>
                <span style={{ fontWeight: 500, color: q.me ? "var(--pm-t1)" : "var(--pm-t2)" }}>{q.n}</span>{" "}
                <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{q.cls}</span>
              </div>
              <span className="num" style={{ fontWeight: 500 }}>
                {fmt(q.dps, lang)}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="cbTrack" style={{ flex: 1, height: 14, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(q.dmg / dmgMax) * 100}%`, background: classColor(q.cls), opacity: 0.85 }} />
                </div>
                <span className="num" style={{ fontSize: 12, width: 64 }}>
                  {ab(q.dmg, lang)}
                </span>
              </div>
              <span className="num" style={{ color: "var(--pm-t2)" }}>
                {pc(q.pct, lang)}
              </span>
              <span className="num" style={{ color: "var(--pm-t2)" }}>
                {q.hits}
              </span>
            </button>
          ))}
        </div>
      )}

      {tab === "skill" && p && (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {party.map((q) => (
              <button
                key={q.key}
                type="button"
                aria-pressed={q.key === p.key}
                onClick={() => setSel(q.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 30,
                  padding: "0 10px 0 4px",
                  borderRadius: 6,
                  border: "1px solid var(--pm-line)",
                  background: q.key === p.key ? "var(--pm-s3)" : q.me ? "var(--pm-tint)" : "transparent",
                  color: "var(--pm-t1)",
                  cursor: "pointer",
                }}
              >
                <Av cls={q.cls} size={22} radius={5} font={8} bare />
                {q.n}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr)", gap: 12, marginBottom: 12 }}>
            <StatCard
              title={p.n}
              rows={[
                [t("combat.col.dmg"), fmt(p.dmg, lang)],
                [t("combat.col.hits"), fmt(p.hits, lang)],
                ...(win
                  ? []
                  : ([
                      [t("combat.tab.taken"), fmt(p.actor.damageReceived, lang)],
                      [t("combat.tab.heal"), fmt(heals.get(p.key)?.v ?? 0, lang)],
                    ] as [string, string][])),
              ]}
            />
            <StatCard
              title={rec.bossName || "—"}
              rows={[
                [t("combat.col.dmg"), fmt(party.reduce((x, r) => x + r.dmg, 0), lang)],
                [t("combat.col.hits"), fmt(party.reduce((x, r) => x + r.hits, 0), lang)],
                [t("combat.duration"), clock(secs)],
              ]}
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 8 }}>
              {p.rates.map(([l, v]) => (
                <div
                  key={l}
                  className="card"
                  style={{ padding: "10px 6px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 4 }}
                >
                  <span style={{ fontSize: 10, letterSpacing: ".1em", color: "var(--pm-t3)" }}>{l}</span>
                  <span className="mono" style={{ fontSize: 16 }}>
                    {pc(v, lang)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: "6px 8px", overflowX: "auto" }}>
            <h2 style={{ padding: "8px 10px", fontWeight: 500 }}>{t("combat.skillVs", { target: rec.bossName || "—" })}</h2>
            <div style={{ display: "grid", gridTemplateColumns: SKILL_COLS, gap: 8, padding: "6px 10px", borderBottom: "1px solid var(--pm-line)", minWidth: 1100 }}>
              {SKILL_HEAD.map((k) => {
                const on = sort[0] === k;
                return (
                  <button
                    key={k}
                    type="button"
                    className="cbSort"
                    title={t(`combat.tip.${k}`)}
                    aria-sort={on ? (sort[1] < 0 ? "descending" : "ascending") : undefined}
                    onClick={() => setSort([k, on ? -sort[1] : -1])}
                    style={{ color: on ? "var(--pm-redt)" : "var(--pm-t3)", textAlign: k === "n" ? "left" : "right" }}
                  >
                    {t(`combat.col.${k}`)}
                    {on ? (sort[1] < 0 ? " ↓" : " ↑") : ""}
                  </button>
                );
              })}
            </div>
            {!skills.length && noData}
            {skills.map((s) => (
              <SkillRow key={s.j} lang={lang} s={s} />
            ))}
          </div>
        </>
      )}

      {tab === "tl" && p && (
        <section className="card" style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <h2 style={{ fontWeight: 500 }}>{t("combat.tab.tl")}</h2>
            <div style={{ flex: 1 }} />
            <button type="button" className="btn" style={{ height: 28, padding: "0 10px", fontSize: 12, gap: 4 }} onClick={() => setMine(!mine)}>
              <ArrowsLeftRightIcon aria-hidden="true" /> {mine ? t("combat.onlyMe") : "Party"}
            </button>
          </div>
          {(mine
            ? [...p.raw].sort((a, b) => b.dmg - a.dmg).slice(0, 7).map((s, j) => ({ id: `${j}`, n: s.name, col: classColor(p.cls), ts: s.hitTimestamps }))
            : full.map((q) => ({ id: `${q.key}`, n: q.n, col: classColor(q.cls), ts: q.raw.flatMap((s) => s.hitTimestamps) }))
          ).map((r) => {
            // One mark per 0.1% of the axis: a hit per mark would be thousands of nodes on a long fight.
            const marks = [...new Set(r.ts.map((x) => x / 1000).filter((x) => x >= t0 && x <= t0 + secs).map((x) => px(x).toFixed(1)))];
            return (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "180px minmax(0,1fr)", gap: 12, alignItems: "center", height: 30, borderBottom: "1px solid var(--pm-line)" }}>
                <span style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.n}</span>
                <div style={{ position: "relative", height: 16 }}>
                  {marks.map((x) => (
                    <span key={x} style={{ position: "absolute", left: `${x}%`, top: 0, width: 3, height: 16, borderRadius: 1, background: r.col }} />
                  ))}
                </div>
              </div>
            );
          })}
          <div style={{ display: "grid", gridTemplateColumns: "180px minmax(0,1fr)", gap: 12, marginTop: 6 }}>
            <span />
            <div className="cbTicks">
              {ticks.map((x, k) => (
                <span key={k}>{x}</span>
              ))}
            </div>
          </div>
        </section>
      )}

      {(tab === "taken" || tab === "heal") && (
        <>
          <div style={{ fontSize: 12, color: "var(--pm-t3)", marginBottom: 8 }}>{t(`combat.caption.${tab}`)}</div>
          {!list(tab).length && noData}
          {list(tab).map(({ a, b, v }, _, rows) => (
            <div
              key={a}
              style={{
                display: "grid",
                gridTemplateColumns: "220px minmax(0,1fr) 80px 110px",
                gap: 12,
                alignItems: "center",
                minHeight: 40,
                padding: "0 12px",
                background: "var(--pm-s1)",
                border: "1px solid var(--pm-line)",
                borderRadius: 6,
                marginBottom: 4,
              }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>{a}</div>
                <div style={{ fontSize: 11, color: "var(--pm-t3)" }}>{b}</div>
              </div>
              <div className="cbTrack" style={{ height: 8, borderRadius: 4 }}>
                <div style={{ height: "100%", width: `${(v / rows[0].v) * 100}%`, background: "var(--pm-red)", borderRadius: 4 }} />
              </div>
              <span className="num">{ab(v, lang)}</span>
              <span className="num" style={{ color: "var(--pm-t2)", fontSize: 12 }}>
                {fmt(v / Math.max(1, dur), lang)}
                {tab === "heal" ? " HPS" : "/s"}
              </span>
            </div>
          ))}
        </>
      )}

      {share && (
        <ShareModal
          t={t}
          lang={lang}
          kind="log"
          url={uploadedUrl(rec.id)}
          preview={[`${rec.bossName || "—"} · ${clock(dur)}`, ...full.slice(0, 3).map((q, k) => `${k + 1}. ${q.n} (${q.cls}) ${fmt(q.dps, lang)}`)]}
          onClose={() => setShare(false)}
          onError={onError}
        />
      )}
    </>
  );
}

/** This attempt (a) against another (b), whole fights: duration, party and per-player DPS (players matched by name), delta. */
function Compare({
  t,
  lang,
  a,
  aDur,
  aN,
  b,
  bDur,
  bId,
  bN,
  options,
  onPick,
}: {
  t: PageProps["t"];
  lang: string;
  a: FightRow[];
  aDur: number;
  aN: number;
  b?: FightRow[];
  bDur: number;
  bId: string;
  bN: number;
  options: [string, string][];
  onPick: (id: string) => void;
}) {
  const sum = (rs: FightRow[]) => rs.reduce((x, r) => x + r.dps, 0);
  const delta = (x: number, y?: number) => {
    if (!y) return <span style={{ color: "var(--pm-t3)" }}>—</span>;
    const d = ((x - y) / y) * 100;
    return <span style={{ color: Math.abs(d) < 0.05 ? "var(--pm-t3)" : d > 0 ? "#5FD99A" : "var(--pm-redt)" }}>{`${d > 0 ? "+" : ""}${pc(d, lang)}`}</span>;
  };
  const rows: [string, string, string, ReactNode][] = b
    ? [
        [t("combat.duration"), clock(aDur), clock(bDur), <span style={{ color: "var(--pm-t2)" }}>{`${aDur >= bDur ? "+" : "-"}${clock(Math.abs(aDur - bDur))}`}</span>],
        [t("combat.partyDps"), fmt(sum(a), lang), fmt(sum(b), lang), delta(sum(a), sum(b))],
        ...a.map((r): [string, string, string, ReactNode] => {
          const o = b.find((q) => q.n === r.n);
          return [`${r.n}${r.me ? ` ${t("combat.you")}` : ""}`, fmt(r.dps, lang), o ? fmt(o.dps, lang) : "—", delta(r.dps, o?.dps)];
        }),
      ]
    : [];
  const cols = "minmax(160px,1fr) 110px 110px 90px";
  return (
    <section className="card" style={{ padding: "12px 16px", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <h2 className="kicker">{t("combat.compare")}</h2>
        <select className="cbSelect" aria-label={t("combat.compareWith")} value={bId} onChange={(e) => onPick(e.target.value)}>
          {options.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 10, padding: "6px 0", fontSize: 11, color: "var(--pm-t3)", borderBottom: "1px solid var(--pm-line)" }}>
        <span />
        <span style={{ textAlign: "right" }}>{t("shell.attempt", { n: aN })}</span>
        <span style={{ textAlign: "right" }}>{t("shell.attempt", { n: bN })}</span>
        <span style={{ textAlign: "right" }}>Δ</span>
      </div>
      {!b && <div className="skeleton" style={{ height: 30, margin: "4px 0" }} />}
      {rows.map(([l, x, y, d]) => (
        <div key={l} style={{ display: "grid", gridTemplateColumns: cols, gap: 10, alignItems: "center", minHeight: 30, fontSize: 12, borderBottom: "1px solid var(--pm-line)" }}>
          <span style={{ color: "var(--pm-t2)" }}>{l}</span>
          <span className="num">{x}</span>
          <span className="num" style={{ color: "var(--pm-t2)" }}>
            {y}
          </span>
          <span className="num">{d}</span>
        </div>
      ))}
    </section>
  );
}

function StatCard({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <section className="card" style={{ padding: 14 }}>
      <h2 className="kicker" style={{ marginBottom: 8 }}>
        {title}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", fontSize: 12 }}>
        {rows.map(([l, v]) => (
          <div key={l} style={{ display: "contents" }}>
            <span style={{ color: "var(--pm-t2)" }}>{l}</span>
            <span className="num">{v}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SkillRow({ s, lang }: { s: Skill; lang: string }) {
  const t2 = { color: "var(--pm-t2)" };
  return (
    <div
      className="cbHover"
      style={
        {
          "--bg": "transparent",
          display: "grid",
          gridTemplateColumns: SKILL_COLS,
          gap: 8,
          alignItems: "center",
          minHeight: 36,
          padding: "0 10px",
          borderBottom: "1px solid var(--pm-line)",
          fontFamily: "var(--pm-mono)",
          fontSize: 12,
          textAlign: "right",
          minWidth: 1100,
        } as CSSProperties
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter,sans-serif", fontSize: 13, textAlign: "left", minWidth: 0 }}>
        <span style={{ width: 22, height: 22, borderRadius: 4, background: "var(--pm-s3)", display: "grid", placeItems: "center", fontSize: 9, color: "var(--pm-t2)", flex: "none" }}>
          <SkillIcon skill={s.sk} name={s.n} />
        </span>
        <span style={{ color: "var(--pm-t1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.n}</span>
      </div>
      <span>{fmt(s.dmg, lang)}</span>
      <span style={t2}>{pc(s.pct, lang)}</span>
      <span>{s.hits}</span>
      <span>{pc(s.crit, lang)}</span>
      <span style={t2}>{fmt(s.min, lang)}</span>
      <span style={t2}>{fmt(s.max, lang)}</span>
      <span>{fmt(s.avg, lang)}</span>
      <span style={t2}>{pc(s.back, lang)}</span>
      <span style={t2}>{pc(s.parry, lang)}</span>
      <span style={t2}>{pc(s.perfect, lang)}</span>
      <span style={t2}>{pc(s.double, lang)}</span>
      <span style={t2}>{s.multi ? pc(s.multi, lang) : "—"}</span>
    </div>
  );
}
