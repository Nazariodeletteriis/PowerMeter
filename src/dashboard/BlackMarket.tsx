import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { PawPrintIcon } from "@phosphor-icons/react";
import type { IconUrls, ListRow } from "../data/db/types";
import type { T } from "./i18n";
import { GameIcon } from "./pages/world/db";
import { PET_EXP_MAX, petsFromGame, type PetSet } from "./pages/characters/calc";
import { loadPoints, petSpots, type MapPoints } from "./pages/world/points";
import PET_IDS from "../data/pet_ids.json";
import PET_ITEMS from "../data/pet_items.json";

/**
 * Spots on the map (all maps summed) under which a pet counts as hard to farm. 0 = only bosses, dungeons or events
 * (58 pets of 207); among the others, under 15 spots is roughly the rarest 10%.
 */
const HARD_SPOTS = 15;
const SHOW_MS = 60_000; // the shop sends no "closed": the panel stays this long after the last list
const ALL_MAX_MS = 4000; // the "all at MAX" line goes sooner, like the kill card
const LEAVE_MS = 150; // .bmPanel.isLeaving / .bmRow.isLeaving transition
const MAX_ROWS = 10; // 10 rows of 42px fit under the kill card in the 360x560 window

const ITEM_PET = PET_ITEMS as Record<string, string>;
const spotCount = (points: MapPoints, code: string) => Object.values(petSpots(points, code)).reduce((n, s) => n + s.length, 0);
const loadPets = () =>
  invoke<{ pets?: { id: number; lvl: number; exp: number }[] }>("get_captured_character").then((c) =>
    petsFromGame(c.pets ?? [], PET_IDS as Record<string, string>),
  );

/**
 * The Black Market panel under the kill card. lib.rs's tick sends "black-market" with the pets on sale (item ids)
 * when a shop tab opens, and again without the one just bought. It lists those not at MAX yet, hard to farm first.
 */
export function BlackMarket({ t, creatures, icons }: { t: T; creatures?: ListRow[]; icons: IconUrls }) {
  const [items, setItems] = useState<number[]>();
  const [bought, setBought] = useState<number>(); // the item just bought: its row leaves instead of vanishing
  const [leaving, setLeaving] = useState(false);
  const [owned, setOwned] = useState<PetSet>();
  const [points, setPoints] = useState<MapPoints>();
  const shown = useRef<number[]>(undefined);

  useEffect(() => {
    const refresh = () => loadPets().then(setOwned, () => setOwned((o) => o ?? {}));
    const stopMarket = listen<number[]>("black-market", ({ payload }) => {
      const prev = shown.current;
      // The same list less one item is a purchase.
      const sold = prev && payload.length === prev.length - 1 && payload.every((id) => prev.includes(id));
      shown.current = payload;
      setBought(sold ? prev.find((id) => !payload.includes(id)) : undefined);
      setItems(payload);
      setLeaving(false);
      refresh();
      loadPoints().then(setPoints, () => {});
    });
    // A purchase adds exp to the pet bought, a kill to some pet: the counts stay current while the panel is up.
    const stopKills = listen("pet-kill", () => shown.current && refresh());
    return () => {
      for (const stop of [stopMarket, stopKills])
        stop.then(
          (f) => f(),
          () => {},
        );
    };
  }, []);

  useEffect(() => {
    if (bought === undefined) return;
    const id = window.setTimeout(() => setBought(undefined), LEAVE_MS);
    return () => clearTimeout(id);
  }, [bought]);

  // The bought item stays in its place for its exit; the rest: one row per pet, not at MAX, hard first, then lowest level.
  const pets = useMemo(() => {
    if (!items || !owned || !points) return undefined;
    const out = new Map<string, { code: string; lvl: number; exp: number; hard: boolean; gone: boolean }>();
    for (const id of bought === undefined ? items : [...items, bought]) {
      const code = ITEM_PET[String(id)];
      const gone = id === bought;
      if (!code || out.has(code) || (!gone && owned[code]?.lvl === 3)) continue;
      out.set(code, {
        code,
        lvl: owned[code]?.lvl ?? 0,
        exp: owned[code]?.exp ?? 0,
        hard: spotCount(points, code) < HARD_SPOTS,
        gone,
      });
    }
    return [...out.values()].sort((a, b) => Number(b.hard) - Number(a.hard) || a.lvl - b.lvl);
  }, [items, bought, owned, points]);
  const empty = !!pets && !pets.some((p) => !p.gone);

  // Every new list rearms the time.
  useEffect(() => {
    if (!items) return;
    const id = window.setTimeout(() => setLeaving(true), empty ? ALL_MAX_MS : SHOW_MS);
    return () => clearTimeout(id);
  }, [items, empty]);
  useEffect(() => {
    if (!leaving) return;
    const id = window.setTimeout(() => {
      shown.current = undefined;
      setItems(undefined);
    }, LEAVE_MS);
    return () => clearTimeout(id);
  }, [leaving]);

  return (
    <div aria-live="polite">
      {/* Nothing left on sale (the last pet bought): no "all at MAX" line, the panel goes. */}
      {pets && (items?.length || bought !== undefined) && (
        <section className={`bmPanel${leaving ? " isLeaving" : ""}`} aria-labelledby="bmTitle">
          <h2 id="bmTitle" className="bmTitle">
            {t("widgetset.blackMarket")}
          </h2>
          {empty && bought === undefined ? (
            <p className="bmEmpty">{t("widgetset.petMarketAllMax")}</p>
          ) : (
            <ul className="bmList">
              {pets.slice(0, MAX_ROWS).map((p, i) => {
                const row = creatures?.find((r) => r.id === p.code);
                return (
                  <li key={p.code} className={`bmRow${p.gone ? " isLeaving" : ""}`} style={{ "--i": i } as CSSProperties}>
                    <GameIcon url={row?.icon ? icons[row.icon] : undefined} grade={row?.grade} size={32} glyph={<PawPrintIcon />} />
                    <span className="bmText">
                      <span className="bmName">{row?.name ?? t("characters.builder.tab.pet")}</span>
                      {p.hard && <span className="bmHard">{t("widgetset.petHard")}</span>}
                    </span>
                    <span className="bmLevel">
                      {p.lvl ? (
                        <span className="bmCount">{`${Math.min(PET_EXP_MAX, p.exp)}/${PET_EXP_MAX}`}</span>
                      ) : (
                        <span className="bmLocked">{t("widgetset.petLocked")}</span>
                      )}
                      <span
                        className="bmPips"
                        {...(p.lvl
                          ? {
                              role: "img",
                              "aria-label": t("characters.builder.pets.level", {
                                n: p.lvl,
                              }),
                            }
                          : { "aria-hidden": true })}
                      >
                        {[1, 2, 3].map((n) => (
                          <span key={n} className={n <= p.lvl ? "isOn" : undefined} />
                        ))}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
