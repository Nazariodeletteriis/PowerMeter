import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  ArrowsInIcon,
  ArrowsOutIcon,
  CrosshairIcon,
  CubeIcon,
  DiamondIcon,
  FlagIcon,
  HouseIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  PawPrintIcon,
  PolygonIcon,
  SealIcon,
  SwordIcon,
  XIcon,
  type Icon,
} from "@phosphor-icons/react";
import type { Settings } from "../../App";
import { activeId, readCharacters } from "../../characters";
import type { T } from "../../i18n";
import { ownedPets } from "../characters/calc";
import { PetGrid } from "../characters/pets";
import { CAPTURED_PETS_KEY, PETS_KEY, readPets } from "../characters/shared";
import { gd, useGd, useIcons } from "./db";
import { MAP_LICENSE, MAP_SOURCE, MAP_TYPES, MAPS, MapView, type MapData, type MapFocus } from "./MapView";
import { GATHER_GROUPS, gatherIcon, loadPoints, MAP_FOCUS_KEY, petSpots, takeMapFocus, type PetFocus } from "./points";

const FOUND_KEY = "pm.map.found";
/** Layers switched off (layer key → true); gathering starts off: thousands of nodes. */
const HIDDEN_KEY = "pm.map.hidden";
/** Pets picked in the pet panel (creature codes), and "every pet I'm missing" when none is picked. */
const PETS_PICKED_KEY = "pm.map.pets";
const PETS_ALL_KEY = "pm.map.petsAll";
const PET_COLOR = "#E86FB8";

// Subtype → icon, color (world.layer.<subtype> labels the layer).
const LAYERS: Record<string, [Icon, string]> = {
  teleport: [LightningIcon, "#E8B03A"],
  village: [HouseIcon, "#EAE3D2"],
  seal: [SealIcon, "#6CC46A"],
  battlefield: [SwordIcon, "#FF4D4D"],
  occupation: [FlagIcon, "#E8833A"],
  monolithMaterial: [DiamondIcon, "#4F93EA"],
  hiddenCube: [CubeIcon, "#5FC8D8"],
};
// Subtypes the game lets you complete.
const COMPLETABLE = new Set(["seal", "occupation", "monolithMaterial"]);

type Marker = { type: string; x: number; y: number; region: string; label: string; id: string };

const markersOf = (m: MapData): Marker[] =>
  m.markers.map(([type, x, y, region, label, id]) => ({
    type: MAP_TYPES[type as number],
    x: x as number,
    y: y as number,
    region: m.regions[region as number]?.name ?? "",
    label: label as string,
    id: id as string,
  }));

/** localStorage value kept in state; anything unreadable falls back to `init`. */
function useStored<V>(key: string, init: V) {
  const [value, setValue] = useState<V>(() => {
    try {
      return (JSON.parse(localStorage.getItem(key) ?? "null") as V) ?? init;
    } catch {
      return init; // hand-edited
    }
  });
  const set = (next: V | ((v: V) => V)) =>
    setValue((v) => {
      const n = next instanceof Function ? next(v) : next;
      localStorage.setItem(key, JSON.stringify(n));
      return n;
    });
  return [value, set] as const;
}

const label: CSSProperties = { fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--pm-t3)", margin: "8px 0 4px" };

/**
 * The world map with its layers (aion2-interactive-map markers, gathering nodes, pet spots), the pet panel and
 * full screen. Used by the Map page and by the Map window. `takeFocus`: this one answers "Show on map" (showOnMap).
 * `fill`: the map takes its parent's height instead of the page's. `extra`: more buttons in the top-right row.
 */
