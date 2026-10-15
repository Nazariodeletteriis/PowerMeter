import type { FightSummary } from "../combat/parts";

// Field bosses respawn on a countdown from their kill, so each server has its own times and no
// schedule exists. We work them out from the kills PowerMeter saw: kill time + respawn interval.
// Intervals: Game8's field boss list (2026-10-16), estimated, to check in game. Codes: src/data/i18n/npcs.

const H = 60; // minutes
/** NPC code → zone and respawn interval in minutes. Verteron is Elyos, Altgard Asmodian. */
const FIELD_BOSSES: Record<number, { zone: "Verteron" | "Altgard"; every: number }> = {
  2100141: { zone: "Verteron", every: 1 * H }, // Blooming Korin
  2100582: { zone: "Verteron", every: 3 * H }, // Heretic Layla
  2100617: { zone: "Verteron", every: 2 * H }, // Black Tentacle Lawa
  2100661: { zone: "Verteron", every: 6 * H }, // Phantasm Kasia
  2100708: { zone: "Verteron", every: 2 * H }, // Centurion Demiros
  2100718: { zone: "Verteron", every: 6 * H }, // Divine Ansas
  2100876: { zone: "Verteron", every: 3 * H }, // Harvest Manager Moshav
  2100877: { zone: "Verteron", every: 2 * H }, // Sentinel K'nash
  2100988: { zone: "Verteron", every: 2 * H }, // Scholar Aulla
  2100989: { zone: "Verteron", every: 2 * H }, // Forest Warrior Aullamu
  2100991: { zone: "Verteron", every: 2 * H }, // Chaser Taulo
  2100003: { zone: "Verteron", every: 30 }, // Neikel of the East
  2101016: { zone: "Verteron", every: 6 * H }, // Researcher Setram
  2101074: { zone: "Verteron", every: 12 * H }, // Eternal Gartua
  2101120: { zone: "Verteron", every: 6 * H }, // Silent Dartan
  2101122: { zone: "Verteron", every: 6 * H }, // Soul Ruler Kashapa
  2101131: { zone: "Verteron", every: 12 * H }, // High Commander Lagta
  2100040: { zone: "Verteron", every: 30 }, // Rotten Kutar
  2100050: { zone: "Verteron", every: 30 }, // Kernon of the West
  2100076: { zone: "Verteron", every: 2 * H }, // Kusan the Mad Gladiator
  2100077: { zone: "Verteron", every: 2 * H }, // Ritualist Garshim
  2100079: { zone: "Verteron", every: 90 }, // Bodyguard Teegant
  2100177: { zone: "Verteron", every: 3 * H }, // Furious Saursus
  2100178: { zone: "Verteron", every: 3 * H }, // Bloodfang Pnyn
  2400017: { zone: "Altgard", every: 30 }, // Melted Danar
  2400140: { zone: "Altgard", every: 30 }, // Faithful Rajit
  2400141: { zone: "Altgard", every: 1 * H }, // Berserker Vargor
  2400223: { zone: "Altgard", every: 90 }, // Blood Warrior Lannar
  2400358: { zone: "Altgard", every: 3 * H }, // Advisor Resana
  2400074: { zone: "Altgard", every: 30 }, // Black Warrior Aed
  2400212: { zone: "Altgard", every: 2 * H }, // Predator Garsan
  2400274: { zone: "Altgard", every: 2 * H }, // Deceiver Trid
  2400335: { zone: "Altgard", every: 2 * H }, // Blue Wave Kelpina
  2400353: { zone: "Altgard", every: 2 * H }, // High Overseer Nutah
  2400419: { zone: "Altgard", every: 3 * H }, // Special Operations Leader Linx
  2400424: { zone: "Altgard", every: 4 * H }, // Desecrator Newbold
  2400425: { zone: "Altgard", every: 4 * H }, // Specter Archon Axios
  2400474: { zone: "Altgard", every: 3 * H }, // Addicted Hardirun
  2400504: { zone: "Altgard", every: 4 * H }, // Executioner Barthien
  2400593: { zone: "Altgard", every: 6 * H }, // Drakan Battalion Weapon Guruta
  2400607: { zone: "Altgard", every: 3 * H }, // Veteran Shujakan
  2400608: { zone: "Altgard", every: 4 * H }, // Visionary Karuka
  2400659: { zone: "Altgard", every: 6 * H }, // Dark Shadow Vishwada
  2400709: { zone: "Altgard", every: 6 * H }, // Sharp Shylak
  2400800: { zone: "Altgard", every: 12 * H }, // Immortal Gartua
  2400853: { zone: "Altgard", every: 12 * H }, // High Commander Lagta
  2400854: { zone: "Altgard", every: 6 * H }, // Soul Ruler Kashapa
  2400855: { zone: "Altgard", every: 6 * H }, // Silent Dartan
};

export interface Respawn {
  code: number;
  name: string;
  zone: string;
  every: number; // minutes
  killedAt: number;
  respawnAt: number;
}

const KEEP = 24 * 60 * 60e3; // older kills say nothing about the boss today

/** The last kill of each field boss in the fight history (newest first), and when it comes back; soonest first. */
export function fieldBossRespawns(fights: FightSummary[], now: number): Respawn[] {
  const out = new Map<number, Respawn>();
  for (const f of fights) {
    const b = FIELD_BOSSES[f.mobCode];
    const killedAt = f.startTimeMs + f.durationMs;
    if (!b || !f.killed || out.has(f.mobCode) || now - killedAt > KEEP) continue;
    out.set(f.mobCode, { code: f.mobCode, name: f.bossName, zone: b.zone, every: b.every, killedAt, respawnAt: killedAt + b.every * 60e3 });
  }
  return [...out.values()].sort((a, b) => a.respawnAt - b.respawnAt);
}

/** "3 h", "1.5 h", "30 min" in `lang`. */
export const interval = (minutes: number, lang: string) =>
  minutes < 60
    ? new Intl.NumberFormat(lang, { style: "unit", unit: "minute", unitDisplay: "short" }).format(minutes)
    : new Intl.NumberFormat(lang, { style: "unit", unit: "hour", unitDisplay: "short", maximumFractionDigits: 1 }).format(minutes / 60);
