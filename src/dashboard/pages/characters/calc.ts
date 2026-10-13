// Daevanion Planner and Character Builder math, on the game data archive (no React, so tests run it directly).
// Planner: adjacency is the orthogonal grid of a board; a picked node must stay connected to the board's Start
// node through picked nodes. Empty cells (kind "None") are layout only: never picked, never a path.
// Stats are summed in display units: raw values of percent stats (stat_dictionary.percent) are ×100.

import type { BuilderData, EnhancementValue, GearPiece, Planner, PlannerNodeData } from "../../../data/db/types";

export type PNode = {
  id: string;
  board: number;
  row: number;
  col: number;
  kind: string; // Start | Stat | SkillLevel | None
  rarity: string;
  cost: number;
  title: string | null;
  /** Raw stat values (Stat nodes). */
  stats: [key: string, raw: number][];
  /** Skill level bonus (SkillLevel nodes): skill id and levels. */
  skill?: { id: string; levels: number; icon?: string };
};

export function plannerNodes(p: Planner): PNode[] {
  return p.nodes.map(({ id, data_json: d }) => {
    const n = d as unknown as PlannerNodeData;
    const list = n.stats ?? (n.stat ? [{ stat: n.stat, value: n.value ?? "" }] : []);
    return {
      id,
      board: n.board,
      row: n.row,
      col: n.col,
      kind: n.kind,
      rarity: n.rarity,
      cost: n.cost ?? 0,
      title: n.title ?? null,
      stats: n.kind === "Stat" ? list.map((s) => [s.stat, Number(s.value)] as [string, number]).filter(([, v]) => Number.isFinite(v)) : [],
      skill: n.kind === "SkillLevel" && n.stat ? { id: n.stat, levels: Number(n.value) || 0, icon: n.skillIcon } : undefined,
    };
  });
}

const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function graph(nodes: PNode[]) {
  const at = new Map(nodes.map((n) => [`${n.board}:${n.row}:${n.col}`, n]));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const near = (n: PNode) =>
    STEPS.map(([r, c]) => at.get(`${n.board}:${n.row + r}:${n.col + c}`)).filter((x): x is PNode => !!x && x.kind !== "None");
  return { byId, near };
}

/** The picked nodes still connected to a Start node (unknown ids, Start and empty cells dropped): reload validation and pruning. */
export function connected(nodes: PNode[], picked: Iterable<string>): string[] {
  const { byId, near } = graph(nodes);
  const chosen = new Set(picked);
  const seen = new Set<string>();
  const queue = nodes.filter((n) => n.kind === "Start");
  while (queue.length) {
    const n = queue.pop()!;
    if (seen.has(n.id)) continue;
    seen.add(n.id);
    for (const next of near(n)) if (next.kind === "Start" || chosen.has(next.id)) queue.push(next);
  }
  return [...chosen].filter((id) => seen.has(id) && byId.get(id)!.kind !== "Start");
}

/** Next selection after clicking a node, or null when it cannot be picked (not next to the path, Start, empty). */
export function toggle(nodes: PNode[], picked: string[], id: string): string[] | null {
  const { byId, near } = graph(nodes);
  const n = byId.get(id);
  if (!n || n.kind === "Start" || n.kind === "None") return null;
  if (picked.includes(id)) return connected(nodes, picked.filter((x) => x !== id));
  const set = new Set(picked);
  if (!near(n).some((x) => x.kind === "Start" || set.has(x.id))) return null;
  return [...picked, id];
}

/** Can be picked now: next to a Start node or a picked one. */
export function reachableNow(nodes: PNode[], picked: string[]): Set<string> {
  const { near } = graph(nodes);
  const set = new Set(picked);
  return new Set(nodes.filter((n) => n.kind !== "None" && n.kind !== "Start" && !set.has(n.id) && near(n).some((x) => x.kind === "Start" || set.has(x.id))).map((n) => n.id));
}

export type PlanTotals = {
  spent: Record<number, number>;
  /** Raw stat values summed (display them with statValue). */
  stats: Record<string, number>;
  /** Skill level bonuses by skill id, with the node title. */
  skills: Record<string, { title: string; levels: number; icon?: string }>;
};

export function planTotals(nodes: PNode[], picked: string[]): PlanTotals {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: PlanTotals = { spent: {}, stats: {}, skills: {} };
  for (const id of connected(nodes, picked)) {
    const n = byId.get(id)!;
    out.spent[n.board] = (out.spent[n.board] ?? 0) + n.cost;
    for (const [k, v] of n.stats) out.stats[k] = (out.stats[k] ?? 0) + v;
    if (n.skill) {
      const s = (out.skills[n.skill.id] ??= { title: n.title ?? n.skill.id, levels: 0, icon: n.skill.icon });
      s.levels += n.skill.levels;
    }
  }
  return out;
}

