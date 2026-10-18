import { invoke } from "@tauri-apps/api/core";

// Gathering nodes and pet monsters on the map (scripts/build-map-points.mjs, Taiwan v105 datamine).
// Loaded on demand: 300 KB that only the map and the pets' location need.

/** monster id, English Global name, level. */
export type PetMonster = [id: number, name: string, level: number | null];
export type MapPoints = {
  groups: string[];
  /** Creature code → the monsters that give it. */
  pets: Record<string, PetMonster[]>;
  /** Flat [group index | monster id, x, y, ...] in map pixels. */
  maps: Record<string, { gather: number[]; monsters: number[] }>;
};

let loading: Promise<MapPoints> | undefined;
export const loadPoints = () => (loading ??= import("../../../data/map/points.json").then((m) => m.default as unknown as MapPoints));

/** Gathering layers, in panel order (same keys as points.json groups). */
export const GATHER_GROUPS = ["od", "gem", "metal", "herb", "shellfish", "vegetable", "wood", "berry"];

// Game icons of the gathering layers (one per group, copied from the datamine).
const GATHER = import.meta.glob<string>("../../../assets/pm/map/*.png", { eager: true, import: "default" });
export const gatherIcon = (group: string) => GATHER[`../../../assets/pm/map/${group}.png`];

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
