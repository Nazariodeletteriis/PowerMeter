// Map points beyond aion2-interactive-map's markers: gathering nodes and the
// monsters that give a pet (creature), read from the Taiwan v105 datamine
// (tools/datamine/import/csv/tw_105/map_points.csv, local and gitignored) and
// the game data archive (pet ↔ monster link, English Global names).
// Writes src/data/map/points.json. Run:
//   node scripts/build-map-points.mjs [path/to/gamedata.sqlite]
// (default: %APPDATA%/com.letrionlabs.powermeter/gamedata/gamedata.sqlite, opened read-only).
//
// Coordinates: px = u * W, py = v * H, W/H = tiles * tile of the map in
// maps.json (median error ~5 px on the 61 teleports both sources have).
// Divine traces are left out: they are the monoliths maps.json already has.
//
// Gathering is listed per resource, with its English Global name (never
// translated: it is the name the game shows). TW names its nodes in Chinese and
// the item they give has no Global id, so RESOURCE links each TW node to the
// Global item it gives (Material_Gather_<key>_f, name read from the archive):
// same kind and race (L = Elyos map, D = Asmodian map), and the TW item ids
// follow the Global letter order (610680043..048 = Food_L_c_01a..f, the
// missing 046 being 01d). Confirmed by name where they translate: 金盞花
// marigold = Calendula, 龍蒿 tarragon = Targena, 菩提 bodhi = Asvata
// (asvattha), 世界樹 world tree = Yggdrasil, 秋葵 okra = Ohkra, 梅拉 = Mela,
// 庫庫羅 = Kukuru, 雲芝 = Coriolus; and by icon where Global shares one
// (Targena and Calendula, the TW nodes too).
// Layer icons (src/assets/pm/map/<key>.png) were copied once from each node's
// icon_local_path (datamine assets, or its webp in tools/datamine/cdn/files),
// resized to 64 px.
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const CSV = join(ROOT, "tools/datamine/import/csv/tw_105/map_points.csv");
const OUT = join(ROOT, "src/data/map/points.json");
const DB =
  process.argv[2] ??
  (process.env.APPDATA && join(process.env.APPDATA, "com.letrionlabs.powermeter/gamedata/gamedata.sqlite"));
if (!DB) throw new Error("Pass the path of gamedata.sqlite (no APPDATA to find it)");

// TW map id → our map (maps.json). The other TW maps have no tiles here.
const MAP_OF = { 1010: "World_L_A", 1110: "World_D_A", 20: "Abyss_Reshanta_A" };
// Gathering groups (TW names) → group keys (the dropdown's headings), in panel order.
const GATHER = { 奥德: "od", 宝石: "gem", 金属: "metal", 药草: "herb", 贝类: "shellfish", 蔬菜: "vegetable", 木材: "wood", 浆果: "berry" };
const GROUPS = Object.values(GATHER);
// TW gatherable entity → resource key (see the top of the file).
const RESOURCE = {
  1080001: "Od_A_c_01", 1090001: "Od_A_c_01", 2000001: "Od_A_c_01",
  1080101: "Ore_A_c_01", 1090101: "Ore_A_c_01",
  1080501: "Gemstone_A_c_01", 1090501: "Gemstone_A_c_01",
  1080502: "Gemstone_A_c_02", 1090502: "Gemstone_A_c_02",
  1080503: "Gemstone_A_c_03", 1090503: "Gemstone_A_c_03",
  1080601: "Herb_L_c_01a", 1080602: "Herb_L_c_01b", 1090601: "Herb_D_c_01a", 1090602: "Herb_D_c_01b",
  1081002: "Food_L_c_01a", 1081006: "Food_L_c_01b", 1091002: "Food_D_c_01a", 1091006: "Food_D_c_01b",
  1081001: "Food_L_c_01c", 1091001: "Food_D_c_01c",
  1081003: "Food_L_c_01e", 1081004: "Food_L_c_01f", 1091003: "Food_D_c_01e", 1091004: "Food_D_c_01f",
  1080301: "Wood_L_c_01", 1090301: "Wood_D_c_01",
};

const maps = JSON.parse(readFileSync(join(ROOT, "src/data/map/maps.json"), "utf8")).maps;
const size = Object.fromEntries(maps.map((m) => [m.id, [m.tiles[0] * m.tile, m.tiles[1] * m.tile]]));

