// Daevanion Planner and Character Builder math, on the game data archive (no React, so tests run it directly).
// Planner: adjacency is the orthogonal grid of a board; a picked node must stay connected to the board's Start
// node through picked nodes. Empty cells (kind "None") are layout only: never picked, never a path.
// Stats are summed in display units: raw values of percent stats (stat_dictionary.percent) are ×100.

import type { BuilderData, EnhancementValue, GearPiece, Planner, PlannerNodeData } from "../../../data/db/types";
import PET_GENUS from "../../../data/pet_genus_effects.json" with { type: "json" };

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

/** `bonus`: enhancement bonus; `extra`: the item's own bonus stats read from the game (display units). */
export type Equipped = { piece: GearPiece; enh: number; bonus: [key: string, value: number][]; extra?: [key: string, value: number][] };

/**
 * What one point of each attribute gives (raw, percent stats ×100), up to maxPoints points: the archive's
 * stat-conversion.json (global_204, planner_collections), as the game's character window explains each attribute.
 */
const STAT_CONVERSION: [attr: string, maxPoints: number, perPoint: [stat: string, raw: number][]][] = [
  ["STR", 1000, [["DamageRatio", 10]]],
  ["DEX", 1000, [["EvasionRatio", 10], ["BlockRatio", 10], ["CriticalResistRatio", 10]]],
  ["INT", 1000, [["AbnormalAccuracy", 10]]],
  ["CON", 1000, [["MaxHPRatio", 10]]],
  ["AGI", 1000, [["AccuracyRatio", 10], ["CriticalRatio", 10]]],
  ["WIS", 1000, [["AbnormalResistance", 10]]],
  ["Justice", 1000, [["DefenseRatio", 10], ["Perfect", 10]]],
  ["Destruction", 1000, [["DamageRatio", 10], ["PerfectResist", 10]]],
  ["Freedom", 1000, [["AccuracyRatio", 10], ["EvasionRatio", 10]]],
  ["Death", 1000, [["CriticalRatio", 10], ["IgnoreRestoration", 10]]],
  ["Illusion", 1000, [["CoolTimeIncrease", -10], ["IgnoreIronWall", 10]]],
  ["Wisdom", 1000, [["MPUseIncrease", -10], ["HardHit", 10]]],
  ["Life", 1000, [["MaxHPRatio", 10], ["Restoration", 10]]],
  ["Destiny", 1000, [["MaxMPRatio", 10], ["IronWall", 10]]],
  ["Time", 1000, [["CombatSpeed", 10], ["HardHitResist", 10]]],
  ["Space", 1000, [["MoveSpeed", 10], ["BlockRatio", 10]]],
];

/** The stats some attribute points give (display units): `points` by attribute, `pct` the percent stat keys. */
export function derivedStats(points: Record<string, number>, pct: Set<string>): [key: string, value: number][] {
  return STAT_CONVERSION.flatMap(([attr, max, per]) => {
    const n = Math.min(points[attr] ?? 0, max);
    return n > 0 ? per.map(([k, raw]) => [k, statValue(raw * n, pct.has(k))] as [string, number]) : [];
  });
}

/**
 * Every source added up, in display units: base for the level, gear fixed stats + enhancement bonus + its own bonus
 * stats, Daevanion nodes, pet collection effects (the ones that are character stats, see petStatKey), then what the
 * attribute points give (STAT_CONVERSION).
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
    for (const [k, v] of g.extra ?? []) add(k, v);
  }
  for (const [k, v] of Object.entries(plan.stats)) add(k, statValue(v, pct.has(k)));
  for (const [k, v] of pets) {
    const key = petStatKey(k, known);
    if (key && Number.isFinite(v)) add(key, v);
  }
  for (const [k, v] of derivedStats(out, pct)) add(k, v);
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

/**
 * Stats that are no stat of the character: the mount's (the Pet window lists them) and the wings' Flight Power
 * (FPMax: no class base value to add it to, so a total would only repeat the wing's figure).
 */
const MOUNT_STATS = new Set(["GroundVehicleSpeed", "VehicleSpeed", "VehicleSprintSpeed", "VehicleSprintCost", "FPMax"]);

/**
 * The Builder stat a pet, wing or title effect adds to, or null when it adds to none (mount and flight stats, keys
 * the stat dictionary does not have). The Builder sums the game's own stat keys, so a known key maps to itself. The capture uses this too.
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

/** What one pet of each genus gives at levels 1-3, and each creature's genus (scripts/build-pet-effects.mjs). */
const PET_FX = PET_GENUS as unknown as { levels: Record<string, PetEffect[][]>; genus: Record<string, string> };

/** What a pet gives at its level: each level replaces the one before (level 3 = tier 3 alone); Special pets give none. */
export const petLevelEffects = (code: string, lvl: number): PetEffect[] => PET_FX.levels[PET_FX.genus[code]]?.[lvl - 1] ?? [];

