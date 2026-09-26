import { useState, type CSSProperties } from "react";
import {
  DiamondIcon,
  LeafIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PathIcon,
  PlusIcon,
  SkullIcon,
  StorefrontIcon,
  UserIcon,
  XIcon,
  type Icon,
} from "@phosphor-icons/react";
import { MAP_LAYER_COUNTS, MAP_POINTS, MAP_ROUTE, MAP_ZONES, MONOLITHS_FOUND, type MapPoint } from "../sample/world";
import type { PageProps } from "./types";
import "./world/world.css";

// Prototype pMap.defs: layer id → icon, color.
const LAYERS: Record<string, [Icon, string]> = {
  services: [StorefrontIcon, "#E8B03A"],
  npcs: [UserIcon, "#EAE3D2"],
  monsters: [SkullIcon, "#FF4D4D"],
  gathering: [LeafIcon, "#6CC46A"],
  monoliths: [DiamondIcon, "#4F93EA"],
};
const MONOLITHS_TOTAL = MAP_LAYER_COUNTS.monoliths;

const at = (p: MapPoint): CSSProperties => ({ left: `${p.x}%`, top: `${p.y}%` });

export default function Mappa({ t }: PageProps) {
  const [zone, setZone] = useState(MAP_ZONES[0]);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [marker, setMarker] = useState<MapPoint | null>(null);
  const [route, setRoute] = useState(false);
  const [found, setFound] = useState(MONOLITHS_FOUND);
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const points = MAP_POINTS.filter((p) => !hidden[p.layer] && p.name.toLowerCase().includes(query));

  return (
    <div className="wMap">
      <div className="wMapLabel">{t("world.map.placeholder", { zone })}</div>
      {route && (
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
          <polyline points={MAP_ROUTE} fill="none" stroke="#DB0000" strokeWidth="2" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {points.map((p) => {
        const [Ic, c] = LAYERS[p.layer];
        return (
          <button
            key={p.name}
            type="button"
            className="wMarker"
            title={p.name}
            aria-label={p.name}
            style={{ ...at(p), "--c": c } as CSSProperties}
            onClick={() => setMarker(p)}
          >
            <Ic aria-hidden="true" />
          </button>
        );
      })}
      {marker && (
        <div className="wPopup" style={at(marker)} role="dialog" aria-label={marker.name}>
          <div style={{ display: "flex" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{marker.name}</div>
              <div style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t(`world.layer.${marker.layer}`)}</div>
            </div>
            <button type="button" className="close" aria-label={t("world.map.close")} onClick={() => setMarker(null)}>
              <XIcon aria-hidden="true" />
            </button>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="wMapBtn fill"
              onClick={() => {
                setFound(found + 1);
                setMarker(null);
              }}
            >
              {t("world.map.markFound")}
            </button>
            <button type="button" className="wMapBtn">
              {t("world.map.details")}
            </button>
          </div>
        </div>
      )}

      <div className="wPanel">
        <select value={zone} onChange={(e) => setZone(e.target.value)} aria-label={t("world.map.zone")}>
          {MAP_ZONES.map((z) => (
            <option key={z}>{z}</option>
          ))}
        </select>
        <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--pm-t3)", margin: "4px 0" }}>
          {t("world.map.layers")}
        </div>
        {Object.entries(LAYERS).map(([id, [Ic, c]]) => (
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
              {MAP_LAYER_COUNTS[id]}
            </span>
          </button>
        ))}
        <div style={{ borderTop: "1px solid var(--pm-line)", marginTop: 8, paddingTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
            <span>{t("world.map.monolithsFound")}</span>
            <span className="mono">
              {found}/{MONOLITHS_TOTAL}
            </span>
          </div>
          <div style={{ height: 4, background: "var(--pm-s3)", borderRadius: 2 }} aria-hidden="true">
            <div style={{ height: "100%", width: `${(found / MONOLITHS_TOTAL) * 100}%`, background: "#4F93EA", borderRadius: 2 }} />
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", right: 12, top: 12, display: "flex", gap: 6 }}>
        <label className="wMapSearch">
          <MagnifyingGlassIcon aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("world.map.search")} aria-label={t("world.map.search")} />
        </label>
        <button type="button" className="wRouteBtn" aria-pressed={route} onClick={() => setRoute(!route)}>
          <PathIcon aria-hidden="true" />
          {t(route ? "world.map.routeOn" : "world.map.routes")}
        </button>
      </div>
      {/* ponytail: the zoom buttons do nothing, like the prototype; they need the real map (after 30/09). */}
      <div className="wZoom">
        <button type="button" title={t("world.map.zoomIn")} aria-label={t("world.map.zoomIn")} aria-disabled="true">
          <PlusIcon aria-hidden="true" />
        </button>
        <button type="button" title={t("world.map.zoomOut")} aria-label={t("world.map.zoomOut")} aria-disabled="true">
          <MinusIcon aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
