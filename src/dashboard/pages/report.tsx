import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import {
  ArrowsLeftRightIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ColumnsIcon,
  ExportIcon,
  GlobeSimpleIcon,
  ShareNetworkIcon,
  SkullIcon,
} from "@phosphor-icons/react";
import { fmt } from "../ui";
import { BOSS, DUNGEON, BOSS_STATS, BUFFS, CLASS_SKILLS, DEATH, DURATION, FIGHT_DATE, PHASE, PLAYER_EXTRA, REPORT_LISTS, TL_PERIOD } from "../sample/combat";
import { ab, Av, Chart, classColor, clock, pc, rank, sampleBadges, sampleParty, samplePoints, sampleSeries, sampleSkills, type Row, type Skill } from "./combat/parts";
import { SkillIcon } from "../skills";
import { ShareModal } from "./shared/ShareModal";
import type { PageProps } from "./types";

// Every number on this page is the prototype's sample fight until online logs
// (R2) and the fight record viewer are wired to it.
const TABS = ["overview", "skill", "tl", "buff", "taken", "heal", "targets"] as const;
type Tab = (typeof TABS)[number];
const X_TICKS = ["0:00", "1:00", "2:00", "3:00", "4:00", "5:12"];
const OVERVIEW_COLS = "30px minmax(160px,1fr) 80px 90px minmax(200px,1.4fr) 70px 64px 56px";
const SKILL_COLS = "minmax(220px,1.6fr) repeat(12,minmax(58px,1fr))";
// Sort keys; labels are combat.col.<key>, tooltips combat.tip.<key>.
const SKILL_HEAD: (keyof Skill)[] = ["n", "dmg", "pct", "hits", "crit", "min", "max", "avg", "back", "parry", "perfect", "double", "multi"];

