// Character Builder "Pet" tab: the creature collection as the game's Pet window shows it (genus menu, cards with
// level and progress, the equipped pet) and the collection's effects. Pets are per roster character: marked here
// (pm.pets) or read from the game (pm.capturedPets, which wins). Effects: each pet's by level (genus tiers of the
// datamine, src/data/pet_genus_effects.json) summed over the collection, and the insight ones read from the game.

import { useRef, useState, type KeyboardEvent } from "react";
import { MapTrifoldIcon, PawPrintIcon, XIcon } from "@phosphor-icons/react";
import type { BuilderData, IconUrls, ListRow, MonsterRegion } from "../../../data/db/types";
import type { T } from "../../i18n";
import type { PageProps } from "../types";
import { Modal } from "../system/Modal";
import { DataState, gd, useGd, useIcons } from "../world/db";
import { loadPoints, petSpots, showOnMap } from "../world/points";
import { ownedPets, petCollection, PET_EXP_MAX, petLevelEffects, petStatKey, type PetEffect, type PetSet, type PetState } from "./calc";
import { CAPTURED_PETS_KEY, PETS_KEY, readPets } from "./shared";

/** Genus menu of the Pet window: the records' creature.genus, in the game's order, with the game's Soul Crystal icons. */
const GENUS = ["Intellect", "Feral", "Nature", "Trans", "Special"] as const;
const GENUS_ART = import.meta.glob<string>("../../../assets/pm/genus/*.png", { eager: true, import: "default" });
const genusArt = (g: string) => GENUS_ART[`../../../assets/pm/genus/${g}.png`];

/** Pets the game counts (163/200): the Special ones are listed but left out of the count. */
const counted = (rows: { id: string; kind?: string | null }[] | undefined, owned: PetSet) => {
  const c = (rows ?? []).filter((r) => r.kind !== "Special");
  return { n: c.filter((r) => owned[r.id]).length, total: c.length };
};

type Props = Pick<PageProps, "t" | "lang" | "settings" | "save" | "onError"> & {
  /** The builder's character; none without a roster. */
  charId?: string;
  /** Stat names (gamedata_builder), for the effects list. */
  stats?: BuilderData["stats"];
};

