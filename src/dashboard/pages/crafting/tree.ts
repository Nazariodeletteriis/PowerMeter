// Crafting planner logic on the archive's recipes (gamedata_recipes): sections, upgrade chains, the recipe
// tree of a goal with what the user owns taken off, and the totals. Pure: tests/crafting.test.ts.
// Items are keyed by name: the archive repeats one piece under several codes (e.g. two "True Dragon Lord Bow"
// that a Succession recipe accepts alike), and the user thinks in names.

export type Part = {
  code: string;
  name: string;
  type?: string;
  grade?: string;
  icon?: string;
  slot?: string;
  level?: number;
  race?: string;
  count?: number;
};
export type RecipeData = {
  recipe: { output: Part; count?: number; type?: string; race?: string };
  categoryLabel?: string;
  subCategoryLabel?: string;
  components?: Part[];
  /** Succession base: one of these items (always the same piece under different codes). */
  successionInputs?: Part[];
};
export type Recipe = { id: string; data_json: RecipeData };
export type Race = "Light" | "Dark";

/** Profession tabs and their sub-sections, in menu order ("All" is implicit). */
export const SECTIONS: Record<string, string[]> = {
  Alchemy: ["Spellbook", "Orb", "Potion", "Scroll", "Manastone", "Materials"],
  Blacksmithing: ["Greatsword", "Longsword", "Dagger", "Mace", "Guard", "Materials"],
  Cooking: ["Food"],
  Armorsmithing: ["Helm", "Pauldrons", "Top", "Legs", "Gloves", "Shoes", "Cloak", "Materials"],
  Handicrafting: ["Bow", "Staff", "Necklace", "Earring", "Ring", "Bracelet", "Materials"],
};
/** Archive slot → the name the crafting window shows. */
const SLOT: Record<string, string> = {
  Sword: "Longsword",
  Guarder: "Guard",
  Magicbook: "Spellbook",
  Helmet: "Helm",
  Shoulder: "Pauldrons",
  Torso: "Top",
  Pants: "Legs",
  Boots: "Shoes",
  Cape: "Cloak",
};

/** Sub-section of a recipe. Cooking is all Food (its two Seasonings too); Alchemy consumables by output code. */
export function sectionOf(d: RecipeData): string | undefined {
  const { slot, code } = d.recipe.output;
  if (slot) return SLOT[slot] ?? slot;
  if (d.categoryLabel === "Cooking") return "Food";
  if (d.subCategoryLabel === "Materials") return "Materials";
  if (/^Potion_/i.test(code)) return "Potion";
  if (/^Scroll_/i.test(code)) return "Scroll";
  if (/^(Magic|Spirit)Stone/i.test(code)) return "Manastone"; // Soulstones included
  return undefined;
}

/** A recipe of this faction (or of both). */
export const forRace = (r: Recipe, race: Race) => [race, "All", undefined].includes(r.data_json.recipe.race);
/** What one craft consumes: the Succession base first (×1), then the components. */
function inputs(r: Recipe): Part[] {
  const base = r.data_json.successionInputs?.[0];
  return [...(base ? [{ ...base, count: 1 }] : []), ...(r.data_json.components ?? [])];
}
/** The previous chain step a recipe consumes: its Succession base, else its gear component. */
const gearInput = (r: Recipe) => r.data_json.successionInputs?.[0]?.name ?? r.data_json.components?.find((p) => p.type === "Equip")?.name;

export type Index = {
  /** Recipe per output name for one faction: one with listed inputs, fewest pieces per craft (exact counts). */
  recipe: Map<string, Recipe>;
  /** Splendent piece → its Normal twin, when the archive lists no inputs for the Splendent: it comes out of
   * the Normal craft by luck, or the Normal is upgraded (item and kinah not published). */
  normal: Map<string, string>;
  /** Icon, grade, code and level of every item name the recipes show. */
  part: Map<string, Part>;
  /** Previous / next step of an upgrade chain. */
  prev: Map<string, string>;
  next: Map<string, string>;
};

