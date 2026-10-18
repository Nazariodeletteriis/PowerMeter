// Pet collection: owned pets (game over hand-marked) and effects added to the Builder's stats. Run: node --test tests/pets.test.ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildStats, ownedPets, petCollection, petLevelEffects, petsFromGame, petStatKey, type PetEffect, type PetSet } from "../src/dashboard/pages/characters/calc.ts";

// The Pet window's "owned effects" list as the game shows it (screenshot, 2026-10).
const effects: PetEffect[] = [
  ["Accuracy", 11, false],
  ["Evasion", 7, false],
  ["SPMax", 144, false],
  ["CON", 1, false],
  ["GroundVehicleSpeed", 66, false],
  ["Critical", 6, false],
  ["VehicleSprintCost", 4.7, true],
  ["CriticalResist", 8, false],
  ["HPMax", 340, false],
];
const keys = ["Accuracy", "Evasion", "SPMax", "CON", "Critical", "CriticalResist", "HPMax", "GroundVehicleSpeed", "VehicleSprintCost"];

test("mount stats and unknown keys add to no Builder stat", () => {
  const known = new Set(keys);
  assert.equal(petStatKey("HPMax", known), "HPMax");
  assert.equal(petStatKey("GroundVehicleSpeed", known), null);
  assert.equal(petStatKey("VehicleSprintCost", known), null);
  assert.equal(petStatKey("NotAStat", known), null);
});

test("pet effects are summed with the other sources", () => {
  const data = {
    base: [{ level: 45, stats_json: { HPMax: 1000 } }],
    stats: keys.map((k) => ({ stat_key: k, name: k, percent: k === "VehicleSprintCost" ? 1 : 0, grp: null })),
    skills: [],
  } as never;
  const s = buildStats(data, 45, [], { spent: {}, stats: {}, skills: {} }, effects);
  assert.equal(s.HPMax, 1340);
  assert.equal(s.Accuracy, 11);
  assert.equal(s.SPMax, 144);
  assert.equal(s.GroundVehicleSpeed, undefined);
  assert.equal(s.VehicleSprintCost, undefined);
});

test("pets read from the game win, and so does their equipped one", () => {
  const manual = { A: { lvl: 2 as const, exp: 30, eq: true as const }, B: { lvl: 1 as const, exp: 5 } };
  assert.deepEqual(ownedPets(manual), manual);
  assert.deepEqual(ownedPets(manual, { B: { lvl: 3, exp: 0, eq: true } }), { A: { lvl: 2, exp: 30 }, B: { lvl: 3, exp: 0, eq: true } });
  assert.deepEqual(ownedPets(manual, { B: { lvl: 3, exp: 0 } }), { A: { lvl: 2, exp: 30, eq: true }, B: { lvl: 3, exp: 0 } });
});

test("the game's collection maps TW pet ids to creature codes", () => {
  // packets_20261013_031645 (00 90): 1013 level 3 (MAX), 1002 level 1 at 16/75; 9999 is no pet of the map.
  const codes = { "1002": "Basilisk_01", "1013": "AbyssSwarm_01" };
  const got = petsFromGame([{ id: 1002, lvl: 1, exp: 16 }, { id: 1013, lvl: 3, exp: 40 }, { id: 9999, lvl: 2, exp: 3 }], codes);
  assert.deepEqual(got, { Basilisk_01: { lvl: 1, exp: 16 }, AbyssSwarm_01: { lvl: 3, exp: 0 } });
});

test("a pet's level replaces the one before (genus tiers of the datamine)", () => {
  // OwlMag_01 is Intellect: Lv 1 HP 10; Lv 2 Crit 1, HP 20; Lv 3 Crit 2, HP 30, Might 1. Special pets give none.
  assert.deepEqual(petLevelEffects("OwlMag_01", 1), [["HPMax", 10, false]]);
  assert.deepEqual(petLevelEffects("OwlMag_01", 3), [["Critical", 2, false], ["HPMax", 30, false], ["STR", 1, false]]);
  assert.deepEqual(petLevelEffects("BlackDragon_01", 3), []);
  assert.deepEqual(petLevelEffects("NotAPet", 2), []);
});

test("the collection sums every owned pet at its level, by genus too", () => {
  const PET_IDS = JSON.parse(readFileSync(new URL("../src/data/pet_ids.json", import.meta.url), "utf8")) as Record<string, string>;
  // packets_20261013_031702 (00 90): 165 pets; summed per level they give the game's owned-effects list above.
  const hex = readFileSync(new URL("../src-tauri/src/capture/testdata/pets_0090_20261013_031702.hex", import.meta.url), "utf8").trim();
  const b = Buffer.from(hex, "hex");
  let n = 0, sh = 0, o = 4;
  for (;;) { const x = b[o++]; n |= (x & 0x7f) << sh; sh += 7; if (!(x & 0x80)) break; }
  const pets = Array.from({ length: n }, (_, i) => ({ id: b.readUInt32LE(o + i * 12), lvl: b.readUInt32LE(o + i * 12 + 8), exp: 0 }));
  const owned = petsFromGame(pets, PET_IDS);
  const got = Object.fromEntries(petCollection(owned).map(([k, v]) => [k, v]));
  assert.deepEqual(got, Object.fromEntries(effects.map(([k, v]) => [k, v])));
  assert.deepEqual(petCollection(owned, "Trans").sort(), [["CON", 1, false], ["Evasion", 7, false], ["VehicleSprintCost", 4.7, true]]);
  const two: PetSet = { OwlMag_01: { lvl: 2, exp: 0 }, AddShulack_03: { lvl: 3, exp: 0 } };
  assert.deepEqual(petCollection(two), [["Critical", 3, false], ["HPMax", 50, false], ["STR", 1, false]]);
  assert.deepEqual(petCollection(two, "Feral"), []);
});
