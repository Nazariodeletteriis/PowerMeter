import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
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
import { activeId, readCharacters, type Faction } from "../../characters";
import type { T } from "../../i18n";
import { usePoll } from "../../usePoll";
import { ownedPets } from "../characters/calc";
import { PetGrid } from "../characters/pets";
import { CAPTURED_PETS_KEY, PETS_KEY, readPets } from "../characters/shared";
import { gd, useGd, useIcons } from "./db";
import { MAP_LICENSE, MAP_SOURCE, MAP_TYPES, MAPS, MapView, type MapData, type MapFocus } from "./MapView";
import { GAME_MAPS, toPixel } from "./cubes";
import CUBE_SPOTS from "../../../data/map/cubes.json";
import { AllNone, MiniChrome, type GatherGroup, type LayerRow } from "./Minimap";
import { gatherIcon, loadPoints, MAP_FOCUS_KEY, petSpots, takeMapFocus, type PetFocus } from "./points";

const FOUND_KEY = "pm.map.found";
/** Layers switched off (layer key → true). */
const HIDDEN_KEY = "pm.map.hidden";
/** Gathering resources switched on (resource keys): they start off, thousands of nodes. */
const GATHER_ON_KEY = "pm.map.gather";
/** Minimap: the map's opacity, and the markers' ("Path Opacity", the game's name for its roads layer). */
const MAP_OPACITY_KEY = "pm.map.mapOpacity";
const PATH_OPACITY_KEY = "pm.map.pathOpacity";
/** Pets picked in the pet panel (creature codes), and "every pet I'm missing" when none is picked. */
const PETS_PICKED_KEY = "pm.map.pets";
const PETS_ALL_KEY = "pm.map.petsAll";
const PET_COLOR = "#E86FB8";
/** The map a character of each faction opens on. */
export const HOME_MAP: Record<Faction, string> = { elyos: "World_L_A", asmodian: "World_D_A" };
const CUBES_SOURCE = "https://github.com/SkeeveAN/Aion-DPS-Meter";
const HALF: Record<string, number> = Object.fromEntries(Object.values(GAME_MAPS));
/** `cubes`: the hidden cubes standing near you now, game units (they show up within sight only). */
export const getPlayerPosition = () => invoke<{ pos: [number, number, number] | null; map: number | null; cubes: [number, number][] }>("get_player_position");

