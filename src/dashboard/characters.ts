import { invoke } from "@tauri-apps/api/core";
import type { SaveSetting, Settings } from "./App";
import { USER_NAME_KEY } from "./Shell";

// The user's characters, kept in settings as JSON so every window sees the
// same list. The active one is mirrored into the keys the rest of the app
// already reads (pm.class, pm.region, the meter's name), so switching
// character re-targets builder, skill planner, Daevanion etc. for free.
export type Character = { id: string; name: string; cls: string; region: string; level?: number; cp?: number };

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

export const newId = () => `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const saveCharacters = (save: SaveSetting, list: Character[]) => save(CHARACTERS_KEY, JSON.stringify(list));

export async function activate(save: SaveSetting, c: Character) {
  localStorage.setItem(USER_NAME_KEY, c.name);
  await invoke("set_character_name", { name: c.name });
  await save("pm.region", c.region);
  await save(ACTIVE_KEY, c.id);
  await save("pm.class", c.cls);
}
