import { invoke } from "@tauri-apps/api/core";

// Gathering nodes and pet monsters on the map (scripts/build-map-points.mjs, Taiwan v105 datamine).
// Loaded on demand: 300 KB that only the map and the pets' location need.

/** monster id, English Global name, level. */
export type PetMonster = [id: number, name: string, level: number | null];
/** A gathering resource: key (Global item Material_Gather_<key>_f, icon file), English Global name, group. */
export type GatherResource = [key: string, name: string, group: string];
export type MapPoints = {
  /** Gathering groups, in panel order (world.layer.<group> labels them). */
  groups: string[];
  /** By group, then name. The name is the game's, never translated. */
  resources: GatherResource[];
  /** Creature code → the monsters that give it. */
  pets: Record<string, PetMonster[]>;
  /** Flat [resource index | monster id, x, y, ...] in map pixels. */
  maps: Record<string, { gather: number[]; monsters: number[] }>;
};

let loading: Promise<MapPoints> | undefined;
export const loadPoints = () => (loading ??= import("../../../data/map/points.json").then((m) => m.default as unknown as MapPoints));

// Game icon of each resource (src/assets/pm/map/<key>.png, from the datamine).
const GATHER = import.meta.glob<string>("../../../assets/pm/map/*.png", { eager: true, import: "default" });
export const gatherIcon = (key: string) => GATHER[`../../../assets/pm/map/${key}.png`];

/** Spots of a pet's monsters per map: map id → [monster id, x, y][]. */
export function petSpots(points: MapPoints, code: string) {
  const ids = new Set((points.pets[code] ?? []).map(([id]) => id));
  const out: Record<string, [number, number, number][]> = {};
  for (const [map, { monsters }] of Object.entries(points.maps))
    for (let i = 0; i < monsters.length; i += 3) if (ids.has(monsters[i])) (out[map] ??= []).push([monsters[i], monsters[i + 1], monsters[i + 2]]);
  return out;
}

/**
 * "Show this pet on the map", from any window: the Map window reads it when it opens, or through the
 * storage event when it is already open (windows of the app share localStorage), then removes it.
 */
export const MAP_FOCUS_KEY = "pm.map.focus";
export type PetFocus = { pet: string; char?: string };
export function showOnMap(focus: PetFocus) {
  localStorage.setItem(MAP_FOCUS_KEY, JSON.stringify(focus));
  return invoke("open_map_window");
}
export function takeMapFocus(raw = localStorage.getItem(MAP_FOCUS_KEY)): PetFocus | undefined {
  if (!raw) return undefined;
  localStorage.removeItem(MAP_FOCUS_KEY);
  try {
    const v = JSON.parse(raw);
    return typeof v?.pet === "string" ? { pet: v.pet, char: typeof v.char === "string" ? v.char : undefined } : undefined;
  } catch {
    return undefined; // hand-edited
  }
}
