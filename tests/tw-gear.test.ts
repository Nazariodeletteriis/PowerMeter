// Taiwan equipment (numeric item ids from the packets) as Builder pieces. Run: node --test tests/tw-gear.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildStats,
  twPiece,
  type TwGearRow,
} from "../src/dashboard/pages/characters/calc.ts";

// Rows as gamedata_tw_gear returns them for Spiritforged Mace (110730048), caught in packets_20261011_121052.
const mace: TwGearRow = {
  id: "110730048",
  name: "Spiritforged Mace",
  slot: "Mace",
  grade: "Unique",
  level: 57,
  stats_json: [
    ["WeaponMinDamage|WeaponDamage", "Attack", "203 ~ 261"],
    ["Block", "Block", "50"],
    ["MaxShieldBlock", "Shield Block Damage Reduction Amount", "100,000"],
    ["DecreaseShieldBlock", "Shield Block Damage Reduction Rate", "40%"],
    ["DamageRatio", "Attack Increase", null],
    [null, "Attack range (horizontal)", "20m"],
  ],
  enh_json: [
    [0, [], []],
    [1, { WeaponMinDamage: "10", WeaponDamage: "10" }, []],
    [
      16,
      { WeaponMinDamage: "250", WeaponDamage: "250" },
      { WeaponFixingDamage: "30", DamageRatio: "1%" },
    ],
  ],
};

test("reads the item card's values as stats", () => {
  const { piece } = twPiece(mace);
  assert.equal(piece.slot, "Mace");
  assert.deepEqual(piece.stats_json, [
    ["WeaponMinDamage", "Attack min", 203, "number"],
    ["WeaponDamage", "Attack max", 261, "number"],
    ["Block", "Block", 50, "number"],
    [
      "MaxShieldBlock",
      "Shield Block Damage Reduction Amount",
      100000,
      "number",
    ],
    [
      "DecreaseShieldBlock",
      "Shield Block Damage Reduction Rate",
      40,
      "percent",
    ],
  ]);
  assert.equal(piece.max_enh, 16);
});

test("gives the enhancement bonus per level, percent raw ×100 like the Global data", () => {
  const { levels } = twPiece(mace);
  assert.deepEqual(
    levels.filter((v) => v.level === 1).map((v) => [v.stat_key, v.value_raw]),
    [
      ["WeaponMinDamage", 10],
      ["WeaponDamage", 10],
    ],
  );
  assert.deepEqual(
    [
      levels.find((v) => v.level === 16 && v.stat_key === "DamageRatio")
        ?.value_raw,
      levels.find((v) => v.level === 16 && v.stat_key === "DamageRatio")
        ?.percent,
    ],
    [100, 1],
  );
});

test("adds up in the Builder totals", () => {
  const { piece } = twPiece(mace);
  const data = {
    base: [{ level: 45, stats_json: {} }],
    stats: [],
    skills: [],
  } as never;
  const plan = { spent: {}, stats: {}, skills: {} };
  const t = buildStats(
    data,
    45,
    [{ piece, enh: 1, bonus: [["WeaponDamage", 10]] }],
    plan,
  );
  assert.deepEqual(
    [t.WeaponMinDamage, t.WeaponDamage, t.Block],
    [203, 271, 50],
  );
});
