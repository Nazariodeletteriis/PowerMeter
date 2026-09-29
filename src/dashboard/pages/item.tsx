import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { HammerIcon, ScrollIcon, ShareNetworkIcon, SwordIcon, TargetIcon } from "@phosphor-icons/react";
import { planClass } from "../skills";
import { fmt } from "../ui";
import { CollectionBonus } from "./characters/collections";
import { activeId, readCharacters } from "../characters";
import { activeBuild, addToGear, GEAR_KEY, itemSlots, OWN_BUILD, readGear, useGearData, type BuildGear } from "./characters/gear";
import { useMem, useToast, type BuildSrc } from "./characters/shared";
import { ShareModal } from "./shared/ShareModal";
import type { PageProps } from "./types";
import { Credit, EntryHead, EntryLink, term, TypePage, useDb, type DbRow } from "./world/db";
import "./world/world.css";

const MONO: CSSProperties = { fontFamily: "var(--pm-mono)" };

// Equipment stats (scripts/scrape-db.mjs), loaded with the page.
type Equip = { il?: number; st?: Record<string, number>; sub?: [id: string, min: number, max: number][]; sell?: number };
const EQUIP = import.meta.glob<Record<string, Equip>>("../../data/db/equip.json", { import: "default" });
const STATS = import.meta.glob<Record<string, [name: string, percent: 0 | 1]>>("../../data/db/stats.json", { import: "default" });
type StatData = { equip: Record<string, Equip>; stats: Record<string, [string, 0 | 1]> };
let statData: Promise<StatData> | undefined;
// Missing or broken files (before the first scrape) → no stats, never a crash.
const loadStats = () =>
  (statData ??= Promise.all([Object.values(EQUIP)[0]?.() ?? {}, Object.values(STATS)[0]?.() ?? {}])
    .then(([equip, stats]) => ({ equip, stats }))
    .catch(() => ({ equip: {}, stats: {} })));

// Adding to the active character's build writes the Character Builder's own
// state (gear.ts): module memory "gear" (what an open builder reads) and
// pm.builderGear (what a reload reads).

// Opened from the database, the builder (by name) or a link; else its list.
export default function Item({ t, go, setHeader, ...rest }: PageProps) {
  return <TypePage type="items" t={t} go={go} setHeader={setHeader} title={t("shell.itemTitle")} card={(row, open) => <ItemCard {...rest} t={t} go={go} setHeader={setHeader} row={row} open={open} />} />;
}

