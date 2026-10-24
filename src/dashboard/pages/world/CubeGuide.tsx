import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ArrowCounterClockwiseIcon, ArrowUpIcon, CaretDownIcon, CaretUpIcon, LockSimpleIcon, LockSimpleOpenIcon, SkipForwardIcon, XIcon } from "@phosphor-icons/react";
import type { Settings } from "../../App";
import { activeId, readCharacters } from "../../characters";
import type { T } from "../../i18n";
import { usePoll } from "../../usePoll";
import { facing, GAME_MAPS, nearCubes, toPixel } from "./cubes";
import { getPlayerPosition, HOME_MAP, LAYERS, markersOf } from "./MapExplorer";
import { MAPS } from "./MapView";
import { startMove, useLock } from "./Minimap";

const CUBES_LABEL = "cubes"; // the window's label, for its lock (powermeter.rs LOCKS)
/** How long the card flashes when a cube shows up. */
const ALERT_MS = 3000;
/** How long the compass shows where your last cast aimed: past it you may face anywhere. */
const HEADING_MS = 60_000;
/** The big distance counts from the old value to the new one in this long, so you see it closing in. */
const COUNT_MS = 500;
/** A cube this many metres above or below you lights the up or down caret: a step, not the ground's slope. */
const CLIMB_M = 3;

/** A short two-tone chime: a cube showed up. Web Audio, so no sound file; muted if the webview refuses to play. */
function chime() {
  try {
    const ac = new AudioContext();
    const g = ac.createGain();
    g.connect(ac.destination);
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, ac.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.45);
    const o = ac.createOscillator();
    o.frequency.setValueAtTime(880, ac.currentTime);
    o.frequency.setValueAtTime(1320, ac.currentTime + 0.12);
    o.connect(g);
    o.start();
    o.stop(ac.currentTime + 0.45);
    o.onended = () => void ac.close();
  } catch {
    // no audio: the flash still tells
  }
}

/**
 * `target`, counted to over COUNT_MS (ease-out) from what is on screen when it changes, a new value cutting in from
 * wherever the count is. A new `key` (another cube: Skip, one showing up), the first value and reduced motion jump.
 */
function useCountTo(target: number, key: string) {
  const [shown, setShown] = useState({ key, v: target });
  const live = useRef(shown);
  useEffect(() => {
    const from = live.current;
    if (from.key !== key || from.v === target || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      live.current = { key, v: target };
      setShown(live.current);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / COUNT_MS);
      live.current = { key, v: from.v + (target - from.v) * (1 - (1 - p) ** 5) }; // easeOutQuint
      setShown(live.current);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, key]);
  // A new cube shows its own distance from the first frame, not the old one's until the effect runs.
  return shown.key === key ? shown.v : target;
}

/**
 * The Hidden cube guide (window "cubes", MapWindow.tsx): the hidden cube spots of the map you are on nearest to where
 * the game last placed you, the nearest one large, the other spots of the place (within 100 m, nearCubes) in rows under
 * it. The compass is north up, like the game's minimap; for a minute after a cast a cone on it shows where that cast
 * aimed (the game sends no facing in between). A cube the game shows standing near you (it sends them within sight
 * only) beats the spots it may be on: it becomes the target, and each new one flashes the card and chimes.
 * The position moves on teleports and on your own casts, effects and dashes, not while you walk or fly, so the footer
 * says how old it is. Skipped cubes are kept in memory for the map you are on, never saved: cubes come back, they
 * aren't a collection. The whole card moves the window.
 */
