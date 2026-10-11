// Widget event notice: from 10 minutes before an event of the Timer (rift, world bosses, Shugo festival,
// resets) a strip under the widget header names it with a countdown, so whoever keeps only the widget open
// sees it while playing. It goes at the start, or when closed with its X (that window only).
// Same event rules and maths as the dashboard's Timer (gamedata_events + organizer/schedule.ts); rings the
// Timer's chime when a new notice appears, if the Timer's sound is on.
import { invoke } from "@tauri-apps/api/core";
import { chime, SOUND_KEY } from "../dashboard/chime";
import { upcomingWindows, type GameEvent } from "../dashboard/pages/organizer/schedule";

const LEAD = 10 * 60e3;
const RELOAD = 60 * 60e3; // the archive can bring new rules while the app runs

type I18n = { format?: (key: string, vars: Record<string, string>, fallback: string) => string };
const w = window as unknown as { A2_VIEW?: string; i18n?: I18n };

const strip = document.querySelector<HTMLElement>(".pmEventStrip");
// index.html also hosts the details/settings windows: the notice is the overlay's only.
if (strip && w.A2_VIEW === "main") {
  const text = strip.querySelector<HTMLElement>(".pmEventText")!;
  let events: GameEvent[] = [];
  let loadedAt = -RELOAD;
  let dismissed = 0;
  let shown = 0;

  strip.querySelector(".pmEventClose")!.addEventListener("click", () => {
    dismissed = shown;
    strip.hidden = true;
  });

  const tick = () => {
    const now = Date.now();
    if (now - loadedAt >= RELOAD) {
      loadedAt = now;
      // Not downloaded yet: no notice until the next reload.
      invoke<GameEvent[]>("gamedata_events").then((e) => (events = e), () => (events = []));
    }
    // Two windows per event: the first can be one still running (Shugo festival lasts 10 minutes).
    const soon = events.flatMap((e) => upcomingWindows(e, now, 2).map((x) => ({ name: e.name, start: x.start }))).filter((x) => x.start > now && x.start - now <= LEAD);
    const start = Math.min(...soon.map((x) => x.start));
    if (!soon.length || start === dismissed) {
      strip.hidden = true;
      return;
    }
    if (start !== shown) invoke<Record<string, string>>("get_settings").then((s) => s[SOUND_KEY] === "1" && chime(), () => {});
    shown = start;
    const left = Math.ceil((start - now) / 1000);
    const time = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    const name = [...new Set(soon.filter((x) => x.start === start).map((x) => x.name))].join(", ");
    text.textContent = w.i18n?.format?.("pmWidget.eventSoon", { name, time }, `${name} in ${time}`) ?? `${name} in ${time}`;
    strip.hidden = false;
  };
  tick();
  setInterval(tick, 1000);
}
