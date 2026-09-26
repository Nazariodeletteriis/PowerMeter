// SAMPLE DATA — copied from the Claude Design prototype
// (docs/design/claude-design/videogame-tool-design-system/project/PowerMeter Dashboard.dc.html),
// functions pDb and pMap. Nothing here is real: replace each block with the
// game data after launch (30/09) and delete it.
// Game names stay in English. `type` is either a game term (shown as is) or a
// world.* i18n key for the prototype's UI labels; `n` fills its {n}.

export type DbItem = { name: string; cat: string; type: string; n?: number; lv: number; rarity?: string };

// pDb.items — `cat` is the category id (world.cat.<id>).
export const DB_ITEMS: DbItem[] = [
  { name: "Staff of the Ashen Tide", cat: "items", type: "Staff", lv: 45, rarity: "Mythic" },
  { name: "Robe of the Ashbound", cat: "items", type: "Chest", lv: 45, rarity: "Legendary" },
  { name: "Earring of the Ashen Tide", cat: "items", type: "Earring", lv: 45, rarity: "Heroic" },
  { name: "Gloves of Storm Oath", cat: "items", type: "Gloves", lv: 44, rarity: "Heroic" },
  { name: "Ring of Quiet Aether", cat: "items", type: "Ring", lv: 40, rarity: "Rare" },
  { name: "Aether Crystal Shard", cat: "items", type: "world.type.material", lv: 30, rarity: "Uncommon" },
  { name: "Ashen Tide", cat: "itemSets", type: "world.type.setPieces", n: 5, lv: 45, rarity: "Legendary" },
  { name: "Storm Oath", cat: "itemSets", type: "world.type.setPieces", n: 4, lv: 44, rarity: "Heroic" },
  { name: "Refined Ember Ingot", cat: "recipes", type: "Armorsmith", lv: 38, rarity: "Rare" },
  { name: "Aether Potion", cat: "recipes", type: "Alchemy", lv: 20, rarity: "Common" },
  { name: "The Ember Oath", cat: "quests", type: "world.type.campaign", lv: 42 },
  { name: "Shugo Delivery", cat: "quests", type: "world.type.daily", lv: 30 },
  { name: "Ashbound Slayer", cat: "achievements", type: "Dungeon", lv: 45 },
  { name: "Ashen Sanctum", cat: "dungeons", type: "world.type.players", n: 6, lv: 45 },
  { name: "Veiled Crypt", cat: "dungeons", type: "world.type.players", n: 6, lv: 42 },
  { name: "Flamebringer", cat: "titles", type: "world.type.title", lv: 40, rarity: "Heroic" },
  { name: "Vorathis the Ashbound", cat: "npcs", type: "Boss", lv: 45 },
  { name: "Captain Lyra", cat: "npcs", type: "world.type.services", lv: 40 },
  { name: "Forest Spirit Wings", cat: "wings", type: "world.type.wings", lv: 35, rarity: "Legendary" },
  { name: "Ember Kitling", cat: "pets", type: "Pet", lv: 1, rarity: "Rare" },
  { name: "Moonpetal", cat: "gathering", type: "Herbs", lv: 25, rarity: "Uncommon" },
  { name: "Flame Cage", cat: "skills", type: "Sorcerer", lv: 40 },
  { name: "Ice Chain", cat: "skills", type: "Sorcerer", lv: 20 },
  { name: "Nezekan", cat: "daevanionBoards", type: "world.type.points", n: 134, lv: 45 },
  { name: "Rune: Aether Surge", cat: "daevanionNodes", type: "Nezekan", lv: 45, rarity: "Legendary" },
];

// pDb.dbCatCards.n — entries per category on the hub cards.
export const DB_COUNTS: Record<string, number> = {
  items: 845,
  itemSets: 297,
  recipes: 297,
  quests: 297,
  achievements: 160,
  dungeons: 297,
  titles: 160,
  npcs: 297,
  wings: 160,
  pets: 160,
  gathering: 160,
  skills: 297,
  daevanionBoards: 160,
  daevanionNodes: 160,
};

// pg.item block — the only item the prototype details.
export type ItemDetail = {
  type: string;
  classes: string;
  stats: { name: string; value: number; max?: number; pct?: boolean }[];
  substats: string[];
  set: { name: string; bonuses: [pieces: number, bonus: string][] };
  drop: { boss: string; dungeon: string; rate: number };
  craft: string;
};

export const ITEM_DETAILS: Record<string, ItemDetail> = {
  "Staff of the Ashen Tide": {
    type: "Two-Handed Staff",
    classes: "Sorcerer, Spiritmaster",
    stats: [
      { name: "Magic Attack", value: 1842, max: 2310 },
      { name: "Magic Boost", value: 1284 },
      { name: "Casting Speed", value: 8, pct: true },
      { name: "Accuracy", value: 310 },
    ],
    substats: ["Critical Strike", "Magic Boost", "Casting Speed", "HP", "Accuracy"],
    set: {
      name: "Ashen Tide",
      bonuses: [
        [2, "Magic Boost +120"],
        [3, "Critical Strike +80"],
        [5, "Aether Surge"],
      ],
    },
    drop: { boss: "Vorathis the Ashbound", dungeon: "Ashen Sanctum", rate: 2.4 },
    craft: "Weaponsmith Lv 5",
  },
};

// pMap — layer id → total markers in the zone (world.layer.<id>).
export const MAP_LAYER_COUNTS: Record<string, number> = {
  services: 42,
  npcs: 118,
  monsters: 236,
  gathering: 412,
  monoliths: 560,
};

// pMap.pts — x/y in % of the map.
export type MapPoint = { layer: string; x: number; y: number; name: string };

export const MAP_POINTS: MapPoint[] = [
  { layer: "services", x: 22, y: 30, name: "Teleporter · Eltnen Fortress" },
  { layer: "services", x: 40, y: 62, name: "Shugo Merchant" },
  { layer: "npcs", x: 30, y: 44, name: "Captain Lyra" },
  { layer: "npcs", x: 58, y: 28, name: "Oracle Venn" },
  { layer: "monsters", x: 64, y: 52, name: "Ashclaw Stalker" },
  { layer: "monsters", x: 72, y: 40, name: "Named · Kargath the Blighted" },
  { layer: "monsters", x: 48, y: 74, name: "Cinder Wyrmling" },
  { layer: "gathering", x: 18, y: 58, name: "Berries · Emberroot" },
  { layer: "gathering", x: 36, y: 80, name: "Ore · Aetherite" },
  { layer: "gathering", x: 80, y: 66, name: "Herbs · Moonpetal" },
  { layer: "gathering", x: 54, y: 18, name: "Gems · Duskstone" },
  { layer: "monoliths", x: 26, y: 18, name: "Monolith #112" },
  { layer: "monoliths", x: 86, y: 24, name: "Monolith #113" },
  { layer: "monoliths", x: 68, y: 84, name: "Monolith #114" },
];

export const MAP_ZONES = ["Eltnen", "Heiron", "Morheim"];
export const MAP_ROUTE = "18,58 36,80 48,74 64,52 80,66";
export const MONOLITHS_FOUND = 34;
