// Builder wings and titles: saved picks, faction, stats at an enchant level, title labels on stat keys.
// Run: node --test tests/wings-titles.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildStats, raceFits, readTitle, readWing, titleRace, titleStats, wingStats } from "../src/dashboard/pages/characters/calc.ts";
import type { EnhancementValue } from "../src/data/db/types.ts";

test("saved picks: only well-formed ones are read", () => {
  assert.deepEqual(readWing({ id: "Wing_D_WingA_010", enh: 7 }), { id: "Wing_D_WingA_010", enh: 7 });
  assert.deepEqual(readWing({ id: "Wing_D_WingA_010", enh: -1 }), { id: "Wing_D_WingA_010", enh: 0 });
  assert.deepEqual(readWing({ id: "Wing_D_WingA_010", enh: "9" }), { id: "Wing_D_WingA_010", enh: 0 });
  assert.equal(readWing({ id: "<img>", enh: 1 }), undefined);
  assert.equal(readWing("Wing_D_WingA_010"), undefined);
  assert.equal(readWing(undefined), undefined);
  assert.equal(readTitle(19033001), 19033001);
  assert.equal(readTitle(49033001), 49033001);
  assert.equal(readTitle("19033001"), undefined);
  assert.equal(readTitle(59033001), undefined);
  assert.equal(readTitle(1.5), undefined);
});

test("faction: Light is Elyos, Dark Asmodian, the rest both; no faction shows all", () => {
  assert.equal(titleRace(19033001), "Light");
  assert.equal(titleRace(29033002), "Dark");
  assert.equal(titleRace(31010001), "All");
  assert.equal(titleRace(41010001), "All");
  assert.equal(raceFits("Light", "elyos"), true);
  assert.equal(raceFits("Light", "asmodian"), false);
  assert.equal(raceFits("Dark", "asmodian"), true);
  assert.equal(raceFits("All", "asmodian"), true);
  assert.equal(raceFits("Dark", undefined), true);
});

// Forest Spirit Wings (archive, global_204): own stats and group Wing_L_DropParty_05b.
const own = [
  { stat: "BossNpcAddDamage", value: 95 },
  { stat: "BossNpcAmplifyDamage", value: 350 },
  { stat: "Defense", value: 400 },
];
const row = (level: number, stat_key: string, value_raw: number, percent: 0 | 1 = 0): EnhancementValue => ({ level, stat_key, value_raw, percent, value_kind: "reported_group_stats", status: "published" });
const levels = [row(0, "FPMax", 20000), row(0, "DecreaseDamage", 100, 1), row(10, "FPMax", 30000), row(10, "DecreaseDamage", 100, 1)];
const pct = new Set(["BossNpcAmplifyDamage", "DecreaseDamage"]);

test("wing stats: own stats plus the group's at exactly that level, percent ×100", () => {
  assert.deepEqual(wingStats(own, levels, 10, pct), [
    ["BossNpcAddDamage", 95, false],
    ["BossNpcAmplifyDamage", 3.5, true],
    ["Defense", 400, false],
    ["FPMax", 30000, false],
    ["DecreaseDamage", 1, true],
  ]);
  // Level 5 is not in the group: no level values are made up, the own stats stay.
  assert.equal(wingStats(own, levels, 5, pct).length, 3);
  // Rows of other kinds or not published are left out.
  assert.equal(wingStats([], [{ ...row(0, "HPMax", 50), status: "derived_zero_baseline" }], 0, pct).length, 0);
});

const dict = [
  { stat_key: "FixingDamage", name: "Attack Bonus", percent: 0 as const, grp: null },
  { stat_key: "HPMax", name: "HP", percent: 0 as const, grp: null },
  { stat_key: "MoveSpeed", name: "Move Speed", percent: 1 as const, grp: null },
  { stat_key: "FPMax", name: "Flight Power", percent: 0 as const, grp: null },
];

test("title stats: labels are the dictionary's names, unknown ones shown apart", () => {
  const r = titleStats([["Attack Bonus", 7], ["Move Speed", 160], ["Made-up Stat", 3]], dict);
  assert.deepEqual(r.fx, [["FixingDamage", 7, false], ["MoveSpeed", 1.6, true]]);
  assert.deepEqual(r.unmapped, [["Made-up Stat", 3]]);
});

test("wing and title effects add to the totals; Flight Power does not", () => {
  const data = { base: [{ level: 45, stats_json: { HPMax: 1000 } }], stats: dict, skills: [] } as never;
  const fx = [...wingStats([{ stat: "HPMax", value: 500 }], [row(3, "FPMax", 23000)], 3, new Set()), ...titleStats([["Attack Bonus", 7]], dict).fx];
  const s = buildStats(data, 45, [], { spent: {}, stats: {}, skills: {} }, fx);
  assert.equal(s.HPMax, 1500);
  assert.equal(s.FixingDamage, 7);
  assert.equal(s.FPMax, undefined);
});

test("titles file: facts only, well-formed ids, categories, grades and 69 stat labels", () => {
  const titles = JSON.parse(readFileSync(new URL("../src/data/titles.json", import.meta.url), "utf8")) as {
    id: number; category: string; name: string; grade: string; equipped: [string, number][]; owned: [string, number][]; how: string;
  }[];
  assert.equal(titles.length, 769);
  const cats = new Set(["adventure", "challenge", "quest", "dungeon", "item", "growth"]);
  const grades = new Set(["Common", "Rare", "Legend", "Unique", "Special", "Epic"]);
  for (const t of titles) {
    assert.equal(readTitle(t.id), t.id);
    assert.ok(cats.has(t.category), t.category);
    assert.ok(grades.has(t.grade), t.grade);
    assert.deepEqual(Object.keys(t).sort(), ["category", "equipped", "grade", "how", "id", "name", "owned"]);
    for (const [l, v] of [...t.equipped, ...t.owned]) assert.ok(typeof l === "string" && Number.isInteger(v) && v > 0, `${t.id} ${l}`);
  }
  const labels = new Set(titles.flatMap((t) => [...t.equipped, ...t.owned].map(([l]) => l)));
  assert.equal(labels.size, 69);
});
