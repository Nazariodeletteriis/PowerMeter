import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { BellRingingIcon } from "@phosphor-icons/react";
import type { Settings } from "./App";
import { initialLanguage, LANGUAGE_SETTING, translator } from "./i18n";
import { applyPalette } from "./pages/system/theme";
import "./eventPopup.css";

/** What the widget's event notice sends (src/widget/eventAlert.ts): the event names, its start (ms), seconds to show. */
type EventAlert = { name: string; start: number; seconds: number };

const LEAVE_MS = 150; // .evPop.isLeaving transition

const clock = (ms: number) => {
  const left = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
};

/**
 * The event popup over the game (window "eventpop", powermeter.rs open_pet_popup_on_start): transparent and
 * click-through like the pet card, at the top centre of the screen just below it. When an event of the Timer is about
 * to start, it shows the event and a live countdown for the seconds set in Settings, then leaves.
 */
export function EventPopup() {
  const [settings, setSettings] = useState<Settings>({});
  const [alert, setAlert] = useState<EventAlert>();
  const [leaving, setLeaving] = useState(false);
  const [now, setNow] = useState(Date.now());
  const timers = useRef<number[]>([]);

  useEffect(() => {
    invoke<Settings>("get_settings").then(setSettings, () => {});
    const stopSettings = listen<{ key: string; value: string }>("setting-changed", ({ payload }) =>
      setSettings((s) => ({ ...s, [payload.key]: String(payload.value) })),
    );
    const clear = () => timers.current.splice(0).forEach(clearTimeout);
    const stopAlerts = listen<EventAlert>("event-alert", ({ payload }) => {
      clear();
      setAlert(payload);
      setLeaving(false);
      timers.current.push(
        window.setTimeout(() => {
          setLeaving(true);
          timers.current.push(window.setTimeout(() => setAlert(undefined), LEAVE_MS));
        }, payload.seconds * 1000),
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

  if (!alert) return null;
  const left = alert.start - now;
  return (
    <div className={`evPop${leaving ? " isLeaving" : ""}`} role="alert">
      <BellRingingIcon className="evPopIcon" weight="fill" aria-hidden="true" />
      <div className="evPopText">
        <span className="evPopLabel">{left > 0 ? t("events.startsIn") : t("events.started")}</span>
        <span className="evPopName">{alert.name}</span>
      </div>
      {left > 0 && <span className="evPopTime">{clock(left)}</span>}
      <span className="evPopBar" style={{ animationDuration: `${alert.seconds}s` }} />
    </div>
  );
}
