// SAMPLE DATA for the combat pages, copied from the Claude Design prototype
// (docs/design/claude-design/videogame-tool-design-system/project/PowerMeter Dashboard.dc.html).
// Nothing here is real. Replace each block with the engine / online source
// after the game launches (30/09) and delete it. The prototype function each
// block comes from is named above it.
// Game content (names, skills, items, effects) stays in English; UI words that
// the prototype wrote into its data are i18n keys (combat.*).

// pCommon: [name, class, CP, DPS, deaths, isMe]
export const PARTY: [string, string, number, number, number, boolean?][] = [
  ["Kaelthas", "Sorcerer", 48215, 18420, 0, true],
  ["Nyxara", "Assassin", 47880, 17950, 0],
  ["Vharok", "Gladiator", 46120, 14310, 1],
  ["Ironveil", "Templar", 49010, 8840, 0],
  ["Elowyn", "Chanter", 45300, 7210, 0],
  ["Solenne", "Cleric", 46650, 3120, 0],
];
export const BOSS = "Vorathis the Ashbound";
export const DUNGEON = "Ashen Sanctum";
/** Fight length in seconds (5:12). */
export const DURATION = 312;
/** 26 set 2026, 21:14 (local time). */
export const FIGHT_DATE = new Date(2026, 8, 26, 21, 14);

// pReport: skills per class (real skill names, src/data/skills.json; "Auto Attack" is not a skill there)
export const CLASS_SKILLS: Record<string, string[]> = {
  Sorcerer: ["Flame Arrow", "Hellfire", "Ice Chain", "Blaze", "Flame Harpoon", "Frost Burst", "Soul Freeze", "Auto Attack"],
  Assassin: ["Shadow Fall", "Ambush", "Heart Gore", "Surprise Attack", "Whirlwind Slash", "Quick Slash", "Storm Slash", "Auto Attack"],
  Gladiator: ["Devastating Sword", "Crushing Wave", "Overhead Slam", "Rending Blow", "Rage Burst", "Wrathful Strike", "Keen Strike", "Auto Attack"],
  Templar: ["Shield Smite", "Judgment", "Punishment", "Annihilation", "Fierce Strike", "Punishing Strike", "Continuous Flurry", "Auto Attack"],
  Chanter: ["Incandescent Blow", "Windrage Fury", "Scorch Strike", "Dark Crush", "Wave Blow", "Thunderbolt Strike", "Spin Strike", "Auto Attack"],
  Cleric: ["Judgment Lightning", "Earth's Retribution", "Thunderclap", "Chain of Pain", "Lightning Barrage", "Divine Punishment", "Condemnation", "Auto Attack"],
};
/** Share of damage and base hits per skill slot. */
export const SKILL_SHARE = [0.24, 0.18, 0.14, 0.12, 0.11, 0.09, 0.07, 0.05];
export const SKILL_HITS = [28, 34, 52, 20, 96, 140, 18, 160];
/** Sub-rows of skill slots 4 and 5; "{skill}" is the slot's skill, "{hit}" is combat.hit. */
export const SKILL_KIDS: Record<number, string[]> = {
  4: ["{skill} · {hit}", "{skill} · DOT"],
  5: ["{skill} · {hit}", "{skill} · DOT"],
};
export const BADGES: [string, number][] = [["CRIT", 38.4], ["BACK", 14.2], ["PARRY", 3.1], ["PERFECT", 9.6], ["DOUBLE", 7.8]];
/** Skill tab side cards: cast, damage taken, healing of the selected player; boss damage/cast/hits. */
export const PLAYER_EXTRA = { casts: 214, taken: 540112, heal: 64020 };
export const BOSS_STATS = { damage: 4832600, casts: 96, hits: 388 };
/** Timeline: seconds between casts of the first 7 skills. */
export const TL_PERIOD = [9, 14, 11, 24, 30, 6, 45];
/** Chart markers: phase 2 (sample 30-33 of 59) and Vharok's death (sample 41). */
export const PHASE = { name: "Ashen Tide", from: 30, to: 33 };
export const DEATH = { name: "Vharok", at: 41 };
export const BUFFS: [string, "buff" | "debuff", [number, number][]][] = [
  ["Wind Blessing", "buff", [[0, 40], [60, 120], [140, 200], [230, 300]]],
  ["Aether Surge", "buff", [[20, 55], [110, 150], [210, 250]]],
  ["Burning Brand", "debuff", [[5, 100], [120, 300]]],
  ["Weakened Armor", "debuff", [[15, 80], [95, 160], [175, 290]]],
  ["Chanter · Mantra of Fury", "buff", [[0, 312]]],
];
/** Damage taken / healing / targets tabs: [who, what, amount]; target kinds are combat.* keys. */
export const REPORT_LISTS: Record<"taken" | "heal" | "targets", [string, string, number][]> = {
  taken: [["Ironveil", "Molten Slam · Vorathis", 1840000], ["Vharok", "Ashfall Cleave", 1210000], ["Kaelthas", "Cinder Rain", 540000], ["Nyxara", "Cinder Rain", 498000], ["Elowyn", "Ember Orb", 430000], ["Solenne", "Ember Orb", 312000]],
  heal: [["Solenne", "Light of Healing · Radiance of Recovery", 2210000], ["Elowyn", "Recuperation · Hand of Grace", 840000], ["Ironveil", "Shield of Protection", 210000], ["Kaelthas", "Contract of Revival", 64000]],
  targets: [["Vorathis the Ashbound", "combat.kindBoss", 15200000], ["Cinderspawn ×6", "combat.kindAdd", 3100000], ["Ashbound Totem", "combat.kindObject", 1150000]],
};
export const SHARE_URL = "powermeter.letrionlabs.it/e/9Uiga7pj";