export function CubeGuide({ t, lang, settings, run }: { t: T; lang: string; settings: Settings; run: (action: () => Promise<unknown>) => void }) {
  // Positions come several times a second in a fight: poll often, so the distance drops as you close in.
  const at = usePoll(getPlayerPosition, 500).data;
  const [locked, toggleLock] = useLock(CUBES_LABEL, run);
  // The map the game says you are on; no zone load seen yet (opened in game): the active character's faction world, as the minimap.
  const chars = readCharacters(settings);
  const faction = chars.find((c) => c.id === activeId(settings, chars))?.faction;
  const home = faction && Object.values(GAME_MAPS).find(([id]) => id === HOME_MAP[faction]);
  const [mapId, half] = (at?.map != null ? GAME_MAPS[at.map] : home) || [];
  const map = MAPS.find((m) => m.id === mapId);
  const cubes = useMemo(() => (map ? markersOf(map).filter((m) => m.type === "hiddenCube") : []), [map]);

  // Skips hold on the map they were made on.
  const [skipped, setSkipped] = useState<ReadonlySet<string>>(new Set());
  const [skippedOn, setSkippedOn] = useState(mapId);
  if (mapId !== skippedOn) {
    setSkippedOn(mapId);
    setSkipped(new Set());
  }

  // A clock for "N s ago".
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ago = useMemo(() => new Intl.RelativeTimeFormat(lang, { numeric: "always", style: "narrow" }), [lang]);
  const metres = useMemo(() => new Intl.NumberFormat(lang, { style: "unit", unit: "meter", maximumFractionDigits: 0 }), [lang]);
  const since = (ms: number) => {
    const s = Math.max(0, Math.round((now - ms) / 1000));
    return s < 60 ? ago.format(-s, "second") : s < 3600 ? ago.format(-Math.floor(s / 60), "minute") : ago.format(-Math.floor(s / 3600), "hour");
  };

  const pos = at?.pos;
  const known = pos && map && half;
  const w = map ? map.tiles[0] * map.tile : 0;
  const h = map ? map.tiles[1] * map.tile : 0;
  // The cubes standing now, as map pixels; their zone is the spot each one stands on.
  const live = (half ? (at?.cubes ?? []) : []).map(([x, y, z]) => ({
    id: `live${Math.round(x)},${Math.round(y)}`,
    x: toPixel(x, half!, w),
    y: toPixel(y, half!, h),
    z,
    region: nearCubes(cubes, [x, y], half!, w, h, new Set(), 0, 1)[0]?.cube.region ?? "",
  }));
  const liveKey = live.map((c) => c.id).join(" ");

  // A cube not there on the last poll: flash and chime.
  const [alertAt, setAlertAt] = useState(0);
  const seen = useRef<string[]>([]);
  useEffect(() => {
    const ids = live.map((c) => c.id);
    if (ids.some((id) => !seen.current.includes(id))) {
      setAlertAt(Date.now());
      chime();
    }
    seen.current = ids;
  }, [liveKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const alerting = now - alertAt < ALERT_MS;

  const liveGuides = known ? nearCubes(live, pos, half, w, h, skipped, Infinity) : [];
  const [guide, ...others] = liveGuides.length ? liveGuides : known ? nearCubes(cubes, pos, half, w, h, skipped) : [];
  const empty = !known ? t("world.cubes.noPos") : !cubes.length ? t("world.cubes.noCubes") : !guide ? t("world.cubes.allSkipped") : undefined;
  const zone = guide?.cube.region || map?.name;
  const lockLabel = t(locked ? "world.map.unlock" : "world.map.lock");

  // Where your last cast aimed, as a bearing, while that is recent.
  const aim = at?.heading != null && at.headingAt != null && now - at.headingAt < HEADING_MS ? facing(at.heading) : undefined;
  const dist = useCountTo(guide?.metres ?? 0, guide?.cube.id ?? "");
  const steep = (m?: number): m is number => m !== undefined && Math.abs(m) >= CLIMB_M;
  const climbLabel = (m?: number) => (steep(m) ? t(m > 0 ? "world.cubes.above" : "world.cubes.below", { m: metres.format(Math.abs(m)) }) : undefined);
  const cardinals: [string, number][] = [
    [t("world.cubes.north"), 0],
    [t("world.cubes.east"), 90],
    [t("world.cubes.south"), 180],
    [t("world.cubes.west"), 270],
  ];

  return (
    <div
      className="mm cg"
      data-locked={locked || undefined}
      data-alert={alerting || undefined}
      style={{ "--c": LAYERS.hiddenCube[1] } as CSSProperties}
      onPointerDown={(e) => !locked && !(e.target as Element).closest("button") && startMove(e, run)}
    >
      <div className="cgHead">
        <div className="cgTitle">
          {zone && (
            <div className="cgZone" title={zone}>
              {zone}
            </div>
          )}
          <div className="cgSub">
            {liveGuides.length ? <span className="cgLive">{t("world.cubes.live")}</span> : t("world.marker.hiddenCube")}
            {cubes.length > 0 && (
              <span className="mmRowN" title={t("world.cubes.count")}>
                {cubes.length - skipped.size}/{cubes.length}
              </span>
            )}
          </div>
        </div>
        <button type="button" className="mmBtn" aria-pressed={locked} title={lockLabel} aria-label={lockLabel} onClick={toggleLock}>
          {locked ? <LockSimpleIcon aria-hidden="true" weight="fill" /> : <LockSimpleOpenIcon aria-hidden="true" />}
        </button>
        <button type="button" className="mmBtn mmClose" title={t("window.close")} aria-label={t("window.close")} onClick={() => run(() => getCurrentWindow().close())}>
          <XIcon aria-hidden="true" />
        </button>
      </div>

      {guide ? (
        <>
          <div className="cgMain">
            <div
              className="cgCompass"
              data-live={liveGuides.length ? true : undefined}
              role="img"
              aria-label={t(aim !== undefined ? "world.cubes.bearingFacing" : "world.cubes.bearing", { n: Math.round(guide.deg), f: Math.round(aim ?? 0) })}
            >
              {cardinals.map(([label, deg]) => (
                <span key={deg} className="cgCard" aria-hidden="true" style={{ "--a": `${deg}deg` } as CSSProperties}>
                  {label}
                </span>
              ))}
              <ArrowUpIcon aria-hidden="true" weight="bold" style={{ rotate: `${guide.deg}deg` }} />
              {aim !== undefined && <span className="cgAim" aria-hidden="true" style={{ "--a": `${aim}deg` } as CSSProperties} />}
            </div>
            <div className="cgRead">
              <div className="cgDist">{metres.format(dist)}</div>
              <div className="cgClimb" {...(steep(guide.climb) ? { role: "img", "aria-label": climbLabel(guide.climb) } : { "aria-hidden": true })}>
                <CaretUpIcon aria-hidden="true" weight="bold" data-on={(steep(guide.climb) && guide.climb > 0) || undefined} />
                <CaretDownIcon aria-hidden="true" weight="bold" data-on={(steep(guide.climb) && guide.climb < 0) || undefined} />
                {steep(guide.climb) && <span>{metres.format(Math.abs(guide.climb))}</span>}
              </div>
            </div>
          </div>
          {others.length > 0 && (
            <ul className="cgList">
              {others.map((g) => (
                <li key={g.cube.id} aria-label={[t("world.cubes.bearing", { n: Math.round(g.deg) }), metres.format(g.metres), climbLabel(g.climb)].filter(Boolean).join(", ")}>
                  <ArrowUpIcon aria-hidden="true" weight="bold" style={{ rotate: `${g.deg}deg` }} />
                  <span aria-hidden="true">{metres.format(g.metres)}</span>
                  <span aria-hidden="true" className="cgListZ">
                    {steep(g.climb) && `${g.climb > 0 ? "↑" : "↓"} ${metres.format(Math.abs(g.climb))}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="cgEmpty">{empty}</p>
      )}

      <div className="cgFoot">
        <span className="cgWhen" title={t("world.cubes.updatedHint")}>
          {at?.at != null && <span>{t("world.cubes.from", { when: since(at.at) })}</span>}
          {aim !== undefined && (
            <span>
              <span className="cgAimKey" aria-hidden="true" />
              {t("world.cubes.facing", { when: since(at!.headingAt!) })}
            </span>
          )}
        </span>
        {guide && (
          <button type="button" className="mmBtn" title={t("world.cubes.skip")} aria-label={t("world.cubes.skip")} onClick={() => setSkipped(new Set(skipped).add(guide.cube.id))}>
            <SkipForwardIcon aria-hidden="true" />
          </button>
        )}
        {known && cubes.length > 0 && !guide && (
          <button type="button" className="mmBtn" title={t("world.cubes.restart")} aria-label={t("world.cubes.restart")} onClick={() => setSkipped(new Set())}>
            <ArrowCounterClockwiseIcon aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
