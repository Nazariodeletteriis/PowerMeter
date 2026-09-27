import { useEffect, useMemo } from "react";
import type { PageProps } from "./types";
import { Attributes, type AttrSaved } from "./calc/attributes";
import { Equipment, type EqSaved } from "./calc/equipment";
import { Odds, type OddsSaved } from "./calc/odds";
import "./organizer/organizer.css";
import "./calc/calc.css";

// Calculators: the three questions our real data answers (see each tab's
// file for its sources). Inputs persist in settings["pm.calc"].

const KEY = "pm.calc";
type Saved = { tab?: Tab; eq?: EqSaved; attr?: AttrSaved; odds?: OddsSaved };
type Tab = "eq" | "attr" | "odds";
const TABS: Tab[] = ["eq", "attr", "odds"];

export default function Calc({ t, lang, settings, save, go, onError, setHeader }: PageProps) {
  const title = t("nav.calculators");
  useEffect(() => setHeader({ title }), [setHeader, title]);
  const saved: Saved = useMemo(() => {
    try {
      return JSON.parse(settings[KEY] ?? "{}") ?? {};
    } catch {
      return {}; // hand-edited or corrupt: start over
    }
  }, [settings]);
  const set = (patch: Saved) => save(KEY, JSON.stringify({ ...saved, ...patch })).catch(onError);
  const tab = TABS.includes(saved.tab!) ? saved.tab! : "eq";

  return (
    <>
      <div className="orgTabs" role="tablist" aria-label={title}>
        {TABS.map((id) => (
          <button key={id} type="button" role="tab" id={`calc-tab-${id}`} aria-controls="calc-panel" className="orgTab" aria-selected={id === tab} onClick={() => set({ tab: id })}>
            {t(`calc.tab.${id}`)}
          </button>
        ))}
      </div>
      <div id="calc-panel" role="tabpanel" aria-labelledby={`calc-tab-${tab}`}>
        <p className="cIntro">{t(`calc.intro.${tab}`)}</p>
        {tab === "eq" && <Equipment t={t} lang={lang} v={saved.eq ?? {}} set={(eq) => set({ eq })} />}
        {tab === "attr" && <Attributes t={t} lang={lang} v={saved.attr ?? {}} set={(attr) => set({ attr })} />}
        {tab === "odds" && <Odds t={t} lang={lang} go={go} v={saved.odds ?? {}} set={(odds) => set({ odds })} />}
      </div>
    </>
  );
}
