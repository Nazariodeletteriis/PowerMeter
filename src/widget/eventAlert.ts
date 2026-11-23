// Widget event notice: from the Timer's lead (1, 3, 5 or 10 minutes, default 10) before an event of the Timer
// (rift, world bosses, Shugo festival, resets) a strip under the widget header names it with a countdown, so
// whoever keeps only the widget open sees it while playing. One line per start time, so events a minute apart
// each get their own lead. A line goes at its start; the X hides the lines shown, a later event brings the
// strip back.
// Same event rules and maths as the dashboard's Timer (gamedata_events + organizer/schedule.ts); rings the
// Timer's chime when a new notice appears, if the Timer's sound is on, and shows the event popup (its own window at
// the top centre of the screen, EventPopup.tsx) for the seconds set in Settings > Widget DPS, unless turned off there.
import { invoke } from "@tauri-apps/api/core";
import { emitTo, listen } from "@tauri-apps/api/event";
import { chime, LEAD_KEY, leadMinutes, POPUP_KEY, POPUP_SECONDS_KEY, popupSeconds, SOUND_KEY, VOLUME_KEY } from "../dashboard/chime";
import { eventNotice, type GameEvent } from "../dashboard/pages/organizer/schedule";

const RELOAD = 60 * 60e3; // the archive can bring new rules while the app runs

type I18n = { format?: (key: string, vars: Record<string, string>, fallback: string) => string };
const w = window as unknown as { A2_VIEW?: string; i18n?: I18n };

const strip = document.querySelector<HTMLElement>(".pmEventStrip");
// index.html also hosts the details/history windows: the notice is the overlay's only.
if (strip && w.A2_VIEW === "main") {
  const text = strip.querySelector<HTMLElement>(".pmEventText")!;
  let events: GameEvent[] = [];
  let loadedAt = -RELOAD;
  const announced = new Set<number>(); // starts already rung
  let dismissed = 0; // lines up to this start were closed with the X
  let last = 0;
  // The lead follows the Timer page live: update_settings broadcasts setting-changed to every window.
  let lead = leadMinutes() * 60e3;
  const setLead = (value?: string) => (lead = leadMinutes(value) * 60e3);
  invoke<Record<string, string>>("get_settings").then((s) => setLead(s[LEAD_KEY]), () => {});
  listen<{ key: string; value: string }>("setting-changed", ({ payload }) => payload.key === LEAD_KEY && setLead(String(payload.value))).catch(() => {});

  // Controls window: "Event alerts" off hides the strip for good (until turned back on).
  const OFF_KEY = "pm.eventAlerts.off";
  let off = false;
  const setOff = (value?: string) => {
    off = value === "1";
    if (off) strip.hidden = true;
  };
  invoke<Record<string, string>>("get_settings").then((s) => setOff(s[OFF_KEY]), () => {});
  listen<{ key: string; value: string }>("setting-changed", ({ payload }) => payload.key === OFF_KEY && setOff(String(payload.value))).catch(() => {});

  strip.querySelector(".pmEventClose")!.addEventListener("click", () => {
    dismissed = last;
    strip.hidden = true;
  });

  const countdown = (start: number, now: number) => {
    const left = Math.max(0, Math.ceil((start - now) / 1000));
    return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  };
  const say = (key: string, vars: Record<string, string>, fallback: string) => w.i18n?.format?.(key, vars, fallback) ?? fallback;

  // The popup is its own window at the top centre of the screen (EventPopup.tsx, "eventpop"), like the pet card.
  const showPopup = (name: string, start: number, seconds: number) =>
    void emitTo("eventpop", "event-alert", { name, start, seconds }).catch(() => {});
  // "Preview" next to the popup options in the dashboard.
  listen<{ seconds: number }>("pm-event-popup-test", ({ payload }) =>
    showPopup(say("pmWidget.eventPopupTest", {}, "Test popup"), Date.now() + lead, popupSeconds(String(payload?.seconds))),
  ).catch(() => {});

  const tick = () => {
    const now = Date.now();
    if (now - loadedAt >= RELOAD) {
      loadedAt = now;
      // Not downloaded yet or a failed read: keep what we have and retry in a minute, not in an hour.
      invoke<GameEvent[]>("gamedata_events").then((e) => (events = e), () => (loadedAt = now - RELOAD + 60e3));
    }
    const { soon, fresh } = eventNotice(events, now, lead, announced);
    const lines = soon.filter((s) => s.start > dismissed);
    if (off || !lines.length) {
      strip.hidden = true;
      return;
    }
    last = lines[lines.length - 1].start;
    if (fresh) {
      // The new start is the latest one: the earlier lines were announced already.
      const { start, names } = lines[lines.length - 1];
      invoke<Record<string, string>>("get_settings").then((s) => {
        if (s[SOUND_KEY] === "1") chime(s[VOLUME_KEY]);
        if (s[POPUP_KEY] !== "0") showPopup(names.join(", "), start, popupSeconds(s[POPUP_SECONDS_KEY]));
      }, () => {});
    }
    text.textContent = lines.map(({ start, names }) => {
      const name = names.join(", ");
      const time = countdown(start, now);
      return say("pmWidget.eventSoon", { name, time }, `${name} in ${time}`);
    }).join("\n");
    // Detached from the widget (Nazario, 0.5.65): the notice is the popup window now; the strip stays hidden.
    strip.hidden = true;
  };
  tick();
  setInterval(tick, 1000);
}