// Pet → monsters: a monster gives the creature whose portrait it shows.
const db = new DatabaseSync(DB, { readOnly: true });
const creatureOf = new Map(); // portrait icon → creature code
for (const r of db.prepare("SELECT id, data_json FROM records WHERE category = 'creature'").all()) {
  const c = JSON.parse(r.data_json).creature;
  if (c?.icon) creatureOf.set(c.icon, String(r.id));
}
const pets = {}; // creature code → [monster id, English name, level][]
const petMonster = new Set();
for (const r of db.prepare("SELECT id, name, data_json FROM records WHERE category = 'monster'").all()) {
  const m = JSON.parse(r.data_json).monster ?? {};
  const code = creatureOf.get(m.portrait);
  if (!code) continue;
  (pets[code] ??= []).push([Number(r.id), r.name ?? m.name ?? String(r.id), m.level ?? null]);
  petMonster.add(String(r.id));
}
// Material nouns ending the Global item names (Log, Ore, Gemstone: the only ones among the 21).
const MATERIAL = / (Log|Ore|Gemstone)$/;
// Resources: [key, English Global name, group], filled in the order the nodes are met.
const resources = [];
const resourceIndex = new Map();
const itemName = db.prepare("SELECT name FROM records WHERE category = 'item' AND id = ?");
function resourceOf(entity, group) {
  const key = RESOURCE[entity];
  if (!key) throw new Error(`Gathering node ${entity} (${group}) has no Global resource: add it to RESOURCE`);
  if (!resourceIndex.has(key)) {
    const item = itemName.get(`Material_Gather_${key}_f`)?.name;
    if (!item) throw new Error(`Material_Gather_${key}_f is not in the archive`);
    // The node's name as the game shows it: the item's without the material noun ("Asvata Log" → "Asvata").
    const name = item.replace(MATERIAL, "");
    resourceIndex.set(key, resources.length);
    resources.push([key, name, group]);
  }
  return resourceIndex.get(key);
}

// Fields 0..12 of a CSV line (refs_json, the long tail, is never needed).
const COLS = 13;
function fields(line) {
  const out = [];
  let i = 0;
  while (out.length < COLS && i <= line.length) {
    if (line[i] === '"') {
      let v = "";
      i++;
      for (;;) {
        const q = line.indexOf('"', i);
        if (q < 0) throw new Error("CSV: unterminated quote");
        v += line.slice(i, q);
        if (line[q + 1] === '"') {
          v += '"';
          i = q + 2;
        } else {
          i = q + 2; // past the quote and the comma
          break;
        }
      }
      out.push(v);
    } else {
      const c = line.indexOf(",", i);
      const end = c < 0 ? line.length : c;
      out.push(line.slice(i, end));
      i = end + 1;
    }
  }
  return out;
}

const out = Object.fromEntries(Object.values(MAP_OF).map((id) => [id, { gather: [], monsters: [] }]));
const seen = new Set();
let header = true;
for await (const raw of createInterface({ input: createReadStream(CSV, "utf8"), crlfDelay: Infinity })) {
  if (header) {
    header = false;
    const cols = fields(raw.replace(/^﻿/, ""));
    if (cols[0] !== "map_id" || cols[2] !== "category" || cols[4] !== "entity_id" || cols[6] !== "group" || cols[11] !== "u" || cols[12] !== "v")
      throw new Error(`CSV: unexpected header ${cols.join(",")}`);
    continue;
  }
  const mapId = MAP_OF[raw.slice(0, raw.indexOf(","))];
  if (!mapId) continue;
  const [, , category, , entity, , group, , , , , u, v] = fields(raw);
  const [W, H] = size[mapId];
  const x = Math.round(Number(u) * W);
  const y = Math.round(Number(v) * H);
  if (!(x >= 0 && x < W && y >= 0 && y < H)) continue;
  let list, id;
  if (category === "gatherable" && GATHER[group]) [list, id] = [out[mapId].gather, resourceOf(entity, GATHER[group])];
  else if (category === "monster" && petMonster.has(entity)) [list, id] = [out[mapId].monsters, Number(entity)];
  else continue;
  const key = `${mapId}|${category}|${id}|${x}|${y}`; // the same spawn listed twice
  if (seen.has(key)) continue;
  seen.add(key);
  list.push(id, x, y);
}

db.close();
// Resources by group, then name.
const order = resources.map((r, i) => [r, i]).sort(([a], [b]) => GROUPS.indexOf(a[2]) - GROUPS.indexOf(b[2]) || a[1].localeCompare(b[1]));
const renumber = new Map(order.map(([, i], n) => [i, n]));
for (const m of Object.values(out)) for (let i = 0; i < m.gather.length; i += 3) m.gather[i] = renumber.get(m.gather[i]);
const json = {
  // gather: [resource index, x, y, ...]; monsters: [monster id, x, y, ...], in map pixels.
  groups: GROUPS,
  resources: order.map(([r]) => r),
  pets,
  maps: out,
};
writeFileSync(OUT, JSON.stringify(json));
const placed = new Set(Object.values(out).flatMap((m) => m.monsters.filter((_, i) => i % 3 === 0)));
const withCoords = Object.values(pets).filter((ms) => ms.some(([id]) => placed.has(id))).length;
for (const [id, m] of Object.entries(out)) console.log(id, "gather", m.gather.length / 3, "monsters", m.monsters.length / 3);
console.log("resources", json.resources.map((r) => r[1]).join(", "));
console.log(`pets ${Object.keys(pets).length}, with coordinates ${withCoords}; wrote ${OUT}`);
