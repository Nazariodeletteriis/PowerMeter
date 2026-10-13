// Pet collection: owned pets (game over hand-marked) and effects added to the Builder's stats. Run: node --test tests/pets.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildStats, ownedPets, petsFromGame, petStatKey, type PetEffect } from "../src/dashboard/pages/characters/calc.ts";

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
