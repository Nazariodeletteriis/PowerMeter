// Game data archive (src-tauri/src/gamedata.rs): what the gamedata_* commands return.
// The single source for items and every other game record: a `records` row (category, id, name, full JSON)
// plus the child tables (item_stats, enhancement_values, monster_drops, recipe_components, ...).
// null = not published: show "n.d.", never 0.

export type Category =
  | "item" | "monster" | "quest" | "recipe" | "skill" | "map" | "dungeon"
  | "title" | "wing" | "creature" | "daevanion_board" | "daevanion_node";

/** gamedata_get. `data_json` is the record as the archive holds it (shape depends on the category). */
export interface GameRecord {
  category: Category;
  id: string; // game id, always text
  name: string | null;
  in_game_values_verified: 0 | 1;
  image_paths_json: string[];
  data_json: Record<string, unknown>;
}

/** gamedata_search */
export type SearchHit = Pick<GameRecord, "category" | "id" | "name">;

/** gamedata_monster_drops */
export interface MonsterDrop {
  item_code: string;
  name: string | null;
  quantity: number | null;
  probability: number | null;
  quantity_status: string;
  probability_status: string;
}

/** gamedata_item_recipes */
export interface ItemRecipes {
  crafted_by: Pick<GameRecord, "id" | "name" | "data_json">[];
  used_in: { recipe_id: string; quantity: number | null }[];
  splendent: Record<string, string | number | null>[];
}

/** gamedata_planner: ids are "<class>:<board>" / "<class>:<node>". */
export interface Planner {
  boards: Pick<GameRecord, "id" | "name" | "data_json">[];
  nodes: Pick<GameRecord, "id" | "name" | "data_json">[];
}

/** gamedata_sync */
export interface SyncResult {
  version: number | null;
  updated: boolean;
  removed: string[];
}

/** gamedata_list: one row of a category list (null = the category has no such field). */
export interface ListRow {
  id: string;
  name: string | null;
  grade: string | null;
  level: number | null;
  kind: string | null;
  icon: string | null;
  /** Items only: facts.exchange (Exchangeable, NonExchangeable, SoulBind, SoulBind_Acquire). */
  exchange?: string | null;
  /** Items only: item.race (Light, Dark, All, None). */
  race?: string | null;
  /** Items only: the item's source types, comma-separated (monster,quest,shop...). */
  sources?: string | null;
}

/** gamedata_counts */
export interface CategoryCount {
  category: Category;
  n: number;
}

/** gamedata_icons: icon name → image URL on our CDN (icons without an image are missing). */
export type IconUrls = Record<string, string>;

/** gamedata_rows("item_stats", "item_code", id). Raw values are ×100 for percent stats; *_display are ready to show. */
export interface ItemStat {
  stat_key: string;
  label: string | null;
  fixed_display: number | null;
  min_display: number | null;
  max_display: number | null;
  unit: "number" | "percent" | string;
  is_rolled: 0 | 1;
}

/** gamedata_rows("item_enhancement_groups", "item_code", id) */
export interface EnhancementGroup {
  enchant_group: string;
  max_published_level: number | null;
  group_status: string;
}

/** gamedata_rows("enhancement_values", "enchant_group", group). `percent` = value_raw / 100 %. */
export interface EnhancementValue {
  level: number;
  stat_key: string;
  value_raw: number | null;
  percent: 0 | 1;
  value_kind: "enhancement_bonus" | "reported_group_stats" | string;
  status: "published" | "derived_zero_baseline" | string;
}

/** gamedata_rows("monster_regions", "monster_id", id): membership only, no coordinates on Global. */
export interface MonsterRegion {
  map_id: string;
  map_name: string | null;
  region: string | null;
}

/** gamedata_rows("quest_item_rewards", "quest_id", id) */
export interface QuestItemReward {
  reward_kind: "items" | "choice" | string;
  item_code: string;
  name: string | null;
  quantity: number | null;
  probability: number | null;
}

/** gamedata_rows("quest_currency_rewards", "quest_id", id) */
export interface QuestCurrencyReward {
  currency_kind: string;
  quantity: number | null;
}

/** gamedata_dungeons */
export interface Dungeon {
  dungeon_id: string;
  name: string | null;
  type: string | null;
  type_label: string | null;
  tier: string | null;
  tier_name: string | null;
  min_level: number | null;
  item_level: number | null;
  entries: number | null;
  reset_day: string | null;
  location_name: string | null;
  tickets_json: { name: string; kind?: string; resetDay?: string; maxCount?: number }[] | null;
}
export interface DungeonBoss {
  dungeon_id: string;
  boss_index: number;
  monster_id: string | null;
  name: string | null;
  level: number | null;
  final: number | null;
}

/** gamedata_rows("splendent_recipes", "recipe_id", id) */
export interface SplendentRecipe {
  recipe_id: string;
  kinah: number | null;
  route_kind: string | null;
}

/** gamedata_rows("skill_coefficients", "skill_id", id). ratio percent = % ATK. */
export interface SkillCoefficient {
  attack_ratio_min_percent: number | null;
  attack_ratio_max_percent: number | null;
  flat_min: number | null;
  flat_max: number | null;
  hits: number | null;
  cooldown_ms: number | null;
  mp_cost: number | null;
  range_cm: number | null;
}
/** gamedata_rows("skill_effects", "skill_id", id): effect text per skill level. */
export interface SkillEffect {
  level: number;
  effect: string | null;
}

/** gamedata_gear: equipment with fixed stats [stat_key, label, value, unit]. */
export interface GearPiece {
  id: string;
  name: string | null;
  slot: string | null;
  grade: string | null;
  level: number | null;
  icon: string | null;
  max_enh: number | null;
  stats_json: [key: string, label: string | null, value: number | null, unit: string][];
}

/** data_json of a daevanion_node record ("None" kind = empty grid cell, kept for the layout). */
export interface PlannerNodeData {
  id: number;
  board: number;
  row: number;
  col: number;
  rarity: string;
  kind: "Start" | "Stat" | "SkillLevel" | "None" | string;
  cost: number;
  title?: string;
  /** Stat key, or the skill id on SkillLevel nodes. */
  stat?: string;
  value?: string;
  stats?: { stat: string; value: string }[];
  skillIcon?: string;
}
/** data_json of a daevanion_board record. */
export interface PlannerBoardData {
  board: number;
  title: string;
  unlockLevel: number | null;
  pointType: string;
}

/** gamedata_builder(class): `percent` stats have raw values ×100. */
export interface BuilderData {
  stats: { stat_key: string; name: string | null; percent: 0 | 1; grp: string | null }[];
  base: { level: number; stats_json: Record<string, number> }[];
  /** Points per point type (DaevanionCrystal, BattleCrystal, ...); null when not in the archive. */
  budgets: Record<string, number> | null;
  skills: {
    skill_id: string;
    name: string | null;
    attack_ratio_min_percent: number | null;
    attack_ratio_max_percent: number | null;
    flat_min: number | null;
    flat_max: number | null;
    hits: number | null;
    cooldown_ms: number | null;
  }[];
}
