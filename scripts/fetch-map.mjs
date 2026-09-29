// World map data from the open-source aion2-interactive-map project
// (https://github.com/aion2-interactive-map/aion2-interactive-map), data under
// CC BY-NC 4.0 by Yihao Liu (tc-imba). Only /public/data and the English
// locale are used; its GPL /src code is not.
// Writes src/data/map/maps.json. Run: node scripts/fetch-map.mjs
// Map tiles are NOT copied: the page loads them from the project's GitHub
// Pages site (they are game textures, outside the CC-licensed /public/data).
import { writeFileSync } from "node:fs";

const RAW = "https://raw.githubusercontent.com/aion2-interactive-map/aion2-interactive-map/master/public/";
// Maps with markers first; the starter zones have (almost) none but hold NPC spawns (scrape-spawns.mjs).
const MAPS = ["World_L_A", "World_D_A", "Abyss_Reshanta_A", "World_L_Starter", "World_D_Starter"];
// Worlds this project has no tiles for: questlog.gg's single map image (hotlinked, never bundled,
// like the build portraits), for NPC spawns only (no regions or markers). [id, name, size in px].
// The project names the starter zones just "Starter".
const NAME = { World_L_Starter: "Poeta (Elyos)", World_D_Starter: "Ishalgen (Asmodian)" };
const QUESTLOG_MAPS = [["World_L_B", "Eltnen (Elyos)", 8192], ["World_D_B", "Morheim (Asmodian)", 8192]];
// Marker subtypes kept, in panel order. The source defines gathering and pet
// subtypes too, but has no markers for them yet.
const TYPES = ["teleport", "village", "seal", "battlefield", "occupation", "monolithMaterial", "hiddenCube"];
// Subtypes whose source name is a display name (teleports carry Chinese names only).
const NAMED = new Set(["village", "seal", "battlefield", "occupation"]);

// Parser for the block-style YAML these files use (maps, sequences, scalars,
// "- - -" nested sequences). Anything else throws instead of misparsing.
const KEY = /^('(?:[^']|'')*'|"[^"]*"|[^:'"]+):(?: (.*))?$/;
function parseYaml(text) {
  const lines = text.split("\n").filter((l) => l.trim() && !l.trimStart().startsWith("#"))
    .map((l) => ({ ind: l.length - l.trimStart().length, txt: l.trim() }));
  let pos = 0;
  const scalar = (s) => {
    if (s.startsWith("'")) return s.slice(1, -1).replaceAll("''", "'");
    if (s.startsWith('"')) return JSON.parse(s);
    if (s === "[]") return [];
    if (s === "{}") return {};
    if (s === "true" || s === "false") return s === "true";
    if (s === "null" || s === "~") return null;
    return s !== "" && !isNaN(s) ? Number(s) : s;
  };
  const isItem = (l) => l.txt === "-" || l.txt.startsWith("- ");
  function block(ind) {
    const out = isItem(lines[pos]) ? [] : {};
    while (pos < lines.length && lines[pos].ind === ind) {
      const l = lines[pos];
      if (Array.isArray(out)) {
        if (!isItem(l)) break;
        if (l.txt === "-") { pos++; out.push(block(lines[pos].ind)); continue; }
        const rest = l.txt.slice(2);
        if (!rest.startsWith("-") && !KEY.test(rest)) { pos++; out.push(scalar(rest)); continue; }
        lines[pos] = { ind: ind + 2, txt: rest };
        out.push(block(ind + 2));
        continue;
      }
      if (isItem(l)) throw new Error(`YAML: unexpected item at line ${pos}: ${l.txt}`);
      const m = l.txt.match(KEY);
      if (!m) throw new Error(`YAML: unsupported line ${pos}: ${l.txt}`);
      const key = scalar(m[1]);
      pos++;
      const next = lines[pos];
      if (m[2] !== undefined && m[2] !== "") out[key] = scalar(m[2]);
      else if (next && (next.ind > ind || (next.ind === ind && isItem(next)))) out[key] = block(next.ind);
      else out[key] = null;
    }
    if (pos < lines.length && lines[pos].ind > ind) throw new Error(`YAML: unsupported line ${pos}: ${lines[pos].txt}`);
    return out;
  }
  if (lines.length === 1 && !KEY.test(lines[0].txt)) return scalar(lines[0].txt); // "{}" / "[]"
  return block(lines[0].ind);
}

async function get(path) {
  const res = await fetch(RAW + path);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return parseYaml(await res.text());
}

// Even-odd point in polygon over all rings of a region.
function inside([x, y], rings) {
  let hit = false;
  for (const r of rings)
    for (let i = 0, j = r.length - 1; i < r.length; j = i++)
      if (r[i][1] > y !== r[j][1] > y && x < ((r[j][0] - r[i][0]) * (y - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) hit = !hit;
  return hit;
}

// Label anchor: area centroid of the region's largest ring.
function centroid(rings) {
  let best = { a: 0, x: 0, y: 0 };
  for (const r of rings) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const f = r[j][0] * r[i][1] - r[i][0] * r[j][1];
      a += f;
      cx += (r[j][0] + r[i][0]) * f;
      cy += (r[j][1] + r[i][1]) * f;
    }
    if (Math.abs(a) > Math.abs(best.a)) best = { a, x: cx / (3 * a), y: cy / (3 * a) };
  }
  return [Math.round(best.x), Math.round(best.y)];
}

const meta = (await get("data/maps.yaml")).maps;
const mapNames = await get("locales/en/maps.yaml");
const maps = [];
for (const id of MAPS) {
  const m = meta.find((x) => x.name === id);
  const [{ markers }, { regions }, markerNames, regionNames] = await Promise.all([
    get(`data/markers/${id}.yaml`),
    get(`data/regions/${id}.yaml`),
    get(`locales/en/markers/${id}.yaml`),
    get(`locales/en/regions/${id}.yaml`),
  ]);
  const regs = regions.map((r) => ({
    key: r.name,
    name: regionNames[r.name]?.name ?? r.name,
    at: centroid(r.borders),
    poly: r.borders.map((ring) => ring.flatMap(([x, y]) => [Math.round(x), Math.round(y)])),
    rings: r.borders,
  }));
  const ids = new Set();
  const out = [];
  for (const k of markers) {
    if (!TYPES.includes(k.subtype)) continue;
    const xy = [Math.round(k.x), Math.round(k.y)];
    let region = regs.findIndex((r) => r.key === k.region);
    if (region < 0) region = regs.findIndex((r) => inside(xy, r.rings));
    const label = NAMED.has(k.subtype) ? (markerNames[k.id]?.name ?? "") : k.subtype === "monolithMaterial" ? String(k.name) : "";
    const short = k.id.slice(0, 8);
    if (ids.has(short)) throw new Error(`duplicate short id ${short} in ${id}`);
    ids.add(short);
    out.push([TYPES.indexOf(k.subtype), ...xy, region, label, short]);
  }
  maps.push({
    id,
    name: NAME[id] ?? mapNames[id]?.name ?? id,
    tiles: [m.tilesCountX, m.tilesCountY],
    tile: m.tileWidth,
    regions: regs.map(({ name, at, poly }) => ({ name, at, poly })),
    // [type index, x, y, region index (-1 = none), label, short id]
    markers: out,
  });
  console.log(`${id}: ${out.length} markers, ${regs.length} regions, ${out.filter((x) => x[3] < 0).length} outside regions`);
}

for (const [id, name, size] of QUESTLOG_MAPS) {
  maps.push({ id, name, tiles: [1, 1], tile: size, image: `"../src/data/map/maps.json", import.meta.url), JSON.stringify({ types: TYPES, maps }));