/** Points every node of each board costs together (the board's maximum). */
export function boardMax(nodes: PNode[]): Record<number, number> {
  const out: Record<number, number> = {};
  for (const n of nodes) out[n.board] = (out[n.board] ?? 0) + n.cost;
  return out;
}

/** Saved plans: settings["pm.daevanion"] = { [class]: { profile, nodes } }. */
export const PLAN_KEY = "pm.daevanion";
export const PLAN_PROFILE = "global_204";
export type SavedPlans = Record<string, { profile: string; nodes: string[] }>;
export function readPlans(json?: string): SavedPlans {
  try {
    const v = JSON.parse(json ?? "");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {}; // missing or hand-edited
  }
}
/** Node ids of a class's saved plan (only for the profile the archive holds). */
export const savedNodes = (plans: SavedPlans, cls: string) => {
  const p = plans[cls];
  return p?.profile === PLAN_PROFILE && Array.isArray(p.nodes) ? p.nodes.filter((x) => typeof x === "string") : [];
};

// ---------- Character Builder ----------

/** Raw archive value → display value (percent stats are ×100). */
export const statValue = (raw: number, percent: boolean) => (percent ? raw / 100 : raw);

export type Equipped = { piece: GearPiece; enh: number; bonus: [key: string, value: number][] };

/**
 * Every source added up, in display units: base for the level, gear fixed stats + enhancement bonus, Daevanion
 * nodes, pet collection effects (the ones that are character stats, see petStatKey).
 */
export function buildStats(data: BuilderData, level: number, gear: Equipped[], plan: PlanTotals, pets: PetEffect[] = []): Record<string, number> {
  const pct = new Set(data.stats.filter((s) => s.percent).map((s) => s.stat_key));
  const known = new Set(data.stats.map((s) => s.stat_key));
  const out: Record<string, number> = {};
  const add = (k: string, v: number) => (out[k] = (out[k] ?? 0) + v);
  for (const [k, v] of Object.entries(data.base.find((b) => b.level === level)?.stats_json ?? {})) add(k, statValue(v, pct.has(k)));
  for (const g of gear) {
    for (const [k, , v] of g.piece.stats_json ?? []) if (v != null) add(k, v);
    for (const [k, v] of g.bonus) add(k, v);
  }
  for (const [k, v] of Object.entries(plan.stats)) add(k, statValue(v, pct.has(k)));
  for (const [k, v] of pets) {
    const key = petStatKey(k, known);
    if (key && Number.isFinite(v)) add(key, v);
  }
  return out;
}

// ---------- Pets ----------

/** A pet of the collection: level 1-3, progress toward the next level (levels 1-2, 0-PET_EXP_MAX), the equipped one. */
export type PetState = { lvl: 1 | 2 | 3; exp: number; eq?: true };
/** Owned pets by creature code (records of category "creature"). */
export type PetSet = Record<string, PetState>;
/** A collection effect as the game's Pet window lists it: stat key (stat_dictionary), value in display units (4.7 = 4.7%), percent. */
export type PetEffect = [statKey: string, value: number, percent: boolean];
export const PET_EXP_MAX = 75;

/** Mount-only stats: the Pet window lists them, but they are no stat of the character. */
const MOUNT_STATS = new Set(["GroundVehicleSpeed", "VehicleSpeed", "VehicleSprintSpeed", "VehicleSprintCost"]);

/**
 * The Builder stat a pet effect adds to, or null when it adds to none (mount stats, keys the stat dictionary does
 * not have). The Builder sums the game's own stat keys, so a known key maps to itself. The capture uses this too.
 */
export const petStatKey = (key: string, known: Set<string>) => (known.has(key) && !MOUNT_STATS.has(key) ? key : null);

/** The game's collection (get_captured_character `pets`, TW pet ids) as a PetSet; ids missing from `codes` are left out. */
export function petsFromGame(pets: { id: number; lvl: number; exp: number }[], codes: Record<string, string>): PetSet {
  const out: PetSet = {};
  for (const p of pets) {
    const code = codes[p.id];
    if (code && (p.lvl === 1 || p.lvl === 2 || p.lvl === 3)) out[code] = { lvl: p.lvl, exp: p.lvl === 3 ? 0 : Math.min(PET_EXP_MAX, p.exp) };
  }
  return out;
}

/** Pets owned: the ones read from the game win over the ones marked by hand, and so does the game's equipped pet. */
export function ownedPets(manual: PetSet, game?: PetSet): PetSet {
  if (!game) return manual;
  const gameEq = Object.values(game).some((p) => p.eq);
  const kept = Object.entries(manual).map(([c, p]) => [c, gameEq ? { lvl: p.lvl, exp: p.exp } : p]);
  return { ...Object.fromEntries(kept), ...game };
}