// pX (meter): healers [name, class, HPS, overheal %], their heal skills, aggro [name, class, %, isTank]
export const HEALS: [string, string, number, number][] = [
  ["Solenne", "Cleric", 7084, 18],
  ["Elowyn", "Chanter", 2690, 24],
  ["Ironveil", "Templar", 673, 9],
  ["Kaelthas", "Sorcerer", 205, 4],
];
export const HEAL_SKILLS: Record<string, string[]> = {
  Solenne: ["Light of Healing", "Radiance of Recovery", "Light of Regeneration", "Salvation"],
  Elowyn: ["Recuperation", "Hand of Grace", "Blessing of Guardian", "Sprint Mantra"],
  Ironveil: ["Protective Strike", "Noble Armor", "Shield of Protection", "HP Boost"],
  Kaelthas: ["Contract of Revival", "Hibernation", "Flame Arrow", "Frost"],
};
export const HEAL_SHARE = [0.42, 0.28, 0.18, 0.12];
export const AGGRO: [string, string, number, boolean?][] = [
  ["Ironveil", "Templar", 100, true],
  ["Vharok", "Gladiator", 93],
  ["Nyxara", "Assassin", 81],
  ["Kaelthas", "Sorcerer", 68],
  ["Solenne", "Cleric", 44],
  ["Elowyn", "Chanter", 31],
];
export const SAMPLE_PING = 38;
/** Fight timer starts at 3:12 and ticks, like the prototype. */
export const FIGHT_START_S = 192;

// pLists: storico is real (get_fight_history). Rankings: 18 places, podium first.
const RANK_NAMES = ["Varkhan", "Lyssandra", "Oberyth", "Nyxara", "Seraphine", "Kaelthas", "Duskwarden", "Vaelric", "Morwyn", "Thalanor", "Ysolde", "Kaelen", "Rhovan", "Ilyria", "Brakkus", "Veyla", "Sorren", "Ashenmoor"];
const RANK_CLS = ["Gladiator", "Assassin", "Sorcerer", "Assassin", "Sorcerer", "Sorcerer", "Ranger", "Gladiator", "Spiritmaster", "Assassin", "Sorcerer", "Ranger", "Gladiator", "Spiritmaster", "Cleric", "Assassin", "Chanter", "Templar"];
const PODIUM_DPS = [26940, 26515, 26102];
const PODIUM_CP = [52110, 51880, 52430];
const PODIUM_D = ["3:02", "3:04", "3:11"];
const MY_RANK = { pos: 142, n: "Kaelthas", cls: "Sorcerer", dps: 18420, cp: 48215, d: "5:12", date: "26/09" };
/**
 * One leaderboard view. `seed` stands for the region/dungeon/boss/period filters: it rotates
 * who holds each place and shifts the DPS; `cls` makes it that class's board.
 * `me` is undefined when the class filter excludes the local player.
 */
