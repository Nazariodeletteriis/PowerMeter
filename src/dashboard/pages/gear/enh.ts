// Enhancement level and rolled bonuses of a piece, as the Gear Viewer compare sets them (no React, so tests run it).
// Values are in display units, like buildStats sums them: percent stats as 4.08 for 4.08%.

import type { EnhancementGroup, EnhancementValue, ItemStat } from "../../../data/db/types";
import { statValue } from "../characters/calc.ts";

/** gd.rows: a child table of the archive read by one key. */
export type Rows = <R>(table: string, column: string, value: string) => Promise<R[]>;

/** Published enhancement bonuses of an item (first group; never extrapolated past max_published_level). */
export async function enhancementOf(rows: Rows, id: string): Promise<EnhancementValue[]> {
  const g = (await rows<EnhancementGroup>("item_enhancement_groups", "item_code", id))[0];
  if (!g?.enchant_group) return [];
  const max = g.max_published_level ?? 0;
  const vals = await rows<EnhancementValue>("enhancement_values", "enchant_group", g.enchant_group);
  return vals.filter((v) => v.status === "published" && v.value_kind === "enhancement_bonus" && v.level >= 1 && v.level <= max && v.value_raw != null);
}

/** The archive's data stops at +15; the game goes on to +20 (Builder: +16 to +20 read as +15 values). */
const ARCHIVE_MAX_ENH = 15;
const GAME_MAX_ENH = 20;

/** Levels to pick: +0, every published one and, for pieces published up to +15, the game's +16 to +20. */
export function enhSteps(levels: EnhancementValue[]): number[] {
  const published = [0, ...new Set(levels.map((v) => v.level))].sort((a, b) => a - b);
  const last = published[published.length - 1];
  return last === ARCHIVE_MAX_ENH ? [...published, ...Array.from({ length: GAME_MAX_ENH - last }, (_, i) => last + 1 + i)] : published;
}

/** Bonus at a level; past the last published level the piece keeps that level's bonus (the Builder's rule). */
export function enhBonus(levels: EnhancementValue[], enh: number): [string, number][] {
  const lv = levels.reduce((m, v) => (v.level <= enh && v.level > m ? v.level : m), 0);
  return levels.filter((v) => v.level === lv).map((v) => [v.stat_key, statValue(v.value_raw!, v.percent === 1)]);
}

/** A bonus on the piece: stat key, value, 1 when added by hand (the archive has no options for the piece). */
export type Opt = [key: string, value: number, manual: 0 | 1];
export type Tune = { enh: number; opts: Opt[] };
/** Enhancement and bonuses per piece id, settings["pm.gear.tune"]. */
export const TUNE_KEY = "pm.gear.tune";

const KEY = /^[A-Za-z0-9_]{1,60}$/;
/** Hand-typed values: a sane size, two decimals. */
export const manualValue = (v: number) => Math.round(Math.max(-1e6, Math.min(1e6, v)) * 100) / 100;

/** Saved choices of the expected shape only (the setting is a file anyone can edit). */
export function readTunes(json?: string): Record<string, Tune> {
  let v: unknown;
  try {
    v = JSON.parse(json ?? "{}");
  } catch {
    return {};
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, Tune> = {};
  for (const [id, t] of Object.entries(v)) {
    if (!KEY.test(id) || !t || typeof t !== "object") continue;
    const { enh, opts } = t as { enh?: unknown; opts?: unknown };
    out[id] = {
      enh: Number.isInteger(enh) && (enh as number) >= 0 && (enh as number) <= GAME_MAX_ENH ? (enh as number) : 0,
      opts: Array.isArray(opts)
        ? opts.filter((o): o is Opt => Array.isArray(o) && typeof o[0] === "string" && KEY.test(o[0]) && Number.isFinite(o[1]) && (o[2] === 0 || o[2] === 1))
        : [],
    };
  }
  return out;
}

/** A value inside an option's range, on its step (0.01 for percent stats, 1 otherwise). */
export function inRange(s: ItemStat, v: number): number {
  const step = s.unit === "percent" ? 100 : 1;
  const lo = s.min_display ?? v;
  const hi = s.max_display ?? v;
  return Math.round(Math.min(hi, Math.max(lo, v)) * step) / step;
}

/**
 * The bonuses that hold for the piece: with archive options, only those (each once, in its range); without,
 * only the hand-added ones.
 */
export function fitOpts(opts: Opt[], rolled: ItemStat[]): Opt[] {
  const seen = new Set<string>();
  return opts.flatMap(([k, v, manual]): Opt[] => {
    if (seen.has(k)) return [];
    seen.add(k);
    if (!rolled.length) return manual ? [[k, manualValue(v), 1]] : [];
    const s = rolled.find((r) => r.stat_key === k);
    return s && !manual ? [[k, inRange(s, v), 0]] : [];
  });
}
