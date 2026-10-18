// Pet collection effects per genus and level, which the game data archive does not have: the creature tiers of
// creatures.json in the Global v204 datamine (tools/datamine/import/csv/global_204/planner_collections.csv, local
// and gitignored). Writes src/data/pet_genus_effects.json: `levels[genus][lvl - 1]` = what one pet of that genus
// gives at that level, as PetEffect [stat, display value, percent]; `genus[code]` = the creature's genus.
// A level replaces the one before (level 3 gives tier 3 alone, not tiers 1+2+3): the collection of
// packets 20261013_031702 (00 90), summed that way, gives the game's owned-effects list exactly.
// Run: node scripts/build-pet-effects.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const CSV = join(ROOT, "tools/datamine/import/csv/global_204/planner_collections.csv");
const OUT = join(ROOT, "src/data/pet_genus_effects.json");

// Raw ×100 in the tiers (the game shows 14400 Stamina as 144, 470 Sprint Cost as 4.7%); the second one is a percent.
const DIV100 = new Set(["SPMax", "VehicleSprintCost"]);
const PERCENT = new Set(["VehicleSprintCost"]);

const line = readFileSync(CSV, "utf8").split(/\r?\n/).find((l) => l.startsWith("creatures.json,"));
if (!line) throw new Error(`No creatures.json row in ${CSV}`);
const data = JSON.parse(line.slice("creatures.json,".length).replace(/^"|"$/g, "").replaceAll('""', '"'));

const levels = {};
for (const g of data.genus) {
  const tiers = [...g.tiers].sort((a, b) => a.tier - b.tier);
  if (tiers.some((t) => t.stats.length)) {
    levels[g.genus] = tiers.map((t) => t.stats.map(({ stat, value }) => [stat, DIV100.has(stat) ? value / 100 : value, PERCENT.has(stat)]));
  }
}
const genus = Object.fromEntries(data.creatures.map((c) => [c.code, c.genus]));
writeFileSync(OUT, JSON.stringify({ levels, genus }) + "\n");
console.log(`${OUT}: ${Object.keys(levels).length} genera, ${Object.keys(genus).length} creatures`);
