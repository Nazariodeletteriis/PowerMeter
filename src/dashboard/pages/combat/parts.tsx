import { useEffect, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { art, CLASSES } from "../../ui";
import { findSkill, type GameSkill } from "../../skills";
import "./combat.css";

// ---------- formatting (prototype ab / pc) ----------
const dec = (n: number, lang: string) => n.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** 1,2 M · 85 K · 640 */
export const ab = (n: number, lang: string) =>
  n >= 1e6 ? `${dec(n / 1e6, lang)} M` : n >= 1e3 ? `${Math.round(n / 1e3)} K` : String(Math.round(n));
/** 38,4% */
export const pc = (n: number, lang: string) => `${dec(n, lang)}%`;
/** m:ss */
export const clock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Class square of the prototype (cl()): icon on the class tint, initials when there is no icon. */
export function Av({ cls, size, radius = 6, font = 10, bare }: { cls: string; size: number; radius?: number; font?: number; bare?: boolean }) {
  const [init, col] = CLASSES[cls] ?? ["", "var(--pm-grey)"];
  const icon = art(cls);
  const style = { "--c": col, width: size, height: size, borderRadius: radius, fontSize: font } as CSSProperties;
  if (bare) style.border = 0;
  if (!icon) style.background = `${col}22`;
  return (
    <span className="classAvatar" style={style} aria-hidden="true">
      {icon ? <img src={icon} alt="" /> : init}
    </span>
  );
}
export const classColor = (cls: string) => CLASSES[cls]?.[1] ?? "var(--pm-grey)";

// ---------- party rows ----------
export type Row = {
  key: string | number;
  n: string;
  cls: string;
  cp: number;
  dps: number;
  dmg: number;
  deaths: number;
  me: boolean;
  /** Prototype index, drives the sample series and skill numbers. */
  i: number;
  pos: number;
  pct: number;
  barW: number;
  hits: number;
};

/** Adds position, share of damage and bar width, sorted by DPS. */
export function rank(rows: Omit<Row, "pos" | "pct" | "barW" | "hits">[]): Row[] {
  const tot = rows.reduce((a, r) => a + r.dmg, 0) || 1;
  const max = Math.max(...rows.map((r) => r.dps)) || 1;
  return rows
    .sort((a, b) => b.dps - a.dps)
    .map((r, k) => ({ ...r, pos: k + 1, pct: (r.dmg / tot) * 100, barW: (r.dps / max) * 100, hits: Math.round(r.dmg / 13400) }));
}

/** SVG path on the 1000×200 chart box. */
export function path(values: number[], ymax: number) {
  const n = Math.max(1, values.length - 1);
  return values.map((v, k) => `${k ? "L" : "M"}${((k / n) * 1000).toFixed(1)},${(200 - (v / ymax) * 190).toFixed(1)}`).join("");
}

/** DPS lines over the grid (prototype meter + report chart). `children` sit under the lines, `over` above. */
export function Chart({
  lines,
  sel,
  label,
  children,
  over,
  ...rest
}: {
  lines: { key: string | number; col: string; d: string }[];
  sel: string | number;
  label: string;
  children?: ReactNode;
  over?: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="img" aria-label={label} {...rest} style={{ position: "relative", height: 200, ...rest.style }}>
      <div className="cbGrid" />
      {children}
      <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="cbSvg">
        {lines.map((s) => (
          <path
            key={s.key}
            d={s.d}
            fill="none"
            stroke={s.col}
            strokeWidth={s.key === sel ? 2.4 : 1.3}
            opacity={s.key === sel ? 1 : 0.8}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {over}
    </div>
  );
}

// ---------- skills of one player ----------
export type Skill = {
  n: string;
  j: number;
  dmg: number;
  pct: number;
  hits: number;
  crit: number;
  min: number;
  max: number;
  avg: number;
  back: number;
  parry: number;
  perfect: number;
  double: number;
  multi: number;
  init: string;
  /** The game skill of that name, for its icon (none for "Auto Attack"). */
  sk?: GameSkill;
  kids?: string[];
};
export const initials = (n: string) =>
  n
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

// ---------- saved fights (src-tauri/src/entity/fight_record.rs, details_context.rs) ----------
/** DetailSkillEntry: `time` is the hit count, `hitTimestamps` are ms from the fight start. */
export type FightSkill = {
  actorId: number;
  name: string;
  time: number;
  dmg: number;
  minDmg: number;
  maxDmg: number;
  crit: number;
  parry: number;
  back: number;
  perfect: number;
  double: number;
  multiHitCount: number;
  hitTimestamps: number[];
};
export type FightActor = { actorId: number; nickname: string; job: string; jobId: number; partyHeal: number; damageReceived: number; hitsReceived: number };
export type FightRecord = {
  id: string;
  bossName: string;
  startTimeMs: number;
  durationMs: number;
  isTrain: boolean;
  actors: FightActor[];
  details: { skills: FightSkill[]; healSkills?: FightSkill[] };
};
/** FightSummary, the fields used here. Newest first (the backend sorts by start time). */
export type FightSummary = { id: string; bossName: string; startTimeMs: number; durationMs: number };
export const getFights = () => invoke<FightSummary[]>("get_fight_history");

/** Full record of fight `id`; undefined while it loads. */
export function useFight(id: string | undefined, onError: (e: unknown) => void) {
  const [got, setGot] = useState<FightRecord>();
  useEffect(() => {
    if (!id) return;
    let alive = true;
    invoke<FightRecord>("load_fight", { id }).then((r) => alive && setGot({ ...r, id }), (e) => alive && onError(e));
    return () => {
      alive = false;
    };
  }, [id, onError]);
  return got?.id === id ? got : undefined;
}

/** Share URL of a fight uploaded from this PC (Storico writes pm.uploadedFights). */
export function uploadedUrl(id: string): string | undefined {
  try {
    return JSON.parse(localStorage.getItem("pm.uploadedFights") ?? "{}")[id] || undefined;
  } catch {
    return undefined;
  }
}

// Actors carry the class prefix id (job_class.rs); old files only the Korean class name.
const CLASS_OF: Record<string | number, string> = {
  11: "Gladiator", 12: "Templar", 13: "Assassin", 14: "Ranger", 15: "Sorcerer", 16: "Spiritmaster", 17: "Cleric", 18: "Chanter", 19: "Brawler",
  검성: "Gladiator", 수호성: "Templar", 살성: "Assassin", 궁성: "Ranger", 마도성: "Sorcerer", 정령성: "Spiritmaster", 치유성: "Cleric", 호법성: "Chanter", 권성: "Brawler",
};

export type FightRow = { key: number; n: string; cls: string; dmg: number; dps: number; hits: number; pct: number; me: boolean; actor: FightActor; raw: FightSkill[]; skills: Skill[]; rates: [string, number][] };

/**
 * Party of a fight, sorted by DPS. With a window [from, to] (seconds) each skill keeps the hits
 * whose timestamp falls inside it, at the skill's average hit (the record has no per-hit damage).
 */
export function fightParty(rec: FightRecord, me: string, w?: [number, number]): FightRow[] {
  const secs = Math.max(1, w ? w[1] - w[0] : rec.durationMs / 1000);
  const rows = rec.actors.map((a) => {
    const cls = CLASS_OF[a.jobId] ?? CLASS_OF[a.job] ?? a.job;
    const raw = rec.details.skills.filter((s) => s.actorId === a.actorId);
    const cut = raw.map((s) => {
      if (!w) return { s, dmg: s.dmg, hits: s.time };
      const n = s.hitTimestamps.filter((x) => x >= w[0] * 1000 && x <= w[1] * 1000).length;
      return { s, dmg: s.hitTimestamps.length ? (s.dmg * n) / s.hitTimestamps.length : 0, hits: n };
    });
    const dmg = cut.reduce((x, c) => x + c.dmg, 0);
    const hits = cut.reduce((x, c) => x + c.hits, 0);
    const all = raw.reduce((x, s) => x + s.time, 0) || 1;
    const rate = (k: "crit" | "back" | "parry" | "perfect" | "double") => (raw.reduce((x, s) => x + s[k], 0) / all) * 100;
    const skills = cut.map(({ s, dmg: d, hits: h }, j): Skill => {
      const r = (v: number) => (s.time ? (v / s.time) * 100 : 0);
      return { n: s.name, j, dmg: d, pct: dmg ? (d / dmg) * 100 : 0, hits: h, crit: r(s.crit), min: s.minDmg, max: s.maxDmg, avg: s.time ? s.dmg / s.time : 0, back: r(s.back), parry: r(s.parry), perfect: r(s.perfect), double: r(s.double), multi: r(s.multiHitCount), init: initials(s.name), sk: findSkill(s.name, cls) };
    });
    const rates: [string, number][] = [["CRIT", rate("crit")], ["BACK", rate("back")], ["PARRY", rate("parry")], ["PERFECT", rate("perfect")], ["DOUBLE", rate("double")]];
    return { key: a.actorId, n: a.nickname, cls, dmg, dps: dmg / secs, hits, me: !!me && a.nickname === me, actor: a, raw, skills, rates };
  });
  const tot = rows.reduce((x, r) => x + r.dmg, 0) || 1;
  return rows.map((r) => ({ ...r, pct: (r.dmg / tot) * 100 })).sort((a, b) => b.dps - a.dps);
}

/** DPS of each row over `n` equal slices of the fight, from hit timestamps at each skill's average hit. */
export function fightSeries(rows: FightRow[], durationMs: number, n = 60) {
  const slice = Math.max(1, durationMs) / n;
  const pts = rows.map((r) => {
    const v = new Array<number>(n).fill(0);
    for (const s of r.raw) for (const x of s.hitTimestamps) v[Math.min(n - 1, Math.max(0, Math.floor(x / slice)))] += s.dmg / s.hitTimestamps.length;
    return v.map((d) => d / (slice / 1000));
  });
  const ymax = Math.max(1, ...pts.flat()) * 1.1;
  return rows.map((r, k) => ({ key: r.key, col: classColor(r.cls), d: path(pts[k], ymax) }));
}

/** sessionStorage key: the fight Storico opens in the Report (read once; the Report then shows the latest fight). */
export const REPORT_FIGHT_KEY = "pm.reportFight";
