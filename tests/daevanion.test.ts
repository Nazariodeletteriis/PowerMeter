// Daevanion Planner and Builder math. Run: node --test tests/daevanion.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildStats, connected, estimates, planTotals, plannerNodes, savedNodes, toggle } from "../src/dashboard/pages/characters/calc.ts";

// 3×3 board, Start in the middle, empty cell top-left, a skill node bottom-right.
//   None  a    b
//   c     S    d
//   e     f    sk
const cell = (id: string, row: number, col: number, kind = "Stat", extra = {}) => ({
  id: `templar:${id}`,
  name: id,
  data_json: { id: 0, board: 1, row, col, rarity: "Common", kind, cost: kind === "Stat" ? 1 : kind === "SkillLevel" ? 2 : 0, title: id, stat: "HPMax", value: "10", ...extra },
});
const nodes = plannerNodes({
  boards: [],
  nodes: [
    cell("none", 0, 0, "None", { stat: undefined }),
    cell("a", 0, 1),
    cell("b", 0, 2, "Stat", { stat: "CombatSpeed", value: "150" }),
    cell("c", 1, 0),
    cell("S", 1, 1, "Start", { stat: undefined }),
    cell("d", 1, 2),
    cell("e", 2, 0),
    cell("f", 2, 1),
    cell("sk", 2, 2, "SkillLevel", { stat: "13720000", value: "1", title: "Skill Level Up - Exploit Weakness" }),
  ],
});
const id = (x: string) => `templar:${x}`;

test("a node must touch the Start node or a picked node", () => {
  assert.deepEqual(toggle(nodes, [], id("a")), [id("a")]);
  assert.equal(toggle(nodes, [], id("b")), null); // not next to the path
  assert.equal(toggle(nodes, [], id("none")), null); // empty cell
  assert.equal(toggle(nodes, [], id("S")), null); // Start is always on
  assert.deepEqual(toggle(nodes, [id("a")], id("b")), [id("a"), id("b")]);
});

test("removing a node drops the branch it disconnects", () => {
  // S → a → b, and S → d: removing a leaves b with no path (d is not picked... pick it to keep b alive).
  assert.deepEqual(toggle(nodes, [id("a"), id("b")], id("a")), []);
  assert.deepEqual(toggle(nodes, [id("a"), id("b"), id("d")], id("a")), [id("b"), id("d")]);
});

test("reload validation drops unknown and disconnected ids", () => {
  assert.deepEqual(connected(nodes, [id("b"), "templar:999", id("S"), id("f")]), [id("f")]);
  assert.deepEqual(savedNodes({ templar: { profile: "global_204", nodes: [id("a")] } }, "templar"), [id("a")]);
  assert.deepEqual(savedNodes({ templar: { profile: "planner_extended", nodes: [id("a")] } }, "templar"), []);
});

test("totals: cost per board, raw stats, skill bonuses apart", () => {
  const t = planTotals(nodes, [id("a"), id("b"), id("d"), id("sk")]);
  assert.deepEqual(t.spent, { 1: 5 });
  assert.deepEqual(t.stats, { HPMax: 20, CombatSpeed: 150 });
  assert.deepEqual(t.skills, { "13720000": { title: "Skill Level Up - Exploit Weakness", levels: 1, icon: undefined } });
});

test("builder: base + gear + enhancement + planner in display units, estimates", () => {
  const data = {
    stats: [{ stat_key: "CombatSpeed", name: "Combat Speed", percent: 1 as const, grp: null }],
    base: [{ level: 45, stats_json: { HPMax: 4702, FixingDamage: 61, Defense: 450 } }],
    budgets: null,
    skills: [{ skill_id: "1", name: "Hit", attack_ratio_min_percent: 100, attack_ratio_max_percent: 100, flat_min: 10, flat_max: 10, hits: 2, cooldown_ms: 2000 }],
  };
  const staff = { id: "s", name: "Staff", slot: "Staff", grade: "Legend", level: 45, icon: null, max_enh: 10, stats_json: [["WeaponMinDamage", "Min Attack", 183, "number"], ["WeaponDamage", "Max Attack", 252, "number"]] as [string, string, number, string][] };
  const stats = buildStats(data, 45, [{ piece: staff, enh: 1, bonus: [["WeaponMinDamage", 5], ["WeaponDamage", 5]] }], planTotals(nodes, [id("a"), id("b")]));
  assert.equal(stats.CombatSpeed, 1.5); // 150 raw → 1.5 %
  assert.equal(stats.HPMax, 4712);
  assert.equal(stats.WeaponMinDamage, 188);
  const e = estimates(stats, data.skills);
  assert.equal(e.attack, Math.round((188 + 257) / 2 + 61)); // 284 (283.5)
  assert.equal(e.dps, Math.round(((283.5 * 100) / 100 + 10) * 2 / 2));
  assert.equal(e.cp, Math.round(283.5 + 450 + 471.2));
});
