// SAMPLE DATA — copied from the Claude Design prototype
// (docs/design/claude-design/videogame-tool-design-system/project/PowerMeter Dashboard.dc.html).
// Nothing here is real: every export is a stand-in until its feature ships
// (R2 logs online, R3 builds/database, R4 world, R5 organizer, R6 supporter).
// Replace each block with the real source and delete it; don't grow it into a
// data layer. Pages being built from the prototype add their block here, with
// the prototype function it comes from.
// Game content (names, items, activities) stays in English; prototype UI
// labels that ended up in the data (e.g. activity cadence) are Italian like
// the prototype and must move to i18n when the block becomes real.

// pHome / header chip — the character card fields we cannot read yet.
export const SAMPLE_CHARACTER = {
  name: "Kaelthas",
  cls: "Sorcerer",
  faction: "Asmodian",
  level: 45,
  server: "Siel (EU)",
  cp: 48215,
  cpDelta: 1240,
  build: "Ashen Burst · PvE",
  buildOwned: 11,
  buildTotal: 15,
};

// pHome.upgrades
export const SAMPLE_UPGRADES = [
  { name: "Earring of the Ashen Tide", rarity: "Heroic", source: "Ashen Sanctum · Vorathis" },
  { name: "Gloves of Storm Oath", rarity: "Legendary", source: "Crafting · Armorsmith" },
  { name: "Ring of Quiet Aether", rarity: "Heroic", source: "Shop · Abyss Points" },
];

// pHome.homeTimers — seconds left when the page opens.
// The daily/weekly resets are real (pages/organizer/resets.ts).
export const SAMPLE_TIMERS = [
  { name: "Shugo Market", seconds: 2715 },
  { name: "Rift · Eltnen", seconds: 840 },
];

// pHome.today
export const SAMPLE_TODAY = [
  { id: "d1", name: "Daily Mission: Shugo Delivery", cadence: "Giornaliera" },
  { id: "d2", name: "Abyss Point Hunt ×3", cadence: "Giornaliera" },
  { id: "d3", name: "Crafting Mastery Order", cadence: "Giornaliera" },
  { id: "w1", name: "Ashen Sanctum Clear", cadence: "Settimanale" },
  { id: "w2", name: "Arena of Discipline ×5", cadence: "Settimanale" },
];

// pHome.news
export const SAMPLE_NEWS = [
  { date: "24 set", title: "Patch 2.3 — The Ashen Tide: nuovi dungeon e bilanciamento classi" },
  { date: "20 set", title: "Evento Autunno: doppi drop in Veiled Crypt" },
  { date: "17 set", title: "Manutenzione server EU completata" },
];