export function indexRecipes(all: Recipe[], race: Race): Index {
  const recipe = new Map<string, Recipe>();
  const part = new Map<string, Part>();
  const outputs = new Set<string>();
  for (const r of all) {
    if (!forRace(r, race)) continue;
    const out = r.data_json.recipe.output;
    outputs.add(out.name);
    part.set(out.name, out);
    for (const p of inputs(r)) if (!part.has(p.name)) part.set(p.name, p);
    if (!inputs(r).length) continue;
    const cur = recipe.get(out.name);
    const pieces = (x: Recipe) => x.data_json.recipe.count ?? 1;
    if (!cur || pieces(r) < pieces(cur)) recipe.set(out.name, r);
  }
  const normal = new Map<string, string>();
  for (const name of outputs) {
    const twin = name.replace("Splendent ", "");
    if (!recipe.has(name) && twin !== name && recipe.has(twin)) normal.set(name, twin);
  }
  // A step is a piece of the same slot (a crafting tool that takes a bow is no step of the bow chain).
  const prev = new Map<string, string>(normal);
  for (const [name, r] of recipe) {
    const p = gearInput(r);
    if (p && part.get(p)?.slot === part.get(name)?.slot) prev.set(name, p);
  }
  // Next step: the lowest-level piece made from this one (Artisan's Splendent feeds three Dragon Lord tiers, the first is next).
  const level = (n: string) => part.get(n)?.level ?? 0;
  const next = new Map<string, string>();
  for (const [name, p] of prev) {
    const cur = next.get(p);
    if (!cur || level(name) < level(cur)) next.set(p, name);
  }
  return { recipe, normal, part, prev, next };
}

/** Upgrade chain through an item, base first (a material or a consumable is a chain of one). */
export function chainOf(name: string, ix: Index): string[] {
  let top = name;
  const seen = new Set([top]);
  for (let n = ix.next.get(top); n && !seen.has(n); n = ix.next.get(n)) seen.add((top = n));
  const chain = [top];
  for (let p = ix.prev.get(top); p && !chain.includes(p); p = ix.prev.get(p)) chain.unshift(p);
  return chain;
}

export type Node = {
  name: string;
  /** Pieces this spot needs. */
  qty: number;
  /** Pieces taken from the inventory. */
  owned: number;
  /** Times its recipe runs for what is still missing. */
  crafts: number;
  recipe?: Recipe;
  /** Made by crafting its Normal twin (the single kid), see Index.normal. */
  splendent?: boolean;
  /** Already on the way up (a recipe that would need itself): not expanded. */
  loop?: boolean;
  kids: Node[];
};

/**
 * Recipe tree for `qty` of `goal`. Owned pieces (`have`, by name) are taken off where they are first met, in
 * tree order, and what they cover is not expanded: an owned step completes its whole branch.
 */
export function buildTree(goal: string, qty: number, ix: Index, have: Record<string, number>): Node {
  const pool = { ...have };
  const grow = (name: string, qty: number, path: string[]): Node => {
    if (path.includes(name)) return { name, qty, owned: 0, crafts: 0, loop: true, kids: [] };
    const owned = Math.min(qty, Math.max(0, pool[name] ?? 0));
    pool[name] = (pool[name] ?? 0) - owned;
    const node: Node = { name, qty, owned, crafts: 0, recipe: ix.recipe.get(name), kids: [] };
    const need = qty - owned;
    if (!need) return node;
    const up = [...path, name];
    if (node.recipe) {
      node.crafts = Math.ceil(need / (node.recipe.data_json.recipe.count || 1));
      node.kids = inputs(node.recipe).map((p) => grow(p.name, (p.count ?? 1) * node.crafts, up));
    } else if (ix.normal.has(name)) {
      node.splendent = true;
      node.kids = [grow(ix.normal.get(name)!, need, up)];
    }
    return node;
  };
  return grow(goal, qty, []);
}

export type Total = { name: string; qty: number; missing: number; crafted: boolean };

/** Every item below the goal summed by name: raw materials first, then crafted parts, each by missing amount. */
export function totals(root: Node): Total[] {
  const by = new Map<string, Total>();
  const walk = (n: Node) => {
    for (const k of n.kids) {
      const t = by.get(k.name) ?? { name: k.name, qty: 0, missing: 0, crafted: false };
      t.qty += k.qty;
      t.missing += k.qty - k.owned;
      t.crafted ||= !!k.recipe || !!k.splendent;
      by.set(k.name, t);
      walk(k);
    }
  };
  walk(root);
  return [...by.values()].sort((a, b) => +a.crafted - +b.crafted || b.missing - a.missing || a.name.localeCompare(b.name));
}
