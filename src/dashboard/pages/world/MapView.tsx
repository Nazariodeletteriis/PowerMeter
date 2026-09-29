import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
// Built by scripts/fetch-map.mjs from aion2-interactive-map (CC BY-NC 4.0).
import DATA from "../../../data/map/maps.json";
import type { T } from "../../i18n";
import "./world.css";

// Tiles are game textures hosted by the aion2-interactive-map project, not
// shipped with the app (see scripts/fetch-map.mjs).
const TILES = "https://aion2-interactive-map.github.io/aion2-interactive-map/UI/Map/WorldMap/";
export const MAP_SOURCE = "https://github.com/aion2-interactive-map/aion2-interactive-map";
export const MAP_LICENSE = "https://creativecommons.org/licenses/by-nc/4.0/";
const MAX_SCALE = 1.5; // 1 = native tile pixels
const ZOOM_STEP = 1.6;
const MARKER_MIN = 0.45; // marker size when zoomed out, as a share of full size

export const MAPS = DATA.maps;
export const MAP_TYPES = DATA.types;
export type MapData = (typeof DATA.maps)[number];
type View = { x: number; y: number; s: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * A map's tiles with pan (drag) and zoom (wheel, +/- buttons). `world` is drawn
 * in map pixels on top of the tiles (markers, borders, popups: --k and --kp keep
 * them at screen size); `children` float over the viewport (panels, credits).
 * Opens on the whole map. Only the tiles that have been in view load.
 */
export function MapView({
  t,
  map,
  onBareClick,
  world,
  children,
}: {
  t: T;
  map: MapData;
  onBareClick?: () => void;
  world?: ReactNode;
  children?: ReactNode;
}) {
  const [view, setView] = useState<View>({ x: 0, y: 0, s: 0.1 });
  const box = useRef<HTMLDivElement>(null);
  const fit = useRef(0.1);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const size = useRef({ w: 0, h: 0 });
  const seen = useRef({ map: "", tiles: new Set<number>() });

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
      size.current = { w: r.width, h: r.height };
      const s = Math.min(r.width / w, r.height / h);
      fit.current = s;
      setView({ s, x: (r.width - w * s) / 2, y: (r.height - h * s) / 2 });
    };
    const ro = new ResizeObserver(fitMap);
    ro.observe(box.current!);
    return () => ro.disconnect();
  }, [map.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [map.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // A click on the bare map is a click; a drag isn't.
    if (drag.current && !drag.current.moved) onBareClick?.();
    drag.current = null;
  };

  // Markers and labels keep a screen size (shrinking a bit when zoomed out)
  // while the map scales under them.
  const k = clamp(view.s * 2, MARKER_MIN, 1) / view.s;
  const pad = (n: number) => String(n).padStart(2, "0");

  // Tiles in view join the ones already loaded (kept, so panning back doesn't reload them).
  if (seen.current.map !== map.id) seen.current = { map: map.id, tiles: new Set() };
  const cols = map.tiles[0];
  const ts = map.tile * view.s;
  if (size.current.w) {
    const [c0, c1] = [Math.floor(-view.x / ts), Math.floor((size.current.w - view.x) / ts)].map((c) => clamp(c, 0, cols - 1));
    const [r0, r1] = [Math.floor(-view.y / ts), Math.floor((size.current.h - view.y) / ts)].map((r) => clamp(r, 0, map.tiles[1] - 1));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) seen.current.tiles.add(r * cols + c);
  }

  return (
    <div className="wMap" ref={box} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div
        className="wWorld"
        style={{ width: w, height: h, transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`, "--k": k, "--kp": 1 / view.s } as CSSProperties}
      >
        {[...seen.current.tiles].map((i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
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
        {world}
      </div>
      {children}
      <div className="wZoom">
        <button type="button" title={t("world.map.zoomIn")} aria-label={t("world.map.zoomIn")} disabled={view.s >= MAX_SCALE} onClick={() => zoomButton(ZOOM_STEP)}>
          <PlusIcon aria-hidden="true" />
        </button>
        <button type="button" title={t("world.map.zoomOut")} aria-label={t("world.map.zoomOut")} disabled={view.s <= fit.current} onClick={() => zoomButton(1 / ZOOM_STEP)}>
          <MinusIcon aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
