import en from "../data/i18n/pm/en.json";

// Dictionaries: pm/<lang>.json plus one folder per page area, pm/<area>/<lang>.json,
// so page areas can add strings without touching the shared files.
const FILES = import.meta.glob<Record<string, string>>("../data/i18n/pm/**/*.json", {
  eager: true,
  import: "default",
});

// Same codes and native names as the meter's language dropdown (core.js).
export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "de", name: "Deutsch" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "it", name: "Italiano" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "pt", name: "Português" },
  { code: "ru", name: "Русский" },
  { code: "zh-Hant", name: "繁體中文" },
  { code: "zh-Hans", name: "简体中文" },
] as const;

export const LANGUAGE_SETTING = "dpsMeter.language";

// Core keys are checked; page-area keys live in their own files.
export type Key = keyof typeof en | (string & {});
export type T = (key: Key, vars?: Record<string, string | number>) => string;

// A key missing from a language falls back to en.
const DICTS: Record<string, Record<string, string>> = {};
for (const [path, dict] of Object.entries(FILES)) {
  const lang = path.slice(path.lastIndexOf("/") + 1, -".json".length);
  Object.assign((DICTS[lang] ??= {}), dict);
}

function isLanguage(code: string | undefined): code is string {
  return LANGUAGES.some((l) => l.code === code);
}

/** Saved meter language, else the system language if supported, else en. */
export function initialLanguage(saved: string | undefined): string {
  if (isLanguage(saved)) return saved;
  const system = navigator.language || "";
  if (system.startsWith("zh")) return /TW|HK|MO|Hant/i.test(system) ? "zh-Hant" : "zh-Hans";
  const base = system.split("-")[0];
  return isLanguage(base) ? base : "en";
}

export function translator(lang: string): T {
  const dict = DICTS[lang] ?? DICTS.en;
  return (key, vars) => {
    let text = dict[key] ?? DICTS.en[key] ?? key;
    for (const [name, value] of Object.entries(vars ?? {})) {
      text = text.replace(`{${name}}`, String(value));
    }
    return text;
  };
}
