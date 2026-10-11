import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SaveSetting, Settings } from "./App";
import { findCharacter, readCharacters } from "./characters";
import { GAME_SLOTS } from "./pages/characters/calc";
import { CAPTURED_BAR_KEY, CAPTURED_DAEV_KEY, CAPTURED_GEAR_KEY, readCapturedBar, readCapturedDaev, readCapturedGear, setMem } from "./pages/characters/shared";
import { GAME_SKILLS } from "./skills";
import { usePoll } from "./usePoll";

/** Shape of get_captured_character (src-tauri/src/capture/equip_parser.rs). */
type Captured = { owner: string | null; equipment: { slot: number; itemId: number; enchant: number }[]; skillbar: { slot: number; skillId: number }[]; daevanion: number[] };
const load = () => invoke<Captured>("get_captured_character");

/** Planner column of a game bar slot: the game bar has 12 slots, 0-7 and 20-23, laid on the planner's first row. */
const column = (slot: number) => (slot < 8 ? slot : slot >= 20 && slot < 24 ? slot - 12 : undefined);

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
    // Skills missing from our list are left out; skills of another class mean a bar we misread: leave it.
    const known = bar.flatMap((b) => GAME_SKILLS.filter((s) => s.id === String(b.skillId)).map((s) => ({ slot: b.slot, s })));
    const skills = known.map((k) => k.s);
    const cls = skills[0]?.class;
    if (!cls || skills.some((s) => s.class !== cls)) return;
    const cells = known.flatMap(({ slot, s }) => {
      const c = column(slot);
      return c === undefined ? [] : [[`0,${c}`, s.id]];
    });
    setMem(`skBar:${cls}`, Object.fromEntries(cells));
    // The Builder shows it per character: only when the bar is of the class the game says you play.
    const all = readCapturedBar(settings[CAPTURED_BAR_KEY]);
    const ids = skills.map((x) => x.id);
    if (char?.cls === cls && JSON.stringify(all[char.id]) !== JSON.stringify(ids)) save(CAPTURED_BAR_KEY, JSON.stringify({ ...all, [char.id]: ids })).catch(onError);
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
  return null;
}