/** The collection effects of the owned pets (of one genus, if given), summed by stat, as the game's Pet window lists them. */
export function petCollection(owned: PetSet, genus?: string): PetEffect[] {
  const sum = new Map<string, PetEffect>();
  for (const [code, p] of Object.entries(owned)) {
    if (genus && PET_FX.genus[code] !== genus) continue;
    for (const [k, v, pct] of petLevelEffects(code, p.lvl)) sum.set(k, [k, Math.round(((sum.get(k)?.[1] ?? 0) + v) * 100) / 100, pct]);
  }
  return [...sum.values()];
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

/**
 * Arcana game id → the archive's Arcana: 810 <type 1 Grail, 2 Parchment, 3 Compass, 4 Bell, 5 Mirror> <grade 3 Unique,
 * 4 Legend, 5 Rare, 6 Common> <set, 4 digits> (NCSOFT TW item data: 810130001 is the Unique Grail of set
 * Arcana_A_set_001, Time 20, as Arcana_Grail_A_u_set_001_b).
 */
export function arcanaCode(id: string): string | undefined {
  const m = /^810([1-5])([3-6])0(\d{3})$/.exec(id);
  return m ? `Arcana_${["Grail", "Parchment", "Compass", "Bell", "Mirror"][Number(m[1]) - 1]}_A_${"ulrc"[Number(m[2]) - 3]}_set_${m[3]}_b` : undefined;
}

/** Builder slot of each game equipment slot (equip_parser.rs). Slots the Builder has no place for are left out. */
export const GAME_SLOTS: Record<number, string> = {
  1: "weapon", 2: "offhand", 3: "Helmet", 4: "Shoulder", 5: "Torso", 6: "Pants", 7: "Gloves", 8: "Boots",
  10: "Necklace", 11: "Earring 1", 12: "Earring 2", 13: "Ring 1", 14: "Ring 2", 15: "Bracelet", 16: "Bracelet 2",
  17: "Belt", 19: "Cape", 22: "Amulet", 23: "Rune", 24: "Rune 2",
};

// ---------- Wings and titles ----------
// Both add to the totals as effects next to the pets' (buildStats `pets`), in display units.

/** The wing of a build (pm.buildData): record id of category "wing" and enchant level. */
export type WingPick = { id: string; enh: number };
/** A saved wing as stored, or undefined (settings can be hand-edited). The level is capped by the wing's max where shown. */
export function readWing(v: unknown): WingPick | undefined {
  if (!v || typeof v !== "object") return undefined;
  const { id, enh } = v as Record<string, unknown>;
  if (typeof id !== "string" || !/^Wing_[A-Za-z0-9_]{1,60}$/.test(id)) return undefined;
  return { id, enh: Number.isInteger(enh) && (enh as number) >= 0 && (enh as number) <= 30 ? (enh as number) : 0 };
}
/** A saved title id as stored (8 digits, first 1-4), or undefined. */
export const readTitle = (v: unknown): number | undefined => (typeof v === "number" && Number.isInteger(v) && v >= 1e7 && v < 5e7 ? v : undefined);

/** The archive's race of a wing or title: Light = Elyos, Dark = Asmodian, anything else both. */
export const raceFits = (race: string | null | undefined, faction?: "elyos" | "asmodian") =>
  !faction || (race !== "Light" && race !== "Dark") || (race === "Light") === (faction === "elyos");
/**
 * A title's race from its id: 1xxxxxxx and 2xxxxxxx are the Elyos and Asmodian versions of the same title (checked by
 * name against the archive's title records: 151 Light and 150 Dark, none crossed), 3xxxxxxx and 4xxxxxxx both.
 */
export function titleRace(id: number) {
  const d = Math.floor(id / 1e7);
  return d === 1 ? "Light" : d === 2 ? "Dark" : "All";
}

/**
 * What a wing gives at an enchant level: its own stats plus its enchant group's at exactly that level (the group's
 * values are the level's totals, "reported_group_stats", not bonuses to add up). Raw values; percent = ×100.
 */
export function wingStats(own: { stat: string; value: number }[], levels: EnhancementValue[], enh: number, pct: Set<string>): PetEffect[] {
  const at = levels.filter((v) => v.level === enh && v.status === "published" && v.value_kind === "reported_group_stats" && v.value_raw != null);
  return [
    ...own.filter((s) => typeof s?.stat === "string" && Number.isFinite(s.value)).map((s): PetEffect => [s.stat, statValue(s.value, pct.has(s.stat)), pct.has(s.stat)]),
    ...at.map((v): PetEffect => [v.stat_key, statValue(v.value_raw!, v.percent === 1), v.percent === 1]),
  ];
}

/**
 * A title's stats ([English display label, raw value]) as effects on the Builder's stat keys: a label is the stat
 * dictionary's name of the stat. Labels the dictionary has no name for are returned apart, shown but not added.
 */
export function titleStats(list: [label: string, raw: number][], dict: BuilderData["stats"]): { fx: PetEffect[]; unmapped: [string, number][] } {
  const byName = new Map(dict.map((s) => [s.name, s]));
  const fx: PetEffect[] = [];
  const unmapped: [string, number][] = [];
  for (const [label, raw] of list) {
    const s = byName.get(label);
    if (s) fx.push([s.stat_key, statValue(raw, s.percent === 1), s.percent === 1]);
    else unmapped.push([label, raw]);
  }
  return { fx, unmapped };
}
