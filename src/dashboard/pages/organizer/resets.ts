// Aion 2 resets: daily at 06:00, weekly on Wednesday 06:00 (prototype pOrg).
// ponytail: computed in the PC's local time; switch to the server time zone
// per region (settings "pm.region") once it is confirmed at launch.
const RESET_HOUR = 6;
const WEDNESDAY = 3;

/** Next daily (no weekday) or weekly reset strictly after `now`. */
function nextReset(now: Date, weekday?: number): Date {
  const d = new Date(now);
  d.setHours(RESET_HOUR, 0, 0, 0);
  if (weekday !== undefined) d.setDate(d.getDate() + ((weekday - d.getDay() + 7) % 7));
  if (d <= now) d.setDate(d.getDate() + (weekday === undefined ? 1 : 7));
  return d;
}

export const nextDailyReset = (now: Date) => nextReset(now);
export const nextWeeklyReset = (now: Date) => nextReset(now, WEDNESDAY);