/**
 * ESTIMATES, not the game's numbers (the archive has no Combat Power formula).
 * Attack = average of weapon Min/Max Attack + Attack + Attack Bonus.
 * DPS = every damage skill used as soon as it is ready: Σ (Attack × ratio% + flat) × hits ÷ cooldown s.
 * CP = Attack + Defense (both kinds) + HP ÷ 10.
 */
export function estimates(stats: Record<string, number>, skills: BuilderData["skills"]) {
  const s = (k: string) => stats[k] ?? 0;
  const attack = (s("WeaponMinDamage") + s("WeaponDamage")) / 2 + s("WeaponFixingDamage") + s("FixingDamage");
  let dps = 0;
  for (const k of skills) {
    if (!k.cooldown_ms || k.attack_ratio_min_percent == null) continue;
    const ratio = (k.attack_ratio_min_percent + (k.attack_ratio_max_percent ?? k.attack_ratio_min_percent)) / 2;
    const flat = ((k.flat_min ?? 0) + (k.flat_max ?? k.flat_min ?? 0)) / 2;
    dps += ((attack * ratio) / 100 + flat) * (k.hits ?? 1) / (k.cooldown_ms / 1000);
  }
  return { attack: Math.round(attack), dps: Math.round(dps), cp: Math.round(attack + s("ArmorDefense") + s("Defense") + s("HPMax") / 10) };
}

/** gamedata_tw_gear row: Taiwan item data, keyed by the game's numeric item id. Values are the item card's text. */
export type TwGearRow = {
  id: string;
  name: string | null;
  slot: string | null;
  grade: string | null;
  level: number | null;
  /** asset_<sha>, resolved like the game's icon names (gamedata_icons); null in archives before 0.4.6. */
  icon: string | null;
  stats_json: [key: string | null, label: string | null, value: string | null][];
  /** [level, stats, extra stats] per enhancement level; stats are { key: "10" | "1%" } or []. */
  enh_json: [level: number, stats: Record<string, string> | [], extra: Record<string, string> | []][];
};

/** "100,000" → 100000, "40%" → 40 percent, "+250" → 250; anything else (e.g. "20m") is not a number. */
function twNumber(text: string): { v: number; percent: boolean } | undefined {
  const m = /^\+?(-?[\d,]+(?:\.\d+)?)(%?)$/.exec(text.trim());
  return m ? { v: Number(m[1].replace(/,/g, "")), percent: m[2] === "%" } : undefined;
}

/**
 * A Taiwan item as a Builder piece: its fixed stats (stats without a key or a value, like attack range or the
 * Exceed-only lines, are left out; "WeaponMinDamage|WeaponDamage" "203 ~ 261" is two stats) and its enhancement
 * bonus per level in the archive's shape (percent values raw ×100, as the Global data has them).
 */
export function twPiece(row: TwGearRow): { piece: GearPiece; levels: EnhancementValue[] } {
  const stats: GearPiece["stats_json"] = [];
  for (const [key, label, value] of row.stats_json ?? []) {
    if (!key || !value) continue;
    const keys = key.split("|");
    const parts = value.split("~");
    if (parts.length !== keys.length) continue;
    keys.forEach((k, i) => {
      const n = twNumber(parts[i]);
      if (n) stats.push([k, keys.length > 1 ? `${label} ${i ? "max" : "min"}` : label, n.v, n.percent ? "percent" : "number"]);
    });
  }
  const levels: EnhancementValue[] = [];
  for (const [level, a, b] of row.enh_json ?? []) {
    if (level < 1) continue;
    for (const part of [a, b]) {
      for (const [k, text] of Object.entries(Array.isArray(part) ? {} : part)) {
        const n = twNumber(text);
        if (n) levels.push({ level, stat_key: k, value_raw: n.percent ? n.v * 100 : n.v, percent: n.percent ? 1 : 0, value_kind: "enhancement_bonus", status: "published" });
      }
    }
  }
  const max = levels.reduce((m, v) => Math.max(m, v.level), 0);
  return { piece: { id: row.id, name: row.name, slot: row.slot, grade: row.grade, level: row.level, icon: row.icon ?? null, max_enh: max || null, stats_json: stats }, levels };
}

/** Builder slot of each game equipment slot (equip_parser.rs). Slots the Builder has no place for are left out. */
export const GAME_SLOTS: Record<number, string> = {
  1: "weapon", 2: "offhand", 3: "Helmet", 4: "Shoulder", 5: "Torso", 6: "Pants", 7: "Gloves", 8: "Boots",
  10: "Necklace", 11: "Earring 1", 12: "Earring 2", 13: "Ring 1", 14: "Ring 2", 15: "Bracelet", 16: "Bracelet 2",
  17: "Belt", 19: "Cape", 22: "Amulet", 23: "Rune", 24: "Rune 2",
};
