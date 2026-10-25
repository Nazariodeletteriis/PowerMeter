import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowCounterClockwiseIcon, ArrowUpIcon, CaretDownIcon, CaretUpIcon, SkipForwardIcon } from "@phosphor-icons/react";
import type { Settings } from "../../App";
import { activeId, readCharacters } from "../../characters";
import type { T } from "../../i18n";
import { usePoll } from "../../usePoll";
import { facing, GAME_MAPS, nearCubes, toPixel } from "./cubes";
import { getPlayerPosition, HOME_MAP, LAYERS, markersOf } from "./MapExplorer";
import { MAPS } from "./MapView";

/** How long the compass flashes when a cube shows up. */
const ALERT_MS = 3000;
/** How long the compass shows where your last cast aimed: past it you may face anywhere. */
const HEADING_MS = 60_000;
/** The big distance counts from the old value to the new one in this long, so you see it closing in. */
const COUNT_MS = 300; // positions come up to ~7 a second in a fight: a longer count never lands
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
 * `value`, counted to over COUNT_MS (ease-out) from what is on screen when it changes, a new value cutting in from
 * wherever the count is. A new `id` (another cube: Next, one showing up), the first value and reduced motion jump.
 * Written straight into the text node: a render per frame would redraw the whole minimap chrome for one number.
 */
function CountTo({ value, id, format }: { value: number; id: string; format: (v: number) => string }) {
  const el = useRef<HTMLSpanElement>(null);
  const live = useRef<{ id: string; v: number }>(undefined);
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const set = (v: number) => {
      live.current = { id, v };
      node.textContent = format(v);
    };
    const from = live.current;
    if (!from || from.id !== id || from.v === value || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      set(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / COUNT_MS);
      set(from.v + (value - from.v) * (1 - (1 - p) ** 5)); // easeOutQuint
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, id, format]);
  return <span ref={el} />;
}

/**
 * The hidden cube compass of the minimap (top left, both widget windows): the hidden cube spot of the map you are on
 * nearest to where the game last placed you, its bearing, distance and height. North is up, like the minimap; for a
 * minute after a cast a cone shows where that cast aimed (the game sends no facing in between). A cube the game shows
 * standing near you (it sends them within sight only) beats the spots it may be on: it becomes the target, and each
 * new one flashes the compass and chimes. The position moves on teleports and on your own casts, effects and dashes,
 * not while you walk or fly, so a line says how old it is. Skipped cubes are kept in memory for the map you are on,
 * never saved: cubes come back, they aren't a collection.
 * `children` gets the Next cube button (or Show skipped again), for the minimap's icon column; the position is polled
 * in here so only the chrome re-renders with it, not the map.
 */
