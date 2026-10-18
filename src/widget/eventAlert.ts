// Widget event notice: from the Timer's lead (1, 3, 5 or 10 minutes, default 10) before an event of the Timer
// (rift, world bosses, Shugo festival, resets) a strip under the widget header names it with a countdown, so
// whoever keeps only the widget open sees it while playing. One line per start time, so events a minute apart
// each get their own lead. A line goes at its start; the X hides the lines shown, a later event brings the
// strip back.
// Same event rules and maths as the dashboard's Timer (gamedata_events + organizer/schedule.ts); rings the
// Timer's chime when a new notice appears, if the Timer's sound is on, and opens a popup over the widget for
// the seconds set in Settings > Widget DPS, unless it is turned off there.
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { chime, LEAD_KEY, leadMinutes, POPUP_KEY, POPUP_SECONDS_KEY, popupSeconds, SOUND_KEY, VOLUME_KEY } from "../dashboard/chime";
import { eventNotice, type GameEvent } from "../dashboard/pages/organizer/schedule";

const RELOAD = 60 * 60e3; // the archive can bring new rules while the app runs

type I18n = { format?: (key: string, vars: Record<string, string>, fallback: string) => string };
const w = window as unknown as { A2_VIEW?: string; i18n?: I18n; javaBridge?: { setSetting?: (key: string, value: string) => void } };

// Settings > event alert volume (every window that shows the settings panel), with a Test button.
const volume = document.querySelector<HTMLInputElement>(".eventVolumeInput");
if (volume) {
  const label = document.querySelector<HTMLElement>(".eventVolumeValue");
  const show = () => label && (label.textContent = `${volume.value}%`);
  invoke<Record<string, string>>("get_settings").then((s) => {
    if (s[VOLUME_KEY] != null) volume.value = s[VOLUME_KEY];
    show();
  }, () => {});
  volume.addEventListener("input", show);
  volume.addEventListener("change", () => w.javaBridge?.setSetting?.(VOLUME_KEY, volume.value));
  document.querySelector(".eventVolumeTest")?.addEventListener("click", () => chime(volume.value));
}

const strip = document.querySelector<HTMLElement>(".pmEventStrip");
// index.html also hosts the details/settings windows: the notice is the overlay's only.
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

  strip.querySelector(".pmEventClose")!.addEventListener("click", () => {
    dismissed = last;
    strip.hidden = true;
  });

  const countdown = (start: number, now: number) => {
    const left = Math.max(0, Math.ceil((start - now) / 1000));
    return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
  };
  const say = (key: string, vars: Record<string, string>, fallback: string) => w.i18n?.format?.(key, vars, fallback) ?? fallback;

  // The popup. Its bar's animation is the timer: paused while the pointer or focus is on it, so it can be read.
  const popup = document.querySelector<HTMLElement>(".pmEventPopup")!;
  const popupName = popup.querySelector<HTMLElement>(".pmEventPopupName")!;
  const popupTime = popup.querySelector<HTMLElement>(".pmEventPopupTime")!;
  const popupAlert = popup.querySelector<HTMLElement>(".pmEventPopupAlert")!;
  let popupStart = 0; // the start it counts down to; 0 = closed
  let timer: Animation | undefined;
  const closePopup = () => {
    if (!popupStart) return;
    popupStart = 0;
    timer?.cancel();
    popup.classList.add("isLeaving");
    setTimeout(() => popupStart || (popup.hidden = true), 150); // the leave transition
  };
  const showPopup = (name: string, start: number, seconds: number) => {
    popupStart = start;
    const time = countdown(start, Date.now());
    popupName.textContent = name;
    popupTime.textContent = say("pmWidget.eventStartsIn", { time }, `in ${time}`);
    popupAlert.textContent = say("pmWidget.eventSoon", { name, time }, `${name} in ${time}`);
    popup.classList.remove("isLeaving");
    popup.hidden = false;
    timer?.cancel();
    timer = popup.querySelector(".pmEventPopupBar")!.animate([{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }], {
      duration: seconds * 1000,
      easing: "linear",
      fill: "forwards",
    });
    timer.finished.then(closePopup, () => {}); // cancel() rejects: a newer popup or the X
  };
  popup.querySelector(".pmEventPopupClose")!.addEventListener("click", closePopup);
  for (const [on, off] of [["pointerenter", "pointerleave"], ["focusin", "focusout"]]) {
    popup.addEventListener(on, () => timer?.pause());
    popup.addEventListener(off, () => popupStart && timer?.play());
  }
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
    if (popupStart) {
      // Closes on its timer, or when the event starts if that comes first.
      const time = countdown(popupStart, now);
      if (popupStart <= now) closePopup();
      else popupTime.textContent = say("pmWidget.eventStartsIn", { time }, `in ${time}`);
    }
    const lines = soon.filter((s) => s.start > dismissed);
    if (!lines.length) {
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
    strip.hidden = false;
  };
  tick();
  setInterval(tick, 1000);
}
