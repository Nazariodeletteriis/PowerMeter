// Black Market pet items → collection pet: the shop list (`91 56`, equip_parser.rs) names items by their numeric id,
// the collection by creature code. The Taiwan v105 datamine gives the item ids with their English names
// ("Pet: Krall Laborer", tools/datamine/import/csv/tw_105/items_metadata.csv), the Global v204 one the creature
// names by code (global_204/all_records.csv); both are local and gitignored. Matched by name, case aside.
// Checked against packets_20261118_231033: the five pets bought (534760024 → 1021 OdSpider_04, 534760063 → 1064,
// 534760075 → 1115, 534760144 → 1178, 534760173 → 1142) are the ids of their `0D 90`.
// Writes src/data/pet_items.json: { "<item id>": "<creature code>" }. Run: node scripts/build-pet-items.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const CSV = join(ROOT, "tools/datamine/import/csv");
const OUT = join(ROOT, "src/data/pet_items.json");

/** RFC 4180 rows (quoted fields hold commas, quotes and newlines). */
function* rows(text) {
  let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') (field += '"'), i++;
      else quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === ",") row.push(field), (field = "");
    else if (c === "\n") row.push(field.replace(/\r$/, "")), yield row, (row = []), (field = "");
    else field += c;
  }
  if (field || row.length) yield [...row, field];
}
const table = (file) => {
  const it = rows(readFileSync(file, "utf8").replace(/^﻿/, ""));
  const head = it.next().value;
  return Array.from(it, (r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
};

const codeByName = new Map();
for (const r of table(join(CSV, "global_204/all_records.csv"))) if (r.category === "creature") codeByName.set(r.name.toLowerCase(), r.id);

const out = {};
const missing = [];
for (const r of table(join(CSV, "tw_105/items_metadata.csv"))) {
  if (!r.name?.startsWith("Pet: ") || r.item_type !== "VehicleSoul") continue;
  const code = codeByName.get(r.name.slice(5).trim().toLowerCase());
  if (code) out[r.item_id] = code;
  else missing.push(r.name);
}
writeFileSync(OUT, JSON.stringify(out) + "\n");
console.log(`${OUT}: ${Object.keys(out).length} pet items; no creature for ${missing.length} (${missing.slice(0, 8).join(", ")}...)`);
