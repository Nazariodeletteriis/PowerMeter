import de from "../data/i18n/pm/de.json";
import en from "../data/i18n/pm/en.json";
import es from "../data/i18n/pm/es.json";
import fr from "../data/i18n/pm/fr.json";
import it from "../data/i18n/pm/it.json";
import ja from "../data/i18n/pm/ja.json";
import ko from "../data/i18n/pm/ko.json";
import pt from "../data/i18n/pm/pt.json";
import ru from "../data/i18n/pm/ru.json";
import zhHans from "../data/i18n/pm/zh-Hans.json";
import zhHant from "../data/i18n/pm/zh-Hant.json";

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

export type Key = keyof typeof en;
export type T = (key: Key, vars?: Record<string, string | number>) => string;

// A key missing from a language falls back to en.
const DICTS: Record<string, Partial<Record<Key, string>>> = {
  de, en, es, fr, it, ja, ko, pt, ru, "zh-Hans": zhHans, "zh-Hant": zhHant,
};

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
  const dict = DICTS[lang] ?? en;
  return (key, vars) => {
    let text = dict[key] ?? en[key];
    for (const [name, value] of Object.entries(vars ?? {})) {
      text = text.replace(`{${name}}`, String(value));
    }
    return text;
  };
}
