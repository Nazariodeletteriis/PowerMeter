// The character bar's recharging counters, shared by the meter (charBar.ts) and the dashboard's character cards
// (pages/personaggi.tsx). Data only: importing it runs nothing.
import beritraIcon from "../assets/pm/counters/beritra.png";
import dailyIcon from "../assets/pm/counters/daily.png";
import nightmareIcon from "../assets/pm/counters/nightmare.png";
import odyleIcon from "../assets/pm/counters/odyle.png";
import shugoIcon from "../assets/pm/counters/shugo.png";

/** Last counters read for a character, by its name, in localStorage: `{ "<game id>": [base, charged] }`. */
export const REMEMBER_KEY = "pm.counters.";
export const ODYLE = 60000001;
/**
 * The counters, in order (Nazario's: Nightmare, Daily Dungeon, Beritra, Shugo, Odyle): game id (capture/counters.rs),
 * the base's max from the game's tooltip (null: not known yet, shown without), label key (meter: pmWidget.<key>,
 * dashboard: overlays.<key>), English fallback, icon (the game's, Nazario's set).
 */
export const COUNTERS: [number, number | null, string, string, string][] = [
  [4, null, "counterNightmare", "Nightmare", nightmareIcon],
  [101, 14, "counterDailyDungeon", "Daily Dungeon", dailyIcon],
  [8, null, "counterBeritraKeys", "Beritra keys", beritraIcon],
  [1, 21, "counterShugoKeys", "Shugo Festival keys", shugoIcon],
  [ODYLE, 840, "counterOdyle", "Odyle", odyleIcon],
];
