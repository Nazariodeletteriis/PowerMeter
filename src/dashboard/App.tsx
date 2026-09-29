import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { initialLanguage, LANGUAGE_SETTING, translator } from "./i18n";
import { Onboarding, TERMS_VERSION } from "./Onboarding";
import { applyPalette } from "./pages/system/theme";
import { Shell } from "./Shell";
import { TitleBar } from "./TitleBar";

export type Settings = Record<string, string>;
export type SaveSetting = (key: string, value: string) => Promise<void>;

export function App() {
  const [settings, setSettings] = useState<Settings>();
  const [error, setError] = useState<string>();
  const [startStep, setStartStep] = useState(1);
  const onError = useCallback((e: unknown) => setError(String(e)), []);

  useEffect(() => {
    // Builds saved before 0.3.8 hold third-party item data we no longer ship: wipe them once.
    localStorage.removeItem("pm.widgetBuild");
    for (const key of ["pm.builderGear", "pm.likedBuilds"]) invoke("update_settings", { key, value: "" }).catch(() => {});
    invoke<Settings>("get_settings").then(setSettings, (e) => {
      setError(String(e));
      setSettings({});
    });
    // The Settings window and the meter write through update_settings too;
    // the backend broadcasts every real change to all windows.
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
  const onboarded = settings?.["pm.onboarded"] === "1";
  const save: SaveSetting = async (key, value) => {
    await invoke("update_settings", { key, value });
    setSettings((s) => ({ ...s, [key]: value }));
  };
  const reviewOnboarding = (step: number) => {
    setStartStep(step);
    save("pm.onboarded", "0").catch(onError);
  };

  return (
    <div className="app">
      {/* Always drawn, so the window can be moved and closed during onboarding. */}
      <TitleBar t={t} lang={lang} onError={onError} />
      {error && (
        <p className="error updateBanner" role="alert">
          {t("common.error", { message: error })}
          <button type="button" className="close" title={t("window.close")} aria-label={t("window.close")} onClick={() => setError(undefined)}>
            ×
          </button>
        </p>
      )}
      {settings &&
        (onboarded && settings["pm.termsAccepted"] === TERMS_VERSION ? (
          <Shell t={t} lang={lang} settings={settings} save={save} onError={onError} reviewOnboarding={reviewOnboarding} />
        ) : (
          // Onboarded under older terms: only the legal step until accepted.
          <Onboarding t={t} lang={lang} settings={settings} save={save} startStep={startStep} termsOnly={onboarded} />
        ))}
    </div>
  );
}
