// Aion 2 resets: daily at 07:00 UTC (16:00 server time), weekly on Wednesday at the same hour.
// Fixed in UTC, so the local hour follows the PC's daylight saving on its own.
const RESET_HOUR_UTC = 7;
const WEDNESDAY = 3;

/** Next daily (no weekday) or weekly reset strictly after `now`. */
function nextReset(now: Date, weekday?: number): Date {
  const d = new Date(now);
  d.setUTCHours(RESET_HOUR_UTC, 0, 0, 0);
  if (weekday !== undefined) d.setUTCDate(d.getUTCDate() + ((weekday - d.getUTCDay() + 7) % 7));
  if (d <= now) d.setUTCDate(d.getUTCDate() + (weekday === undefined ? 1 : 7));
  return d;
}

export const nextDailyReset = (now: Date) => nextReset(now);
export const nextWeeklyReset = (now: Date) => nextReset(now, WEDNESDAY);

/** The reset hour in the PC's local time, e.g. "09:00". */
export const resetTime = (now: Date) =>
  nextDailyReset(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
