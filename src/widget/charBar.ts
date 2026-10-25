// Widget character bar (top row, right of the event notice): the dashboard's active character, its class icon and
// name. The active character follows the one you play (AutoCharacter), so this is who the meter counts.
// Then its recharging counters as the game shows them, "base (+charged) / max" (get_counters, capture/counters.rs:
// the server sends them on entering the world and on each change, so they follow the character you log in with).
// The max values are not in the packets: COUNTERS.
// Reads the settings keys of src/dashboard/characters.ts (not imported: it pulls in the dashboard shell).
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import beritraIcon from "../assets/pm/counters/beritra.png";
import dailyIcon from "../assets/pm/counters/daily.png";
import nightmareIcon from "../assets/pm/counters/nightmare.png";
import odyleIcon from "../assets/pm/counters/odyle.png";
import shugoIcon from "../assets/pm/counters/shugo.png";

type Character = { id: string; name: string; cls: string };
type I18n = { format?: (key: string, vars: Record<string, string>, fallback: string) => string; onChange?: (f: () => void) => void };

const COUNTER_POLL_MS = 2000;
/** Last counters read for a character (+ its name), in this window's storage. */
const REMEMBER_KEY = "pm.counters.";
/**
 * The counters shown, in order (Nazario's: Nightmare, Daily Dungeon, Beritra, Shugo, Odyle): game id (capture/counters.rs),
 * the base's max from the game's tooltip (null: not known yet, shown without), label key, icon (the game's, Nazario's set).
 */
const COUNTERS: [number, number | null, string, string, string][] = [
  [4, null, "pmWidget.counterNightmare", "Nightmare", nightmareIcon],
  [101, 14, "pmWidget.counterDailyDungeon", "Daily Dungeon", dailyIcon],
  [8, null, "pmWidget.counterBeritraKeys", "Beritra keys", beritraIcon],
  [1, 21, "pmWidget.counterShugoKeys", "Shugo Festival keys", shugoIcon],
  [60000001, 840, "pmWidget.counterOdyle", "Odyle", odyleIcon],
];

const bar = document.querySelector<HTMLElement>(".pmCharBar");
// index.html also hosts the details/history windows: the bar is the overlay's only.
if (bar && (window as { A2_VIEW?: string }).A2_VIEW === "main") {
  const name = bar.querySelector<HTMLElement>(".pmCharName")!;
  const slot = bar.querySelector<HTMLElement>(".pmCounters")!;
  const i18n = () => (window as { i18n?: I18n }).i18n;
  let settings: Record<string, string> = {};

  // The active character's name: the counters read this session are remembered under it (REMEMBER_KEY), so they show
  // from the start, before the game sends them again on entering the world.
  let charName = "";
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
    name.hidden = !char;
    name.textContent = char?.name ?? "";
    if (char) bar.dataset.cls = char.cls.toLowerCase(); // powermeter-theme.css [data-cls]: the class's colour and icon
    else delete bar.dataset.cls;
    if ((char?.name ?? "") !== charName) {
      charName = char?.name ?? "";
      counts = remembered();
      showCounters();
    }
  };

  // Counter id → [base, charged]. Always shown: one not known yet reads "–" until the game sends it.
  let counts: Record<string, [number, number]> = {};
  const remembered = (): Record<string, [number, number]> => {
    try {
      return JSON.parse(localStorage.getItem(REMEMBER_KEY + charName) ?? "{}");
    } catch {
      return {};
    }
  };
  const showCounters = () => {
    const html = COUNTERS.map(([id, max, key, fallback, icon]) => {
      const c = counts[id];
      const label = i18n()?.format?.(key, {}, fallback) ?? fallback;
      const of = max === null ? "" : ` / ${max}`;
      const value = c ? `${c[0]} <span class="pmCounterPlus">(+${c[1]})</span>` : "–";
      const title = `${label}: ${c ? `${c[0]} (+${c[1]})` : "–"}${of}`;
      const maxText = max === null ? "" : `<span class="pmCounterMax">/${max}</span>`;
      return `<span class="pmCounter" title="${title}" aria-label="${title}"><img src="${icon}" alt=""><span>${value}${maxText}</span></span>`;
    }).join("");
    if (slot.innerHTML !== html) slot.innerHTML = html;
  };
  const poll = () =>
    invoke<Record<string, [number, number]>>("get_counters").then((c) => {
      if (!Object.keys(c).length) return; // nothing read yet this session: keep the remembered ones
      counts = c;
      try {
        localStorage.setItem(REMEMBER_KEY + charName, JSON.stringify(c));
      } catch {
        // storage refused: they show until the app closes
      }
      showCounters();
    }, () => {});
  showCounters();
  poll();
  setInterval(poll, COUNTER_POLL_MS);
  i18n()?.onChange?.(showCounters);

  invoke<Record<string, string>>("get_settings").then((s) => {
    settings = s;
    show();
  }, () => {});
  listen<{ key: string; value: string }>("setting-changed", ({ payload }) => {
    settings = { ...settings, [payload.key]: String(payload.value) };
    show();
  }).catch(() => {});
}
