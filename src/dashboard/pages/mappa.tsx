import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  CubeIcon,
  DiamondIcon,
  FlagIcon,
  HouseIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  PolygonIcon,
  SealIcon,
  SwordIcon,
  XIcon,
  type Icon,
} from "@phosphor-icons/react";
// Built by scripts/fetch-map.mjs from aion2-interactive-map (CC BY-NC 4.0).
import DATA from "../../data/map/maps.json";
import type { PageProps } from "./types";
import "./world/world.css";

// Tiles are game textures hosted by the aion2-interactive-map project, not
// shipped with the app (see scripts/fetch-map.mjs).
const TILES = "https://aion2-interactive-map.github.io/aion2-interactive-map/UI/Map/WorldMap/";
const SOURCE = "https://github.com/aion2-interactive-map/aion2-interactive-map";
const LICENSE = "https://creativecommons.org/licenses/by-nc/4.0/";
const FOUND_KEY = "pm.map.found";
const MAX_SCALE = 1.5; // 1 = native tile pixels
const ZOOM_STEP = 1.6;
const MARKER_MIN = 0.45; // marker size when zoomed out, as a share of full size

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

type MapData = (typeof DATA.maps)[number];
type Marker = { type: string; x: number; y: number; region: string; label: string; id: string };
type View = { x: number; y: number; s: number };

