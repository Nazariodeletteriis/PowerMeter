import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SaveSetting, Settings } from "./App";
import { findCharacter, readCharacters, saveCharacters } from "./characters";
import PET_IDS from "../data/pet_ids.json";
import { GAME_SLOTS, petsFromGame } from "./pages/characters/calc";
import { BAR_SLOTS, CAPTURED_BAR_KEY, CAPTURED_DAEV_KEY, CAPTURED_GEAR_KEY, CAPTURED_PETS_KEY, readCapturedBar, readCapturedDaev, readCapturedGear, readPets, setMem } from "./pages/characters/shared";
import { GAME_SKILLS } from "./skills";
import { usePoll } from "./usePoll";

/** Shape of get_captured_character (src-tauri/src/capture/equip_parser.rs). */
type Captured = {
  owner: string | null;
  equipment: { slot: number; itemId: number; enchant: number }[];
  /** Row 0 is skillId, rows 1-3 the chain (0 = empty). */
  skillbar: { bar: number; slot: number; skillId: number; chain: number[] }[];
  daevanion: number[];
  gearScore: number | null;
  combatPower: number | null;
  /** Pet collection, TW pet ids (src/data/pet_ids.json maps them to creature codes). */
  pets: { id: number; lvl: number; exp: number }[];
};
const load = () => invoke<Captured>("get_captured_character");

/**
 * Copies what the game shows into the dashboard, without asking: the skill bar into the Skill Planner's quick
 * bars of its class, the worn equipment (game item ids) into the Builder's current gear of the character being
 * played. Equipment goes only to a character already in the roster (AutoCharacter asks to create a missing one),
 * and only to the one the game says wears it (`owner`): on a character switch the new inventory comes a few
 * seconds before the new name, and the name in use then is still the previous character's.
 */
export function CaptureSync({ settings, save, onError }: { settings: Settings; save: SaveSetting; onError: (e: unknown) => void }) {
  const data = usePoll(load, 3000).data;
  const owner = data?.owner?.trim();
  const char = owner ? findCharacter(readCharacters(settings), owner) : undefined;
  const bar = data?.skillbar;
  const key = JSON.stringify(bar ?? []);
  useEffect(() => {
    if (!bar?.length) return;
    // Every row of every set, at its place in the game's bar window. Skills missing from our list are left out;
    // skills of another class mean a bar we misread: leave it.
    const cells = bar.flatMap((b) =>
      [b.skillId, ...b.chain].flatMap((id, row) => {
        const s = GAME_SKILLS.find((x) => x.id === String(id));
        const c = BAR_SLOTS.indexOf(b.slot);
        return s && c >= 0 ? [{ set: b.bar, row, c, s }] : [];
      }),
    );
    const cls = cells[0]?.s.class;
    if (!cls || cells.some((x) => x.s.class !== cls)) return;
    // The planner shows the first set; its rows run top to bottom above the keys, so the game's row 0 is its last.
    const first = Math.min(...cells.map((x) => x.set));
    setMem(`skBar:${cls}`, Object.fromEntries(cells.filter((x) => x.set === first).map((x) => [`${3 - x.row},${x.c}`, x.s.id])));
    // The Builder shows it per character: only when the bar is of the class the game says you play.
    const all = readCapturedBar(settings[CAPTURED_BAR_KEY]);
    const grid = Object.fromEntries(cells.map((x) => [`${x.set},${x.row},${x.c}`, x.s.id]));
    if (char?.cls === cls && JSON.stringify(all[char.id]) !== JSON.stringify(grid)) save(CAPTURED_BAR_KEY, JSON.stringify({ ...all, [char.id]: grid })).catch(onError);
  }, [key, char?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // A guard (1150xxxxx) on a slot number not seen yet still is the off-hand (a Ranger's guard went missing, no log yet).
  const slotOf = (e: { slot: number; itemId: number }) => GAME_SLOTS[e.slot] ?? (String(e.itemId).startsWith("1150") ? "offhand" : undefined);
  const gear = Object.fromEntries((data?.equipment ?? []).flatMap((e) => (slotOf(e) ? [[slotOf(e)!, { id: String(e.itemId), enh: e.enchant }]] : [])));
  const all = readCapturedGear(settings[CAPTURED_GEAR_KEY]);
  const changed = !!char && Object.keys(gear).length > 0 && JSON.stringify(all[char.id]) !== JSON.stringify(gear);
  useEffect(() => {
    if (changed) save(CAPTURED_GEAR_KEY, JSON.stringify({ ...all, [char!.id]: gear })).catch(onError);
  }, [changed, char?.id, JSON.stringify(gear)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Daevanion nodes taken, sent at login with the inventory: same owner rule as the gear.
  const daev = data?.daevanion ?? [];
  const daevAll = readCapturedDaev(settings[CAPTURED_DAEV_KEY]);
  const daevChanged = !!char && daev.length > 0 && JSON.stringify(daevAll[char.id]) !== JSON.stringify(daev);
  useEffect(() => {
    if (daevChanged) save(CAPTURED_DAEV_KEY, JSON.stringify({ ...daevAll, [char!.id]: daev })).catch(onError);
  }, [daevChanged, char?.id, JSON.stringify(daev)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pet collection, sent at login after the inventory: same owner rule; the effects already kept stay.
  const pets = petsFromGame(data?.pets ?? [], PET_IDS);
  const petsAll = readPets(settings[CAPTURED_PETS_KEY]);
  const petsChanged = !!char && Object.keys(pets).length > 0 && JSON.stringify(petsAll[char.id]?.owned) !== JSON.stringify(pets);
  useEffect(() => {
    if (petsChanged) save(CAPTURED_PETS_KEY, JSON.stringify({ ...petsAll, [char!.id]: { owned: pets, effects: petsAll[char!.id]?.effects ?? [] } })).catch(onError);
  }, [petsChanged, char?.id, JSON.stringify(pets)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Item level and combat power, same owner rule: kept on the character, so they stay with the game closed.
  const gs = data?.gearScore ?? undefined;
  const cp = data?.combatPower ?? undefined;
  const powerChanged = !!char && ((gs != null && gs !== char.gs) || (cp != null && cp !== char.cp));
  useEffect(() => {
    if (powerChanged) saveCharacters(save, readCharacters(settings).map((c) => (c.id === char!.id ? { ...c, gs: gs ?? c.gs, cp: cp ?? c.cp } : c))).catch(onError);
  }, [powerChanged, char?.id, gs, cp]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