export default function Report({ t, lang, onError, setHeader }: PageProps) {
  // ponytail: the sample fight's; the fight record viewer will pass the real one.
  const crumb = `${DUNGEON} → ${BOSS} → ${t("shell.attempt", { n: 4 })}`;
  useEffect(() => setHeader({ title: BOSS, crumb }), [setHeader, crumb]);
  const [sel, setSel] = useState(0);
  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useState<[number, number] | null>(null);
  const drag = useRef<number | null>(null);
  const [sort, setSort] = useState<[keyof Skill, number]>(["dmg", -1]);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [mine, setMine] = useState(true);
  const [share, setShare] = useState(false);

  const full = sampleParty();
  // Stats below the chart follow the dragged window; the whole fight when there is none.
  const win: [number, number] | null = range && Math.abs(range[1] - range[0]) >= 0.01 ? [Math.min(...range), Math.max(...range)] : null;
  const party = win ? inWindow(full, win) : full;
  const t0 = win ? win[0] * DURATION : 0;
  const secs = win ? (win[1] - win[0]) * DURATION : DURATION;
  const tf = secs / DURATION;
  const p = party.find((r) => r.i === sel)!;
  const df = p.dmg / full.find((r) => r.i === sel)!.dmg;
  // dmg already follows the window (p); hits scale with it, so avg/min/max stay put.
  const skills = sampleSkills(p, ...sort).map((s) => ({ ...s, hits: Math.round(s.hits * df) }));
  // Timelines below zoom to the window: % position of second `s` in it, and its axis.
  const px = (s: number) => ((s - t0) / secs) * 100;
  const ticks = win ? [0, 1, 2, 3, 4, 5].map((k) => clock(t0 + (k * secs) / 5)) : X_TICKS;
  const date = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(FIGHT_DATE);

  const pos = (e: MouseEvent<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientX - b.left) / b.width));
  };
  const endDrag = () => {
    drag.current = null;
    if (range && Math.abs(range[1] - range[0]) < 0.01) setRange(null);
  };
  const at = (f: number) => clock(f * DURATION);
  const outline = { height: 30, padding: "0 12px" };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "-6px 0 14px", flexWrap: "wrap" }}>
        {/* ponytail: one sample attempt; attempts come with the fight record viewer. */}
        <button type="button" className="btn" title={t("combat.prevAttempt")} aria-label={t("combat.prevAttempt")} style={{ width: 30, height: 30, padding: 0 }}>
          <CaretLeftIcon aria-hidden="true" />
        </button>
        <span style={{ fontSize: 12, color: "var(--pm-t2)" }}>
          {t("combat.attemptOf", { total: 4 })
            .split("{n}")
            .flatMap((part, k) => (k ? [<b key={k} style={{ color: "var(--pm-t1)", fontWeight: 500 }}>4</b>, part] : [part]))}
        </span>
        <button
          type="button"
          className="btn"
          disabled
          title={t("combat.nextAttempt")}
          aria-label={t("combat.nextAttempt")}
          style={{ width: 30, height: 30, padding: 0, color: "var(--pm-t3)", opacity: 0.45, cursor: "default" }}
        >
          <CaretRightIcon aria-hidden="true" />
        </button>
        <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: "#3FBF7F22", color: "#5FD99A", border: "1px solid #3FBF7F55" }}>KILL</span>
        <span style={{ fontSize: 12, color: "var(--pm-t2)" }}>
          {t("combat.duration")}{" "}
          <span className="mono" style={{ color: "var(--pm-t1)" }}>
            {clock(DURATION)}
          </span>{" "}
          · {date} · EU · <GlobeSimpleIcon aria-hidden="true" style={{ verticalAlign: "-2px" }} /> {t("combat.vis.public")}
        </span>
        <div style={{ display: "flex", gap: 3, marginLeft: 4 }}>
          {party.map((q) => (
            <span key={q.n} title={`${q.n} · ${q.cls}`} style={{ display: "flex" }}>
              <Av cls={q.cls} size={22} radius={5} font={8} />
            </span>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn fill" style={outline} onClick={() => setShare(true)}>
          <ShareNetworkIcon aria-hidden="true" />
          {t("combat.share")}
        </button>
        <button type="button" className="btn" style={outline}>
          <ColumnsIcon aria-hidden="true" />
          {t("combat.compare")}
        </button>
        <button type="button" className="btn" style={outline}>
          <ExportIcon aria-hidden="true" />
          {t("combat.export")}
        </button>
      </div>

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
          lines={sampleSeries(full)}
          sel={sel}
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
        >
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(PHASE.from / 59) * 100}%`, width: `${((PHASE.to - PHASE.from) / 59) * 100}%`, background: "var(--pm-s3)" }}>
            <span style={{ position: "absolute", top: 4, left: 4, fontSize: 10, color: "var(--pm-t2)", whiteSpace: "nowrap" }}>
              {t("combat.phase", { n: 2 })} · {PHASE.name}
            </span>
          </div>
          <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(DEATH.at / 59) * 100}%`, borderLeft: "1px dashed var(--pm-red)" }}>
            <span style={{ position: "absolute", top: 18, left: 4, fontSize: 10, color: "var(--pm-redt)", whiteSpace: "nowrap" }}>
              <SkullIcon aria-hidden="true" style={{ verticalAlign: "-1px" }} /> {DEATH.name}
            </span>
          </div>
        </Chart>
        <div className="cbTicks" style={{ marginTop: 6 }}>
          {X_TICKS.map((x) => (
            <span key={x}>{x}</span>
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
          <div style={{ display: "grid", gridTemplateColumns: OVERVIEW_COLS, gap: 10, padding: "8px 10px", fontSize: 11, color: "var(--pm-t3)", borderBottom: "1px solid var(--pm-line)", minWidth: 860 }}>
            <span />
            <span>{t("combat.col.player")}</span>
            <span style={{ textAlign: "right" }}>CP</span>
            <span style={{ textAlign: "right" }}>DPS</span>
            <span>{t("combat.col.totalDmg")}</span>
            <span style={{ textAlign: "right" }}>%</span>
            <span style={{ textAlign: "right" }}>{t("combat.col.hits")}</span>
            <span style={{ textAlign: "right" }}>{t("combat.col.deaths")}</span>
          </div>
          {party.map((q) => (
            <button
              key={q.n}
              type="button"
              aria-pressed={q.i === sel}
              className="cbPlain cbHover"
              onClick={() => setSel(q.i)}
              style={
                {
                  "--bg": q.i === sel ? "var(--pm-s3)" : q.me ? "var(--pm-tint)" : "transparent",
                  display: "grid",
                  gridTemplateColumns: OVERVIEW_COLS,
                  gap: 10,
                  alignItems: "center",
                  minHeight: 40,
                  padding: "0 10px",
                  borderBottom: "1px solid var(--pm-line)",
                  minWidth: 860,
                } as CSSProperties
              }
            >
              <Av cls={q.cls} size={26} font={9} />
              <div>
                <span style={{ fontWeight: 500, color: q.me ? "var(--pm-t1)" : "var(--pm-t2)" }}>{q.n}</span>{" "}
                <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{q.cls}</span>
              </div>
              <span className="num" style={{ color: "var(--pm-t2)" }}>
                {fmt(q.cp, lang)}
              </span>
              <span className="num" style={{ fontWeight: 500 }}>
                {fmt(q.dps, lang)}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="cbTrack" style={{ flex: 1, height: 14, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${q.barW}%`, background: classColor(q.cls), opacity: 0.85 }} />
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
              <span className="num" style={{ color: "var(--pm-t2)" }}>
                {q.deaths}
              </span>
            </button>
          ))}
        </div>
      )}

      {tab === "skill" && (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {party.map((q) => (
              <button
                key={q.n}
                type="button"
                aria-pressed={q.i === sel}
                onClick={() => setSel(q.i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 30,
                  padding: "0 10px 0 4px",
                  borderRadius: 6,
                  border: "1px solid var(--pm-line)",
                  background: q.i === sel ? "var(--pm-s3)" : q.me ? "var(--pm-tint)" : "transparent",
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
                ["Cast", fmt(PLAYER_EXTRA.casts * tf, lang)],
                [t("combat.tab.taken"), fmt(PLAYER_EXTRA.taken * tf, lang)],
                [t("combat.tab.heal"), fmt(PLAYER_EXTRA.heal * tf, lang)],
              ]}
            />
            <StatCard
              title={BOSS}
              rows={[
                [t("combat.col.dmg"), fmt(BOSS_STATS.damage * tf, lang)],
                ["Cast", fmt(BOSS_STATS.casts * tf, lang)],
                [t("combat.col.hits"), fmt(BOSS_STATS.hits * tf, lang)],
                [t("combat.duration"), clock(secs)],
              ]}
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 8 }}>
              {sampleBadges(p).map(([l, v]) => (
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
            <h2 style={{ padding: "8px 10px", fontWeight: 500 }}>{t("combat.skillVs", { target: BOSS })}</h2>
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
            {skills.flatMap((s) => {
              const isOpen = !!open[s.j];
              const main = (
                <SkillRow
                  key={s.n}
                  lang={lang}
                  s={s}
                  onToggle={s.kids ? () => setOpen({ ...open, [s.j]: !isOpen }) : undefined}
                  isOpen={isOpen}
                />
              );
              if (!isOpen || !s.kids) return [main];
              return [
                main,
                ...s.kids.map((k, q) => {
                  const f = q ? 0.38 : 0.62;
                  return (
                    <SkillRow
                      key={k}
                      lang={lang}
                      kid
                      s={{ ...s, n: k.replace("{skill}", s.n).replace("{hit}", t("combat.hit")), init: "↳", dmg: s.dmg * f, pct: s.pct * f, hits: Math.round(s.hits * f) }}
                    />
                  );
                }),
              ];
            })}
          </div>
        </>
      )}

      {tab === "tl" && (
        <section className="card" style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <h2 style={{ fontWeight: 500 }}>{t("combat.tab.tl")}</h2>
            <div style={{ flex: 1 }} />
            <button type="button" className="btn" style={{ height: 28, padding: "0 10px", fontSize: 12, gap: 4 }} onClick={() => setMine(!mine)}>
              <ArrowsLeftRightIcon aria-hidden="true" /> {mine ? t("combat.onlyMe") : "Party"}
            </button>
          </div>
          {(mine
            ? CLASS_SKILLS[p.cls].slice(0, 7).map((n, j) => ({ n, col: classColor(p.cls), per: TL_PERIOD[j], off: j * 1.7 }))
            : party.map((q) => ({ n: q.n, col: classColor(q.cls), per: 4 + q.i, off: q.i }))
          ).map((r) => {
            const marks: number[] = [];
            for (let x = r.off; x < t0 + secs; x += r.per) if (x >= t0 && !(x > 150 && x < 170)) marks.push(x);
            return (
              <div key={r.n} style={{ display: "grid", gridTemplateColumns: "180px minmax(0,1fr)", gap: 12, alignItems: "center", height: 30, borderBottom: "1px solid var(--pm-line)" }}>
                <span style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.n}</span>
                <div style={{ position: "relative", height: 16 }}>
                  {marks.map((x) => (
                    <span key={x} style={{ position: "absolute", left: `${px(x).toFixed(2)}%`, top: 0, width: 3, height: 16, borderRadius: 1, background: r.col }} />
                  ))}
                </div>
              </div>
            );
          })}
          <div style={{ display: "grid", gridTemplateColumns: "180px minmax(0,1fr)", gap: 12, marginTop: 6 }}>
            <span />
            <div className="cbTicks">
              {ticks.map((x) => (
                <span key={x}>{x}</span>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === "buff" && (
        <section className="card" style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 12, color: "var(--pm-t2)" }}>
            <h2 style={{ fontWeight: 500, color: "var(--pm-t1)" }}>{t("combat.buffTimeline", { name: p.n })}</h2>
            <span>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "#3FBF7F" }} /> Buff
            </span>
            <span>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: "var(--pm-red)" }} /> {t("combat.debuffOnBoss")}
            </span>
          </div>
          {BUFFS.map(([n, kind, segs]) => {
            const col = kind === "buff" ? "#3FBF7F" : "var(--pm-red)";
            const cut = segs.map(([x, y]) => [Math.max(x, t0), Math.min(y, t0 + secs)]).filter(([x, y]) => y > x);
            const up = (cut.reduce((a, [x, y]) => a + y - x, 0) / secs) * 100;
            return (
              <div key={n} style={{ display: "grid", gridTemplateColumns: "200px minmax(0,1fr) 64px", gap: 12, alignItems: "center", height: 32, borderBottom: "1px solid var(--pm-line)" }}>
                <span style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n}</span>
                <div className="cbTrack" style={{ position: "relative", height: 12, borderRadius: 2 }}>
                  {cut.map(([x, y]) => (
                    <span
                      key={x}
                      style={{ position: "absolute", left: `${px(x)}%`, width: `${(100 * (y - x)) / secs}%`, top: 0, bottom: 0, background: col, opacity: 0.8, borderRadius: 2 }}
                    />
                  ))}
                </div>
                <span className="num" title={t("combat.uptimeTip")} style={{ fontSize: 12 }}>
                  {pc(up, lang)}
                </span>
              </div>
            );
          })}
        </section>
      )}

      {(tab === "taken" || tab === "heal" || tab === "targets") && (
        <>
          <div style={{ fontSize: 12, color: "var(--pm-t3)", marginBottom: 8 }}>{t(`combat.caption.${tab}`)}</div>
          {REPORT_LISTS[tab]
            // Each row follows its own sample curve (busy at a different time), so the window reshuffles the bars too.
            .map(([a, b, v], i) => [a, b, win ? v * portion(samplePoints({ n: a, i, dps: 1 }).map((y, k) => y * (1.2 + Math.sin(k / 8 + i * 2))), win) : v] as const)
            .sort((x, y) => y[2] - x[2])
            .map(([a, b, v], _, list) => (
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
                <div style={{ fontSize: 11, color: "var(--pm-t3)" }}>{b.startsWith("combat.") ? t(b) : b}</div>
              </div>
              <div className="cbTrack" style={{ height: 8, borderRadius: 4 }}>
                <div style={{ height: "100%", width: `${(v / list[0][2]) * 100}%`, background: "var(--pm-red)", borderRadius: 4 }} />
              </div>
              <span className="num">{ab(v, lang)}</span>
              <span className="num" style={{ color: "var(--pm-t2)", fontSize: 12 }}>
                {fmt(v / secs, lang)}
                {tab === "heal" ? " HPS" : "/s"}
              </span>
            </div>
          ))}
        </>
      )}

      {share && <ShareModal t={t} lang={lang} kind="log" onClose={() => setShare(false)} onError={onError} />}
    </>
  );
}

/** Is chart sample k (of 0..59) inside the window [a, b] (fractions of the fight)? */
const inside = ([a, b]: [number, number], k: number) => k / 59 >= a && k / 59 <= b;
const mean = (v: number[]) => v.reduce((x, y) => x + y, 0) / v.length;

/** Fraction of a sample curve's total that falls inside the window. */
function portion(pts: number[], w: [number, number]) {
  const cut = pts.filter((_, k) => inside(w, k));
  return (mean(cut.length ? cut : [pts[Math.round(((w[0] + w[1]) / 2) * 59)]]) / mean(pts)) * (w[1] - w[0]);
}

/** Party over a chart window: each player's damage is the share of their chart curve inside it. */
function inWindow(rows: Row[], w: [number, number]) {
  const secs = (w[1] - w[0]) * DURATION;
  return rank(
    rows.map((r) => {
      const dmg = r.dmg * portion(samplePoints(r), w);
      return { key: r.key, n: r.n, cls: r.cls, cp: r.cp, me: r.me, i: r.i, dps: dmg / secs, dmg, deaths: r.n === DEATH.name && inside(w, DEATH.at) ? r.deaths : 0 };
    }),
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

function SkillRow({ s, lang, kid, isOpen, onToggle }: { s: Skill; lang: string; kid?: boolean; isOpen?: boolean; onToggle?: () => void }) {
  const t2 = { color: "var(--pm-t2)" };
  const dash = kid ? "—" : null;
  return (
    <div
      className="cbHover"
      onClick={onToggle}
      style={
        {
          "--bg": kid ? "var(--pm-s2)" : "transparent",
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
          cursor: onToggle ? "pointer" : undefined,
        } as CSSProperties
      }
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter,sans-serif", fontSize: 13, textAlign: "left", paddingLeft: kid ? 18 : 0, minWidth: 0 }}>
        <span style={{ width: 14, color: "var(--pm-t3)", display: "flex" }}>
          {onToggle && (
            <button type="button" className="cbPlain" aria-expanded={isOpen} aria-label={s.n} onClick={(e) => (e.stopPropagation(), onToggle())} style={{ display: "flex", color: "inherit" }}>
              {isOpen ? <CaretDownIcon aria-hidden="true" /> : <CaretRightIcon aria-hidden="true" />}
            </button>
          )}
        </span>
        <span style={{ width: 22, height: 22, borderRadius: 4, background: "var(--pm-s3)", display: "grid", placeItems: "center", fontSize: 9, color: "var(--pm-t2)", flex: "none" }}>
          {kid ? s.init : <SkillIcon skill={s.sk} name={s.n} />}
        </span>
        <span style={{ color: kid ? "var(--pm-t2)" : "var(--pm-t1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.n}</span>
      </div>
      <span>{fmt(s.dmg, lang)}</span>
      <span style={t2}>{pc(s.pct, lang)}</span>
      <span>{s.hits}</span>
      <span>{pc(s.crit, lang)}</span>
      <span style={t2}>{fmt(s.min, lang)}</span>
      <span style={t2}>{fmt(s.max, lang)}</span>
      <span>{fmt(s.avg, lang)}</span>
      <span style={t2}>{pc(s.back, lang)}</span>
      <span style={t2}>{dash ?? pc(s.parry, lang)}</span>
      <span style={t2}>{pc(s.perfect, lang)}</span>
      <span style={t2}>{dash ?? pc(s.double, lang)}</span>
      <span style={t2}>{dash ?? (s.multi ? pc(s.multi, lang) : "—")}</span>
    </div>
  );
}