/** Right rail panel: how many pets the character has, and the button that opens the collection. */
export function PetsTab({ t, lang, settings, save, onError, charId, stats }: Props) {
  const [open, setOpen] = useState(false);
  const all = readPets(settings[PETS_KEY]);
  const manual = (charId && all[charId]?.owned) || {};
  const game = charId ? readPets(settings[CAPTURED_PETS_KEY])[charId] : undefined;
  const owned = ownedPets(manual, game?.owned);
  const list = useGd(() => gd.list("creature"), "creature");
  const setManual = (next: PetSet) => {
    if (!charId) return;
    const rest = Object.fromEntries(Object.entries(all).map(([c, x]) => [c, { owned: x.owned }]));
    save(PETS_KEY, JSON.stringify({ ...rest, [charId]: { owned: next } })).catch(onError);
  };
  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
      <div style={{ fontSize: 13, color: "var(--pm-t2)" }}>
        {charId ? t("characters.builder.pets.owned", { n: list.data ? counted(list.data, owned).n : Object.keys(owned).length }) : t("characters.builder.pets.noChar")}
      </div>
      {game && <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("characters.builder.pets.fromGame")}</div>}
      <button type="button" className="btn sm" disabled={!charId} onClick={() => setOpen(true)}>
        <PawPrintIcon aria-hidden="true" />
        {t("characters.builder.pets.show")}
      </button>
      {open && (
        <PetsModal
          t={t}
          lang={lang}
          manual={manual}
          owned={owned}
          game={game?.owned}
          effects={game?.effects ?? []}
          stats={stats}
          charId={charId}
          setManual={setManual}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function PetsModal({
  t,
  lang,
  manual,
  owned,
  game,
  effects,
  stats,
  charId,
  setManual,
  onClose,
}: Pick<Props, "t" | "lang" | "stats" | "charId"> & {
  manual: PetSet;
  owned: PetSet;
  game?: PetSet;
  effects: PetEffect[];
  setManual: (next: PetSet) => void;
  onClose: () => void;
}) {
  const list = useGd(() => gd.list("creature"), "creature");
  const icons = useIcons(list.data?.map((r) => r.icon) ?? []);
  const [view, setView] = useState<"pets" | "effects">("pets");
  const [sel, setSel] = useState<string>();
  const genusLabel = (g: string) => t(`characters.builder.pets.genus.${g}`);

  // Hand edits: one equipped pet at most; pets read from the game are not edited here (they would win anyway).
  const row = list.data?.find((r) => r.id === sel);
  const fromGame = !!(sel && game?.[sel]);
  const gameEq = Object.values(game ?? {}).some((p) => p.eq);
  const mine = sel ? manual[sel] : undefined;
  const edit = (p?: PetState) => {
    if (!sel) return;
    const next = { ...manual };
    if (p?.eq) for (const [c, x] of Object.entries(next)) if (x.eq) next[c] = { lvl: x.lvl, exp: x.exp };
    if (p) next[sel] = p;
    else delete next[sel];
    setManual(next);
  };
  const withEq = (p: PetState, eq: boolean): PetState => (eq ? { ...p, eq: true } : { lvl: p.lvl, exp: p.exp });
  const shownPet = sel ? owned[sel] : undefined; // the edited values, or the game's

  const names = new Map((stats ?? []).map((s) => [s.stat_key, s.name]));
  const known = new Set(names.keys());
  const collection = petCollection(owned);
  const effectRows = (rows: PetEffect[]) =>
    rows.map(([k, v, pct], i) => (
      <div key={k + i} className="dvRow" style={{ minHeight: 28, fontSize: 13 }}>
        <span>{names.get(k) ?? k}</span>
        <span className="mono" style={{ fontVariantNumeric: "tabular-nums", color: "var(--pm-t1)" }}>
          {v.toLocaleString(lang, { maximumFractionDigits: 2 })}
          {pct ? "%" : ""}
        </span>
      </div>
    ));
  // Effects the Builder does not add to the character's stats (mount ones), listed apart.
  const summedRows = (rows: PetEffect[]) => {
    const apart = rows.filter(([k]) => !petStatKey(k, known));
    return (
      <>
        {effectRows(rows.filter((e) => !apart.includes(e)))}
        {apart.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: "var(--pm-t3)", margin: "16px 0 4px" }}>{t("characters.builder.pets.notSummed")}</div>
            {effectRows(apart)}
          </>
        )}
      </>
    );
  };

  return (
    <Modal
      width={1100}
      onClose={onClose}
      title={(id) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 id={id} style={{ fontSize: 17, fontWeight: 500 }}>
            {t("characters.builder.tab.pet")}
          </h2>
          {list.data && (
            <span className="mono" style={{ fontSize: 12, color: "var(--pm-t3)" }}>
              {t("characters.builder.pets.count", counted(list.data, owned))}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button type="button" className="shareClose" onClick={onClose} title={t("window.close")} aria-label={t("window.close")}>
            <XIcon aria-hidden="true" />
          </button>
        </div>
      )}
    >
      <div className="chSeg" role="group" aria-label={t("characters.builder.tab.pet")} style={{ alignSelf: "flex-start" }}>
        {(["pets", "effects"] as const).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
            {t(`characters.builder.pets.view.${v}`)}
          </button>
        ))}
      </div>

      {view === "effects" && (
        <div className="petFx">
          <section aria-labelledby="petFxCollection">
            <h3 id="petFxCollection">{t("characters.builder.pets.collection")}</h3>
            <p>{t("characters.builder.pets.collectionNote")}</p>
            {collection.length === 0 ? (
              <p style={{ color: "var(--pm-t2)" }}>{t("characters.builder.pets.collectionEmpty")}</p>
            ) : (
              <>
                <h4>{t("characters.builder.pets.total")}</h4>
                {summedRows(collection)}
                {GENUS.map((g) => {
                  const rows = petCollection(owned, g);
                  return (
                    rows.length > 0 && (
                      <div key={g}>
                        <h4>
                          <img src={genusArt(g)} alt="" />
                          {genusLabel(g)}
                        </h4>
                        {effectRows(rows)}
                      </div>
                    )
                  );
                })}
              </>
            )}
          </section>
          <section aria-labelledby="petFxInsight">
            <h3 id="petFxInsight">{t("characters.builder.pets.insight")}</h3>
            <p>{t("characters.builder.pets.insightNote")}</p>
            {effects.length === 0 ? (
              <div style={{ color: "var(--pm-t2)" }}>
                <div style={{ fontSize: 14, color: "var(--pm-t1)", marginBottom: 4 }}>{t("characters.builder.pets.effectsEmptyTitle")}</div>
                {t("characters.builder.pets.effectsEmpty")}
              </div>
            ) : (
              summedRows(effects)
            )}
          </section>
        </div>
      )}

      {view === "pets" && !list.data && <DataState t={t} error={list.error} retry={list.retry} />}
      {view === "pets" && list.data && (
        <>
          <PetGrid t={t} rows={list.data} icons={icons} owned={owned} isOn={(id) => sel === id} onPick={setSel} />

          {/* Editor of the selected card: under the grid, Tab reaches it after one card. */}
          <div className="petEdit">
            {!row ? (
              <span style={{ color: "var(--pm-t3)", alignSelf: "center" }}>{t("characters.builder.pets.pickHint")}</span>
            ) : (
              <>
                <div style={{ minWidth: 160, maxWidth: 240 }}>
                  <div style={{ fontSize: 14, color: "var(--pm-t1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name ?? row.id}</div>
                  <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{row.kind ? genusLabel(row.kind) : ""}</div>
                </div>
                <div className="field">
                  {t("characters.builder.pets.state")}
                  <div className="chSeg" role="group" aria-label={t("characters.builder.pets.state")}>
                    {([0, 1, 2, 3] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        aria-pressed={(shownPet?.lvl ?? 0) === l}
                        disabled={fromGame}
                        onClick={() => edit(l ? withEq({ lvl: l, exp: l === 3 ? 0 : (mine?.exp ?? 0) }, !!mine?.eq) : undefined)}
                      >
                        {l ? t("characters.builder.pets.level", { n: l }) : t("characters.builder.pets.notOwned")}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="field" style={{ margin: 0 }}>
                  {t("characters.builder.pets.progress", { max: PET_EXP_MAX })}
                  <input
                    className="input sm"
                    type="number"
                    min={0}
                    max={PET_EXP_MAX}
                    style={{ width: 80 }}
                    disabled={fromGame || !mine || mine.lvl === 3}
                    value={shownPet && shownPet.lvl < 3 ? shownPet.exp : ""}
                    onChange={(e) => mine && edit({ ...mine, exp: Math.min(PET_EXP_MAX, Math.max(0, Math.round(Number(e.target.value) || 0))) })}
                  />
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", height: 30, fontSize: 12, color: "var(--pm-t2)", cursor: "pointer" }}>
                  <input type="checkbox" checked={!!shownPet?.eq} disabled={fromGame || gameEq || !mine} onChange={(e) => mine && edit(withEq(mine, e.target.checked))} />
                  {t("characters.builder.pets.equipped")}
                </label>
                {(fromGame || (gameEq && mine)) && (
                  <span style={{ fontSize: 12, color: "var(--pm-t3)", alignSelf: "center", flexBasis: "100%" }}>{t("characters.builder.pets.gameNote")}</span>
                )}
                <div className="petTiers" role="list" aria-label={t("characters.builder.pets.levelEffects")}>
                  {([1, 2, 3] as const).map((l) => {
                    const fx = petLevelEffects(row.id, l);
                    const on = shownPet?.lvl === l;
                    return (
                      <div key={l} role="listitem" className="petTier" aria-current={on || undefined}>
                        <div className="petTierHead">
                          {t("characters.builder.pets.level", { n: l })}
                          {on && <span className="srOnly"> ({t("characters.builder.pets.reached")})</span>}
                        </div>
                        {fx.length ? (
                          fx.map(([k, v, pct]) => (
                            <span key={k}>
                              {names.get(k) ?? k} <span className="mono">{v.toLocaleString(lang, { maximumFractionDigits: 2 })}{pct ? "%" : ""}</span>
                            </span>
                          ))
                        ) : (
                          <span>{t("characters.builder.pets.noEffects")}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <PetLocation key={row.id} t={t} code={row.id} charId={charId} />
              </>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}

/**
 * Genus menu and pet cards of the game's Pet window, shared by the Builder's Pet modal (one card picked, to edit)
 * and the Map's pet panel (several picked, to show on the map). `isOn`: whether a card is pressed.
 */
export function PetGrid({
  t,
  rows,
  icons,
  owned,
  isOn,
  onPick,
}: {
  t: T;
  rows: ListRow[];
  icons: IconUrls;
  owned: PetSet;
  isOn: (id: string) => boolean;
  onPick: (id: string) => void;
}) {
  const [genus, setGenus] = useState("");
  const grid = useRef<HTMLDivElement>(null);
  const shown = rows.filter((r) => !genus || r.kind === genus);
  // One card in the Tab order (the first pressed one, else the first); arrows move between cards.
  const tabStop = (shown.find((r) => isOn(r.id)) ?? shown[0])?.id;
  const genusLabel = (g: string) => t(`characters.builder.pets.genus.${g}`);
  const statusOf = (p?: PetState) =>
    !p
      ? t("characters.builder.pets.notOwned")
      : [t("characters.builder.pets.level", { n: p.lvl }), p.lvl < 3 ? `${p.exp}/${PET_EXP_MAX}` : "MAX", p.eq ? t("characters.builder.pets.equipped") : ""].filter(Boolean).join(", ");

  const move = (e: KeyboardEvent<HTMLDivElement>) => {
    const cards = [...(grid.current?.querySelectorAll<HTMLButtonElement>(".petCard") ?? [])];
    const i = cards.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0 || !grid.current) return;
    const cols = getComputedStyle(grid.current).gridTemplateColumns.split(" ").length;
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols, Home: -i, End: cards.length - 1 - i };
    const to = cards[i + (step[e.key] ?? NaN)];
    if (!to) return;
    e.preventDefault();
    to.focus();
  };

  return (
    <div style={{ display: "flex", gap: 12, minHeight: 0 }}>
      <div className="petRail" role="group" aria-label={t("characters.builder.pets.genusLabel")} style={{ display: "flex", flexDirection: "column", gap: 4, flex: "none" }}>
        <button type="button" className="chRailBtn petAll" aria-pressed={!genus} onClick={() => setGenus("")}>
          {t("characters.builder.pets.all")}
        </button>
        {GENUS.map((g) => (
          <button key={g} type="button" className="chRailBtn petGenus" aria-pressed={genus === g} aria-label={genusLabel(g)} data-tip={genusLabel(g)} onClick={() => setGenus(g)}>
            <img src={genusArt(g)} alt="" />
          </button>
        ))}
      </div>
      <div ref={grid} className="petGrid" role="group" aria-label={genus ? genusLabel(genus) : t("characters.builder.pets.all")} onKeyDown={move}>
        {shown.map((r) => {
          const p = owned[r.id];
          const url = r.icon ? icons[r.icon] : undefined;
          return (
            <button
              key={r.id}
              type="button"
              className="chBtnReset petCard"
              data-owned={p ? "" : undefined}
              data-eq={p?.eq ? "" : undefined}
              aria-pressed={isOn(r.id)}
              aria-label={`${r.name ?? r.id}: ${statusOf(p)}`}
              tabIndex={r.id === tabStop ? 0 : -1}
              onClick={() => onPick(r.id)}
            >
              <span className="petArt">
                {url ? <img src={url} alt="" loading="lazy" /> : <PawPrintIcon aria-hidden="true" style={{ fontSize: 28, color: "var(--pm-grey)" }} />}
                {p?.eq && <span className="petEq">{t("characters.builder.pets.equipped")}</span>}
              </span>
              <span className="petName">{r.name ?? r.id}</span>
              <span className="petFoot">
                {p ? (
                  <>
                    <span className="petLvl" data-max={p.lvl === 3 ? "" : undefined}>
                      {p.lvl}
                    </span>
                    {p.lvl === 3 ? (
                      <span className="petMax">MAX</span>
                    ) : (
                      <span className="petExp">
                        <span className="mono">
                          {p.exp}/{PET_EXP_MAX}
                        </span>
                        <span className="petBar">
                          <span style={{ transform: `scaleX(${p.exp / PET_EXP_MAX})` }} />
                        </span>
                      </span>
                    )}
                  </>
                ) : (
                  <span>{t("characters.builder.pets.notOwned")}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Where a pet lives: zones of its monsters (archive monster_regions), and the Map window on its spots. */
function PetLocation({ t, code, charId }: { t: T; code: string; charId?: string }) {
  const points = useGd(loadPoints, "points").data;
  const monsters = points?.pets[code] ?? [];
  const ids = monsters.map(([id]) => String(id));
  const rows = useGd(() => Promise.all(ids.map((id) => gd.rows<MonsterRegion>("monster_regions", "monster_id", id))).then((r) => r.flat()), ids.join("|"));
  const byMap = new Map<string, Set<string>>();
  for (const r of rows.data ?? []) if (r.map_name) {
    const set = byMap.get(r.map_name) ?? new Set<string>();
    if (r.region) set.add(r.region);
    byMap.set(r.map_name, set);
  }
  const spots = !!points && Object.keys(petSpots(points, code)).length > 0;
  const [error, setError] = useState<string>();

  const status = !points || (ids.length > 0 && rows.data === undefined && !rows.error) ? t("world.db.loading") : byMap.size === 0 ? t("characters.builder.pets.noLocation") : "";

  // One wrapped row under the editor: the grid above keeps its height.
  return (
    <div style={{ flexBasis: "100%", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, borderTop: "1px solid var(--pm-line)", paddingTop: 8, fontSize: 13 }}>
      <span style={{ fontSize: 12, color: "var(--pm-t2)", marginRight: 4 }}>{t("characters.builder.pets.location")}</span>
      {status && <span style={{ color: "var(--pm-t3)" }}>{status}</span>}
      {!status &&
        [...byMap].map(([map, regions]) => (
          <span key={map} style={{ display: "inline-flex", flexWrap: "wrap", alignItems: "center", gap: 5, marginRight: 8 }}>
            <span style={{ fontWeight: 500 }}>{map}</span>
            {[...regions].map((r) => (
              <span key={r} className="wTag">
                {r}
              </span>
            ))}
          </span>
        ))}
      {points && !spots && byMap.size > 0 && <span style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("characters.builder.pets.noCoords")}</span>}
      {(rows.error || error) && <span className="error">{rows.error ?? error}</span>}
      {spots && (
        <button type="button" className="btn sm" style={{ marginLeft: "auto" }} onClick={() => showOnMap({ pet: code, char: charId }).catch((e) => setError(String(e)))}>
          <MapTrifoldIcon aria-hidden="true" />
          {t("characters.builder.pets.showOnMap")}
        </button>
      )}
    </div>
  );
}