// Subtype → icon, color (world.layer.<subtype> labels the layer).
export const LAYERS: Record<string, [Icon, string]> = {
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

/**
 * Hidden cubes: every spot the game can spawn one on (cubes.json: map → [x, y, region], map pixels), from
 * Aion-DPS-Meter (MIT, cubes.LICENSE). They stand in for the source's hiddenCube markers, placed by hand: 91% of
 * those lie within 20 m of one of these, 41% within 5 m.
 */
const cubeSpots: Record<string, number[][]> = CUBE_SPOTS;

export const markersOf = (m: MapData): Marker[] => [
  ...m.markers.filter(([type]) => MAP_TYPES[type as number] !== "hiddenCube").map(([type, x, y, region, label, id]) => ({
    type: MAP_TYPES[type as number],
    x: x as number,
    y: y as number,
    region: m.regions[region as number]?.name ?? "",
    label: label as string,
    id: id as string,
  })),
  ...(cubeSpots[m.id] ?? []).map(([x, y, region], i) => ({ type: "hiddenCube", x, y, region: m.regions[region]?.name ?? "", label: "", id: `cube${i}` })),
];

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
 * You, where the game last placed you: it moves on teleports and on your own casts, not while you walk
 * (the rest is encrypted). Polled in here so the rest of the map doesn't re-render with it.
 */
function You({ t, map, home, onMap }: { t: T; map: MapData; home?: string; onMap: (id?: string) => void }) {
  const at = usePoll(getPlayerPosition, 2000).data;
  // The map the game says you are on ("" = one we can't draw on); none seen yet: your faction's.
  const where = at?.map == null ? undefined : (GAME_MAPS[at.map]?.[0] ?? "");
  useEffect(() => onMap(where || undefined), [where]); // eslint-disable-line react-hooks/exhaustive-deps
  const pos = at?.pos;
  const half = HALF[map.id];
  if (!half || (where ?? home ?? map.id) !== map.id) return null;
  const w = map.tiles[0] * map.tile;
  const h = map.tiles[1] * map.tile;
  const name = t("world.map.you");
  const cube = t("world.map.liveCube");
  return (
    <>
      {at?.cubes.map(([x, y]) => (
        <div key={`${x},${y}`} className="wLiveCube" role="img" title={cube} aria-label={cube} style={{ left: toPixel(x, half, w), top: toPixel(y, half, h) }} />
      ))}
      {pos && <div className="wYou" role="img" title={name} aria-label={name} style={{ left: toPixel(pos[0], half, w), top: toPixel(pos[1], half, h) }} />}
    </>
  );
}

/**
 * The world map with its layers (aion2-interactive-map markers, gathering nodes, pet spots), the pet panel and
 * full screen. Used by the Map page and by the Map window. `takeFocus`: this one answers "Show on map" (showOnMap).
 * `fill`: the map takes its parent's height instead of the page's. `extra`: more buttons in the top-right row.
 * `mini`: the minimap (Map window), with its own controls (Minimap.tsx) until it goes full screen.
 */
export function MapExplorer({
  t,
  settings,
  run,
  takeFocus,
  fill,
  extra,
  mini,
}: {
  t: T;
  settings: Settings;
  run: (action: () => Promise<unknown>) => void;
  takeFocus?: boolean;
  fill?: boolean;
  extra?: ReactNode;
  mini?: boolean;
}) {
  const [mapId, setMapId] = useState(MAPS[0].id);
  const map = MAPS.find((m) => m.id === mapId)!;
  const markers = useMemo(() => markersOf(map), [map]);
  const [hidden, setHidden] = useStored<Record<string, boolean>>(HIDDEN_KEY, {});
  const [gatherOn, setGatherOn] = useStored<string[]>(GATHER_ON_KEY, []);
  const [mapOpacity, setMapOpacity] = useStored<number>(MAP_OPACITY_KEY, 0.85);
  const [pathOpacity, setPathOpacity] = useStored<number>(PATH_OPACITY_KEY, 1);
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
  const active = activeId(settings, chars);
  const char = chars.some((c) => c.id === focusChar) ? focusChar : active;
  // The map to follow: the one the game says you are on, else the active character's faction world.
  const [gameMap, setGameMap] = useState<string>();
  const faction = chars.find((c) => c.id === active)?.faction;
  const home = faction && HOME_MAP[faction];
  const follow = gameMap ?? home;
  const [followed, setFollowed] = useState<string>();
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

  // Gathering nodes of this map, by resource.
  const gather = points?.maps[map.id]?.gather ?? [];
  const gatherCounts: number[] = [];
  for (let i = 0; i < gather.length; i += 3) gatherCounts[gather[i]] = (gatherCounts[gather[i]] ?? 0) + 1;
  const gathered = new Set(gatherOn);

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

  // The toggles, shared by the Map page's panel and the minimap's dropdowns.
  const layerRows: LayerRow[] = [
    ...Object.entries(LAYERS)
      .filter(([id]) => counts[id])
      .map(([id, [Ic, c]]) => ({
        id,
        icon: <Ic aria-hidden="true" style={{ color: c, fontSize: 15 }} />,
        name: t(`world.layer.${id}`),
        n: counts[id],
        on: !hidden[id],
        toggle: () => toggleLayer(id),
      })),
    { id: "pet", icon: <PawPrintIcon aria-hidden="true" style={{ color: PET_COLOR, fontSize: 15 }} />, name: t("world.layer.pet"), n: dots.length, on: !hidden.pet, toggle: () => toggleLayer("pet") },
  ];
  const setLayers = (rows: LayerRow[], on: boolean) => setHidden({ ...hidden, ...Object.fromEntries(rows.map((r) => [r.id, !on])) });
  const toggleGather = (key: string) => setGatherOn(gathered.has(key) ? gatherOn.filter((k) => k !== key) : [...gatherOn, key]);
  const setGather = (rows: LayerRow[], on: boolean) => {
    const ids = new Set(rows.map((r) => r.id));
    setGatherOn([...gatherOn.filter((k) => !ids.has(k)), ...(on ? ids : [])]);
  };
  // Resources of this map by group; the names are the game's, never translated.
  const gatherGroups: GatherGroup[] = (points?.groups ?? [])
    .map((group) => ({
      group,
      rows: (points?.resources ?? []).flatMap(([key, name, g], i) =>
        g === group && gatherCounts[i]
          ? [{ id: key, icon: <img src={gatherIcon(key)} alt="" width={18} height={18} />, name, n: gatherCounts[i], on: gathered.has(key), toggle: () => toggleGather(key) }]
          : [],
      ),
    }))
    .filter((g) => g.rows.length);
  const gatherRows = gatherGroups.flatMap((g) => g.rows);
  const layerButton = (r: LayerRow) => (
    <button key={r.id} type="button" className="wBtn wLayer" aria-pressed={r.on} onClick={r.toggle}>
      {r.icon}
      <span style={{ flex: 1 }}>{r.name}</span>
      <span className="mono" style={{ fontSize: 11, color: "var(--pm-t3)" }}>
        {r.n}
      </span>
    </button>
  );

  // Status of a picked pet in the panel.
  const petStatus = (code: string): { text: string; frame?: boolean; monsters?: string } => {
    if (done(code)) return { text: t("world.map.petDone") };
    const monsters = [...new Set((points?.pets[code] ?? []).map((m) => m[1]))].join(", ") || undefined;
    const spots = points ? petSpots(points, code) : {};
    if (!Object.keys(spots).length) return { text: t("world.map.petNoCoords") };
    if (spots[map.id]) return { text: t("world.map.petHere", { n: spots[map.id].length }), frame: true, monsters };
    const other = Object.keys(spots).sort((a, b) => spots[b].length - spots[a].length)[0];
    return { text: t("world.map.petElsewhere", { map: MAPS.find((m) => m.id === other)?.name ?? other }), frame: true, monsters };
  };
  const togglePick = (code: string) => setPicked(picked.includes(code) ? picked.filter((c) => c !== code) : [...picked, code]);

  const fullLabel = t(full ? "world.map.exitFullscreen" : "world.map.fullscreen");
  const compact = mini && !full;
  const pickZone = (id: string) => {
    setMapId(id);
    setMarker(null);
    setFocus(undefined);
  };
  // Opens on the followed map and moves when it changes; a zone picked by hand or a "Show on map" holds until then.
  // Set while rendering, so the map shown first is already the right one.
  if (follow !== followed) {
    setFollowed(follow);
    if (follow) pickZone(follow);
  }
  const credit = (
    <>
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
      {" · "}
      {t("world.map.creditCubes")}{" "}
      <a href={CUBES_SOURCE} onClick={link(CUBES_SOURCE)}>
        Aion-DPS-Meter (MIT)
      </a>
    </>
  );

  return (
    <div
      className={["wExplorer", fill && "wFill", compact && "mm"].filter(Boolean).join(" ")}
      data-full={full || undefined}
      style={compact ? ({ "--mm-map": mapOpacity, "--mm-path": pathOpacity } as CSSProperties) : undefined}
    >
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
                const key = points.resources[gather[i]][0];
                return gathered.has(key) ? <img key={i} className="wGather" src={gatherIcon(key)} alt="" style={{ left: gather[i + 1], top: gather[i + 2] }} /> : null;
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
            <You t={t} map={map} home={home} onMap={setGameMap} />
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
        {compact ? (
          <MiniChrome
            t={t}
            run={run}
            zone={mapId}
            zones={MAPS}
            onZone={pickZone}
            layers={[
              ...layerRows,
              ...(map.regions.length > 0
                ? [{ id: "borders", icon: <PolygonIcon aria-hidden="true" style={{ fontSize: 15 }} />, name: t("world.map.regions"), on: borders, toggle: () => setBorders(!borders) }]
                : []),
            ]}
            setLayers={(on) => {
              setLayers(layerRows, on);
              setBorders(on);
            }}
            gather={gatherGroups}
            setGather={setGather}
            mapOpacity={mapOpacity}
            setMapOpacity={setMapOpacity}
            pathOpacity={pathOpacity}
            setPathOpacity={setPathOpacity}
            pets={panel}
            setPets={setPanel}
            onFullscreen={() => setFullscreen(true)}
            credit={credit}
          />
        ) : (
          <>
            <div className="wPanel">
              <select value={mapId} onChange={(e) => pickZone(e.target.value)} aria-label={t("world.map.zone")}>
                {MAPS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <div className="wPanelHead" style={{ ...label, marginTop: 4 }}>
                <span>{t("world.map.layers")}</span>
                <AllNone t={t} rows={layerRows} set={(on) => setLayers(layerRows, on)} />
              </div>
              {layerRows.map(layerButton)}
              {gatherRows.length > 0 && (
                <>
                  <div className="wPanelHead" style={label}>
                    <span>{t("world.map.gathering")}</span>
                    <AllNone t={t} rows={gatherRows} set={(on) => setGather(gatherRows, on)} />
                  </div>
                  {gatherGroups.map((g) => (
                    <div key={g.group} role="group" aria-label={t(`world.layer.${g.group}`)} style={{ display: "contents" }}>
                      <div className="wPanelSub">{t(`world.layer.${g.group}`)}</div>
                      {g.rows.map(layerButton)}
                    </div>
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
          </>
        )}

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
                        {s.monsters && (
                          <span className="wPetMonsters" title={s.monsters}>
                            {t("world.map.petMonsters", { list: s.monsters })}
                          </span>
                        )}
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

        {!compact && query && shown.length === 0 && <div className="wMapLabel">{t("world.map.noResults", { q: q.trim() })}</div>}
        {!compact && <div className="wCredit">{credit}</div>}
      </MapView>
    </div>
  );
}