// Prototype pg.item layout, with the scraped data.
function ItemCard({ t, lang, name, onError, settings, save, row, open }: PageProps & { row: DbRow; open: (r: DbRow) => void }) {
  const [share, setShare] = useState(false);
  const activeCls = planClass(settings["pm.class"]);
  // The build open in the builder when it is yours, else your default one.
  const [src] = useMem<BuildSrc>("bSrc", { t: OWN_BUILD, au: name, cls: activeCls, own: true });
  const build = activeBuild(src);
  // A build opened from a character's card belongs to that character (and its class).
  const cls = src.char ? src.cls : activeCls;
  const charId = src.char ?? activeId(settings, readCharacters(settings));
  const [stored, setStored] = useMem<Record<string, BuildGear>>("gear", readGear(settings[GEAR_KEY]));
  const [toast, showToast] = useToast();
  useGearData(); // a new piece's soul imprint lines and enhancement cap come from equip.json
  // Slots the item fits for the class, by name and grade: the builder keeps one
  // id per item the scrape lists twice.
  const fits = useMemo(() => itemSlots(row, cls), [row, cls]);
  const why = fits.length ? "" : row.cat === "weapon" ? t("db.item.notClass", { cls }) : t("db.item.noSlot");
  const add = (view: keyof BuildGear) => {
    const done = addToGear(stored, build, cls, view, row, charId);
    if (!done) return;
    setStored(done.all);
    save(GEAR_KEY, JSON.stringify(done.all)).catch(onError);
    showToast({ title: t(view === "owned" ? "db.item.addedOwned" : "db.item.addedTarget"), text: `${row.name} → ${done.label} · ${build === OWN_BUILD ? t("characters.builder.defaultBuild") : build}` });
  };
  const [data, setData] = useState<StatData>();
  useEffect(() => void loadStats().then(setData), []);
  const rel = useDb(["recipes", "quests"]);
  const eq = data?.equip[row.id];
  const stat = (id: string, v: number) => {
    const [name, pct] = data?.stats[id] ?? [id, 0];
    return { name, value: pct ? `${(v / 100).toLocaleString(lang)}%` : fmt(v, lang) };
  };
  const subtitle = [term(row.sub) ?? term(row.cat), row.lv && `Lv ${row.lv}`, eq?.il && t("db.item.level", { n: eq.il })].filter(Boolean).join(" · ");
  const rewards = rel?.filter((q) => q.rw?.some(([id]) => id === row.id)) ?? [];
  const crafted = rel?.filter((r) => r.out?.[0] === row.id || r.combo === row.id) ?? [];
  const usedIn = rel?.filter((r) => r.in?.some(([id]) => id === row.id)) ?? [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 12 }}>
      <section className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <EntryHead row={row} sub={subtitle} />
        {eq && (eq.st || eq.sub) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <h3 className="wLabel">{t("world.item.stats")}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "5px 10px", fontSize: 13 }}>
                {Object.entries(eq.st ?? {}).map(([id, v]) => {
                  const s = stat(id, v);
                  return (
                    <div key={id} style={{ display: "contents" }}>
                      <span style={{ color: "var(--pm-t2)" }}>{s.name}</span>
                      <span style={MONO}>{s.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="wLabel">{t("world.item.substats")}</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {eq.sub?.map(([id, min, max]) => (
                  <span key={id} className="wTag">
                    {stat(id, min).name} {stat(id, min).value}–{stat(id, max).value}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Wing and title items grant a collection entry: show what it gives. */}
        {row.sub === "getwing" && <CollectionBonus t={t} lang={lang} kind="wings" name={row.name.replace(/ \(Bound\)$/, "")} />}
        {row.sub === "gettitle" && <CollectionBonus t={t} lang={lang} kind="titles" name={row.name.replace(/^Title: /, "")} />}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn fill" disabled={!!why} aria-describedby={why ? "itemWhy" : undefined} onClick={() => add("owned")}>
            <SwordIcon aria-hidden="true" />
            {t("world.item.addBuild")}
          </button>
          <button type="button" className="btn" disabled={!!why} aria-describedby={why ? "itemWhy" : undefined} onClick={() => add("target")}>
            <TargetIcon aria-hidden="true" />
            {t("db.item.addTarget")}
          </button>
          <button type="button" className="btn" onClick={() => setShare(true)}>
            <ShareNetworkIcon aria-hidden="true" />
            {t("world.item.share")}
          </button>
        </div>
        {why && (
          <div id="itemWhy" style={{ fontSize: 12, color: "var(--pm-t3)", marginTop: -8 }}>
            {why}
          </div>
        )}
        <Credit t={t} row={row} />
      </section>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <section className="card">
          <h3 className="wLabel" style={{ marginBottom: 8 }}>
            {t("world.item.sources")}
          </h3>
          {rewards.length + crafted.length === 0 && <div style={{ fontSize: 13, color: "var(--pm-t2)" }}>{rel ? t("db.none") : t("db.loading")}</div>}
          {crafted.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <HammerIcon aria-hidden="true" style={{ color: "var(--pm-t2)", flex: "none" }} />
              <div style={{ flex: 1 }}>
                <EntryLink row={r} onOpen={open} />
              </div>
            </div>
          ))}
          {rewards.map((q) => (
            <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ScrollIcon aria-hidden="true" style={{ color: "var(--pm-t2)", flex: "none" }} />
              <div style={{ flex: 1 }}>
                <EntryLink row={q} onOpen={open} />
              </div>
            </div>
          ))}
        </section>
        <section className="card">
          <h3 className="wLabel" style={{ marginBottom: 8 }}>
            {t("world.item.usedIn")}
          </h3>
          {usedIn.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--pm-t2)" }}>{rel ? t("world.item.usedInNone") : t("db.loading")}</div>
          ) : (
            usedIn.map((r) => <EntryLink key={r.id} row={r} onOpen={open} />)
          )}
        </section>
      </div>
      {toast}
      {share && <ShareModal t={t} lang={lang} kind="item" onClose={() => setShare(false)} onError={onError} />}
    </div>
  );
}
