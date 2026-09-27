import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { art, CLASSES } from "../../ui";
import { findSkill, type GameSkill } from "../../skills";
import { BADGES, CLASS_SKILLS, DURATION, PARTY, SKILL_HITS, SKILL_KIDS, SKILL_SHARE } from "../../sample/combat";
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

// ---------- sample party (prototype pCommon) ----------
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

/** Party sorted by DPS; `tick` adds the prototype's live wobble (meter only). */
export function sampleParty(tick?: number): Row[] {
  const rows = PARTY.map(([n, cls, cp, dps, deaths, me], i) => {
    const d = tick == null ? dps : dps * (1 + 0.035 * Math.sin(tick * 0.8 + i * 1.3));
    return { key: i, n, cls, cp, dps: d, dmg: d * DURATION, deaths, me: !!me, i };
  });
  return rank(rows);
}

/** Adds position, share of damage and bar width, sorted by DPS. */
export function rank(rows: Omit<Row, "pos" | "pct" | "barW" | "hits">[]): Row[] {
  const tot = rows.reduce((a, r) => a + r.dmg, 0) || 1;
  const max = Math.max(...rows.map((r) => r.dps)) || 1;
  return rows
    .sort((a, b) => b.dps - a.dps)
    .map((r, k) => ({ ...r, pos: k + 1, pct: (r.dmg / tot) * 100, barW: (r.dps / max) * 100, hits: Math.round(r.dmg / 13400) }));
}

/** Prototype pMeter series: 60 DPS samples of one player, with the phase-2 dip and Vharok's death. */
export function samplePoints(p: Pick<Row, "n" | "i" | "dps">) {
  const pts: number[] = [];
  for (let k = 0; k < 60; k++) {
    let v = p.dps * (0.8 + 0.18 * Math.sin(k * 0.35 + p.i * 1.7) + 0.1 * Math.sin(k * 1.3 + p.i));
    if (k >= 30 && k <= 33) v *= 0.25;
    if (p.n === "Vharok" && k >= 41 && k <= 45) v = 0;
    pts.push(v);
  }
  return pts;
}

export function sampleSeries(rows: Row[]) {
  return rows.map((p) => ({ key: p.key, col: classColor(p.cls), d: path(samplePoints(p), 26000) }));
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

// ---------- sample skills of one player (prototype pReport) ----------
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

export function sampleSkills(p: Row, key: keyof Skill = "dmg", dir = -1): Skill[] {
  const names = CLASS_SKILLS[p.cls] ?? CLASS_SKILLS.Sorcerer;
  return names
    .map((n, j) => {
      const dmg = p.dmg * SKILL_SHARE[j];
      const hits = SKILL_HITS[j] + p.i * 3;
      const avg = dmg / hits;
      return {
        n,
        j,
        dmg,
        pct: SKILL_SHARE[j] * 100,
        hits,
        crit: 28 + ((j * 7 + p.i * 5) % 22),
        min: avg * 0.62,
        max: avg * 2.1,
        avg,
        back: 8 + ((j * 3) % 14),
        parry: (j * 2) % 6,
        perfect: 4 + ((j * 5) % 9),
        double: (j * 4) % 12,
        multi: j === 1 || j === 4 ? 18 + j : 0,
        init: initials(n),
        sk: findSkill(n, p.cls),
        kids: SKILL_KIDS[j],
      };
    })
    .sort((a, b) => (a[key]! > b[key]! ? 1 : -1) * dir);
}

/** CRIT / BACK / PARRY / PERFECT / DOUBLE of a sample player. */
export const sampleBadges = (p: Row): [string, number][] => BADGES.map(([l, v], k) => [l, v + p.i * 0.7 - k * 0.2]);
