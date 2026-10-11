import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SaveSetting, Settings } from "./App";
import { findCharacter, readCharacters } from "./characters";
import { GAME_SLOTS } from "./pages/characters/calc";
import { CAPTURED_GEAR_KEY, readCapturedGear, setMem } from "./pages/characters/shared";
import type { CaptureStatus } from "./Shell";
import { GAME_SKILLS } from "./skills";
import { usePoll } from "./usePoll";

/** Shape of get_captured_character (src-tauri/src/capture/equip_parser.rs). */
type Captured = { equipment: { slot: number; itemId: number }[]; skillbar: { slot: number; skillId: number }[] };
const load = () => invoke<Captured>("get_captured_character");

/** Planner column of a game bar slot: the game bar has 12 slots, 0-7 and 20-23, laid on the planner's first row. */
const column = (slot: number) => (slot < 8 ? slot : slot >= 20 && slot < 24 ? slot - 12 : undefined);

/**
 * Copies what the game shows into the dashboard, without asking: the skill bar into the Skill Planner's quick
 * bars of its class, the worn equipment (game item ids) into the Builder's current gear of the character being
 * played. Equipment goes only to a character already in the roster: AutoCharacter asks to create a missing one.
 */
export function CaptureSync({ settings, save, capture, onError }: { settings: Settings; save: SaveSetting; capture?: CaptureStatus; onError: (e: unknown) => void }) {
  const data = usePoll(load, 3000).data;
  const bar = data?.skillbar;
  const key = JSON.stringify(bar ?? []);
  useEffect(() => {
    if (!bar?.length) return;
    const skills = bar.map((b) => GAME_SKILLS.find((s) => s.id === String(b.skillId)));
    const cls = skills[0]?.class;
    // A skill missing from our list, or of another class: leave the planner as it is.
    if (!cls || skills.some((s) => s?.class !== cls)) return;
    const cells = bar.flatMap((b, i) => {
      const c = column(b.slot);
      return c === undefined ? [] : [[`0,${c}`, skills[i]!.id]];
    });
    setMem(`skBar:${cls}`, Object.fromEntries(cells));
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const playing = capture?.locked && capture.localPlayerId != null ? capture.characterName?.trim() : undefined;
  const char = playing ? findCharacter(readCharacters(settings), playing) : undefined;
  const gear = Object.fromEntries((data?.equipment ?? []).flatMap((e) => (GAME_SLOTS[e.slot] ? [[GAME_SLOTS[e.slot], String(e.itemId)]] : [])));
  const all = readCapturedGear(settings[CAPTURED_GEAR_KEY]);
  const changed = !!char && Object.keys(gear).length > 0 && JSON.stringify(all[char.id]) !== JSON.stringify(gear);
  useEffect(() => {
    if (changed) save(CAPTURED_GEAR_KEY, JSON.stringify({ ...all, [char!.id]: gear })).catch(onError);
  }, [changed, char?.id, JSON.stringify(gear)]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
