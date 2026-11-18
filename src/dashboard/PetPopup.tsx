import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { PawPrintIcon } from "@phosphor-icons/react";
import type { Settings } from "./App";
import type { ListRow } from "../data/db/types";
import { initialLanguage, LANGUAGE_SETTING, translator, type T } from "./i18n";
import { applyPalette } from "./pages/system/theme";
import { GameIcon, gd, useGd, useIcons } from "./pages/world/db";
import { PET_EXP_MAX } from "./pages/characters/calc";
import PET_IDS from "../data/pet_ids.json";
import "./petPopup.css";

/** One kill that counts for a pet (src-tauri/src/capture/equip_parser.rs PetKill), emitted to this window as "pet-kill". */
type PetKill = { id: number; lvl: number; exp: number };

const SHOW_MS = 4000;
const LEAVE_MS = 150; // .petPop.isLeaving transition

/** What the card says: level 0 = not unlocked yet (threshold unknown: no denominator, no bar), 1-2 = exp/75, 3 = MAX. */
function petLine(t: T, k: PetKill): { label: string; count: string; fill?: number; max?: boolean } {
  if (k.lvl <= 0) return { label: t("widgetset.petUnlock"), count: String(k.exp) };
  if (k.lvl >= 3) return { label: t("characters.builder.pets.level", { n: 3 }), count: "MAX", fill: 1, max: true };
  const exp = Math.min(PET_EXP_MAX, k.exp);
  return { label: t("characters.builder.pets.level", { n: k.lvl }), count: `${exp}/${PET_EXP_MAX}`, fill: exp / PET_EXP_MAX };
}

/**
 * What both pet overlays (PetPopup here, BlackMarket's "petmarket") need: the settings followed like the dashboard's,
 * its language and palette, and the creature list with its icons, loaded once for the window's life.
 */
export function usePetWindow() {
  const [settings, setSettings] = useState<Settings>({});
  useEffect(() => {
    invoke<Settings>("get_settings").then(setSettings, () => {}); // the defaults draw it as well
    const stop = listen<{ key: string; value: string }>("setting-changed", ({ payload }) =>
      setSettings((s) => ({ ...s, [payload.key]: String(payload.value) })),
    );
    return () => void stop.then((f) => f(), () => {});
  }, []);
  const lang = initialLanguage(settings[LANGUAGE_SETTING]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => applyPalette(settings), [settings]);
  const list = useGd(() => gd.list("creature"), "creature");
  const icons = useIcons(list.data?.map((r) => r.icon) ?? []);
  return { t: translator(lang), list, icons };
}

/**
 * The pet popup over the game (window "petpop", powermeter.rs open_pet_popup_on_start): always there, transparent and
 * click-through; it draws a card for a few seconds when a kill counts for a collection pet. Another kill of the
 * shown pet updates the count and restarts the time; another pet takes the card. Nothing is stacked.
 */
export function PetPopup() {
  const { t, list, icons } = usePetWindow();
  const [kill, setKill] = useState<PetKill>();
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const clear = () => timers.current.splice(0).forEach(clearTimeout);
    const stopKills = listen<PetKill[]>("pet-kill", ({ payload }) => {
      // Several kills in one tick: a pet reaching MAX wins, otherwise the latest.
      const last = payload.find((k) => k.lvl >= 3) ?? payload[payload.length - 1];
      if (!last) return;
      clear(); // a kill during the leave keeps the card
      setKill(last);
      setLeaving(false);
      timers.current.push(
        window.setTimeout(() => {
          setLeaving(true);
          timers.current.push(window.setTimeout(() => setKill(undefined), LEAVE_MS));
        }, SHOW_MS),
      );
    });
    return () => {
      clear();
      stopKills.then((f) => f(), () => {});
    };
  }, []);

  const code = kill && (PET_IDS as Record<string, string>)[String(kill.id)];
  const row = code ? list.data?.find((r) => r.id === code) : undefined;

  // The status region stays mounted, so the reader hears each new card.
  return (
    <div role="status" aria-live="polite">
        {/* Keyed by pet and level: another pet, or a level up (the bar back to the start), enters as a new card
            instead of swapping its text in place and running the bar backwards. */}
        {kill && <PetCard key={`${kill.id}:${kill.lvl}`} t={t} kill={kill} leaving={leaving} row={row} icon={row?.icon ? icons[row.icon] : undefined} />}
    </div>
  );
}

function PetCard({ t, kill, leaving, row, icon }: { t: T; kill: PetKill; leaving: boolean; row?: ListRow; icon?: string }) {
  const line = petLine(t, kill);

  // The count ticks when it changes (same pet, one more kill), not when the card first opens.
  const count = useRef<HTMLSpanElement>(null);
  const shown = useRef(line.count);
  useEffect(() => {
    if (shown.current === line.count) return;
    shown.current = line.count;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    count.current?.animate([{ transform: "translateY(3px)", opacity: 0.5 }, { transform: "none", opacity: 1 }], {
      duration: 200,
      easing: "cubic-bezier(0.23, 1, 0.32, 1)",
    });
  }, [line.count]);

  return (
    <div className={`petPop${leaving ? " isLeaving" : ""}${line.max ? " isMax" : ""}`}>
      <GameIcon url={icon} grade={row?.grade} size={40} glyph={<PawPrintIcon />} />
      <div className="petPopText">
        <span className="petPopName">{row?.name ?? t("characters.builder.tab.pet")}</span>
        <span className="petPopLabel">{line.label}</span>
      </div>
      <span ref={count} className="petPopCount">
        {line.count}
      </span>
      {line.fill !== undefined && <span className="petPopBar" style={{ transform: `scaleX(${line.fill})` }} aria-hidden="true" />}
    </div>
  );
}