const markersOf = (m: MapData): Marker[] =>
  m.markers.map(([type, x, y, region, label, id]) => ({
    type: DATA.types[type as number],
    x: x as number,
    y: y as number,
    region: m.regions[region as number]?.name ?? "",
    label: label as string,
    id: id as string,
  }));

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export default function Mappa({ t, run }: PageProps) {
  const [mapId, setMapId] = useState(DATA.maps[0].id);
  const map = DATA.maps.find((m) => m.id === mapId)!;
  const markers = useMemo(() => markersOf(map), [map]);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [marker, setMarker] = useState<Marker | null>(null);
  const [borders, setBorders] = useState(true);
  const [found, setFound] = useState<string[]>(() => JSON.parse(localStorage.getItem(FOUND_KEY) ?? "[]"));
  const [q, setQ] = useState("");
  const [view, setView] = useState<View>({ x: 0, y: 0, s: 0.1 });
  const box = useRef<HTMLDivElement>(null);
  const fit = useRef(0.1);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const w = map.tiles[0] * map.tile;
  const h = map.tiles[1] * map.tile;

  // Keep at least half the viewport covered by the map.
  const place = (v: View): View => {
    const r = box.current!.getBoundingClientRect();
    return { s: v.s, x: clamp(v.x, r.width / 2 - w * v.s, r.width / 2), y: clamp(v.y, r.height / 2 - h * v.s, r.height / 2) };
  };
  // Zoom by `f` keeping the point (cx, cy) of the viewport still.
  const zoomAt = (v: View, f: number, cx: number, cy: number): View => {
    const s = clamp(v.s * f, fit.current, MAX_SCALE);
    return place({ s, x: cx - ((cx - v.x) * s) / v.s, y: cy - ((cy - v.y) * s) / v.s });
  };

  // New map or resized window: fit the map in the viewport.
  useLayoutEffect(() => {
    const fitMap = () => {
      const r = box.current!.getBoundingClientRect();
      const s = Math.min(r.width / w, r.height / h);
      fit.current = s;
      setView({ s, x: (r.width - w * s) / 2, y: (r.height - h * s) / 2 });
    };
    const ro = new ResizeObserver(fitMap);
    ro.observe(box.current!);
    return () => ro.disconnect();
  }, [mapId]); // eslint-disable-line react-hooks/exhaustive-deps

  // React's onWheel is passive: preventDefault needs a native listener.
  useEffect(() => {
    const el = box.current!;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      setView((v) => zoomAt(v, Math.exp(-e.deltaY * 0.002), e.clientX - r.left, e.clientY - r.top));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [mapId]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomButton = (f: number) => {
    const r = box.current!.getBoundingClientRect();
    setView((v) => zoomAt(v, f, r.width / 2, r.height / 2));
  };

  const down = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input, select, .wPopup, .wPanel")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
  };
  const move = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 3) return;
    drag.current = { x: e.clientX, y: e.clientY, moved: true };
    setView((v) => place({ ...v, x: v.x + dx, y: v.y + dy }));
  };
  const up = () => {
    // A click on the bare map closes the popup; a drag doesn't.
    if (drag.current && !drag.current.moved) setMarker(null);
    drag.current = null;
  };

  const toggleFound = (id: string) => {
    const next = found.includes(id) ? found.filter((f) => f !== id) : [...found, id];
    setFound(next);
    localStorage.setItem(FOUND_KEY, JSON.stringify(next));
  };

  const link = (url: string) => (e: MouseEvent) => {
    e.preventDefault();
    run(() => openUrl(url));
  };

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

  // Markers and labels keep a screen size (shrinking a bit when zoomed out)
  // while the map scales under them.
  const k = clamp(view.s * 2, MARKER_MIN, 1) / view.s;

  return (
    <div className="wMap" ref={box} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div
        className="wWorld"
        style={{ width: w, height: h, transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`, "--k": k, "--kp": 1 / view.s } as CSSProperties}
      >
        {Array.from({ length: map.tiles[0] * map.tiles[1] }, (_, i) => {
          const col = i % map.tiles[0];
          const row = Math.floor(i / map.tiles[0]);
          const pad = (n: number) => String(n).padStart(2, "0");
          return (
            <img
              key={i}
              src={`${TILES}${map.id}/Res/${map.id}_${pad(col)}_${pad(row)}.webp`}
              alt=""
              draggable={false}
              decoding="async"
              style={{ left: col * map.tile, top: row * map.tile, width: map.tile, height: map.tile }}
            />
          );
        })}
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
      </div>

      <div className="wPanel">
        <select value={mapId} onChange={(e) => {
            setMapId(e.target.value);
            setMarker(null);
          }}aria-label={t("world.map.zone")}>
          {DATA.maps.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--pm-t3)", margin: "4px 0" }}>
          {t("world.map.layers")}
        </div>
        {Object.entries(LAYERS)
          .filter(([id]) => counts[id])
          .map(([id, [Ic, c]]) => (
            <button
              key={id}
              type="button"
              className="wBtn wLayer"
              aria-pressed={!hidden[id]}
              onClick={() => setHidden({ ...hidden, [id]: !hidden[id] })}
            >
              <Ic aria-hidden="true" style={{ color: c, fontSize: 15 }} />
              <span style={{ flex: 1 }}>{t(`world.layer.${id}`)}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--pm-t3)" }}>
                {counts[id]}
              </span>
            </button>
          ))}
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
      </div>

      <div style={{ position: "absolute", right: 12, top: 12, display: "flex", gap: 6 }}>
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
      </div>
      {query && shown.length === 0 && <div className="wMapLabel">{t("world.map.noResults", { q: q.trim() })}</div>}
      <div className="wZoom">
        <button type="button" title={t("world.map.zoomIn")} aria-label={t("world.map.zoomIn")} disabled={view.s >= MAX_SCALE} onClick={() => zoomButton(ZOOM_STEP)}>
          <PlusIcon aria-hidden="true" />
        </button>
        <button type="button" title={t("world.map.zoomOut")} aria-label={t("world.map.zoomOut")} disabled={view.s <= fit.current} onClick={() => zoomButton(1 / ZOOM_STEP)}>
          <MinusIcon aria-hidden="true" />
        </button>
      </div>
      <div className="wCredit">
        {t("world.map.credit")}{" "}
        <a href={SOURCE} onClick={link(SOURCE)}>
          aion2-interactive-map
        </a>
        {" · "}
        <a href={LICENSE} onClick={link(LICENSE)}>
          CC BY-NC 4.0
        </a>
      </div>
    </div>
  );
}