export function sampleRanking(seed: number, cls?: string) {
  const f = 1 - (seed % 7) * 0.012;
  const rows = RANK_NAMES.map((_, i) => {
    const j = (i + seed * 5) % RANK_NAMES.length;
    const b = i - 3;
    return {
      pos: i + 1,
      n: RANK_NAMES[j],
      cls: cls ?? RANK_CLS[j],
      dps: Math.round((i < 3 ? PODIUM_DPS[i] : 24800 - b * 410 - (b % 3) * 90) * f),
      cp: j < 3 ? PODIUM_CP[j] : 51200 - (j - 3) * 260,
      d: i < 3 ? PODIUM_D[i] : `${3 + (b % 3)}:${String(10 + ((b * 3) % 50)).padStart(2, "0")}`,
      date: `${20 + (i % 6)}/09`,
      sup: j === 0 || (j >= 3 && (j - 3) % 4 === 1),
    };
  });
  const me = !cls || cls === MY_RANK.cls ? { ...MY_RANK, pos: MY_RANK.pos + ((seed * 7) % 41) - 20, dps: Math.round(MY_RANK.dps * f) } : undefined;
  return { podium: rows.slice(0, 3), board: rows.slice(3), me };
}
export const REGIONS = ["EU", "NA"];
export const RANK_DUNGEONS = ["Ashen Sanctum", "Veiled Crypt"];
export const RANK_BOSSES = ["Vorathis the Ashbound", "Grimtooth Warden"];

