// SAMPLE DATA — characters and builds pages, copied from the Claude Design
// prototype (docs/design/claude-design/videogame-tool-design-system/project/
// PowerMeter Dashboard.dc.html: pLists, pBuilds, pBuilder, pSkill, pDaev, pX).
// Nothing here is real: replace each block with the real source after the
// game launch (30/09) and delete it; don't grow it into a data layer.
// Game content (items, skills, stats, bosses) stays in English. Build titles
// and descriptions are user-written content, so they stay as in the prototype.

// Relative times are [amount, unit]; the page formats them with Intl.
export type Ago = [number, Intl.RelativeTimeFormatUnit];

// pLists.chars
export const SAMPLE_CHARS: {
  name: string;
  cls: string;
  level: number;
  server: string;
  cp: number;
  build: string | null;
  /** Last fight: days ago and optional boss, null = never. */
  last: { days: number; boss?: string } | null;
  active?: boolean;
}[] = [
  { name: "Kaelthas", cls: "Sorcerer", level: 45, server: "Siel", cp: 48215, build: "Ashen Burst · PvE", last: { days: 0, boss: "Vorathis" }, active: true },
  { name: "Morrigane", cls: "Cleric", level: 45, server: "Siel", cp: 46020, build: "Radiant Support", last: { days: 1, boss: "Lady Seryth" } },
  { name: "Brannoc", cls: "Templar", level: 42, server: "Israphel", cp: 39880, build: "Bulwark PvP", last: { days: 3 } },
  { name: "Sylweth", cls: "Ranger", level: 38, server: "Siel", cp: 31440, build: null, last: null },
];

// The signed-in user in the prototype.
export const SAMPLE_ME = "kaelthas";

// pBuilds.B
export type CommunityBuild = {
  t: string;
  cls: string;
  sub: string;
  n: number;
  reg: string;
  tags: string[];
  ago: Ago;
  au: string;
  likes: number;
};
const b = (t: string, cls: string, sub: string, n: number, reg: string, tags: string[], ago: Ago, au: string, likes: number): CommunityBuild => ({ t, cls, sub, n, reg, tags, ago, au, likes });
export const SAMPLE_BUILDS: CommunityBuild[] = [
  b("Ashen Burst · PvE e PvP", "Sorcerer", "Guida endgame EU", 4, "EU", ["PvE", "DPS"], [2, "hour"], "kaelthas", 17),
  b("Veiled Blade Starter", "Assassin", "Dal livello 1 al Veiled Crypt", 6, "NA", ["PvE", "Beginner Friendly"], [1, "day"], "nyxara", 11),
  b("Radiant Bulwark", "Templar", "Tank per dungeon a 6", 2, "EU", ["Tank", "Dungeon"], [43, "minute"], "ironveil", 10),
  b("Storm Oath Ranger", "Ranger", "Endgame PvE (crafting)", 8, "NA", ["PvE", "DPS"], [2, "week"], "duskwarden", 8),
  b("Mantra Support", "Chanter", "Buff e cure per raid", 5, "EU", ["Support", "Healer"], [1, "day"], "elowyn", 8),
  b("Crimson Wrath", "Gladiator", "Siege e Large-Scale", 4, "EU", ["PvP", "Siege"], [7, "hour"], "vharok", 7),
  b("Radiant Cure", "Cleric", "Healer PvE early game", 8, "EU", ["PvE", "Healer"], [3, "hour"], "solenne", 6),
  b("Tidecaller", "Spiritmaster", "Evocazioni teoriche", 7, "EU", ["PvE", "DPS"], [15, "hour"], "morwyn", 5),
  b("Budget Frost", "Sorcerer", "Build economica 0–800 GS", 5, "EU", ["Budget Build", "PvE"], [13, "hour"], "ysolde", 4),
  b("Shadowstep PvP", "Assassin", "Stagione 1 PvP", 5, "NA", ["PvP"], [2, "month"], "thalanor", 4),
  b("Aegis Endgame", "Templar", "Hero set completo", 4, "EU", ["Endgame Build", "Tank"], [1, "week"], "brannoc", 3),
];
export const BUILD_REGIONS = ["EU", "NA"];
export const BUILD_TAGS = ["PvE", "PvP", "Arena", "Dungeon", "Siege", "Large-Scale", "Beginner Friendly", "Budget Build", "Endgame Build", "Tank", "DPS", "Healer", "Support"];

