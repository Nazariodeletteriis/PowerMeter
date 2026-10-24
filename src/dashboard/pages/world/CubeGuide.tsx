import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ArrowCounterClockwiseIcon, ArrowUpIcon, LockSimpleIcon, LockSimpleOpenIcon, SkipForwardIcon, XIcon } from "@phosphor-icons/react";
import type { Settings } from "../../App";
import { activeId, readCharacters } from "../../characters";
import type { T } from "../../i18n";
import { usePoll } from "../../usePoll";
import { GAME_MAPS, nearestCube } from "./cubes";
import { getPlayerPosition, HOME_MAP, LAYERS, markersOf } from "./MapExplorer";
import { MAPS } from "./MapView";
import { startMove, useLock } from "./Minimap";

const CUBES_LABEL = "cubes"; // the window's label, for its lock (powermeter.rs LOCKS)

/**
 * The Hidden cube guide (window "cubes", MapWindow.tsx): the nearest hidden cube of the map you are on, from where the
 * game last placed you. The arrow is a compass, north up as on the map: where you face is not something we know.
 * The position moves on teleports and on your own casts only, so the footer says how old it is. Skipped cubes are
 * kept in memory for the map you are on, never saved: cubes come back, they aren't a collection.
 * The whole card moves the window.
 */
export function CubeGuide({ t, lang, settings, run }: { t: T; lang: string; settings: Settings; run: (action: () => Promise<unknown>) => void }) {
  const at = usePoll(getPlayerPosition, 2000).data;
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

  // When the position last changed (first seen counts: the game doesn't say how old it is), and a clock for "N s ago".
  const pos = at?.pos;
  const posKey = pos?.join() ?? "";
  const [since, setSince] = useState<number>();
  useEffect(() => {
    if (posKey) setSince(Date.now());
  }, [posKey]);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const ago = useMemo(() => new Intl.RelativeTimeFormat(lang, { numeric: "auto", style: "narrow" }), [lang]);
  const metres = useMemo(() => new Intl.NumberFormat(lang, { style: "unit", unit: "meter", maximumFractionDigits: 0 }), [lang]);
  const s = since === undefined ? 0 : Math.max(0, Math.round((now - since) / 1000));
  const when = s < 60 ? ago.format(-s, "second") : s < 3600 ? ago.format(-Math.floor(s / 60), "minute") : ago.format(-Math.floor(s / 3600), "hour");

  const known = pos && map && half;
  const guide = known ? nearestCube(cubes, [pos[0], pos[1]], half, map.tiles[0] * map.tile, map.tiles[1] * map.tile, skipped) : undefined;
  const empty = !known ? t("world.cubes.noPos") : !cubes.length ? t("world.cubes.noCubes") : !guide ? t("world.cubes.allSkipped") : undefined;
  const zone = guide?.cube.region || map?.name;
  const lockLabel = t(locked ? "world.map.unlock" : "world.map.lock");

  return (
    <div
      className="mm cg"
      data-locked={locked || undefined}
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
            {t("world.marker.hiddenCube")}
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
          <div className="cgCompass" role="img" aria-label={t("world.cubes.bearing", { n: Math.round(guide.deg) })}>
            <span className="cgN" aria-hidden="true">
              {t("world.cubes.north")}
            </span>
            <ArrowUpIcon aria-hidden="true" weight="bold" style={{ rotate: `${guide.deg}deg` }} />
          </div>
          <div className="cgDist">{metres.format(guide.metres)}</div>
        </>
      ) : (
        <p className="cgEmpty">{empty}</p>
      )}

      <div className="cgFoot">
        <span title={t("world.cubes.updatedHint")}>{since !== undefined && t("world.cubes.updated", { when })}</span>
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
