import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Settings } from "./App";
import { errorText, initialLanguage, LANGUAGE_SETTING, translator } from "./i18n";
import { applyPalette } from "./pages/system/theme";
import { MapExplorer } from "./pages/world/MapExplorer";

/**
 * The widget windows over the game, dashboard.html with window.__PM_VIEW__ set (powermeter.rs open_widget_window):
 * the minimap in a transparent window (its controls are Minimap.tsx, the hidden cube compass CubeGuide.tsx), full
 * screen the whole map; "map" from the Map page, "cubes" from Cube Finder (its own layers and settings).
 * Settings read and followed like the dashboard (App.tsx).
 */
export function MapWindow({ view }: { view: "map" | "cubes" }) {
  const [settings, setSettings] = useState<Settings>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    // The window is transparent: only the widget draws (world.css .mmDoc).
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
      {settings && <MapExplorer t={t} settings={settings} run={run} takeFocus={view === "map"} fill mini cubes={view === "cubes"} />}
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
