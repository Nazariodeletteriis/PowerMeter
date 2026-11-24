import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { BellRingingIcon } from "@phosphor-icons/react";
import type { Settings } from "./App";
import { initialLanguage, LANGUAGE_SETTING, translator } from "./i18n";
import { applyPalette } from "./pages/system/theme";
import { startMove } from "./pages/world/Minimap";
import "./eventPopup.css";

/** What the widget's event notice sends (src/widget/eventAlert.ts): the event names and its start (ms). */
type EventAlert = { name: string; start: number; seconds: number };

const LEAVE_MS = 150; // .evPop.isLeaving transition
/** The card stays until the event starts, then says so this long. */
const AFTER_START_MS = 10_000;

const clock = (ms: number) => {
  const left = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
};

/**
 * The event popup over the game (window "eventpop", powermeter.rs open_pet_popup_on_start): transparent and
 * click-through like the pet card, a small card in the bottom right corner of the screen. When an event of the Timer
 * is about to start, it shows the event and a live countdown until it starts, says it started, then leaves.
 */
export function EventPopup() {
  const [settings, setSettings] = useState<Settings>({});
  const [alert, setAlert] = useState<EventAlert & { at: number }>();
  const [leaving, setLeaving] = useState(false);
  const [now, setNow] = useState(Date.now());
  const timers = useRef<number[]>([]);

  useEffect(() => {
    document.documentElement.classList.add("evDoc");
    invoke<Settings>("get_settings").then(setSettings, () => {});
    const stopSettings = listen<{ key: string; value: string }>("setting-changed", ({ payload }) =>
      setSettings((s) => ({ ...s, [payload.key]: String(payload.value) })),
    );
    const clear = () => timers.current.splice(0).forEach(clearTimeout);
    // Stays until the event starts (+ AFTER_START_MS); a newer event takes the card.
    const stopAlerts = listen<EventAlert>("event-alert", ({ payload }) => {
      clear();
      setAlert({ ...payload, at: Date.now() });
      setLeaving(false);
      timers.current.push(
        window.setTimeout(() => {
          setLeaving(true);
          timers.current.push(window.setTimeout(() => setAlert(undefined), LEAVE_MS));
        }, Math.max(0, payload.start - Date.now()) + AFTER_START_MS),
      );
    });
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clear();
      clearInterval(tick);
      void stopSettings.then((f) => f(), () => {});
      void stopAlerts.then((f) => f(), () => {});
    };
  }, []);

  const lang = initialLanguage(settings[LANGUAGE_SETTING]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => applyPalette(settings), [settings]);
  const t = translator(lang);
  // Click-through, except while the card shows: then it takes the mouse to be moved (place kept under window.eventPop.*).
  const shown = !!alert;
  useEffect(() => {
    getCurrentWindow().setIgnoreCursorEvents(!shown).catch(() => {});
  }, [shown]);

  if (!alert) return null;
  const left = alert.start - now;
  return (
    <div
      className={`evPop${leaving ? " isLeaving" : ""}`}
      role="alert"
      onPointerDown={(e) => startMove(e, (action) => void action().catch(() => {}))}
    >
      <BellRingingIcon className="evPopIcon" weight="fill" aria-hidden="true" />
      <div className="evPopText">
        <span className="evPopLabel">{left > 0 ? t("events.startsIn") : t("events.started")}</span>
        <span className="evPopName">{alert.name}</span>
      </div>
      {left > 0 && <span className="evPopTime">{clock(left)}</span>}
      {/* The time left before the start, from when the card came. */}
      <span className="evPopBar" style={{ transform: `scaleX(${Math.max(0, left) / Math.max(1, alert.start - alert.at)})` }} />
    </div>
  );
}
