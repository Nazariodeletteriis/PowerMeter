import { useEffect, useState } from "react";
import type { SaveSetting, Settings } from "./App";
import { activate, activeId, readCharacters } from "./characters";
import type { T } from "./i18n";
import type { CaptureStatus } from "./Shell";
import { Modal } from "./pages/system/Modal";

/** Name the Characters page pre-fills its add form with (set when the user agrees to create the one being played). */
export const NEW_CHARACTER_KEY = "pm.newCharacterName";
// Names already asked about this launch: "Later" is not asked again until restart.
const ASKED = new Set<string>();

/**
 * Follows the character being played: once the game says who you are, the matching
 * character of the roster becomes the active one; a character not created yet gets
 * a prompt to create it first.
 */
export function AutoCharacter({ t, settings, save, capture, go, onError }: {
  t: T;
  settings: Settings;
  save: SaveSetting;
  capture?: CaptureStatus;
  go: (page: string) => void;
  onError: (e: unknown) => void;
}) {
  const [missing, setMissing] = useState<string>();
  // Only a name tied to an in-game entity: before that it may still be the one typed at onboarding.
  const playing = capture?.locked && capture.localPlayerId != null ? capture.characterName?.trim() : undefined;
  const list = readCharacters(settings);
  const match = playing ? list.find((c) => c.name.trim().toLowerCase() === playing.toLowerCase()) : undefined;
  const active = activeId(settings, list);

  useEffect(() => {
    if (!playing) return;
    if (match) {
      if (match.id !== active) activate(save, match).catch(onError);
    } else if (!ASKED.has(playing)) {
      ASKED.add(playing);
      setMissing(playing);
    }
    // save/onError are new every render: re-running on them would activate twice.
  }, [playing, match?.id, active]);

  if (!missing) return null;
  return (
    <Modal
      width={440}
      enter
      onClose={() => setMissing(undefined)}
      title={(id) => (
        <h2 id={id} style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>
          {t("autochar.title")}
        </h2>
      )}
    >
      <p style={{ margin: 0, color: "var(--pm-t2)" }}>{t("autochar.text", { name: missing })}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="btn" onClick={() => setMissing(undefined)}>
          {t("autochar.later")}
        </button>
        <button
          type="button"
          className="btn fill"
          onClick={() => {
            sessionStorage.setItem(NEW_CHARACTER_KEY, missing);
            setMissing(undefined);
            go("personaggi");
          }}
        >
          {t("autochar.create")}
        </button>
      </div>
    </Modal>
  );
}
