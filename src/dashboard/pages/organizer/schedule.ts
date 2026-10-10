import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

// Event timer: the `events` table of the game data archive (rules in the event's own
// time zone, Asia/Seoul). Instants are UTC ms; pages show them in the PC's local time
// (Intl does the zone and DST conversion, see shugo/events.ts `clock`).

export type Cadence =
  | { kind: "minuteOfHour"; minutes: number[] }
  | { kind: "hourOfDay"; hours: number[] }
  | { kind: "daysAtTime"; weekdays: number[]; hour: number; minute: number }; // weekdays 0 = Sunday

/** One `events` row (gamedata_events). */
export interface GameEvent {
  event_id: string;
  category: string;
  name: string;
  timezone: string;
  duration_minutes: number;
  cadence_json: Cadence;
  location: string | null;
  server_verified: 0 | 1;
}

export interface EventWindow {
  event_id: string;
  start: number;
  end: number;
  active: boolean;
}

const MIN = 60e3;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const fmt = new Map<string, Intl.DateTimeFormat>();
/** Wall clock of `ms` in `zone`. */
function parts(ms: number, zone: string) {
  let f = fmt.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    });
    fmt.set(zone, f);
  }
  const p = Object.fromEntries(f.formatToParts(ms).filter((x) => x.type !== "literal").map((x) => [x.type, Number(x.value)]));
  return p as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
}

/** UTC instant of the wall time y-m-d h:min in `zone` (converges in 1-2 steps, DST included). */
export function instantAt(y: number, m: number, d: number, h: number, min: number, zone: string) {
  const wall = Date.UTC(y, m - 1, d, h, min);
  let ms = wall;
  for (let i = 0; i < 3; i++) {
    const p = parts(ms, zone);
    ms += wall - Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  }
  return ms;
}

/** The next `count` windows of `e` still running or ahead of `now`, by start. */
export function upcomingWindows(e: GameEvent, now: number, count = 8): EventWindow[] {
  const c = e.cadence_json;
  const len = e.duration_minutes * MIN;
  const out: EventWindow[] = [];
  const add = (start: number) => {
    const end = start + len;
    if (end > now || (len === 0 && start > now)) out.push({ event_id: e.event_id, start, end, active: len > 0 && start <= now && now < end });
  };
  if (c.kind === "minuteOfHour") {
    // ponytail: whole-hour UTC base, right for every whole-hour zone (Asia/Seoul).
    const base = Math.floor((now - len) / HOUR) * HOUR;
    const minutes = [...c.minutes].sort((a, b) => a - b);
    for (let h = 0; out.length < count; h++) for (const m of minutes) add(base + h * HOUR + m * MIN);
  } else {
    const p = parts(now - len, e.timezone);
    const day0 = Date.UTC(p.year, p.month - 1, p.day);
    const hours = c.kind === "hourOfDay" ? [...c.hours].sort((a, b) => a - b) : [];
    for (let n = 0; out.length < count && n < 400; n++) {
      const d = new Date(day0 + n * DAY);
      const at = (h: number, min: number) => add(instantAt(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), h, min, e.timezone));
      if (c.kind === "daysAtTime") {
        if (c.weekdays.includes(d.getUTCDay())) at(c.hour, c.minute);
      } else for (const h of hours) at(h, 0);
    }
  }
  return out.sort((a, b) => a.start - b.start).slice(0, count);
}

/** Running window (active) or the next one, and the ms to its end / start. */
export function eventStatus(e: GameEvent, now: number) {
  const window = upcomingWindows(e, now, 1)[0];
  return { window, remaining: (window.active ? window.end : window.start) - now };
}

/** True if any event starts in (from, to]: the ring for the sound alert. */
export const startsBetween = (events: GameEvent[], from: number, to: number) =>
  events.some((e) => upcomingWindows(e, from, 2).some((w) => w.start > from && w.start <= to));

/**
 * Event rules from the archive; [] when the archive is not downloaded yet (empty state,
 * not an error), undefined while loading. Other failures go to `onError`.
 */
export function useGameEvents(onError: (e: unknown) => void) {
  const [events, setEvents] = useState<GameEvent[]>();
  useEffect(() => {
    invoke<GameEvent[]>("gamedata_events").then(setEvents, (e) => {
      setEvents([]);
      if (!String(e).includes("not downloaded")) onError(e);
    });
  }, []); // once per visit
  return events;
}
