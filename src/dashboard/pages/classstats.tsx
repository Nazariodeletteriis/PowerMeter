import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChartBarHorizontalIcon, WarningOctagonIcon } from "@phosphor-icons/react";
import { Card, EmptyState, fmt } from "../ui";
import { classColor } from "./combat/parts";
import "./combat/combat.css";
import type { PageProps } from "./types";

/** GET /api/stats/classes (PowerMeter-server): aggregates over public logs only. */
type Stats = {
  logs: number;
  bosses: { mobCode: number; name: string; logs: number }[];
  classes: { cls: string; players: number; avgDps: number }[];
  weeks: { week: string; cls: string; avgDps: number }[];
};
const REGIONS = ["EU", "NA"];
const PERIODS = [
  ["30", "combat.last30"],
  ["90", "combat.stats.last90"],
  ["all", "combat.allTime"],
] as const;

export default function ClassStats({ t, lang }: PageProps) {
  const [region, setRegion] = useState("");
  const [boss, setBoss] = useState("");
  const [period, setPeriod] = useState("90");
  const [stats, setStats] = useState<Stats>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setError("");
    invoke<Stats>("pm_class_stats", { boss: boss ? Number(boss) : null, region: region || null, period }).then(
      (s) => alive && setStats(s),
      (e) => alive && setError(String(e)),
    );
    return () => {
      alive = false;
    };
  }, [boss, region, period, attempt]);

  const players = stats?.classes.reduce((n, c) => n + c.players, 0) ?? 0;
  const dpsMax = Math.max(1, ...(stats?.classes.map((c) => c.avgDps) ?? []));
  const byShare = [...(stats?.classes ?? [])].sort((a, b) => b.players - a.players);

  return (
    <>
      <section className="card" style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <h2 style={{ fontSize: 15, fontWeight: 500 }}>{t("combat.stats.introTitle")}</h2>
        <p style={{ color: "var(--pm-t2)", fontSize: 13, maxWidth: 760 }}>{t("combat.stats.introText")}</p>
      </section>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <select className="cbSelect" aria-label={t("combat.region")} value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">{t("combat.stats.allRegions")}</option>
          {REGIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select className="cbSelect" aria-label="Boss" value={boss} onChange={(e) => setBoss(e.target.value)}>
          <option value="">{t("combat.allBosses")}</option>
          {stats?.bosses.map((b) => (
            <option key={b.mobCode} value={b.mobCode}>
              {b.name} ({b.logs})
            </option>
          ))}
        </select>
        <div className="cbSeg" role="group" aria-label={t("combat.period")}>
          {PERIODS.map(([p, label]) => (
            <button key={p} type="button" aria-pressed={p === period} onClick={() => setPeriod(p)}>
              {t(label)}
            </button>
          ))}
        </div>
        {stats && stats.logs > 0 && <span style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("combat.stats.basedOn", { n: fmt(stats.logs, lang) })}</span>}
      </div>

      {error ? (
        <section className="card cbState" style={{ maxWidth: 544 }} role="alert">
          <WarningOctagonIcon aria-hidden="true" style={{ color: "var(--pm-err)" }} />
          <div style={{ fontSize: 15 }}>{t("combat.states.errorTitle")}</div>
          <div className="cbStateText">{error}</div>
          <div>
            <button type="button" className="btn" onClick={() => setAttempt(attempt + 1)}>
              {t("combat.retry")}
            </button>
          </div>
        </section>
      ) : !stats ? (
        <div className="skeleton" style={{ height: 240 }} />
      ) : !stats.classes.length ? (
        <section className="card">
          <EmptyState icon={<ChartBarHorizontalIcon aria-hidden="true" />} title={t("combat.stats.emptyTitle")} text={t("combat.stats.emptyText")} />
        </section>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 12 }}>
          <Card title={t("combat.stats.avgDps")} aside={!boss && <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t("combat.stats.pickBoss")}</span>}>
            <Bars rows={stats.classes.map((c) => ({ cls: c.cls, w: c.avgDps / dpsMax, value: fmt(c.avgDps, lang), note: t("combat.stats.nPlayers", { n: fmt(c.players, lang) }) }))} />
          </Card>
          <Card title={t("combat.stats.distribution")}>
            <Bars
              rows={byShare.map((c) => ({
                cls: c.cls,
                w: c.players / Math.max(1, byShare[0].players),
                value: `${Math.round((c.players / Math.max(1, players)) * 100)}%`,
                note: t("combat.stats.nPlayers", { n: fmt(c.players, lang) }),
              }))}
            />
          </Card>
          <Card title={t("combat.stats.trend")} style={{ gridColumn: "1 / -1" }}>
            <Trend t={t} lang={lang} weeks={stats.weeks} />
          </Card>
        </div>
      )}
    </>
  );
}

