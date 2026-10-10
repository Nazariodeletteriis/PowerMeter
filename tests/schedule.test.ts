// Event timer engine. Run: node --test tests/schedule.test.ts  (Node 22.18+ strips the types)
import assert from "node:assert/strict";
import { test } from "node:test";
import { eventStatus, instantAt, startsBetween, upcomingWindows, type GameEvent } from "../src/dashboard/pages/organizer/schedule.ts";
import { clock } from "../src/dashboard/pages/shugo/events.ts";

const rule = (event_id: string, cadence_json: GameEvent["cadence_json"], duration_minutes = 0): GameEvent => ({
  event_id, category: "event", name: event_id, timezone: "Asia/Seoul", duration_minutes, cadence_json, location: null, server_verified: 0,
});
const daily = rule("daily-reset", { kind: "hourOfDay", hours: [16] });
const weekly = rule("weekly-reset", { kind: "daysAtTime", weekdays: [3], hour: 16, minute: 0 });
const shugo = rule("shugo-festival", { kind: "minuteOfHour", minutes: [0] }, 10);
const rift = rule("spacetime-rift", { kind: "hourOfDay", hours: [0, 3, 6, 9, 12, 15, 18, 21] }, 60);
const at = (iso: string) => Date.parse(iso);
const local = (ms: number, zone: string) => clock(ms, "en-GB", zone);

test("16:00 KST across the European switch to winter time (2026-10-25)", () => {
  const [sat, sun] = upcomingWindows(daily, at("2026-10-24T00:00:00Z"), 2);
  assert.equal(sat.start, at("2026-10-24T07:00:00Z"));
  assert.equal(sun.start, at("2026-10-25T07:00:00Z"));
  assert.equal(local(sat.start, "Europe/Rome"), "09:00"); // CEST, UTC+2
  assert.equal(local(sun.start, "Europe/Rome"), "08:00"); // CET, UTC+1
  // No DST: same wall time both days.
  for (const w of [sat, sun]) {
    assert.equal(local(w.start, "Asia/Tokyo"), "16:00");
    assert.equal(local(w.start, "Asia/Kolkata"), "12:30");
  }
});

test("rift windows stay 3 hours apart through the DST night", () => {
  const ws = upcomingWindows(rift, at("2026-10-24T20:00:00Z"), 6);
  for (let i = 1; i < ws.length; i++) assert.equal(ws[i].start - ws[i - 1].start, 3 * 3600e3);
  assert.deepEqual(ws.map((w) => local(w.start, "Europe/Rome")), ["23:00", "02:00", "04:00", "07:00", "10:00", "13:00"]);
});

test("wall time to instant in a DST zone", () => {
  assert.equal(instantAt(2026, 10, 24, 12, 0, "Europe/Rome"), at("2026-10-24T10:00:00Z"));
  assert.equal(instantAt(2026, 10, 25, 12, 0, "Europe/Rome"), at("2026-10-25T11:00:00Z"));
  assert.equal(instantAt(2026, 3, 29, 12, 0, "Europe/Rome"), at("2026-03-29T10:00:00Z"));
});

test("window boundaries: start inclusive, end exclusive", () => {
  const start = at("2026-10-10T03:00:00Z"); // 12:00 KST
  assert.deepEqual(eventStatus(shugo, start - 1), { window: { event_id: "shugo-festival", start, end: start + 600e3, active: false }, remaining: 1 });
  assert.equal(eventStatus(shugo, start).window.active, true);
  assert.equal(eventStatus(shugo, start + 600e3 - 1).remaining, 1);
  const after = eventStatus(shugo, start + 600e3);
  assert.equal(after.window.active, false);
  assert.equal(after.window.start, start + 3600e3);
  // Zero-length events (resets) are never "active": at the instant they move to the next one.
  assert.equal(eventStatus(daily, at("2026-10-24T07:00:00Z")).window.start, at("2026-10-25T07:00:00Z"));
});

test("weekly reset: Wednesday 16:00 KST", () => {
  const saturday = at("2026-10-10T12:00:00Z");
  assert.equal(eventStatus(weekly, saturday).window.start, at("2026-10-14T07:00:00Z"));
  // At the reset instant the next one is a week later.
  assert.equal(eventStatus(weekly, at("2026-10-14T07:00:00Z")).window.start, at("2026-10-21T07:00:00Z"));
  // Wednesday 16:00 KST is still Wednesday 09:00 in Rome before the switch, 08:00 after.
  const [a, b, c] = upcomingWindows(weekly, saturday, 3);
  assert.deepEqual([a, b, c].map((w) => local(w.start, "Europe/Rome")), ["09:00", "09:00", "08:00"]);
});

test("sound alert fires once, on the start", () => {
  const start = at("2026-10-10T03:00:00Z");
  assert.equal(startsBetween([shugo], start - 1000, start), true);
  assert.equal(startsBetween([shugo], start, start + 1000), false);
  assert.equal(startsBetween([], start - 1000, start), false);
});
