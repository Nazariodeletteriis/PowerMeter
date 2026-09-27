import { useEffect, useRef, useState, type CSSProperties } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  ArrowCounterClockwiseIcon,
  ArrowSquareOutIcon,
  FirstAidIcon,
  FloppyDiskIcon,
  ShieldWarningIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { fmt } from "../ui";
import { AGGRO, BOSS, DURATION, FIGHT_START_S, HEAL_SHARE, HEAL_SKILLS, HEALS, SAMPLE_PING } from "../sample/combat";
import { ab, Av, Chart, classColor, clock, pc, path, rank, sampleBadges, sampleParty, sampleSeries, sampleSkills, type Row } from "./combat/parts";
import type { PageProps } from "./types";

/** dps-update payload (src-tauri/src/entity/dps_data.rs), the fields shown here. */
type Dps = {
  map: Record<string, { job: string; dps: number; amount: number; nickname: string; combatPower: number }>;
  targetName: string;
  targetMode: string;
  targetId: number;
  battleTime: number;
  localPlayerId: number | null;
};
/** get_skill_details entries (details_context.rs DetailSkillEntry); `time` is the hit count. */
type SkillEntry = { name: string; dmg: number; time: number; crit: number; back: number; parry: number; perfect: number; double: number };

// The engine sends Korean class names (job_class.rs class_name).
const JOB: Record<string, string> = {
  검성: "Gladiator",
  수호성: "Templar",
  궁성: "Ranger",
  살성: "Assassin",
  마도성: "Sorcerer",
  치유성: "Cleric",
  정령성: "Spiritmaster",
  호법성: "Chanter",
};
// Tab labels → set_target_mode ids (dps_calculator.rs).
const MODES = [
  ["Boss", "bossTargets"],
  ["Train", "trainTargets"],
  ["PvP", "pvpTargets"],
] as const;
/** Chart window: 60 dps-update samples (500 ms each). */
const HISTORY = 60;

