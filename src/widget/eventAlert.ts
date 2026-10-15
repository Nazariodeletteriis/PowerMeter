// Widget event notice: from 10 minutes before an event of the Timer (rift, world bosses, Shugo festival,
// resets) a strip under the widget header names it with a countdown, so whoever keeps only the widget open
// sees it while playing. One line per start time, so events a minute apart each get their own 10 minutes.
// A line goes at its start; the X hides the lines shown, a later event brings the strip back.
// Same event rules and maths as the dashboard's Timer (gamedata_events + organizer/schedule.ts); rings the
// Timer's chime when a new notice appears, if the Timer's sound is on.
import { invoke } from "@tauri-apps/api/core";
import { chime, SOUND_KEY, VOLUME_KEY } from "../dashboard/chime";
import { eventNotice, type GameEvent } from "../dashboard/pages/organizer/schedule";

const LEAD = 10 * 60e3;
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

  strip.querySelector(".pmEventClose")!.addEventListener("click", () => {
    dismissed = last;
    strip.hidden = true;
  });

  const tick = () => {
    const now = Date.now();
    if (now - loadedAt >= RELOAD) {
      loadedAt = now;
      // Not downloaded yet or a failed read: keep what we have and retry in a minute, not in an hour.
      invoke<GameEvent[]>("gamedata_events").then((e) => (events = e), () => (loadedAt = now - RELOAD + 60e3));
    }
    const { soon, fresh } = eventNotice(events, now, LEAD, announced);
    const lines = soon.filter((s) => s.start > dismissed);
    if (!lines.length) {
      strip.hidden = true;
      return;
    }
    if (fresh) invoke<Record<string, string>>("get_settings").then((s) => s[SOUND_KEY] === "1" && chime(s[VOLUME_KEY]), () => {});
    last = lines[lines.length - 1].start;
    text.textContent = lines.map(({ start, names }) => {
      const left = Math.ceil((start - now) / 1000);
      const time = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
      const name = names.join(", ");
      return w.i18n?.format?.("pmWidget.eventSoon", { name, time }, `${name} in ${time}`) ?? `${name} in ${time}`;
    }).join("\n");
    strip.hidden = false;
  };
  tick();
  setInterval(tick, 1000);
}
