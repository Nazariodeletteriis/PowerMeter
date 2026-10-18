import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MinusIcon, XIcon } from "@phosphor-icons/react";
import type { Settings } from "./App";
import { errorText, initialLanguage, LANGUAGE_SETTING, translator } from "./i18n";
import { applyPalette } from "./pages/system/theme";
import { MapExplorer } from "./pages/world/MapExplorer";
import { Logo } from "./ui";

/**
 * The Map window (label "map", powermeter.rs open_map_window): dashboard.html with window.__PM_VIEW__ = "map".
 * Only the map, under its own title bar; settings read and followed like the dashboard (App.tsx).
 */
export function MapWindow() {
  const [settings, setSettings] = useState<Settings>();
  const [error, setError] = useState<string>();

  useEffect(() => {
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
  const win = getCurrentWindow();
  const run = (action: () => Promise<unknown>) => void action().catch((e) => setError(String(e)));

  return (
    <div className="app">
      <header className="titlebar" data-tauri-drag-region>
        <Logo size={18} />
        <div className="brandName">
          Power<span>Meter</span>
        </div>
        <div className="brandBy">{t("nav.map")}</div>
        <div className="winButtons">
          <button type="button" title={t("window.minimize")} aria-label={t("window.minimize")} onClick={() => run(() => win.minimize())}>
            <MinusIcon />
          </button>
          <button type="button" className="close" title={t("window.close")} aria-label={t("window.close")} onClick={() => run(() => win.close())}>
            <XIcon />
          </button>
        </div>
      </header>
      {error && (
        <p className="error updateBanner" role="alert">
          {errorText(t, error)}
          <button type="button" className="close" title={t("window.close")} aria-label={t("window.close")} onClick={() => setError(undefined)}>
            ×
          </button>
        </p>
      )}
      {settings && <MapExplorer t={t} settings={settings} run={run} takeFocus fill />}
    </div>
  );
}
