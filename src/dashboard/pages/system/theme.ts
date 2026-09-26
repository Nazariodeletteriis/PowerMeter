import type { Settings } from "../../App";
import "./themes.css";

export const PALETTE_SETTING = "pm.palette";
export const PALETTES = ["brace", "carbonio", "chiaro"] as const;

/** Puts the saved palette on <html data-pm-palette>; unknown or unset → brace. */
export function applyPalette(settings: Settings) {
  const saved = settings[PALETTE_SETTING];
  document.documentElement.dataset.pmPalette = PALETTES.find((p) => p === saved) ?? "brace";
}