// pParty: [name, class, role, CP, gear score, Daevanion]
export const PT_MEMBERS: [string, string, string, string, string, string][] = [
  ["Kaelthas", "Sorcerer", "DPS", "48.215", "2.564", "112/134"],
  ["Nyxara", "Assassin", "DPS", "47.880", "2.540", "108/134"],
  ["Vharok", "Gladiator", "DPS", "46.120", "2.498", "98/134"],
  ["Ironveil", "Templar", "Tank", "49.010", "2.612", "120/134"],
  ["Elowyn", "Chanter", "Support", "45.300", "2.460", "101/134"],
  ["Solenne", "Cleric", "Healer", "46.650", "2.505", "104/134"],
];
export const PT_SKILLS: Record<string, string[]> = {
  Sorcerer: ["Flame Arrow", "Hellfire", "Ice Chain", "Blaze", "Flame Harpoon", "Frost Burst", "Soul Freeze", "Wish of Concentration"],
  Assassin: ["Shadow Fall", "Ambush", "Heart Gore", "Surprise Attack", "Whirlwind Slash", "Quick Slash", "Storm Slash", "Shadow Step"],
  Gladiator: ["Devastating Sword", "Crushing Wave", "Overhead Slam", "Rending Blow", "Rage Burst", "Wrathful Strike", "Keen Strike", "Crushing Charge"],
  Templar: ["Shield Smite", "Judgment", "Punishment", "Annihilation", "Fierce Strike", "Punishing Strike", "Continuous Flurry", "Banner of the Battlefield"],
  Chanter: ["Undefeated Mantra", "Incandescent Blow", "Windrage Fury", "Scorch Strike", "Dark Crush", "Wave Blow", "Thunderbolt Strike", "Barrier Spell"],
  Cleric: ["Light of Healing", "Radiance of Recovery", "Judgment Lightning", "Earth's Retribution", "Thunderclap", "Salvation", "Chain of Pain", "Summon Revive"],
};
export const PT_HUES = ["#4F93EA", "#B377E8", "#E8743B", "#3FC9C1", "#F0A63A", "#E79AC9", "#6CC46A", "#D8B64A"];
/** Opener: skill slot of each of the first 10 casts. */
export const PT_OPENER = [1, 2, 0, 3, 4, 1, 5, 0, 6, 2];
/** Group buff bands in the first 60 s: [name, from s, to s, color, top]. */
export const PT_BANDS: [string, number, number, string, string][] = [
  ["Mantra of Fury", 0, 60, "#E79AC9", "2px"],
  ["Wind Blessing", 18, 34, "#3FC9C1", "18px"],
  ["Battlefield Banner", 20, 30, "#D8B64A", "2px"],
  ["Word of Wind", 40, 52, "#3FC9C1", "18px"],
];
const MAIN_HAND: Record<string, string> = {
  Sorcerer: "Staff of the Ashen Tide",
  Assassin: "Fang of the Veiled Night",
  Cleric: "Mace of Radiant Oath",
  Templar: "Longsword of the Aegis",
  Chanter: "Staff of Resonance",
};
/** [slot, item, rarity, enchant] */
export const ptGear = (cls: string): [string, string, string, number][] => [
  ["Main Hand", MAIN_HAND[cls] ?? "Greatsword of Crimson Wrath", "Mythic", 15],
  ["Off Hand", "Orb of Quiet Embers", "Legendary", 12],
  ["Head", "Hood of Storm Oath", "Heroic", 10],
  ["Shoulders", "Mantle of Cinders", "Legendary", 12],
  ["Chest", "Robe of the Ashbound", "Legendary", 11],
  ["Gloves", "Gloves of Quiet Embers", "Rare", 8],
  ["Legs", "Leggings of Cinders", "Legendary", 12],
  ["Boots", "Shoes of Silent Aether", "Rare", 9],
  ["Belt", "Sash of Embers", "Heroic", 7],
  ["Cloak", "Cloak of the Ashen Tide", "Legendary", 10],
  ["Necklace", "Pendant of Veiled Flame", "Heroic", 5],
  ["Earring", "Earring of Quiet Aether ×2", "Rare", 5],
  ["Ring", "Ring of Silent Aether ×2", "Rare", 5],
  ["Bracelet", "Band of Embers ×2", "Heroic", 5],
  ["Wings", "Forest Spirit Wings", "Legendary", 10],
];
/** [scroll, effect (combat.* key when it is a sentence), quantity, active for this class] */
export const ptScrolls = (cls: string): [string, string, number, boolean][] => [
  ["Scroll of Courage", "+Attack Speed 20% · 10 min", 8, true],
  ["Scroll of Awakening", "+Casting Speed 15% · 10 min", 5, cls === "Sorcerer" || cls === "Cleric" || cls === "Chanter"],
  ["Crit Strike Scroll", "+Critical Hit 80 · 10 min", 6, true],
  ["Scroll of Running", "+Move Speed 20% · 10 min", 12, false],
  ["Anti-Shock Scroll", "combat.stunResist", 3, false],
];
/** [buff, source (class · player, or a combat.src* key), effect, icon, color, uptime] */
export const PT_BUFFS: [string, string, string, string, string, string][] = [
  ["Mantra of Fury", "Chanter · Elowyn", "+Attack 12%", "music", "#E79AC9", "100%"],
  ["Wind Blessing", "Chanter · Elowyn", "+Speed 15%", "wind", "#3FC9C1", "41%"],
  ["Battlefield Banner", "Templar · Ironveil", "+Damage 8%", "banner", "#D8B64A", "33%"],
  ["Blessing of Stone", "Cleric · Solenne", "+HP 1.200", "shield", "#EAE3D2", "92%"],
  ["Aether Feast", "combat.srcFood", "+Magic Boost 60 · 30 min", "food", "#F0A63A", "100%"],
  ["Greater Recovery Potion", "combat.srcPotion", "HP 4.500 in 5 s", "flask", "#FF6B6B", "—"],
  ["Fortress Blessing", "combat.srcLegion", "+PvE Attack 3%", "castle", "#4F93EA", "100%"],
  ["Abyss Awakening", "combat.srcEvent", "+EXP 50%", "sparkle", "#B377E8", "0%"],
  ["Divine Protection", "Cleric · Solenne", "combat.dmgTaken10", "hand", "#EAE3D2", "0%"],
];
