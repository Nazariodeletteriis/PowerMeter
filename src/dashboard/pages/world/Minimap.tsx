import { useEffect, useState, type ButtonHTMLAttributes, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode, type SyntheticEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow, PhysicalPosition } from "@tauri-apps/api/window";
import { ArrowsOutCardinalIcon, ArrowsOutIcon, CaretDownIcon, CrosshairIcon, EyeSlashIcon, FunnelIcon, GearSixIcon, LockSimpleIcon, LockSimpleOpenIcon, PawPrintIcon, XIcon } from "@phosphor-icons/react";
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

/** A slider of the minimap's options (an opacity, 0-1, or the zoom: `max`, shown as a share of `base`). */
export type Opacity = { label: string; hint?: string; value: number; min: number; max?: number; base?: number; set: (v: number) => void };

/**
 * The minimap's controls over the map: the icon column on the right (close, move, filter, pets, follow, full screen,
 * options, then `rail`: the hidden cube compass's Next cube), zoom on the wheel only. The filter holds the two
 * dropdowns, Gathering and Layers; the options the lock, hiding in game menus, the opacities (map, icons, compass) and the zone.
 * Locked, the window can't be moved; its controls keep working. `label`: the window's, for its lock (powermeter.rs LOCKS).
 */
export function MiniChrome({
  t,
  run,
  label,
  zone,
  zones,
  onZone,
  layers,
  setLayers,
  gather,
  setGather,
  opacities,
  pets,
  setPets,
  onFullscreen,
  credit,
  follow,
  setFollow,
  rail,
  hideInMenus,
  setHideInMenus,
}: {
  t: T;
  run: (action: () => Promise<unknown>) => void;
  label: string;
  zone: string;
  zones: { id: string; name: string }[];
  onZone: (id: string) => void;
  layers: LayerRow[];
  setLayers: (on: boolean) => void;
  gather: GatherGroup[];
  setGather: (rows: LayerRow[], on: boolean) => void;
  opacities: Opacity[];
  pets: boolean;
  setPets: (on: boolean) => void;
  onFullscreen: () => void;
  credit: ReactNode;
  follow: boolean;
  setFollow: (on: boolean) => void;
  rail?: ReactNode;
  hideInMenus: boolean;
  setHideInMenus: (on: boolean) => void;
}) {
  const [pop, setPop] = useState<"filter" | "options">();
  const [locked, toggleLock] = useLock(label, run);
  const win = getCurrentWindow();
  const move = (e: ReactPointerEvent<HTMLElement>) => !locked && startMove(e, run); // the lock keeps the window in place

  // A dropdown closes on Esc or a press outside it.
  useEffect(() => {
    if (!pop) return;
    const down = (e: PointerEvent) => !(e.target as Element).closest(".mmPop, .mmPopBtn") && setPop(undefined);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setPop(undefined);
    window.addEventListener("pointerdown", down);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", key);
    };
  }, [pop]);
  const openPop = (p: "filter" | "options") => {
    setPop(pop === p ? undefined : p);
    setPets(false);
  };

  const slider = (o: Opacity) => (
    <label key={o.label} className="mmSlider" title={o.hint}>
      <span>{o.label}</span>
      <input
        type="range"
        min={o.min}
        max={o.max ?? 1}
        step={0.05}
        value={o.value}
        onChange={(e) => o.set(Number(e.target.value))}
        aria-valuetext={`${Math.round((o.value / (o.base ?? 1)) * 100)}%`}
        style={{ "--v": `${((o.value - o.min) / ((o.max ?? 1) - o.min)) * 100}%` } as CSSProperties}
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
      <div className="mmRail">
        {railBtn(t("window.close"), <XIcon aria-hidden="true" />, { className: "mmBtn mmClose", onClick: () => run(() => win.close()) })}
        {railBtn(t("world.map.move"), <ArrowsOutCardinalIcon aria-hidden="true" />, { className: "mmBtn mmMove", onPointerDown: move })}
        {railBtn(t("world.map.filter"), <FunnelIcon aria-hidden="true" />, {
          className: "mmBtn mmPopBtn",
          "aria-pressed": pop === "filter",
          "aria-expanded": pop === "filter",
          onClick: () => openPop("filter"),
        })}
        {railBtn(t("world.map.pets"), <PawPrintIcon aria-hidden="true" />, {
          "aria-pressed": pets,
          onClick: () => {
            setPets(!pets);
            setPop(undefined);
          },
        })}
        {railBtn(t("world.map.follow"), <CrosshairIcon aria-hidden="true" />, { "aria-pressed": follow, onClick: () => setFollow(!follow) })}
        {railBtn(t("world.map.fullscreen"), <ArrowsOutIcon aria-hidden="true" />, { onClick: onFullscreen })}
        {railBtn(t("world.map.options"), <GearSixIcon aria-hidden="true" />, {
          className: "mmBtn mmPopBtn",
          "aria-pressed": pop === "options",
          "aria-expanded": pop === "options",
          onClick: () => openPop("options"),
        })}
        {rail}
      </div>

      {pop === "filter" && (
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

      {pop === "options" && (
        <div className="mmPop mmOptions" role="dialog" aria-label={t("world.map.options")}>
          <label className="mmRow">
            <input type="checkbox" checked={locked} onChange={toggleLock} />
            <span className="mmRowIcon">{locked ? <LockSimpleIcon aria-hidden="true" weight="fill" /> : <LockSimpleOpenIcon aria-hidden="true" />}</span>
            <span className="mmRowName">{t("world.map.lock")}</span>
          </label>
          <label className="mmRow" title={t("world.map.hideInMenusHint")}>
            <input type="checkbox" checked={hideInMenus} onChange={() => setHideInMenus(!hideInMenus)} />
            <span className="mmRowIcon">
              <EyeSlashIcon aria-hidden="true" />
            </span>
            <span className="mmRowName">{t("world.map.hideInMenus")}</span>
          </label>
          {opacities.map(slider)}
          <label className="mmZone">
            <span>{t("world.map.zone")}</span>
            <select value={zone} onChange={(e) => onZone(e.target.value)}>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
            <CaretDownIcon aria-hidden="true" />
          </label>
        </div>
      )}
    </>
  );
}
