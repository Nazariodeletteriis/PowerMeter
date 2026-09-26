// SAMPLE DATA — copied from the Claude Design prototype
// (docs/design/claude-design/videogame-tool-design-system/project/PowerMeter Dashboard.dc.html).
// Organizer (R5) and system modals. Same rules as ../sampleData.ts: replace
// each block with the real source and delete it. Game names stay in English;
// user-written labels (custom timers) stay Italian like the prototype.

// pOrg.data — [id, name, priority]
export type Priority = "high" | "medium" | "low";
export const SAMPLE_ACTIVITIES: Record<string, [id: string, name: string, priority: Priority][]> = {
  daily: [
    ["d1", "Daily Mission: Shugo Delivery", "high"],
    ["d2", "Abyss Point Hunt ×3", "high"],
    ["d3", "Crafting Mastery Order", "medium"],
    ["d4", "Kinah Exchange", "low"],
    ["d5", "Gathering: 50 Aetherite", "medium"],
  ],
  weekly: [
    ["w1", "Ashen Sanctum Clear", "high"],
    ["w2", "Arena of Discipline ×5", "medium"],
    ["w3", "Fortress Siege", "high"],
  ],
  seasonal: [["s1", "Season Pass: Tier 40", "medium"]],
  custom: [["c1", "Farm Moonpetal per le pozioni", "low"]],
};

// pOrg.chars — the account's characters for the matrix view.
export const SAMPLE_ALTS = ["Kaelthas", "Morrigane", "Brannoc", "Sylweth"];

// pOrg.timers minus the two resets, which are computed for real.
// `left` = seconds left when the page opens, `period` = full cycle.
export const SAMPLE_ORG_TIMERS = [
  { name: "Shugo Market", sub: "Ogni 3 ore", left: 2715, period: 10800, win: true, discord: false },
  { name: "Rift · Eltnen", sub: "Apertura stimata", left: 840, period: 3600, win: true, discord: true },
  { name: "Pozione Aether", sub: "Personalizzato · 45 min", left: 1930, period: 2700, win: false, discord: false },
  { name: "Raid serale", sub: "Personalizzato · 21:00", left: 12600, period: 86400, win: true, discord: true },
];

// md.update — latest.json only has version + msiUrl (+ releaseNotesUrl).
export const SAMPLE_UPDATE = {
  version: "1.5.0",
  msiUrl: "",
  date: "2026-09-25",
  sizeMb: 48,
  notes: [
    "Nuova scheda Timeline buff nel report",
    "Rilevamento automatico di VPN e ping reducer",
    "Il widget ricorda la posizione per ogni monitor",
    "Correzioni: nomi con caratteri speciali, Double non contati su DOT",
  ],
};
