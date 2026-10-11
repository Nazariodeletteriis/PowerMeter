import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { setMem } from "./pages/characters/shared";
import { GAME_SKILLS } from "./skills";
import { usePoll } from "./usePoll";

/** Shape of get_captured_character (src-tauri/src/capture/equip_parser.rs). */
type Captured = { skillbar: { slot: number; skillId: number }[] };
const load = () => invoke<Captured>("get_captured_character");

/** Planner column of a game bar slot: the game bar has 12 slots, 0-7 and 20-23, laid on the planner's first row. */
const column = (slot: number) => (slot < 8 ? slot : slot >= 20 && slot < 24 ? slot - 12 : undefined);

/**
 * Copies the skill bar read from the game into the Skill Planner's quick bars of its class, without asking.
 * Equipment is captured as well, but with the game's numeric item ids: the archive has no numeric id
 * to match them to the Character Builder's pieces yet, so it is not written there.
 */
export function CaptureSync() {
  const bar = usePoll(load, 3000).data?.skillbar;
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
  return null;
}
