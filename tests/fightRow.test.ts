// Home fight row. Run: node --test tests/fightRow.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { fightOutcome, groupDps } from "../src/dashboard/fightRow.ts";

test("outcome: only boss fights have one; false is 'not killed', not a wipe", () => {
  assert.equal(fightOutcome({ mode: "boss", killed: true }), "kill");
  assert.equal(fightOutcome({ mode: "boss", killed: false }), "notKilled");
  assert.equal(fightOutcome({ mode: "boss" }), "unknown");
  assert.equal(fightOutcome({ mode: "boss", killed: null }), "unknown");
  assert.equal(fightOutcome({ mode: "train" }), "na");
  assert.equal(fightOutcome({ mode: "pvp", killed: true }), "na");
});

test("group DPS: damage over duration, null without a duration", () => {
  assert.equal(groupDps({ totalDamage: 100, durationMs: 4000 }), 25);
  assert.equal(groupDps({ totalDamage: 100, durationMs: 0 }), null);
  assert.equal(groupDps({ totalDamage: 0, durationMs: 4000 }), 0);
});
