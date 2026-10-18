import type { Settings } from "../../App";
import "./themes.css";

/** The widget's theme setting (core.js storageKeys.theme): one theme for all of PowerMeter, dashboard and widget windows. */
export const THEME_SETTING = "dpsMeter.theme";
/** The widget's themes (core.js availableThemes), the design's own first. */
export const THEMES = ["powermeter", "aion2", "asmodian", "cogni", "elyos", "ember", "fera", "frost", "natura", "obsidian", "varian"] as const;

/** The saved theme; unknown or unset (the old Brace / Carbonio / Chiaro palettes too) → powermeter. */
export const themeOf = (settings: Settings) => THEMES.find((x) => x === settings[THEME_SETTING]) ?? "powermeter";

/** Puts the saved theme on <html data-theme>, as core.js applyTheme does in the widget windows. */
export function applyPalette(settings: Settings) {
  document.documentElement.dataset.theme = themeOf(settings);
}
