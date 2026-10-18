import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Settings } from "./App";
import { errorText, initialLanguage, LANGUAGE_SETTING, translator } from "./i18n";
import { applyPalette } from "./pages/system/theme";
import { MapExplorer } from "./pages/world/MapExplorer";

/**
 * The Map window (label "map", powermeter.rs open_map_window): dashboard.html with window.__PM_VIEW__ = "map".
 * The minimap over the game, in a transparent window (its controls are Minimap.tsx); full screen, the whole map.
 * Settings read and followed like the dashboard (App.tsx).
 */
export function MapWindow() {
  const [settings, setSettings] = useState<Settings>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    // The window is transparent: only the minimap draws (world.css .mmDoc).
    document.documentElement.classList.add("mmDoc");
    invoke<Settings>("get_settings").then(setSettings, (e) => {
      setError(String(e));
      setSettings({});
    });
    // Pets marked in the Builder, or read from the game, reach this window too.
    const unlisten = listen<{ key: string; value: string }>("setting-changed", ({ payload }) => {
      setSettings((s) => ({ ...s, [payload.key]: String(payload.value) }));
    });
    return () => {
      unlisten.then((stop) => stop(), () => {});
    };
  }, []);

  const lang = initialLanguage(settings?.[LANGUAGE_SETTING]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    if (settings) applyPalette(settings);
  }, [settings]);

  const t = translator(lang);
  const run = (action: () => Promise<unknown>) => void action().catch((e) => setError(String(e)));

  return (
    <div className="mmWin">
      {settings && <MapExplorer t={t} settings={settings} run={run} takeFocus fill mini />}
      {error && (
        <p className="error mmError" role="alert">
          {errorText(t, error)}
          <button type="button" className="close" title={t("window.close")} aria-label={t("window.close")} onClick={() => setError(undefined)}>
            ×
          </button>
        </p>
      )}
    </div>
  );
}