// pBuilder.SL: [id, slot label, owned item, rarity, enhancement, target item]
// Item names are real (src/data/items.json), rarity by their game grade.
export const SAMPLE_SLOTS: [id: string, label: string, name: string, rarity: string, enh: number, target: string][] = [
  ["mh", "Main Hand", "Ludra's Grimoire", "Legendary", 15, "Ludra's Grimoire"],
  ["oh", "Off Hand", "Tranquility Orb", "Legendary", 12, "Fallen Ancient God Orb"],
  ["head", "Head", "Wisdom Helm", "Legendary", 10, "Wisdom Helm"],
  ["neck", "Necklace", "Tranquility Ruby Necklace", "Legendary", 5, "Tranquility Ruby Necklace"],
  ["sh", "Shoulders", "Wisdom Pauldrons", "Legendary", 12, "Wisdom Pauldrons"],
  ["ear1", "Earring I", "Ritual Diamond Earrings", "Rare", 5, "Tranquility Diamond Earrings"],
  ["chest", "Chest", "Wisdom Breastplate", "Legendary", 11, "Wisdom Breastplate"],
  ["ear2", "Earring II", "Ritual Diamond Earrings", "Rare", 5, "Ritual Diamond Earrings"],
  ["hands", "Gloves", "Elder Gloves", "Rare", 8, "Wisdom Gloves"],
  ["ring1", "Ring I", "Starlight Sapphire Ring", "Rare", 5, "Courage Sapphire Ring"],
  ["legs", "Legs", "Wisdom Greaves", "Legendary", 12, "Wisdom Greaves"],
  ["ring2", "Ring II", "Ritual Sapphire Ring", "Rare", 5, "Ritual Sapphire Ring"],
  ["feet", "Boots", "Elder Boots", "Rare", 9, "Wisdom Boots"],
  ["br1", "Bracelet I", "Drifter Bracelet", "Rare", 5, "Drifter Bracelet"],
  ["belt", "Belt", "Noble Belt", "Legendary", 7, "Noble Belt"],
  ["br2", "Bracelet II", "Drifter Bracelet", "Rare", 5, "Drifter Bracelet"],
  ["cloak", "Cloak", "Wisdom Cloak", "Legendary", 10, "Wisdom Cloak"],
  ["amu", "Amulet", "Revelation Amulet", "Legendary", 0, "Revelation Amulet"],
];
// pX.grp — group label is an i18n key suffix.
export const SLOT_GROUPS: [group: string, ids: string[]][] = [
  ["weapons", ["mh", "oh"]],
  ["armor", ["head", "sh", "chest", "hands", "legs", "feet", "belt", "cloak"]],
  ["accessories", ["neck", "ear1", "ear2", "ring1", "ring2", "br1", "br2", "amu"]],
];
// pBuilder.srcs — where a missing piece drops ("shop" is translated).
export const SAMPLE_SOURCES: Record<string, string> = {
  oh: "Ashen Sanctum · Vorathis the Ashbound",
  ear1: "Ashen Sanctum · Vorathis the Ashbound",
  hands: "Crafting · Armorsmith Lv 4",
  ring1: "shop:1800",
  feet: "Ashen Sanctum · Grimtooth Warden",
};
// pBuilder.picker: [item, rarity, Magic Boost vs current]
export const SAMPLE_PICKER: [string, string, string][] = [
  ["Ludra's Grimoire", "Legendary", "+214"],
  ["Courage Spellbook", "Legendary", "+168"],
  ["Fantasy Spellbook", "Legendary", "+151"],
  ["Elder Spellbook", "Rare", "−42"],
  ["Rainy Forest Spellbook", "Uncommon", "−120"],
];
// pBuilder.subs: [stat, min, max, unit]
export const SAMPLE_SUBS: [string, number, number, string][] = [
  ["Double Chance", 1.75, 2.08, "%"],
  ["Magic Boost", 42, 58, ""],
  ["Critical Hit", 28, 36, ""],
  ["Attack Increase", 1.75, 2.08, "%"],
];
// pBuilder.colls: [icon key, i18n key suffix, tooltip (i18n key suffix or game text), count]
export const SAMPLE_COLLECTIONS: [string, string, string, string][] = [
  ["tshirt", "skins", "tip.skins", "10/17"],
  ["paw", "pets", "tip.pets", "208/208"],
  ["bird", "wings", "Forest Spirit Wings", "25"],
  ["diamond", "monolith", "Elyos Lv 30 · Reshanta Lv 20", "50"],
  ["crown", "titles", "tip.titles", "568/568"],
  ["columns", "pantheon", "", "17/17"],
  ["sparkle", "arcana", "", "5/5"],
];
// pBuilder.myBuilds
export const SAMPLE_MY_BUILDS: { n: string; on: boolean }[] = [
  { n: "Ashen Burst · PvE", on: true },
  { n: "Frost Control · PvP", on: false },
];
export const MY_BUILD_ICONS = ["Mythic", "Legendary", "Legendary", "Heroic", "Rare"];
// pBuilder.G — character stats; group is an i18n key suffix, "%" values use a dot.
export const SAMPLE_STATS: [group: string, rows: [string, number | string][]][] = [
  ["main", [["Max Attack", 682], ["Min Attack", 463], ["Accuracy", 2240], ["Critical Hit", 1180], ["HP", 28400], ["MP", 2280], ["Defense", 2050], ["Critical Hit Resist", 1061], ["Combat Speed", "24%"], ["Move Speed", "28.3%"]]],
  ["attributes", [["Might", 148], ["Dexterity", 65], ["Constitution", 46], ["Precision", 124]]],
  ["attack", [["Attack", 3412], ["Attack Bonus", 955], ["Magic Boost", 2890], ["Penetration", 6910], ["Critical Attack", 25], ["Back Attack", 235], ["Damage Boost", "31.5%"], ["Critical Damage Boost", "26.1%"], ["Weapon Damage Boost", "26.7%"], ["Boss Attack", 865], ["Perfect Chance", "28%"], ["Double Chance", "17.9%"]]],
  ["defense", [["Defense", 9915], ["Defense Bonus", 6430], ["Parry Damage Reduction", "27%"], ["Evasion Bonus", 1172], ["Block", 1865], ["Magic Resist", 1880]]],
  ["pvp", [["PvP Attack", 57], ["PvP Defense", 1665], ["PvP Accuracy", 115], ["PvP Damage Boost", "17%"]]],
  ["pve", [["PvE Attack", 702], ["PvE Defense", 1740], ["PvE Damage Boost", "24%"], ["Boss Damage Boost", "4%"]]],
  ["movement", [["Combat Speed", "49%"], ["Flight Speed", "4%"]]],
  ["recovery", [["Natural HP Regen", 1242], ["Healing Received", "16.5%"]]],
  ["cooldown", [["Cooldown Reduction", "6.5%"]]],
];
// Builder header numbers: owned vs target view.
export const SAMPLE_BUILD_SCORE = { gs: 2564, gsTarget: 2702, gsMax: 3000, cp: 48215, cpTarget: 50380 };
// Comments tab: [author, ago, text]
export const SAMPLE_COMMENTS: [string, Ago, string][] = [
  ["nyxara", [2, "hour"], "Con Double Chance al Max su entrambi gli orecchini guadagno ~400 DPS. Ottima guida."],
  ["ysolde", [1, "day"], "Per il PvP meglio Frost Lance al posto di Blaze of Aether?"],
];

// pSkill — the skills themselves are the real ones (src/dashboard/skills.tsx).
export const SKILL_BUILDS = ["Frost Control · Sorcerer", "Burst PvE · Sorcerer", "Guardian Wall · Templar"];

// pDaev — the planner's build dropdown; the boards themselves are real (data/daevanion.json).
export const DV_BUILDS = ["Burst Nezekan · Sorcerer", "Tank Zikel · Templar"];