export default function Meter({ t, lang, run, onError }: PageProps) {
  const [tick, setTick] = useState(0);
  const [data, setData] = useState<Dps>();
  const [ping, setPing] = useState<number>();
  const [sel, setSel] = useState<string | number>();
  // Chosen tab while no engine snapshot exists (browser preview); the engine's targetMode wins once it reports.
  const [mode, setMode] = useState("bossTargets");
  const [healSel, setHealSel] = useState("Solenne");
  const [skills, setSkills] = useState<SkillEntry[]>();
  const history = useRef(new Map<number, number[]>());

  useEffect(() => {
    const id = setInterval(() => setTick((k) => k + 1), 1000);
    const onDps = (d: Dps) => {
      // Keep the last HISTORY DPS values per actor for the live chart.
      const h = history.current;
      if (!Object.keys(d.map).length) h.clear();
      for (const [id, v] of Object.entries(d.map)) h.set(Number(id), [...(h.get(Number(id)) ?? []), v.dps].slice(-HISTORY));
      setData(d);
    };
    invoke<Dps>("get_dps_snapshot").then(onDps, onError);
    invoke<number | null>("get_ping").then((p) => setPing(p ?? undefined), onError);
    const stops = [
      listen<Dps>("dps-update", (e) => onDps(e.payload)),
      listen<number>("ping-update", (e) => setPing(e.payload)),
    ];
    return () => {
      clearInterval(id);
      stops.forEach((s) => s.then((stop) => stop(), () => {}));
    };
  }, [onError]);

  const liveRows = data
    ? rank(
        Object.entries(data.map)
          .filter(([id, v]) => Number(id) > 0 && Number.isFinite(v.dps))
          .map(([id, v], i) => ({
            key: Number(id),
            n: v.nickname || id,
            cls: JOB[v.job] ?? v.job,
            cp: v.combatPower,
            dps: v.dps,
            dmg: v.amount,
            deaths: 0,
            me: Number(id) === data.localPlayerId,
            i,
          })),
      )
    : [];
  const live = liveRows.length > 0;
  // No fight in progress: the prototype's sample fight, wobbling like its live meter.
  const rows = live ? liveRows : sampleParty(tick);
  const selP = rows.find((r) => r.key === sel) ?? (live ? rows.find((r) => r.me) : rows.find((r) => r.i === 0)) ?? rows[0];
  const selKey = selP.key;
  const targetId = data?.targetId;

  // Skill breakdown of the selected player while a fight is live.
  useEffect(() => {
    setSkills(undefined);
    if (!live || typeof selKey !== "number") return;
    const load = () =>
      invoke<{ skills: (SkillEntry & { actorId: number })[] }>("get_skill_details", { targetId, actorIds: [selKey] }).then(
        (r) => setSkills(r.skills),
        (e) => {
          clearInterval(id);
          onError(e);
        },
      );
    load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, [live, selKey, targetId, onError]);

  const series = live
    ? (() => {
        const ymax = Math.max(1, ...rows.flatMap((r) => history.current.get(r.key as number) ?? [])) * 1.1;
        return rows.map((r) => ({ key: r.key, col: classColor(r.cls), d: path(history.current.get(r.key as number) ?? [], ymax) }));
      })()
    : sampleSeries(rows);

  const { list: skillList, badges } = live ? liveSkills(skills) : sampleSkillList(selP);
  const btn30: CSSProperties = { height: 30 };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "-8px 0 16px", flexWrap: "wrap" }}>
        <div className="cbSeg" role="group">
          {MODES.map(([label, id]) => (
            <button
              key={id}
              type="button"
              aria-pressed={(data?.targetMode ?? mode) === id}
              onClick={() => {
                setMode(id);
                setData((d) => d && { ...d, targetMode: id });
                run(() => invoke("set_target_mode", { mode: id }));
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--pm-t2)", marginLeft: 8 }}>
          {t("combat.target")} <span style={{ color: "var(--pm-t1)" }}>{live ? data!.targetName || "—" : BOSS}</span> ·{" "}
          <span className="mono" style={{ color: "var(--pm-redt)" }}>
            {clock(live ? data!.battleTime / 1000 : FIGHT_START_S + tick)}
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          className="btn"
          style={btn30}
          onClick={() =>
            run(() =>
              invoke("reset_combat").then(() => {
                history.current.clear();
                setData(undefined);
              }),
            )
          }
        >
          <ArrowCounterClockwiseIcon aria-hidden="true" />
          {t("combat.reset")}
        </button>
        {/* ponytail: the engine saves every fight by itself; no manual save command exists yet. */}
        <button type="button" className="btn" style={btn30}>
          <FloppyDiskIcon aria-hidden="true" />
          {t("combat.save")}
        </button>
        <button type="button" className="btn fill" style={{ ...btn30, fontSize: 13 }} onClick={() => run(() => invoke("show_overlay"))}>
          <ArrowSquareOutIcon aria-hidden="true" />
          {t("combat.detach")}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <section className="card" style={{ padding: 8 }} aria-label={t("combat.partyDps")}>
            {rows.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={p.key === selKey}
                className="cbPlain cbHover"
                onClick={() => setSel(p.key)}
                style={
                  {
                    "--bg": p.key === selKey ? "var(--pm-s3)" : p.me ? "var(--pm-tint)" : "transparent",
                    position: "relative",
                    display: "grid",
                    gridTemplateColumns: "24px 30px minmax(0,1fr) 90px 64px 70px",
                    gap: 10,
                    alignItems: "center",
                    height: 44,
                    padding: "0 10px",
                    borderRadius: 6,
                    overflow: "hidden",
                  } as CSSProperties
                }
              >
                <span className="mono" style={{ color: "var(--pm-t3)", fontSize: 12 }}>
                  {p.pos}
                </span>
                <Av cls={p.cls} size={28} />
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                    <span style={{ fontWeight: 500, color: p.me ? "var(--pm-t1)" : "var(--pm-t2)" }}>{p.n}</span>
                    <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{p.cls}</span>
                  </div>
                  <div className="cbTrack" style={{ height: 5, borderRadius: 3 }}>
                    <div className="cbGrow" style={{ width: `${p.barW}%`, background: classColor(p.cls), borderRadius: 3 }} />
                  </div>
                </div>
                <span className="num" style={{ fontSize: 15, fontWeight: 500 }}>
                  {fmt(p.dps, lang)}
                </span>
                <span className="num" style={{ color: "var(--pm-t2)" }}>
                  {pc(p.pct, lang)}
                </span>
                <span className="num" style={{ color: "var(--pm-t3)" }}>
                  {ab(p.dmg, lang)}
                </span>
              </button>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 10px 4px", fontSize: 12, color: "var(--pm-t3)" }}>
              <span>
                {t("combat.partyDps")}{" "}
                <span className="mono" style={{ color: "var(--pm-t1)" }}>
                  {fmt(rows.reduce((a, r) => a + r.dps, 0), lang)}
                </span>
              </span>
              <span>
                Ping{" "}
                <span className="mono" style={{ color: "var(--pm-ok)" }}>
                  {live ? (ping == null ? "—" : `${ping} ms`) : `${SAMPLE_PING} ms`}
                </span>
              </span>
            </div>
          </section>
          <section className="card" style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <h2 className="kicker">{t("combat.liveDps")}</h2>
              <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t("combat.clickToHighlight")}</span>
            </div>
            <Chart lines={series} sel={selKey} label={t("combat.liveDps")} />
          </section>
        </div>

        <section className="card" style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Av cls={selP.cls} size={34} font={11} />
            <div style={{ flex: 1 }}>
              <h2 style={{ fontWeight: 500, fontSize: 15 }}>{selP.n}</h2>
              <div style={{ fontSize: 11, color: "var(--pm-t3)" }}>
                {selP.cls} · CP {selP.cp ? fmt(selP.cp, lang) : "—"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="mono" style={{ fontSize: 20 }}>
                {fmt(selP.dps, lang)}
              </div>
              <div style={{ fontSize: 11, color: "var(--pm-t3)" }}>DPS</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 6 }}>
            {badges.map(([l, v]) => (
              <div key={l} style={{ border: "1px solid var(--pm-line)", borderRadius: 6, padding: 6, textAlign: "center" }}>
                <div style={{ fontSize: 9, letterSpacing: ".1em", color: "var(--pm-t3)" }}>{l}</div>
                <div className="mono" style={{ fontSize: 12 }}>
                  {v == null ? "—" : pc(v, lang)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {skillList === undefined
              ? [0, 1, 2, 3].map((k) => <div key={k} className="skeleton" style={{ height: 28 }} />)
              : skillList.map((s) => (
                  <div key={s.n} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 72px 52px", gap: 8, alignItems: "center", minHeight: 32 }}>
                    <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.n}</span>
                      <div className="cbTrack" style={{ height: 3, borderRadius: 2 }}>
                        <div style={{ height: "100%", width: `${s.barW}%`, background: classColor(selP.cls), borderRadius: 2 }} />
                      </div>
                    </div>
                    <span className="num" style={{ fontSize: 12 }}>
                      {fmt(s.dmg, lang)}
                    </span>
                    <span className="num" style={{ fontSize: 12, color: "var(--pm-t2)" }}>
                      {pc(s.pct, lang)}
                    </span>
                  </div>
                ))}
          </div>
        </section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12, marginTop: 12 }}>
        <Heals t={t} lang={lang} tick={tick} sel={healSel} setSel={setHealSel} />
        <Aggro t={t} tick={tick} />
      </div>
    </>
  );
}

function sampleSkillList(p: Row) {
  return { list: sampleSkills(p).map((s) => ({ n: s.n, dmg: s.dmg, pct: s.pct, barW: (s.pct / 24) * 100 })), badges: sampleBadges(p) };
}

/** Top 8 skills and hit-rate badges from get_skill_details, summed per skill name. */
function liveSkills(entries?: SkillEntry[]) {
  const by = new Map<string, SkillEntry>();
  for (const e of entries ?? []) {
    const s = by.get(e.name);
    by.set(
      e.name,
      s
        ? { ...s, dmg: s.dmg + e.dmg, time: s.time + e.time, crit: s.crit + e.crit, back: s.back + e.back, parry: s.parry + e.parry, perfect: s.perfect + e.perfect, double: s.double + e.double }
        : { ...e },
    );
  }
  const all = [...by.values()];
  const tot = all.reduce((a, s) => a + s.dmg, 0) || 1;
  const hits = all.reduce((a, s) => a + s.time, 0);
  const top = all.sort((a, b) => b.dmg - a.dmg).slice(0, 8);
  const maxPct = top.length ? (top[0].dmg / tot) * 100 : 1;
  const list = entries && top.map((s) => ({ n: s.name, dmg: s.dmg, pct: (s.dmg / tot) * 100, barW: ((s.dmg / tot) * 100 * 100) / maxPct }));
  const rate = (k: "crit" | "back" | "parry" | "perfect" | "double") => (hits ? (all.reduce((a, s) => a + s[k], 0) / hits) * 100 : undefined);
  const badges: [string, number | undefined][] = [
    ["CRIT", rate("crit")],
    ["BACK", rate("back")],
    ["PARRY", rate("parry")],
    ["PERFECT", rate("perfect")],
    ["DOUBLE", rate("double")],
  ];
  return { list, badges };
}

// ---------- sample-only cards (no engine source for heals and aggro yet) ----------

function Heals({ t, lang, tick, sel, setSel }: { t: PageProps["t"]; lang: string; tick: number; sel: string; setSel: (n: string) => void }) {
  const hmax = HEALS[0][2] * 1.1;
  const hv = (HEALS.find((h) => h[0] === sel) ?? HEALS[0])[2] * DURATION;
  return (
    <section className="card" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <FirstAidIcon aria-hidden="true" style={{ color: "var(--pm-okt)" }} />
        <h2 style={{ fontWeight: 500 }}>{t("combat.heals")}</h2>
        <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t("combat.healsHint")}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--pm-t2)" }}>
          Party{" "}
          <span className="mono" style={{ color: "var(--pm-t1)" }}>
            {fmt(HEALS.reduce((a, h) => a + h[2], 0), lang)} HPS
          </span>
        </span>
      </div>
      {HEALS.map(([n, cls, v, oh], i) => {
        const x = v * (1 + 0.04 * Math.sin(tick * 0.7 + i));
        return (
          <button
            key={n}
            type="button"
            aria-pressed={n === sel}
            className="cbPlain cbHover"
            onClick={() => setSel(n)}
            style={
              {
                "--bg": n === sel ? "var(--pm-s3)" : "transparent",
                display: "grid",
                gridTemplateColumns: "26px minmax(0,1fr) 70px 54px",
                gap: 10,
                alignItems: "center",
                minHeight: 40,
                padding: "0 6px",
                borderRadius: 6,
              } as CSSProperties
            }
          >
            <Av cls={cls} size={24} radius={5} font={8} />
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12 }}>
                {n} <span style={{ color: "var(--pm-t3)", fontSize: 11 }}>{cls}</span>
              </span>
              <div className="cbTrack" style={{ display: "flex", height: 5, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${((x * (1 - oh / 100)) / hmax) * 100}%`, background: "#3FBF7F" }} />
                <div title={t("combat.overheal")} style={{ width: `${((x * oh) / 100 / hmax) * 100}%`, background: "#3FBF7F55" }} />
              </div>
            </div>
            <span className="num">{fmt(x, lang)}</span>
            <span className="num" title={t("combat.overheal")} style={{ fontSize: 11, color: "var(--pm-t3)" }}>
              {oh}%
            </span>
          </button>
        );
      })}
      <div style={{ borderTop: "1px solid var(--pm-line)", marginTop: 8, paddingTop: 8 }}>
        <div style={{ fontSize: 11, color: "var(--pm-t3)", marginBottom: 6 }}>{t("combat.healSkills", { name: sel })}</div>
        {HEAL_SKILLS[sel].map((n, k) => (
          <div key={n} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 64px 48px", gap: 8, fontSize: 12, minHeight: 26, alignItems: "center" }}>
            <span style={{ color: "var(--pm-t2)" }}>{n}</span>
            <span className="num">{ab(hv * HEAL_SHARE[k], lang)}</span>
            <span className="num" style={{ color: "var(--pm-t3)" }}>
              {pc(HEAL_SHARE[k] * 100, lang)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Aggro({ t, tick }: { t: PageProps["t"]; tick: number }) {
  return (
    <section className="card" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <ShieldWarningIcon aria-hidden="true" style={{ color: "var(--pm-warn)" }} />
        <h2 style={{ fontWeight: 500 }}>Aggro</h2>
        <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t("combat.aggroHint")}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--pm-t2)" }}>
          {t("combat.targetOf")} <span style={{ color: "var(--pm-t1)" }}>Ironveil</span>
        </span>
      </div>
      {AGGRO.map(([n, cls, v, tank], i) => {
        const x = tank ? 100 : Math.min(128, v + 6 * Math.sin(tick * 0.5 + i * 1.7));
        const warn = !tank && x >= 90;
        const bar = tank ? "var(--pm-t2)" : warn ? "#DB0000" : x >= 75 ? "#E8B03A" : "var(--pm-grey)";
        return (
          <div key={n} style={{ display: "grid", gridTemplateColumns: "26px minmax(0,1fr) 54px", gap: 10, alignItems: "center", minHeight: 40, padding: "0 6px" }}>
            <Av cls={cls} size={24} radius={5} font={8} />
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12 }}>
                <span>{n}</span>
                {tank && (
                  <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, border: "1px solid var(--pm-grey)", color: "var(--pm-t2)" }}>TANK</span>
                )}
                {warn && (
                  <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, background: "#DB000033", color: "#FF6B6B" }}>
                    <WarningIcon weight="fill" aria-hidden="true" style={{ verticalAlign: "-1px" }} /> {t("combat.pullRisk")}
                  </span>
                )}
              </div>
              <div className="cbTrack" style={{ position: "relative", height: 8, borderRadius: 4 }}>
                <div className="cbGrow" style={{ width: `${(x / 130) * 100}%`, background: bar, borderRadius: 4, transitionDuration: ".3s" }} />
                <span style={{ position: "absolute", top: -3, bottom: -3, left: "84.6%", width: 2, background: "var(--pm-t2)" }} />
              </div>
            </div>
            <span className="num" style={{ color: warn ? "#FF6B6B" : "var(--pm-t1)" }}>
              {Math.round(x)}%
            </span>
          </div>
        );
      })}
    </section>
  );
}
