// Gear Viewer compare: enhancement level and bonuses of a piece. Run: node --test tests/gear-tune.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { enhBonus, enhSteps, fitOpts, readTunes } from "../src/dashboard/pages/gear/enh.ts";
import type { EnhancementValue, ItemStat } from "../src/data/db/types.ts";

const lv = (level: number, stat_key: string, value_raw: number, percent: 0 | 1 = 0): EnhancementValue => ({ level, stat_key, value_raw, percent, value_kind: "enhancement_bonus", status: "published" });
const to15 = Array.from({ length: 15 }, (_, i) => lv(i + 1, "WeaponDamage", (i + 1) * 10));

test("levels: published ones, and +16 to +20 only for pieces published up to +15", () => {
  assert.deepEqual(enhSteps([lv(1, "A", 1), lv(2, "A", 2)]), [0, 1, 2]);
  assert.deepEqual(enhSteps(to15).slice(-6), [15, 16, 17, 18, 19, 20]);
  assert.deepEqual(enhSteps([]), [0]);
});

test("bonus: the level's values in display units; past the last published one, that one's", () => {
  assert.deepEqual(enhBonus([lv(1, "A", 5), lv(1, "B", 150, 1)], 1), [["A", 5], ["B", 1.5]]);
  assert.deepEqual(enhBonus(to15, 18), [["WeaponDamage", 150]]);
  assert.deepEqual(enhBonus(to15, 0), []);
});

const atk: ItemStat = { stat_key: "WeaponFixingDamage", label: "Attack", fixed_display: null, min_display: 12, max_display: 21, unit: "number", is_rolled: 1 };
const spd: ItemStat = { stat_key: "CombatSpeed", label: "Combat Speed", fixed_display: null, min_display: 3.49, max_display: 4.08, unit: "percent", is_rolled: 1 };

test("bonuses: archive options stay in their range, once each; hand-added ones only without options", () => {
  assert.deepEqual(
    fitOpts([["WeaponFixingDamage", 40, 0], ["CombatSpeed", 3.456, 0], ["WeaponFixingDamage", 15, 0], ["HPMax", 100, 1], ["Nope", 1, 0]], [atk, spd]),
    [["WeaponFixingDamage", 21, 0], ["CombatSpeed", 3.49, 0]],
  );
  assert.deepEqual(fitOpts([["HPMax", 100.456, 1], ["WeaponFixingDamage", 15, 0]], []), [["HPMax", 100.46, 1]]);
});

test("saved choices: only the expected shape is read", () => {
  assert.deepEqual(readTunes("not json"), {});
  assert.deepEqual(readTunes("[1]"), {});
  assert.deepEqual(
    readTunes(JSON.stringify({ sword_1: { enh: 18, opts: [["STR", 9, 0], ["bad key!", 1, 0], ["AGI", "x", 0], ["HP", 5, 2]] }, "a b": { enh: 1 }, axe: { enh: 99 } })),
    { sword_1: { enh: 18, opts: [["STR", 9, 0]] }, axe: { enh: 0, opts: [] } },
  );
});