export function CubeCompass({ t, settings, children }: { t: T; settings: Settings; children: (next: ReactNode) => ReactNode }) {
  // Positions come several times a second in a fight: poll often, so the distance drops as you close in.
  const at = usePoll(getPlayerPosition, 500).data;
  // The map the game says you are on; no zone load seen yet (opened in game): the active character's faction world, as the minimap.
  const chars = readCharacters(settings);
  const faction = chars.find((c) => c.id === activeId(settings, chars))?.faction;
  const home = faction && Object.values(GAME_MAPS).find(([id]) => id === HOME_MAP[faction]);
  const [mapId, half] = (at?.map != null ? GAME_MAPS[at.map] : home) || [];
  const map = MAPS.find((m) => m.id === mapId);
  const cubes = useMemo(() => (map ? markersOf(map).filter((m) => m.type === "hiddenCube") : []), [map]);
  const lang = document.documentElement.lang || "en";

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

  const liveGuides = known ? nearCubes(live, pos, half, w, h, skipped, Infinity, 1) : [];
  const [guide] = liveGuides.length ? liveGuides : known ? nearCubes(cubes, pos, half, w, h, skipped, 0, 1) : [];
  const empty = !known ? t("world.cubes.noPos") : !cubes.length ? t("world.cubes.noCubes") : !guide ? t("world.cubes.allSkipped") : undefined;

  // Where your last cast aimed, as a bearing, while that is recent.
  const aim = at?.heading != null && at.headingAt != null && now - at.headingAt < HEADING_MS ? facing(at.heading) : undefined;
  const steep = (m?: number): m is number => m !== undefined && Math.abs(m) >= CLIMB_M;
  const climbLabel = (m?: number) => (steep(m) ? t(m > 0 ? "world.cubes.above" : "world.cubes.below", { m: metres.format(Math.abs(m)) }) : undefined);
  const cardinals: [string, number][] = [
    [t("world.cubes.north"), 0],
    [t("world.cubes.east"), 90],
    [t("world.cubes.south"), 180],
    [t("world.cubes.west"), 270],
  ];
  // How old the position is, short under the distance; the whole of it (and the aim's) on hover.
  const when = at?.at != null ? since(at.at) : "";
  const whenHint = [
    t("world.cubes.updatedHint"),
    at?.at != null && t("world.cubes.from", { when }),
    aim !== undefined && t("world.cubes.facing", { when: since(at!.headingAt!) }),
  ]
    .filter(Boolean)
    .join("\n");
  const left = cubes.length ? `${cubes.length - skipped.size}/${cubes.length}` : "";

  const next = guide ? (
    <button
      type="button"
      className="mmBtn"
      title={`${t("world.cubes.skip")} (${left})`}
      aria-label={t("world.cubes.skip")}
      onClick={() => setSkipped(new Set(skipped).add(guide.cube.id))}
    >
      <SkipForwardIcon aria-hidden="true" />
    </button>
  ) : known && cubes.length > 0 ? (
    <button type="button" className="mmBtn" title={t("world.cubes.restart")} aria-label={t("world.cubes.restart")} onClick={() => setSkipped(new Set())}>
      <ArrowCounterClockwiseIcon aria-hidden="true" />
    </button>
  ) : null;

  return (
    <>
      <div className="cg" data-live={liveGuides.length ? true : undefined} data-alert={alerting || undefined} style={{ "--c": LAYERS.hiddenCube[1] } as CSSProperties} title={whenHint}>
        <div
          className="cgCompass"
          role="img"
          aria-label={
            guide
              ? t(aim !== undefined ? "world.cubes.bearingFacing" : "world.cubes.bearing", { n: Math.round(guide.deg), f: Math.round(aim ?? 0) })
              : empty
          }
        >
          {cardinals.map(([label, deg]) => (
            <span key={deg} className="cgCard" aria-hidden="true" style={{ "--a": `${deg}deg` } as CSSProperties}>
              {label}
            </span>
          ))}
          {aim !== undefined && <span className="cgAim" aria-hidden="true" style={{ "--a": `${aim}deg` } as CSSProperties} />}
          {guide && <ArrowUpIcon aria-hidden="true" weight="bold" style={{ rotate: `${guide.deg}deg` }} />}
        </div>
        <div className="cgRead">
          {guide ? (
            <>
              {liveGuides.length > 0 && <div className="cgLive">{t("world.cubes.live")}</div>}
              <div className="cgDist">
                <CountTo value={guide.metres} id={guide.cube.id} format={metres.format} />
              </div>
              <div className="cgClimb" {...(steep(guide.climb) ? { role: "img", "aria-label": climbLabel(guide.climb) } : { "aria-hidden": true })}>
                <CaretUpIcon aria-hidden="true" weight="bold" data-on={(steep(guide.climb) && guide.climb > 0) || undefined} />
                <CaretDownIcon aria-hidden="true" weight="bold" data-on={(steep(guide.climb) && guide.climb < 0) || undefined} />
                {steep(guide.climb) && <span>{metres.format(Math.abs(guide.climb))}</span>}
              </div>
            </>
          ) : (
            <div className="cgEmpty">{empty}</div>
          )}
          {when && <div className="cgWhen">{when}</div>}
        </div>
      </div>
      {children(next)}
    </>
  );
}
