import { useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  CubeIcon,
  DiamondIcon,
  FlagIcon,
  HouseIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  PolygonIcon,
  SealIcon,
  SwordIcon,
  XIcon,
  type Icon,
} from "@phosphor-icons/react";
import { MAP_LICENSE, MAP_SOURCE, MAP_TYPES, MAPS, MapView, type MapData } from "./world/MapView";
import type { PageProps } from "./types";

const FOUND_KEY = "pm.map.found";

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

export default function Mappa({ t, run }: PageProps) {
  const [mapId, setMapId] = useState(MAPS[0].id);
  const map = MAPS.find((m) => m.id === mapId)!;
  const markers = useMemo(() => markersOf(map), [map]);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [marker, setMarker] = useState<Marker | null>(null);
  const [borders, setBorders] = useState(true);
  const [found, setFound] = useState<string[]>(() => JSON.parse(localStorage.getItem(FOUND_KEY) ?? "[]"));
  const [q, setQ] = useState("");
  const w = map.tiles[0] * map.tile;
  const h = map.tiles[1] * map.tile;

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

  return (
    <MapView
      t={t}
      map={map}
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
        </>
      }
    >
      <div className="wPanel">
        <select value={mapId} onChange={(e) => {
            setMapId(e.target.value);
            setMarker(null);
          }}aria-label={t("world.map.zone")}>
          {MAPS.map((m) => (
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
      <div className="wCredit">
        {t("world.map.credit")}{" "}
        <a href={MAP_SOURCE} onClick={link(MAP_SOURCE)}>
          aion2-interactive-map
        </a>
        {" · "}
        <a href={MAP_LICENSE} onClick={link(MAP_LICENSE)}>
          CC BY-NC 4.0
        </a>
      </div>
    </MapView>
  );
}
