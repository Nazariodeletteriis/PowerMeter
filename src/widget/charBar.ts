// Widget character bar (top row, right of the event notice): the dashboard's active character, its class icon and
// name. The active character follows the one you play (AutoCharacter), so this is who the meter counts.
// Then its recharging counters as the game shows them, "base (+charged) / max" (get_counters, capture/counters.rs:
// the server sends them on entering the world and on each change, so they follow the character you log in with).
// The max values are not in the packets: COUNTERS.
// Then the combat power of the character played, from the meter's data (the party roster packet; the backend sends
// it for you alone too), kept per character so it shows between fights. The Options window's "cp" switch
// hides it (powermeter-theme.css .pmPref-cp).
// Reads the settings keys of src/dashboard/characters.ts (not imported: it pulls in the dashboard shell).
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { COUNTERS, ODYLE, REMEMBER_KEY } from "./counterDefs";

type Character = { id: string; name: string; cls: string };
type I18n = {
  format?: (key: string, vars: Record<string, string>, fallback: string) => string;
  t?: (key: string, fallback: string) => string;
  getLanguage?: () => string;
  onChange?: (f: () => void) => void;
};

const COUNTER_POLL_MS = 2000;
const SHOW_KEY = "pm.counters.show.";
const CP_KEY = "pm.charCp."; // + character name: the last combat power read
const DEFAULT_SHOWN = ODYLE;
// Each counter shows by its switch in the Options window (Controls.tsx): `pm.counters.show.<id>` "1" / "0", unset = Odyle only.

const bar = document.querySelector<HTMLElement>(".pmCharBar");
// index.html also hosts the details/history windows: the bar is the overlay's only.
if (bar && (window as { A2_VIEW?: string }).A2_VIEW === "main") {
  const name = bar.querySelector<HTMLElement>(".pmCharName")!;
  const slot = bar.querySelector<HTMLElement>(".pmCounters")!;
  const cpEl = document.createElement("span");
  cpEl.className = "pmCharCp";
  cpEl.hidden = true;
  name.after(cpEl);
  const i18n = () => (window as { i18n?: I18n }).i18n;
  let settings: Record<string, string> = {};
  let playing = ""; // the game's name for the character being played, once it tied one to an entity

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
    // The character the game says you are playing wins over the roster's active one: another account's character
    // (not in the roster) used to leave the last active name here. Its class only when the roster knows it.
    const key = (s: string) => s.trim().toLowerCase();
    const char = playing
      ? (list.find((c) => key(c.name) === key(playing)) ?? { id: "", name: playing, cls: "" })
      : (list.find((c) => c.id === settings["pm.activeCharacter"]) ?? list[0]);
    name.hidden = !char;
    name.textContent = char?.name ?? "";
    if (char?.cls) bar.dataset.cls = char.cls.toLowerCase(); // powermeter-theme.css [data-cls]: the class's colour and icon
    else delete bar.dataset.cls;
    if ((char?.name ?? "") !== charName) {
      charName = char?.name ?? "";
      counts = remembered();
      showCounters();
      showCp(Number(localStorage.getItem(CP_KEY + charName)) || 0);
    }
    fold();
  };

  // Combat power as the meter's rows write it ("116,9k"), the exact figure in its tooltip. 0 = not known: hidden.
  const showCp = (cp: number) => {
    const lang = i18n()?.getLanguage?.() || "en";
    const one = (n: number) => n.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const text = cp >= 1e6 ? `${one(cp / 1e6)}M` : cp >= 1e3 ? `${one(cp / 1e3)}k` : cp > 0 ? String(cp) : "";
    cpEl.hidden = !text;
    if (cpEl.textContent === text) return;
    cpEl.textContent = text;
    cpEl.title = text ? `${i18n()?.t?.("meter.combatPower", "Combat power") ?? "Combat power"}: ${cp.toLocaleString(lang)}` : "";
  };
  // Your entry in the meter's latest data (tauriBridge.js dpsData): its combat power once the backend has it.
  const readCp = () => {
    let d: { localPlayerId?: number | null; map?: Record<string, { combatPower?: number }> } | null = null;
    try {
      d = JSON.parse((window as { dpsData?: { getDpsData?: () => string } }).dpsData?.getDpsData?.() ?? "null");
    } catch {
      return;
    }
    const cp = Math.trunc(Number(d?.localPlayerId != null ? d.map?.[d.localPlayerId]?.combatPower : 0)) || 0;
    if (!cp || !charName) return; // between fights the data is empty: keep the last value
    showCp(cp);
    try {
      localStorage.setItem(CP_KEY + charName, String(cp));
    } catch {
      // storage refused: it shows until the app closes
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
  // Controls window: "Counters" off hides them (pm.counters.off).
  const shown = (id: number) => (settings[SHOW_KEY + id] ?? (id === DEFAULT_SHOWN ? "1" : "0")) === "1";
  const showCounters = () => {
    slot.hidden = settings["pm.counters.off"] === "1";
    const html = COUNTERS.filter(([id]) => shown(id)).map(([id, max, key, fallback, icon]) => {
      const c = counts[id];
      const label = i18n()?.format?.(`pmWidget.${key}`, {}, fallback) ?? fallback;
      const of = max === null ? "" : ` / ${max}`;
      const value = c ? `${c[0]} <span class="pmCounterPlus">(+${c[1]})</span>` : "–";
      const title = `${label}: ${c ? `${c[0]} (+${c[1]})` : "–"}${of}`;
      const maxText = max === null ? "" : `<span class="pmCounterMax">/${max}</span>`;
      return `<span class="pmCounter" title="${title}" aria-label="${title}"><img src="${icon}" alt=""><span>${value}${maxText}</span></span>`;
    }).join("");
    if (slot.innerHTML !== html) slot.innerHTML = html;
    fold();
  };
  // Nothing to show (no character, every counter off): the bar goes, and the top row with it (powermeter-theme.css).
  const fold = () => {
    bar.hidden = name.hidden && (slot.hidden || !slot.childElementCount);
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
  type Capture = { locked?: boolean; localPlayerId?: number | null; characterName?: string | null };
  const pollPlaying = () =>
    invoke<Capture>("get_capture_status").then((c) => {
      const next = c.locked && c.localPlayerId != null ? (c.characterName ?? "").trim() : "";
      if (next && next !== playing) {
        playing = next;
        show();
      }
    }, () => {});
  showCounters();
  poll();
  pollPlaying();
  setInterval(() => {
    poll();
    pollPlaying();
    readCp();
  }, COUNTER_POLL_MS);
  i18n()?.onChange?.(showCounters);

  invoke<Record<string, string>>("get_settings").then((s) => {
    settings = s;
    show();
    showCounters(); // the switches saved last time
  }, () => {});
  listen<{ key: string; value: string }>("setting-changed", ({ payload }) => {
    settings = { ...settings, [payload.key]: String(payload.value) };
    show();
    if (payload.key === "pm.counters.off" || payload.key.startsWith(SHOW_KEY)) showCounters();
  }).catch(() => {});
}
