import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { initialLanguage, LANGUAGE_SETTING, translator } from "./i18n";
import { Onboarding } from "./Onboarding";
import { Shell } from "./Shell";

export type Settings = Record<string, string>;
export type SaveSetting = (key: string, value: string) => Promise<void>;

export function App() {
  const [settings, setSettings] = useState<Settings>();
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    invoke<Settings>("get_settings").then(setSettings, (e) => {
      setLoadError(String(e));
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

  if (!settings) return null;

  const t = translator(lang);
  const save: SaveSetting = async (key, value) => {
    await invoke("update_settings", { key, value });
    setSettings((s) => ({ ...s, [key]: value }));
  };

  return (
    <>
      {loadError && (
        <p className="error banner" role="alert">
          {t("common.error", { message: loadError })}
        </p>
      )}
      {settings["pm.onboarded"] === "1" ? (
        <Shell t={t} lang={lang} settings={settings} save={save} />
      ) : (
        <Onboarding t={t} lang={lang} settings={settings} save={save} />
      )}
    </>
  );
}
