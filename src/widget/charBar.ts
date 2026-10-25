// Widget character bar (top row, right of the event notice): the dashboard's active character, its class icon and
// name. The active character follows the one you play (AutoCharacter), so this is who the meter counts.
// .pmCounters is the slot for that character's entries and keys (Odyle, Shugo and Beritra keys, dungeons): empty until
// the game's counts are read from the packets.
// Reads the settings keys of src/dashboard/characters.ts (not imported: it pulls in the dashboard shell).
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type Character = { id: string; name: string; cls: string };

const bar = document.querySelector<HTMLElement>(".pmCharBar");
// index.html also hosts the details/history windows: the bar is the overlay's only.
if (bar && (window as { A2_VIEW?: string }).A2_VIEW === "main") {
  const name = bar.querySelector<HTMLElement>(".pmCharName")!;
  let settings: Record<string, string> = {};

  const show = () => {
    let list: Character[] = [];
    try {
      list = JSON.parse(settings["pm.characters"] ?? "");
    } catch {
      // none yet: the onboarding name and class below
    }
    if (!Array.isArray(list) || !list.length) {
      const onboarded = localStorage.getItem("dpsMeter.userName");
      list = onboarded && settings["pm.class"] ? [{ id: "c1", name: onboarded, cls: settings["pm.class"] }] : [];
    }
    const char = list.find((c) => c.id === settings["pm.activeCharacter"]) ?? list[0];
    bar.hidden = !char;
    if (!char) return;
    name.textContent = char.name;
    bar.dataset.cls = char.cls.toLowerCase(); // powermeter-theme.css [data-cls]: the class's colour and icon
  };

  invoke<Record<string, string>>("get_settings").then((s) => {
    settings = s;
    show();
  }, () => {});
  listen<{ key: string; value: string }>("setting-changed", ({ payload }) => {
    settings = { ...settings, [payload.key]: String(payload.value) };
    show();
  }).catch(() => {});
}
