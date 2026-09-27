// SAMPLE DATA — copied from the Claude Design prototype
// (docs/design/claude-design/videogame-tool-design-system/project/PowerMeter Dashboard.dc.html),
// function pDb (the map now uses real data, src/data/map). Nothing here is real: replace each block with the
// game data after launch (30/09) and delete it.
// Game names stay in English. `type` is either a game term (shown as is) or a
// world.* i18n key for the prototype's UI labels; `n` fills its {n}.

export type DbItem = { name: string; cat: string; type: string; n?: number; lv: number; rarity?: string };

// pDb.items — `cat` is the category id (world.cat.<id>). The "items" rows are
// real names (src/data/items.json, rarity by game grade) so their icons resolve.
export const DB_ITEMS: DbItem[] = [
  { name: "Ludra's Grimoire", cat: "items", type: "Spellbook", lv: 45, rarity: "Legendary" },
  { name: "Wisdom Breastplate", cat: "items", type: "Chest", lv: 30, rarity: "Legendary" },
  { name: "Tranquility Diamond Earrings", cat: "items", type: "Earring", lv: 30, rarity: "Legendary" },
  { name: "Wisdom Gloves", cat: "items", type: "Gloves", lv: 30, rarity: "Legendary" },
  { name: "Ritual Sapphire Ring", cat: "items", type: "Ring", lv: 20, rarity: "Rare" },
  { name: "Fine Orichalcum Ore", cat: "items", type: "world.type.material", lv: 1, rarity: "Uncommon" },
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
  items: 9449, // real: src/data/items.json
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
  "Ludra's Grimoire": {
    type: "Spellbook",
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
