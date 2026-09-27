import { useEffect, useState, type CSSProperties } from "react";
import { HammerIcon, ScrollIcon, ShareNetworkIcon, ShoppingCartIcon, SwordIcon } from "@phosphor-icons/react";
import { fmt } from "../ui";
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

// Opened from the database, the builder (by name) or a link; else its list.
export default function Item({ t, go, setHeader, ...rest }: PageProps) {
  return <TypePage type="items" t={t} go={go} setHeader={setHeader} title={t("shell.itemTitle")} card={(row, open) => <ItemCard {...rest} t={t} go={go} setHeader={setHeader} row={row} open={open} />} />;
}

// Prototype pg.item layout, with the scraped data.
function ItemCard({ t, lang, onError, row, open }: PageProps & { row: DbRow; open: (r: DbRow) => void }) {
  const [share, setShare] = useState(false);
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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn fill">
            <SwordIcon aria-hidden="true" />
            {t("world.item.addBuild")}
          </button>
          <button type="button" className="btn">
            <ShoppingCartIcon aria-hidden="true" />
            {t("world.item.addShopping")}
          </button>
          <button type="button" className="btn" onClick={() => setShare(true)}>
            <ShareNetworkIcon aria-hidden="true" />
            {t("world.item.share")}
          </button>
        </div>
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
      {share && <ShareModal t={t} lang={lang} kind="item" onClose={() => setShare(false)} onError={onError} />}
    </div>
  );
}
