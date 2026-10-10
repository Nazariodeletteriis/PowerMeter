import { useState, type MouseEvent } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { MapTrifoldIcon, SkullIcon } from "@phosphor-icons/react";
import type { GameRecord, MonsterRegion } from "../../data/db/types";
import type { T } from "../i18n";
import { Modal } from "./system/Modal";
import type { PageProps } from "./types";
import { MAP_LICENSE, MAP_SOURCE, MAPS, MapView } from "./world/MapView";
import { Capped, DataState, EntryHead, EntryLink, gd, Nd, None, RecordCard, Section, TypePage, useGd, useIcons, type Open } from "./world/db";
import "./world/world.css";

type MonsterData = {
  monster: { name?: string; level?: number; subType?: string; creatureType?: string };
  soul?: { code: string; name: string; grade?: string; icon?: string } | null;
  drops?: { code: string; grade?: string; icon?: string }[];
  locations?: { id: string; name: string; subzone?: string }[];
};

export default function Npc({ t, lang, go, setHeader, run }: PageProps) {
  return (
    <TypePage
      t={t}
      go={go}
      setHeader={setHeader}
      category="monster"
      title={t("world.npc.title")}
      glyph={<SkullIcon />}
      card={(id, open) => <RecordCard t={t} category="monster" id={id}>{(r) => <MonsterCard t={t} lang={lang} rec={r} open={open} run={run} />}</RecordCard>}
    />
  );
}

/** Our map (maps.json) for an archive map name: "Verteron" → "Verteron (Elyos)". No match, no map. */
const mapFor = (name: string) => MAPS.find((m) => m.name === name || m.name.startsWith(`${name} (`));

