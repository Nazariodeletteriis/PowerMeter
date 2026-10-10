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