/** Horizontal bars in the class color; the class name and value are text, so color is never the only cue. */
function Bars({ rows }: { rows: { cls: string; w: number; value: string; note: string }[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((r) => (
        <div key={r.cls} title={r.note} style={{ display: "grid", gridTemplateColumns: "96px 1fr 72px", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12 }}>{r.cls}</span>
          <div className="cbTrack" style={{ height: 12, borderRadius: 3, overflow: "hidden" }}>
            <div className="cbGrow" style={{ width: `${r.w * 100}%`, background: classColor(r.cls), borderRadius: "0 3px 3px 0" }} />
          </div>
          <span className="num" style={{ fontSize: 12, textAlign: "right" }}>
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Weekly average DPS per class: one 2px line each; hovering a legend entry brings its line forward. */
function Trend({ t, lang, weeks }: { t: PageProps["t"]; lang: string; weeks: Stats["weeks"] }) {
  const [hot, setHot] = useState("");
  const xs = [...new Set(weeks.map((w) => w.week))].sort();
  if (xs.length < 2) return <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("combat.stats.trendNeedsWeeks")}</div>;
  const classes = [...new Set(weeks.map((w) => w.cls))];
  const ymax = Math.max(1, ...weeks.map((w) => w.avgDps)) * 1.1;
  const W = 600;
  const H = 180;
  const x = (week: string) => (xs.indexOf(week) / (xs.length - 1)) * W;
  const y = (v: number) => H - (v / ymax) * H;
  // Weeks are UTC dates (Monday): formatted in UTC so they do not slip a day west of Greenwich.
  const day = new Intl.DateTimeFormat(lang, { day: "2-digit", month: "2-digit", timeZone: "UTC" });

  return (
    <div>
      <div style={{ position: "relative", height: H }}>
        <div className="cbGrid" />
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
          {classes.map((cls) => {
            const pts = weeks.filter((w) => w.cls === cls);
            return (
              <g key={cls} opacity={hot && hot !== cls ? 0.2 : 1}>
                <polyline fill="none" stroke={classColor(cls)} strokeWidth={2} vectorEffect="non-scaling-stroke" points={pts.map((w) => `${x(w.week)},${y(w.avgDps)}`).join(" ")} />
                {pts.map((w) => (
                  <line key={w.week} x1={x(w.week)} x2={x(w.week)} y1={y(w.avgDps)} y2={y(w.avgDps)} stroke={classColor(cls)} strokeWidth={8} strokeLinecap="round" vectorEffect="non-scaling-stroke">
                    <title>{`${cls} · ${day.format(new Date(w.week))} · ${fmt(w.avgDps, lang)} DPS`}</title>
                  </line>
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="cbTicks" style={{ marginTop: 6 }}>
        {xs.map((w) => (
          <span key={w}>{day.format(new Date(w))}</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
        {classes.map((cls) => (
          <button
            key={cls}
            type="button"
            className="cbPlain"
            style={{ width: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: hot && hot !== cls ? "var(--pm-t3)" : "var(--pm-t2)" }}
            onMouseEnter={() => setHot(cls)}
            onMouseLeave={() => setHot("")}
            onFocus={() => setHot(cls)}
            onBlur={() => setHot("")}
          >
            <span style={{ width: 12, height: 2, background: classColor(cls) }} />
            {cls}
          </button>
        ))}
      </div>
    </div>
  );
}
