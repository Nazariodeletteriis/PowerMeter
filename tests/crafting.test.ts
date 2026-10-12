// Crafting planner: sections, chains, materials per step and their sum. Run: node --test tests/crafting.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { chainOf, indexRecipes, materialsOf, sectionOf, sumMaterials, type Part, type Recipe } from "../src/dashboard/pages/crafting/tree.ts";

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

test("materials of one craft: the Succession base first (x1), a Splendent twin from its Normal, none for a raw material", () => {
  const list = (name: string) => materialsOf(name, ix).map((p) => [p.name, p.count]);
  assert.deepEqual(list("Splendent Expert's Bow"), [["Expert's Bow", 1], ["Scale", 4]]);
  assert.deepEqual(list("Expert's Bow"), [["Splendent Bow", 1], ["Fine Log", 6]]);
  assert.deepEqual(list("Splendent Bow"), [["Bow", 1]]);
  assert.deepEqual(list("Log"), []);
  assert.equal(materialsOf("Splendent Bow", ix)[0].level, 18); // the twin's own icon, grade and level
});

test("two steps summed by name, without the piece the first makes and the second consumes", () => {
  const sum = sumMaterials([materialsOf("Expert's Bow", ix), materialsOf("Splendent Expert's Bow", ix), [mat("Fine Log", 2)]], "Expert's Bow");
  assert.deepEqual(sum, [
    { name: "Splendent Bow", qty: 1 },
    { name: "Fine Log", qty: 8 },
    { name: "Scale", qty: 4 },
  ]);
});
