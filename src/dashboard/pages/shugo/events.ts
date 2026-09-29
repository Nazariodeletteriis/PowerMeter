import { useEffect, useState } from "react";
import type { T } from "../../i18n";

// Shared by the Shugo Festival and Spacetime Rift pages. Both schedules are
// defined in server time (NCSOFT's KR notices); we show every time in the PC's
// local time.

export const MIN = 60e3;
export const HOUR = 60 * MIN;

// Server clock per region (Onboarding REGIONS values). NC has not published
// the EU/NA server time zones yet (global launch 2026-09-30): provisional,
// fix here once confirmed.
const SERVER_TZ: Record<string, string> = { "global-eu": "Europe/Berlin", "us-na": "America/New_York" };
export const serverZone = (region: string | undefined) => SERVER_TZ[region ?? ""] ?? SERVER_TZ["global-eu"];

const hourFmt = new Map<string, Intl.DateTimeFormat>();
/** Hour of day (0-23) of `ms` on the server clock of `zone`. */
export function serverHour(ms: number, zone: string) {
  let f = hourFmt.get(zone);
  if (!f) hourFmt.set(zone, (f = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", hourCycle: "h23" })));
  return Number(f.format(ms));
}

/** Current time, ticking every second. */
export function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const pad = (n: number) => String(n).padStart(2, "0");
/** "2d 04:20:00" like the Timers page, days only when there are any. */
export function countdown(ms: number, t: T) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86400);
  const hms = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return d ? `${t("home.days", { n: d })} ${hms}` : hms;
}

/** "14:15" in the PC's local time, or on `zone`'s clock. */
export const clock = (ms: number, lang: string, zone?: string) =>
  new Date(ms).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: zone });

/** "today" / "tomorrow" / "Fri", localized by Intl. */
export function dayLabel(ms: number, now: number, lang: string) {
  const day = (x: number) => new Date(x).setHours(0, 0, 0, 0);
  const diff = Math.round((day(ms) - day(now)) / (24 * HOUR));
  if (diff < 2) return new Intl.RelativeTimeFormat(lang, { numeric: "auto" }).format(diff, "day");
  return new Date(ms).toLocaleDateString(lang, { weekday: "short" });
}
