// Crafting planner: chains, recipe tree, inventory, totals. Run: node --test tests/crafting.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildTree, chainOf, indexRecipes, sectionOf, totals, type Part, type Recipe } from "../src/dashboard/pages/crafting/tree.ts";

// A bow chain shaped like the archive's (Handicrafting, Light): a Normal craft, its Splendent twin with no
// listed inputs, the next tier made from the Splendent, a Succession step and a Dark copy.
const bow = (name: string, level: number): Part => ({ code: name, name, type: "Equip", slot: "Bow", level });
const mat = (name: string, count: number): Part => ({ code: name, name, type: "Misc", count });
let id = 0;
const recipe = (output: Part, components: Part[], o: { count?: number; race?: string; base?: Part } = {}): Recipe => ({
  id: String(++id),
  data_json: {
    recipe: { output, count: o.count ?? 1, race: o.race ?? "Light" },
    categoryLabel: "Handicrafting",
    subCategoryLabel: "Weapons",
    components,
    successionInputs: o.base ? [o.base, { ...o.base, code: `${o.base.code}#2` }] : [],
  },
});
const RECIPES = [
  recipe(mat("Wood", 0), [mat("Log", 2)], { count: 2 }),
  recipe(bow("Bow", 18), [mat("Wood", 3), mat("Odyle", 2)]),
  recipe(bow("Splendent Bow", 22), []),
  recipe(bow("Expert's Bow", 28), [{ ...bow("Splendent Bow", 22), count: 1 }, mat("Fine Log", 6)]),
  recipe(bow("Splendent Expert's Bow", 35), [mat("Scale", 4)], { base: bow("Expert's Bow", 28) }),
  recipe(mat("Magnifying Glass", 0), [{ ...bow("Splendent Expert's Bow", 35), count: 1 }]),
  recipe(bow("Bow", 18), [mat("Dark Wood", 3)], { race: "Dark" }),
  // A recipe that would need its own output: must not loop.
  recipe(mat("Ouroboros", 0), [mat("Ouroboros", 1)]),
];
const ix = indexRecipes(RECIPES, "Light");

test("sub-sections from slot, label and output code", () => {
  const d = (output: Partial<Part>, categoryLabel: string, subCategoryLabel: string) =>
    sectionOf({ recipe: { output: { code: "", name: "", ...output } }, categoryLabel, subCategoryLabel });
  assert.equal(d({ slot: "Guarder" }, "Blacksmithing", "Weapons"), "Guard");
  assert.equal(d({ slot: "Magicbook" }, "Alchemy", "Weapons"), "Spellbook");
  assert.equal(d({ code: "Potion_HP_Instant_A_c_01a_b" }, "Alchemy", "Consumables"), "Potion");
  assert.equal(d({ code: "Scroll_MoveSpeed_A_c_01b_f" }, "Alchemy", "Consumables"), "Scroll");
  assert.equal(d({ code: "SpiritStonea_Abyss_A_r_40_01a_f" }, "Alchemy", "Consumables"), "Manastone");
  assert.equal(d({ code: "x" }, "Cooking", "Materials"), "Food");
  assert.equal(d({ code: "x" }, "Alchemy", "Materials"), "Materials");
});

test("chain from any step: base first, Splendent twins in between, tools left out", () => {
  const full = ["Bow", "Splendent Bow", "Expert's Bow", "Splendent Expert's Bow"];
  for (const name of full) assert.deepEqual(chainOf(name, ix), full);
  assert.deepEqual(chainOf("Odyle", ix), ["Odyle"]);
  assert.equal(ix.normal.get("Splendent Bow"), "Bow");
});

test("faction: the Dark recipe is used for the Dark index only", () => {
  assert.equal(ix.recipe.get("Bow")!.data_json.components![0].name, "Wood");
  assert.equal(indexRecipes(RECIPES, "Dark").recipe.get("Bow")!.data_json.components![0].name, "Dark Wood");
});

test("tree expands every craftable input; recipe count sets how many crafts", () => {
  const t = buildTree("Splendent Expert's Bow", 1, ix, {});
  assert.deepEqual(
    t.kids.map((k) => k.name),
    ["Expert's Bow", "Scale"],
  );
  const splendent = t.kids[0].kids[0];
  assert.equal(splendent.name, "Splendent Bow");
  assert.equal(splendent.splendent, true);
  const wood = splendent.kids[0].kids[0];
  assert.deepEqual([wood.name, wood.qty, wood.crafts], ["Wood", 3, 2]); // 2 per craft → 2 crafts
  assert.deepEqual([wood.kids[0].name, wood.kids[0].qty], ["Log", 4]);
});

test("owned pieces are taken off once, and an owned step cuts its branch", () => {
  const t = buildTree("Splendent Expert's Bow", 2, ix, { "Splendent Bow": 1, Log: 3 });
  const expert = t.kids[0];
  assert.equal(expert.crafts, 2);
  const sb = expert.kids[0];
  assert.deepEqual([sb.qty, sb.owned], [2, 1]);
  assert.equal(sb.kids[0].qty, 1); // one Bow still to craft
  const sum = Object.fromEntries(totals(t).map((r) => [r.name, r]));
  assert.deepEqual([sum.Log.qty, sum.Log.missing], [4, 1]);
  assert.equal(sum.Scale.missing, 8);
  assert.equal(sum["Splendent Bow"].crafted, true);
  // Raw materials come before crafted parts.
  assert.ok(totals(t).findIndex((r) => r.crafted) > totals(t).findIndex((r) => r.name === "Scale"));
});

test("starting point owned: nothing below it is needed", () => {
  const t = buildTree("Splendent Expert's Bow", 1, ix, { "Expert's Bow": 1 });
  assert.deepEqual(
    totals(t).map((r) => [r.name, r.missing]),
    [["Scale", 4], ["Expert's Bow", 0]],
  );
});

test("a recipe that needs itself stops instead of looping", () => {
  const t = buildTree("Ouroboros", 1, ix, {});
  assert.equal(t.kids[0].loop, true);
  assert.equal(t.kids[0].kids.length, 0);
});