export function MapExplorer({
  t,
  settings,
  run,
  takeFocus,
  fill,
  extra,
}: {
  t: T;
  settings: Settings;
  run: (action: () => Promise<unknown>) => void;
  takeFocus?: boolean;
  fill?: boolean;
  extra?: ReactNode;
}) {
  const [mapId, setMapId] = useState(MAPS[0].id);
  const map = MAPS.find((m) => m.id === mapId)!;
  const markers = useMemo(() => markersOf(map), [map]);
  const [hidden, setHidden] = useStored<Record<string, boolean>>(HIDDEN_KEY, Object.fromEntries(GATHER_GROUPS.map((g) => [g, true])));
  const [marker, setMarker] = useState<Marker | null>(null);
  const [borders, setBorders] = useState(true);
  const [found, setFound] = useStored<string[]>(FOUND_KEY, []);
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState<MapFocus>();
  const [full, setFull] = useState(false);
  const [panel, setPanel] = useState(false);
  const [picked, setPicked] = useStored<string[]>(PETS_PICKED_KEY, []);
  const [allMissing, setAllMissing] = useStored<boolean>(PETS_ALL_KEY, false);
  const [tip, setTip] = useState<{ x: number; y: number; name: string; lvl: number | null }>();
  // Pet to frame once the points are loaded (from "Show on map", or a row of the pet panel).
  const [frameOn, setFrameOn] = useState<string>();
  const [focusChar, setFocusChar] = useState<string>();
  const points = useGd(loadPoints, "points").data;
  const w = map.tiles[0] * map.tile;
  const h = map.tiles[1] * map.tile;

  // The character whose pets count: the one "Show on map" came from, else the active one.
  const chars = readCharacters(settings);
  const char = chars.some((c) => c.id === focusChar) ? focusChar : activeId(settings, chars);
  const owned = char ? ownedPets(readPets(settings[PETS_KEY])[char]?.owned ?? {}, readPets(settings[CAPTURED_PETS_KEY])[char]?.owned) : {};
  const done = (code: string) => owned[code]?.lvl === 3;

  const creatures = useGd(() => gd.list("creature"), "creature");
  const nameOf = (code: string) => creatures.data?.find((r) => r.id === code)?.name ?? code;
  const icons = useIcons(panel ? (creatures.data ?? []).map((r) => r.icon) : []);

  const toggleFound = (id: string) => setFound(found.includes(id) ? found.filter((f) => f !== id) : [...found, id]);
  const toggleLayer = (id: string) => setHidden({ ...hidden, [id]: !hidden[id] });

  const link = (url: string) => (e: MouseEvent) => {
    e.preventDefault();
    run(() => openUrl(url));
  };

  // "Show on map" from the Builder: this pet only, on its map, with the panel open.
  useEffect(() => {
    if (!takeFocus) return;
    const apply = (f?: PetFocus) => {
      if (!f) return;
      setPicked([f.pet]);
      setFocusChar(f.char);
      setHidden((h) => ({ ...h, pet: false }));
      setPanel(true);
      setFrameOn(f.pet);
    };
    apply(takeMapFocus());
    const onStorage = (e: StorageEvent) => {
      if (e.key === MAP_FOCUS_KEY && e.newValue) apply(takeMapFocus(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [takeFocus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Frame a pet: the map with most of its spots, zoomed on them.
  useEffect(() => {
    if (!points || !frameOn) return;
    setFrameOn(undefined);
    const spots = Object.entries(petSpots(points, frameOn)).sort((a, b) => b[1].length - a[1].length)[0];
    if (!spots) return;
    const [id, list] = spots;
    const xs = list.map((s) => s[1]);
    const ys = list.map((s) => s[2]);
    setMapId(id);
    setMarker(null);
    setFocus({ key: `${frameOn}|${Date.now()}`, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] });
  }, [points, frameOn]);

  // Full screen: the window, and the map over everything in it. Esc leaves.
  const setFullscreen = (on: boolean) =>
    run(async () => {
      await getCurrentWindow().setFullscreen(on);
      setFull(on);
    });
  useEffect(() => {
    if (!full) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setFullscreen(false);
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [full]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => void getCurrentWindow().setFullscreen(false).catch(() => {}), []); // leaving the page while full

  // Named places keep their English game name; the rest use the type
  // (world.marker.<subtype>), plus the number monoliths carry.
  const title = (m: Marker) => {
    const type = t(`world.marker.${m.type}`);
    if (m.type === "monolithMaterial") return m.label ? `${type} ${m.label}` : type;
    return m.label || type;
  };

  const counts: Record<string, number> = {};
  for (const m of markers) counts[m.type] = (counts[m.type] ?? 0) + 1;
  const query = q.trim().toLowerCase();
  const shown = markers.filter(
    (m) => !hidden[m.type] && (!query || `${title(m)} ${m.region} ${t(`world.layer.${m.type}`)}`.toLowerCase().includes(query)),
  );
  const monoliths = markers.filter((m) => m.type === "monolithMaterial");
  const monolithsFound = monoliths.filter((m) => found.includes(m.id)).length;

  // Gathering nodes of this map, by group.
  const gather = points?.maps[map.id]?.gather ?? [];
  const gatherCounts: Record<string, number> = {};
  for (let i = 0; i < gather.length; i += 3) {
    const g = points!.groups[gather[i]];
    gatherCounts[g] = (gatherCounts[g] ?? 0) + 1;
  }

  // Pet spots: the picked pets, else (if asked) every pet; completed ones (level 3) never.
  const petCodes = points ? (picked.length ? picked : allMissing ? Object.keys(points.pets) : []).filter((c) => !done(c)) : [];
  const petKey = petCodes.join("|");
  const dots = useMemo(() => {
    if (!points) return [];
    const info = new Map<number, [string, number | null]>();
    for (const c of petKey.split("|")) for (const [id, name, lvl] of points.pets[c] ?? []) info.set(id, [name, lvl]);
    const list = points.maps[map.id]?.monsters ?? [];
    const out: { x: number; y: number; name: string; lvl: number | null }[] = [];
    for (let i = 0; i < list.length; i += 3) {
      const m = info.get(list[i]);
      if (m) out.push({ x: list[i + 1], y: list[i + 2], name: m[0], lvl: m[1] });
    }
    return out;
  }, [points, petKey, map.id]);

  const hoverDot = (e: PointerEvent<SVGSVGElement>) => {
    const i = (e.target as Element).getAttribute("data-i");
    setTip(i === null ? undefined : dots[Number(i)]);
  };

  // Status of a picked pet in the panel.
  const petStatus = (code: string) => {
    if (done(code)) return { text: t("world.map.petDone") };
    const spots = points ? petSpots(points, code) : {};
    if (!Object.keys(spots).length) return { text: t("world.map.petNoCoords") };
    if (spots[map.id]) return { text: t("world.map.petHere", { n: spots[map.id].length }), frame: true };
    const other = Object.keys(spots).sort((a, b) => spots[b].length - spots[a].length)[0];
    return { text: t("world.map.petElsewhere", { map: MAPS.find((m) => m.id === other)?.name ?? other }), frame: true };
  };
  const togglePick = (code: string) => setPicked(picked.includes(code) ? picked.filter((c) => c !== code) : [...picked, code]);

  const fullLabel = t(full ? "world.map.exitFullscreen" : "world.map.fullscreen");

  return (
    <div className={fill ? "wExplorer wFill" : "wExplorer"} data-full={full || undefined}>
      <MapView
        t={t}
        map={map}
        focus={focus}
        onBareClick={() => setMarker(null)}
        world={
          <>
            {borders && map.regions.length > 0 && (
              <>
                <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
                  {map.regions.map((r) => r.poly.map((p, i) => <polygon key={r.name + i} points={p.join(" ")} vectorEffect="non-scaling-stroke" />))}
                </svg>
                {map.regions.map((r) => (
                  <div key={r.name} className="wRegion" style={{ left: r.at[0], top: r.at[1] }} aria-hidden="true">
                    {r.name}
                  </div>
                ))}
              </>
            )}
            {points &&
              gather.map((_, i) => {
                if (i % 3) return null;
                const g = points.groups[gather[i]];
                return hidden[g] ? null : <img key={i} className="wGather" src={gatherIcon(g)} alt="" style={{ left: gather[i + 1], top: gather[i + 2] }} />;
              })}
            {shown.map((m) => {
              const [Ic, c] = LAYERS[m.type];
              const name = title(m);
              return (
                <button
                  key={m.id}
                  type="button"
                  className="wMarker"
                  data-found={found.includes(m.id) || undefined}
                  title={name}
                  aria-label={name}
                  style={{ left: m.x, top: m.y, "--c": c } as CSSProperties}
                  onClick={() => setMarker(m)}
                >
                  <Ic aria-hidden="true" />
                </button>
              );
            })}
            {!hidden.pet && dots.length > 0 && (
              // Over the markers: picked pets are what you look for. Spots are read through the pet panel's list; the dots themselves are for the mouse.
              <svg className="wPetDots" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true" onPointerOver={hoverDot} onPointerOut={() => setTip(undefined)}>
                {dots.map((d, i) => (
                  <circle key={i} data-i={i} cx={d.x} cy={d.y} vectorEffect="non-scaling-stroke" />
                ))}
              </svg>
            )}
            {tip && (
              <div className="wTip" style={{ left: tip.x, top: tip.y }} aria-hidden="true">
                {tip.name}
                {tip.lvl != null && <span>{t("world.db.lv", { n: tip.lvl })}</span>}
              </div>
            )}
            {marker && (
              <div key={marker.id} className="wPopup" style={{ left: marker.x, top: marker.y }} role="dialog" aria-label={title(marker)}>
                <div style={{ display: "flex" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{title(marker)}</div>
                    <div style={{ fontSize: 11, color: "var(--pm-t3)" }}>
                      {[marker.label && marker.type !== "monolithMaterial" && t(`world.marker.${marker.type}`), marker.region].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <button type="button" className="close" aria-label={t("world.map.close")} onClick={() => setMarker(null)}>
                    <XIcon aria-hidden="true" />
                  </button>
                </div>
                {COMPLETABLE.has(marker.type) && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" className={found.includes(marker.id) ? "wMapBtn" : "wMapBtn fill"} onClick={() => toggleFound(marker.id)}>
                      {t(found.includes(marker.id) ? "world.map.markNotFound" : "world.map.markFound")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        }
      >
        <div className="wPanel">
          <select
            value={mapId}
            onChange={(e) => {
              setMapId(e.target.value);
              setMarker(null);
              setFocus(undefined);
            }}
            aria-label={t("world.map.zone")}
          >
            {MAPS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <div style={{ ...label, marginTop: 4 }}>{t("world.map.layers")}</div>
          {Object.entries(LAYERS)
            .filter(([id]) => counts[id])
            .map(([id, [Ic, c]]) => (
              <button key={id} type="button" className="wBtn wLayer" aria-pressed={!hidden[id]} onClick={() => toggleLayer(id)}>
                <Ic aria-hidden="true" style={{ color: c, fontSize: 15 }} />
                <span style={{ flex: 1 }}>{t(`world.layer.${id}`)}</span>
                <span className="mono" style={{ fontSize: 11, color: "var(--pm-t3)" }}>
                  {counts[id]}
                </span>
              </button>
            ))}
          <button type="button" className="wBtn wLayer" aria-pressed={!hidden.pet} onClick={() => toggleLayer("pet")}>
            <PawPrintIcon aria-hidden="true" style={{ color: PET_COLOR, fontSize: 15 }} />
            <span style={{ flex: 1 }}>{t("world.layer.pet")}</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--pm-t3)" }}>
              {dots.length}
            </span>
          </button>
          {gather.length > 0 && (
            <>
              <div style={label}>{t("world.map.gathering")}</div>
              {GATHER_GROUPS.filter((g) => gatherCounts[g]).map((g) => (
                <button key={g} type="button" className="wBtn wLayer" aria-pressed={!hidden[g]} onClick={() => toggleLayer(g)}>
                  <img src={gatherIcon(g)} alt="" width={18} height={18} />
                  <span style={{ flex: 1 }}>{t(`world.layer.${g}`)}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--pm-t3)" }}>
                    {gatherCounts[g]}
                  </span>
                </button>
              ))}
            </>
          )}
          {monoliths.length > 0 && (
            <div style={{ borderTop: "1px solid var(--pm-line)", marginTop: 8, paddingTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                <span>{t("world.map.monolithsFound")}</span>
                <span className="mono">
                  {monolithsFound}/{monoliths.length}
                </span>
              </div>
              <div style={{ height: 4, background: "var(--pm-s3)", borderRadius: 2 }} aria-hidden="true">
                <div style={{ height: "100%", width: `${(monolithsFound / monoliths.length) * 100}%`, background: "#4F93EA", borderRadius: 2 }} />
              </div>
            </div>
          )}
        </div>

        <div className="wMapTools">
          <label className="wMapSearch">
            <MagnifyingGlassIcon aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("world.map.search")} aria-label={t("world.map.search")} />
          </label>
          {map.regions.length > 0 && (
            <button type="button" className="wRouteBtn" aria-pressed={borders} onClick={() => setBorders(!borders)}>
              <PolygonIcon aria-hidden="true" />
              {t("world.map.regions")}
            </button>
          )}
          <button type="button" className="wRouteBtn" aria-pressed={panel} onClick={() => setPanel(!panel)}>
            <PawPrintIcon aria-hidden="true" />
            {t("world.map.pets")}
          </button>
          {extra}
          <button type="button" className="wRouteBtn wIconBtn" aria-pressed={full} title={fullLabel} aria-label={fullLabel} onClick={() => setFullscreen(!full)}>
            {full ? <ArrowsInIcon aria-hidden="true" /> : <ArrowsOutIcon aria-hidden="true" />}
          </button>
        </div>

        {panel && (
          <section className="wPetPanel" aria-label={t("world.map.pets")}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ flex: 1, fontSize: 14, fontWeight: 500, margin: 0 }}>{t("world.map.pets")}</h2>
              {picked.length > 0 && (
                <button type="button" className="wMapBtn" onClick={() => setPicked([])}>
                  {t("world.map.petsClear")}
                </button>
              )}
              <button type="button" className="close wPanelClose" aria-label={t("world.map.close")} onClick={() => setPanel(false)}>
                <XIcon aria-hidden="true" />
              </button>
            </div>
            <div style={{ fontSize: 12, color: "var(--pm-t2)" }}>{t(char ? "world.map.petsHint" : "world.map.petsNoChar")}</div>
            {picked.length === 0 ? (
              <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
                <input type="checkbox" checked={allMissing} onChange={(e) => setAllMissing(e.target.checked)} />
                {t("world.map.petsAllMissing")}
              </label>
            ) : (
              <ul className="wPetPicked">
                {picked.map((code) => {
                  const s = petStatus(code);
                  return (
                    <li key={code}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameOf(code)}</span>
                        <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{s.text}</span>
                      </span>
                      {s.frame && (
                        <button type="button" className="close" title={t("world.map.petFrame")} aria-label={`${t("world.map.petFrame")}: ${nameOf(code)}`} onClick={() => setFrameOn(code)}>
                          <CrosshairIcon aria-hidden="true" />
                        </button>
                      )}
                      <button type="button" className="close" title={t("world.map.petRemove")} aria-label={`${t("world.map.petRemove")}: ${nameOf(code)}`} onClick={() => togglePick(code)}>
                        <XIcon aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {creatures.data ? (
              <PetGrid t={t} rows={creatures.data} icons={icons} owned={owned} isOn={(id) => picked.includes(id)} onPick={togglePick} />
            ) : (
              <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{creatures.error ?? t("world.db.loading")}</div>
            )}
          </section>
        )}

        {query && shown.length === 0 && <div className="wMapLabel">{t("world.map.noResults", { q: q.trim() })}</div>}
        <div className="wCredit">
          {t("world.map.credit")}{" "}
          <a href={MAP_SOURCE} onClick={link(MAP_SOURCE)}>
            aion2-interactive-map
          </a>
          {" · "}
          <a href={MAP_LICENSE} onClick={link(MAP_LICENSE)}>
            CC BY-NC 4.0
          </a>
          {" · "}
          {t("world.map.creditGame")}
        </div>
      </MapView>
    </div>
  );
}
