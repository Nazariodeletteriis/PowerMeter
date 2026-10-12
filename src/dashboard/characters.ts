import type { SaveSetting, Settings } from "./App";
import { USER_NAME_KEY } from "./Shell";

// The user's characters, kept in settings as JSON so every window sees the
// same list. The active one is mirrored into the keys the rest of the app
// already reads (pm.class, pm.region, the meter's name), so switching
// character re-targets builder, skill planner, Daevanion etc. for free.
export const FACTIONS = ["elyos", "asmodian"] as const;
export type Faction = (typeof FACTIONS)[number];
// cp and gs (item level): the last ones the game showed for the character (CaptureSync), kept with the game closed.
export type Character = { id: string; name: string; cls: string; region: string; faction?: Faction; level?: number; cp?: number; gs?: number };

export const CHARACTERS_KEY = "pm.characters";
export const ACTIVE_KEY = "pm.activeCharacter";

export function readCharacters(settings: Settings): Character[] {
  try {
    const list = JSON.parse(settings[CHARACTERS_KEY] ?? "");
    if (Array.isArray(list)) return list;
  } catch {
    // Missing or hand-edited: fall back to the onboarding character below.
  }
  const name = localStorage.getItem(USER_NAME_KEY);
  const cls = settings["pm.class"];
  return name && cls ? [{ id: "c1", name, cls, region: settings["pm.region"] || "global-eu" }] : [];
}

export function activeId(settings: Settings, list: Character[]): string | undefined {
  return list.some((c) => c.id === settings[ACTIVE_KEY]) ? settings[ACTIVE_KEY] : list[0]?.id;
}

/** Edits (insert, delete, replace one letter) from a to b. */
function distance(a: string, b: string) {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}

/**
 * The roster character the game name belongs to: the same name, else the only one at most two letters off
 * (a name typed by hand, e.g. "Agnizska" for "Agniezska"). Undefined when there is none.
 */
export function findCharacter(list: Character[], name: string) {
  const key = (s: string) => s.trim().toLowerCase();
  const exact = list.find((c) => key(c.name) === key(name));
  if (exact || key(name).length < 4) return exact;
  const near = list.filter((c) => distance(key(c.name), key(name)) <= 2);
  return near.length === 1 ? near[0] : undefined;
}

export const newId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const saveCharacters = (save: SaveSetting, list: Character[]) => save(CHARACTERS_KEY, JSON.stringify(list));

// The dashboard's character only. The meter finds who you are playing by itself
// (game window title, self record in the packets), so this never touches it.
export async function activate(save: SaveSetting, c: Character) {
  await save("pm.region", c.region);
  await save(ACTIVE_KEY, c.id);
  await save("pm.class", c.cls);
}
