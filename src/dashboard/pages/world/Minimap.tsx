import { useEffect, useState, type ButtonHTMLAttributes, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, type SyntheticEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, PhysicalPosition } from "@tauri-apps/api/window";
import { ArrowsOutCardinalIcon, ArrowsOutIcon, CaretDownIcon, CrosshairIcon, FunnelIcon, LockSimpleIcon, LockSimpleOpenIcon, PawPrintIcon, XIcon } from "@phosphor-icons/react";
import "@fontsource/noto-sans/600.css";
import type { T } from "../../i18n";

/** A toggle of the map: a layer, the pet spots, the zone borders or a gathering resource. */
export type LayerRow = { id: string; icon: ReactNode; name: string; n?: number; on: boolean; toggle: () => void };
export type GatherGroup = { group: string; rows: LayerRow[] };

/** "Select all / Deselect all" of a list of toggles (Map page panel and minimap dropdowns). */
export function AllNone({ t, rows, set }: { t: T; rows: LayerRow[]; set: (on: boolean) => void }) {
  return (
    <span className="wAllNone">
      <button type="button" disabled={rows.every((r) => r.on)} onClick={() => set(true)}>
        {t("world.map.selectAll")}
      </button>
      <button type="button" disabled={rows.every((r) => !r.on)} onClick={() => set(false)}>
        {t("world.map.selectNone")}
      </button>
    </span>
  );
}

const MAP_LABEL = "map"; // the window's label, for its lock (powermeter.rs LOCKS)

/**
 * The lock of a widget window (powermeter.rs LOCKS, by window label): its state, kept in step with the Rust side, and
 * its toggle. Locked, the window can't be moved.
 */
export function useLock(label: string, run: (action: () => Promise<unknown>) => void) {
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    invoke<boolean>("get_click_through", { label }).then(setLocked, () => {});
    const stop = listen<boolean>(`pm-${label}-click-through`, ({ payload }) => setLocked(payload));
    return () => void stop.then((s) => s(), () => {});
  }, [label]);
  const toggle = () => run(() => invoke("set_click_through", { enabled: !locked, label }).then(() => setLocked(!locked)));
  return [locked, toggle] as const;
}

/**
 * Moves the window with the pointer, by hand, not with the native drag: that one let Windows snap it (Aero Snap) to the
 * screen's top edge or corners, where the game's minimap sits, and a double-click on the bar maximized it.
 * One setPosition in flight at a time, always to the latest pointer.
 */
export function startMove(e: ReactPointerEvent<HTMLElement>, run: (action: () => Promise<unknown>) => void) {
  if (e.button !== 0) return;
  const win = getCurrentWindow();
  const el = e.currentTarget;
  el.setPointerCapture(e.pointerId);
  const from = { x: e.screenX, y: e.screenY };
  const scale = window.devicePixelRatio;
  const origin = win.outerPosition();
  let to: { x: number; y: number } | undefined;
  let busy = false;
  const push = () => {
    if (busy || !to) return;
    const p = to;
    to = undefined;
    busy = true;
    origin
      .then((o) => win.setPosition(new PhysicalPosition(Math.round(o.x + (p.x - from.x) * scale), Math.round(o.y + (p.y - from.y) * scale))))
      .catch((err) => run(() => Promise.reject(err)))
      .finally(() => {
        busy = false;
        push();
      });
  };
  const move = (ev: PointerEvent) => {
    to = { x: ev.screenX, y: ev.screenY };
    push();
  };
  const end = () => {
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", end);
    el.removeEventListener("pointercancel", end);
  };
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}

/**
 * The minimap's controls over the map, as the game's minimap: Map and Path Opacity on top with the close button,
 * the icon column on the right (move, filter, pets, full screen; zoom and lock at the bottom), the zone at the
 * bottom left. The filter holds the two dropdowns, Gathering and Layers. Locked, the window can't be moved; its controls
 * keep working.
 */
