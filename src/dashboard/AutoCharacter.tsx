import { useEffect } from "react";
import type { SaveSetting, Settings } from "./App";
import { activate, activeId, findCharacter, readCharacters } from "./characters";
import type { T } from "./i18n";
import type { CaptureStatus } from "./Shell";

/** Name the Characters page pre-fills its add form with (set when the user agrees to create the one being played). */
export const NEW_CHARACTER_KEY = "pm.newCharacterName";

/**
 * Follows the character being played: once the game says who you are, the character of the roster with that name
 * becomes the active one. One missing from the roster is created by itself (CaptureSync).
 */
export function AutoCharacter({ settings, save, capture, onError }: {
  t: T;
  settings: Settings;
  save: SaveSetting;
  capture?: CaptureStatus;
  go: (page: string) => void;
  onError: (e: unknown) => void;
}) {
  // Only a name tied to an in-game entity: before that it may still be the one typed at onboarding.
  const playing = capture?.locked && capture.localPlayerId != null ? capture.characterName?.trim() : undefined;
  const list = readCharacters(settings);
  const match = playing ? findCharacter(list, playing) : undefined;
  const active = activeId(settings, list);

  // A character missing from the roster is added by CaptureSync once its class is known; then it matches here.
  useEffect(() => {
    if (match && match.id !== active) activate(save, match).catch(onError);
    // save/onError are new every render: re-running on them would activate twice.
  }, [match?.id, active]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