function MonsterCard({ t, lang, rec, open, run }: { t: T; lang: string; rec: GameRecord; open: Open; run: PageProps["run"] }) {
  const d = rec.data_json as unknown as MonsterData;
  const m = d.monster;
  const drops = useGd(() => gd.drops(rec.id), rec.id);
  const regionRows = useGd(() => gd.rows<MonsterRegion>("monster_regions", "monster_id", rec.id), rec.id);
  // Region membership from the regions table and the record's own list, once each.
  const regions = new Map<string, { map: string; region: string | null }>();
  for (const r of regionRows.data ?? []) if (r.map_name) regions.set(`${r.map_name}|${r.region ?? ""}`, { map: r.map_name, region: r.region });
  for (const l of d.locations ?? []) regions.set(`${l.name}|${l.subzone ?? ""}`, { map: l.name, region: l.subzone ?? null });
  const byMap = new Map<string, string[]>();
  for (const r of regions.values()) {
    const list = byMap.get(r.map) ?? [];
    if (r.region && !list.includes(r.region)) list.push(r.region);
    byMap.set(r.map, list);
  }
  const [mapOpen, setMapOpen] = useState<string | null>(null);
  const firstMap = [...byMap.keys()].find((n) => mapFor(n));
  const sub = [m.subType && t(`world.npc.rank.${m.subType}`), m.creatureType, m.level != null && t("world.db.lv", { n: m.level })].filter(Boolean).join(" · ");
  // Grade and icon of each drop: the record lists them, the drops table has codes and names only.
  const itemOf = new Map((d.drops ?? []).map((i) => [i.code, i]));
  const icons = useIcons([d.soul?.icon, ...(d.drops ?? []).map((i) => i.icon)]);

  return (
    <div className="wTwo">
      <div className="wStack">
        <section className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <EntryHead name={rec.name ?? m.name ?? rec.id} sub={sub} glyph={<SkullIcon />} />
          {firstMap && (
            <div>
              <button type="button" className="btn" onClick={() => setMapOpen(firstMap)}>
                <MapTrifoldIcon aria-hidden="true" />
                {t("world.npc.map")}
              </button>
            </div>
          )}
          {d.soul && (
            <div>
              <h3 className="wLabel">{t("world.npc.soul")}</h3>
              <EntryLink name={d.soul.name} grade={d.soul.grade} icon={d.soul.icon ? icons[d.soul.icon] : undefined} onOpen={() => open("item", d.soul!.code)} />
            </div>
          )}
        </section>
        <Section title={t("world.npc.drops")}>
          {drops.data === undefined ? (
            <DataState t={t} error={drops.error} retry={drops.retry} rows={3} />
          ) : drops.data.length === 0 ? (
            <None>{t("world.npc.noDrops")}</None>
          ) : (
            <>
              <div className="gridHead" style={{ gridTemplateColumns: "minmax(0,1fr) 90px 90px" }}>
                <span>{t("world.npc.item")}</span>
                <span className="num">{t("world.npc.quantity")}</span>
                <span className="num">{t("world.npc.chance")}</span>
              </div>
              <Capped
                t={t}
                max={40}
                items={drops.data}
                render={(x, i) => {
                  const it = itemOf.get(x.item_code);
                  return (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 90px 90px", gap: 10, alignItems: "center", borderBottom: "1px solid var(--pm-line)" }}>
                      <EntryLink name={x.name ?? x.item_code} grade={it?.grade} icon={it?.icon ? icons[it.icon] : undefined} onOpen={() => open("item", x.item_code)} />
                      <span className="num" style={{ fontSize: 12 }}>
                        <Nd t={t} lang={lang} value={x.quantity} />
                      </span>
                      <span className="num" style={{ fontSize: 12 }}>
                        <Nd t={t} lang={lang} value={x.probability} />
                      </span>
                    </div>
                  );
                }}
              />
            </>
          )}
        </Section>
      </div>
      <Section title={t("world.npc.regions")}>
        {regionRows.data === undefined && !regionRows.error ? (
          <None>{t("world.db.loading")}</None>
        ) : byMap.size === 0 ? (
          <None>{t("world.npc.noRegions")}</None>
        ) : (
          [...byMap].map(([map, list]) => (
            <div key={map} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32 }}>
                <span style={{ flex: 1, fontWeight: 500 }}>{map}</span>
                {mapFor(map) && (
                  <button type="button" className="btn sm" onClick={() => setMapOpen(map)} aria-label={t("world.npc.mapOf", { map })}>
                    <MapTrifoldIcon aria-hidden="true" />
                    {t("world.npc.map")}
                  </button>
                )}
              </div>
              {list.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {list.map((r) => (
                    <span key={r} className="wTag">
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        {regionRows.error && <div className="error">{regionRows.error}</div>}
        <div style={{ fontSize: 11, color: "var(--pm-t3)", marginTop: 6 }}>{t("world.npc.regionsNote")}</div>
      </Section>
      {mapOpen && <RegionMap t={t} run={run} map={mapOpen} regions={byMap.get(mapOpen) ?? []} onClose={() => setMapOpen(null)} />}
    </div>
  );
}

/** Our map in a popup with the monster's regions filled (no spawn points: Global has no coordinates). */
function RegionMap({ t, run, map, regions, onClose }: { t: T; run: PageProps["run"]; map: string; regions: string[]; onClose: () => void }) {
  const link = (url: string) => (e: MouseEvent) => {
    e.preventDefault();
    run(() => openUrl(url));
  };
  const data = mapFor(map)!;
  const w = data.tiles[0] * data.tile;
  const h = data.tiles[1] * data.tile;
  const lit = data.regions.filter((r) => regions.includes(r.name));
  return (
    <Modal
      width={920}
      onClose={onClose}
      title={(id) => (
        <div style={{ display: "flex", alignItems: "center" }}>
          <h2 id={id} style={{ flex: 1, fontSize: 15, fontWeight: 600, margin: 0 }}>
            {data.name}
          </h2>
          <button type="button" className="btn sm" onClick={onClose} autoFocus>
            {t("world.map.close")}
          </button>
        </div>
      )}
    >
      <div className="wMapModal">
        <MapView
          t={t}
          map={data}
          world={
            <>
              <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
                {data.regions.map((r) => r.poly.map((p, i) => <polygon key={r.name + i} className={regions.includes(r.name) ? "on" : undefined} points={p.join(" ")} vectorEffect="non-scaling-stroke" />))}
              </svg>
              {lit.map((r) => (
                <div key={r.name} className="wRegion" style={{ left: r.at[0], top: r.at[1] }} aria-hidden="true">
                  {r.name}
                </div>
              ))}
            </>
          }
        >
          {/* Same credit as the Map page (CC BY-NC). */}
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
      </div>
      <div style={{ fontSize: 12, color: "var(--pm-t2)" }}>
        {lit.length ? t("world.npc.mapLegend", { list: lit.map((r) => r.name).join(", ") }) : t("world.npc.mapNoRegion")}
      </div>
    </Modal>
  );
}