export function MiniChrome({
  t,
  run,
  zone,
  zones,
  onZone,
  layers,
  setLayers,
  gather,
  setGather,
  mapOpacity,
  setMapOpacity,
  pathOpacity,
  setPathOpacity,
  pets,
  setPets,
  onFullscreen,
  credit,
  follow,
  setFollow,
}: {
  t: T;
  run: (action: () => Promise<unknown>) => void;
  zone: string;
  zones: { id: string; name: string }[];
  onZone: (id: string) => void;
  layers: LayerRow[];
  setLayers: (on: boolean) => void;
  gather: GatherGroup[];
  setGather: (rows: LayerRow[], on: boolean) => void;
  mapOpacity: number;
  setMapOpacity: (v: number) => void;
  pathOpacity: number;
  setPathOpacity: (v: number) => void;
  pets: boolean;
  setPets: (on: boolean) => void;
  onFullscreen: () => void;
  credit: ReactNode;
  follow: boolean;
  setFollow: (on: boolean) => void;
}) {
  const [filter, setFilter] = useState(false);
  const [locked, toggleLock] = useLock(MAP_LABEL, run);
  const win = getCurrentWindow();
  const move = (e: ReactPointerEvent<HTMLElement>) => !locked && startMove(e, run); // the lock keeps the window in place

  // The filter closes on Esc or a press outside it.
  useEffect(() => {
    if (!filter) return;
    const down = (e: PointerEvent) => !(e.target as Element).closest(".mmPop, .mmFilterBtn") && setFilter(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setFilter(false);
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
    };
  }, [filter]);

  const slider = (label: string, hint: string | undefined, value: number, min: number, set: (v: number) => void) => (
    <label className="mmSlider" title={hint}>
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        aria-valuetext={`${Math.round(value * 100)}%`}
        style={{ "--v": `${((value - min) / (1 - min)) * 100}%` } as CSSProperties}
      />
    </label>
  );

  const row = (r: LayerRow) => (
    <label key={r.id} className="mmRow">
      <input type="checkbox" checked={r.on} onChange={r.toggle} />
      <span className="mmRowIcon">{r.icon}</span>
      <span className="mmRowName">{r.name}</span>
      {r.n !== undefined && <span className="mmRowN">{r.n}</span>}
    </label>
  );
  const gatherRows = gather.flatMap((g) => g.rows);
  // Opening one dropdown closes the other (same name): show the opened one from its top.
  // (Setting the panel's scrollTop: scrollIntoView would also scroll the map, overflow hidden but scrollable.)
  const shown = ({ currentTarget: d }: SyntheticEvent<HTMLDetailsElement>) => {
    if (d.open && d.parentElement) d.parentElement.scrollTop = d.offsetTop - 4;
  };
  const onCount = (rows: LayerRow[]) => `${rows.filter((r) => r.on).length}/${rows.length}`;

  const railBtn = (label: string, icon: ReactNode, props: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" className="mmBtn" title={label} aria-label={label} {...props}>
      {icon}
    </button>
  );

  return (
    <>
      <div className="mmBar" onPointerDown={(e) => e.target === e.currentTarget && move(e)}>
        {slider(t("world.map.mapOpacity"), undefined, mapOpacity, 0, setMapOpacity)}
        {slider(t("world.map.pathOpacity"), t("world.map.pathOpacityHint"), pathOpacity, 0.1, setPathOpacity)}
        {railBtn(t("window.close"), <XIcon aria-hidden="true" />, { className: "mmBtn mmClose", onClick: () => run(() => win.close()) })}
      </div>

      <div className="mmRail">
        {railBtn(t("world.map.move"), <ArrowsOutCardinalIcon aria-hidden="true" />, {
          className: "mmBtn mmMove",
          onPointerDown: move,
        })}
        {railBtn(t("world.map.filter"), <FunnelIcon aria-hidden="true" />, {
          className: "mmBtn mmFilterBtn",
          "aria-pressed": filter,
          "aria-expanded": filter,
          onClick: () => {
            setFilter(!filter);
            setPets(false);
          },
        })}
        {railBtn(t("world.map.pets"), <PawPrintIcon aria-hidden="true" />, {
          "aria-pressed": pets,
          onClick: () => {
            setPets(!pets);
            setFilter(false);
          },
        })}
        {railBtn(t("world.map.follow"), <CrosshairIcon aria-hidden="true" />, { "aria-pressed": follow, onClick: () => setFollow(!follow) })}
        {railBtn(t("world.map.fullscreen"), <ArrowsOutIcon aria-hidden="true" />, { onClick: onFullscreen })}
      </div>

      <button
        type="button"
        className="mmBtn mmLock"
        aria-pressed={locked}
        title={t(locked ? "world.map.unlock" : "world.map.lock")}
        aria-label={t(locked ? "world.map.unlock" : "world.map.lock")}
        onClick={toggleLock}
      >
        {locked ? <LockSimpleIcon aria-hidden="true" weight="fill" /> : <LockSimpleOpenIcon aria-hidden="true" />}
      </button>

      <label className="mmZone">
        <select value={zone} onChange={(e) => onZone(e.target.value)} aria-label={t("world.map.zone")}>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
        <CaretDownIcon aria-hidden="true" />
      </label>

      {filter && (
        <div className="mmPop" role="dialog" aria-label={t("world.map.filter")}>
          {gatherRows.length > 0 && (
            <details name="mmFilter" open onToggle={shown}>
              <summary>
                <span>{t("world.map.gathering")}</span>
                <span className="mmRowN">{onCount(gatherRows)}</span>
                <CaretDownIcon aria-hidden="true" />
              </summary>
              <AllNone t={t} rows={gatherRows} set={(on) => setGather(gatherRows, on)} />
              {gather.map((g) => (
                <div key={g.group} role="group" aria-label={t(`world.layer.${g.group}`)}>
                  <div className="mmGroup">{t(`world.layer.${g.group}`)}</div>
                  {g.rows.map(row)}
                </div>
              ))}
            </details>
          )}
          <details name="mmFilter" open={gatherRows.length === 0} onToggle={shown}>
            <summary>
              <span>{t("world.map.layers")}</span>
              <span className="mmRowN">{onCount(layers)}</span>
              <CaretDownIcon aria-hidden="true" />
            </summary>
            <AllNone t={t} rows={layers} set={setLayers} />
            {layers.map(row)}
          </details>
          <div className="mmCredit">{credit}</div>
        </div>
      )}
    </>
  );
}
