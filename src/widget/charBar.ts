// Widget character bar (top row, right of the event notice): the dashboard's active character, its class icon and
// name. The active character follows the one you play (AutoCharacter), so this is who the meter counts.
// Then its recharging counters as the game shows them, "base (+charged) / max" (get_counters, capture/counters.rs:
// the server sends them on entering the world and on each change, so they follow the character you log in with).
// The max values are not in the packets: COUNTERS.
// Reads the settings keys of src/dashboard/characters.ts (not imported: it pulls in the dashboard shell).
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import odyleIcon from "../assets/pm/map/Od_A_c_01.png";

type Character = { id: string; name: string; cls: string };
type I18n = { format?: (key: string, vars: Record<string, string>, fallback: string) => string; onChange?: (f: () => void) => void };

const COUNTER_POLL_MS = 2000;
// Phosphor (regular) Key and CastleTurret.
const svg = (d: string) => `<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
const KEY = svg("M216.57,39.43A80,80,0,0,0,83.91,120.78L28.69,176A15.86,15.86,0,0,0,24,187.31V216a16,16,0,0,0,16,16H72a8,8,0,0,0,8-8V208H96a8,8,0,0,0,8-8V184h16a8,8,0,0,0,5.66-2.34l9.56-9.57A79.73,79.73,0,0,0,160,176h.1A80,80,0,0,0,216.57,39.43ZM224,98.1c-1.09,34.09-29.75,61.86-63.89,61.9H160a63.7,63.7,0,0,1-23.65-4.51,8,8,0,0,0-8.84,1.68L116.69,168H96a8,8,0,0,0-8,8v16H72a8,8,0,0,0-8,8v16H40V187.31l58.83-58.82a8,8,0,0,0,1.68-8.84A63.72,63.72,0,0,1,96,95.92c0-34.14,27.81-62.8,61.9-63.89A64,64,0,0,1,224,98.1ZM192,76a12,12,0,1,1-12-12A12,12,0,0,1,192,76Z");
const CASTLE = svg("M216,216H200V115.31L211.31,104A15.86,15.86,0,0,0,216,92.69V48a16,16,0,0,0-16-16H176a8,8,0,0,0-8,8V64H152V40a8,8,0,0,0-8-8H112a8,8,0,0,0-8,8V64H88V40a8,8,0,0,0-8-8H56A16,16,0,0,0,40,48V92.69A15.86,15.86,0,0,0,44.69,104L56,115.31V216H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16ZM69.66,106.34,56,92.69V48H72V72a8,8,0,0,0,8,8h32a8,8,0,0,0,8-8V48h16V72a8,8,0,0,0,8,8h32a8,8,0,0,0,8-8V48h16V92.69l-13.66,13.65A8,8,0,0,0,184,112V216H160V168a32,32,0,0,0-64,0v48H72V112A8,8,0,0,0,69.66,106.34ZM144,216H112V168a16,16,0,0,1,32,0Z");
/** The counters shown, in order: game id, the base's max (the game's tooltip), label key, icon. */
const COUNTERS: [number, number, string, string, string][] = [
  [101, 14, "pmWidget.counterDailyDungeon", "Daily Dungeon", CASTLE],
  [1, 21, "pmWidget.counterShugoKeys", "Shugo Festival keys", KEY],
  [60000001, 840, "pmWidget.counterOdyle", "Odyle", `<img src="${odyleIcon}" alt="">`],
];

const bar = document.querySelector<HTMLElement>(".pmCharBar");
// index.html also hosts the details/history windows: the bar is the overlay's only.
if (bar && (window as { A2_VIEW?: string }).A2_VIEW === "main") {
  const name = bar.querySelector<HTMLElement>(".pmCharName")!;
  const slot = bar.querySelector<HTMLElement>(".pmCounters")!;
  const i18n = () => (window as { i18n?: I18n }).i18n;
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

  // Counter id → [base, charged]; one the game hasn't sent (not logged in yet) is left out.
  let counts: Record<string, [number, number]> = {};
  const showCounters = () => {
    const html = COUNTERS.flatMap(([id, max, key, fallback, icon]) => {
      const c = counts[id];
      if (!c) return [];
      const label = i18n()?.format?.(key, {}, fallback) ?? fallback;
      const title = `${label}: ${c[0]} (+${c[1]}) / ${max}`;
      return [`<span class="pmCounter" title="${title}" aria-label="${title}">${icon}<span>${c[0]} <span class="pmCounterPlus">(+${c[1]})</span><span class="pmCounterMax">/${max}</span></span></span>`];
    }).join("");
    if (slot.innerHTML !== html) slot.innerHTML = html;
  };
  const poll = () =>
    invoke<Record<string, [number, number]>>("get_counters").then((c) => {
      counts = c;
      showCounters();
    }, () => {});
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
