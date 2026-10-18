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
// Layer icons (src/assets/pm/map/<group>.png) were copied once from the
// datamine's icon_local_path, one per group, resized to 64 px.
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
// Gathering groups (TW names) → layer keys, in panel order.
const GATHER = { 奥德: "od", 宝石: "gem", 金属: "metal", 药草: "herb", 贝类: "shellfish", 蔬菜: "vegetable", 木材: "wood", 浆果: "berry" };
const GROUPS = Object.values(GATHER);

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
db.close();

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
  if (category === "gatherable" && GATHER[group]) [list, id] = [out[mapId].gather, GROUPS.indexOf(GATHER[group])];
  else if (category === "monster" && petMonster.has(entity)) [list, id] = [out[mapId].monsters, Number(entity)];
  else continue;
  const key = `${mapId}|${category}|${id}|${x}|${y}`; // the same spawn listed twice
  if (seen.has(key)) continue;
  seen.add(key);
  list.push(id, x, y);
}

const json = {
  // gather: [group index, x, y, ...]; monsters: [monster id, x, y, ...], in map pixels.
  groups: GROUPS,
  pets,
  maps: out,
};
writeFileSync(OUT, JSON.stringify(json));
const placed = new Set(Object.values(out).flatMap((m) => m.monsters.filter((_, i) => i % 3 === 0)));
const withCoords = Object.values(pets).filter((ms) => ms.some(([id]) => placed.has(id))).length;
for (const [id, m] of Object.entries(out)) console.log(id, "gather", m.gather.length / 3, "monsters", m.monsters.length / 3);
console.log(`pets ${Object.keys(pets).length}, with coordinates ${withCoords}; wrote ${OUT}`);
