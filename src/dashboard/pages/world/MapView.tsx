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
// Zoom a followed `center` comes to at least: 1 map pixel ≈ 1 m in game, so a 360 px minimap shows ~360 m around you.
const NEAR_SCALE = 1;

export const MAPS = DATA.maps;
export const MAP_TYPES = DATA.types;
export type MapData = (typeof DATA.maps)[number];
type View = { x: number; y: number; s: number };
/** A rectangle of the map (x0, y0, x1, y1 in map pixels) to frame; a new `key` frames it again. */
export type MapFocus = { key: string; box: [number, number, number, number] };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * A map's tiles with pan (drag) and zoom (wheel, +/- buttons). `world` is drawn
 * in map pixels on top of the tiles (markers, borders, popups: --k and --kp keep
 * them at screen size); `children` float over the viewport (panels, credits).
 * Opens on the whole map, or on `focus`. Only the tiles that have been in view load. `center` (map pixels) keeps
 * that point in the middle, moving with it, zoomed in to NEAR_SCALE unless you are closer; a drag, the wheel or the
 * zoom-out button calls `onPan`. `zoomButtons`: false leaves zoom to the wheel (the minimap).
 */
export function MapView({
  t,
  map,
  onBareClick,
  world,
  focus,
  center,
  onPan,
  zoomButtons = true,
  children,
}: {
  t: T;
  map: MapData;
  onBareClick?: () => void;
  world?: ReactNode;
  focus?: MapFocus;
  center?: [number, number];
  onPan?: () => void;
  zoomButtons?: boolean;
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

  // New map or new focus: fit the map (or the focus box, with a margin) in the viewport.
  const framing = useRef(focus);
  framing.current = focus;
  const centering = useRef(center);
  centering.current = center;
  const frame = () => {
    const r = box.current!.getBoundingClientRect();
    size.current = { w: r.width, h: r.height };
    const s = Math.min(r.width / w, r.height / h);
    fit.current = s;
    const f = framing.current?.box;
    const c = centering.current;
    if (!f && c) return setView(place({ s: NEAR_SCALE, x: r.width / 2 - c[0] * NEAR_SCALE, y: r.height / 2 - c[1] * NEAR_SCALE }));
    if (!f) return setView({ s, x: (r.width - w * s) / 2, y: (r.height - h * s) / 2 });
    const pad = 120 / MAX_SCALE; // keeps lone spots from zooming in all the way
    const fs = clamp(Math.min(r.width / (f[2] - f[0] + 2 * pad), r.height / (f[3] - f[1] + 2 * pad)), s, MAX_SCALE / 2);
    setView(place({ s: fs, x: r.width / 2 - ((f[0] + f[2]) / 2) * fs, y: r.height / 2 - ((f[1] + f[3]) / 2) * fs }));
  };
  // A resized viewport (the minimap resized, full screen) keeps the view on the same center, at no less than the fit.
  const resized = () => {
    const r = box.current!.getBoundingClientRect();
    const prev = size.current;
    size.current = { w: r.width, h: r.height };
    fit.current = Math.min(r.width / w, r.height / h);
    setView((v) => {
      const s = Math.max(v.s, fit.current);
      return place({ s, x: r.width / 2 - ((prev.w / 2 - v.x) / v.s) * s, y: r.height / 2 - ((prev.h / 2 - v.y) / v.s) * s });
    });
  };
  useLayoutEffect(() => {
    let first = true;
    const ro = new ResizeObserver(() => {
      if (!first) return resized();
      first = false;
      frame();
    });
    ro.observe(box.current!);
    return () => ro.disconnect();
  }, [map.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (focus && size.current.w) frame();
  }, [focus?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!center || !size.current.w) return;
    setView((v) => {
      const s = Math.max(v.s, NEAR_SCALE);
      return place({ s, x: size.current.w / 2 - center[0] * s, y: size.current.h / 2 - center[1] * s });
    });
  }, [center?.[0], center?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  // React's onWheel is passive: preventDefault needs a native listener.
  const panned = useRef(onPan);
  panned.current = onPan;
  useEffect(() => {
    const el = box.current!;
    const wheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest(".wPanel, .wPetPanel, .mmPop")) return; // the panels scroll
      e.preventDefault();
      const r = el.getBoundingClientRect();
      panned.current?.();
      setView((v) => zoomAt(v, Math.exp(-e.deltaY * 0.002), e.clientX - r.left, e.clientY - r.top));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [map.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoomButton = (f: number) => {
    if (f < 1) onPan?.(); // zooming in keeps you in the middle
    const r = box.current!.getBoundingClientRect();
    setView((v) => zoomAt(v, f, r.width / 2, r.height / 2));
  };

  const down = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a, input, select, label, .wPopup, .wPanel, .wPetPanel, .mmPop")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
  };
  const move = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 3) return;
    if (!d.moved) onPan?.();
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
        {/* One layer, so a see-through map (the minimap's opacity) has no seams where tiles meet. */}
        <div className="wTiles">
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
        </div>
        {world}
      </div>
      {children}
      {zoomButtons && (
        <div className="wZoom">
          <button type="button" title={t("world.map.zoomIn")} aria-label={t("world.map.zoomIn")} disabled={view.s >= MAX_SCALE} onClick={() => zoomButton(ZOOM_STEP)}>
            <PlusIcon aria-hidden="true" />
          </button>
          <button type="button" title={t("world.map.zoomOut")} aria-label={t("world.map.zoomOut")} disabled={view.s <= fit.current} onClick={() => zoomButton(1 / ZOOM_STEP)}>
            <MinusIcon aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
