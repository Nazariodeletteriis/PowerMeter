import { useEffect, useMemo, useState } from "react";
import { ChartLineIcon, PlugsIcon, StarIcon, StorefrontIcon } from "@phosphor-icons/react";
import { EmptyState, fmt } from "../ui";
import type { PageProps } from "./types";
import { EntryHead, itemById, matches, openEntry, term, type DbRow } from "./world/db";
import { useEquip } from "./calc/equipData";
import { LineChart } from "./calc/LineChart";
import { PickPanel, Tile } from "./calc/PickPanel";
import "./calc/calc.css";

// Marketplace (replaces the shopping list): the Auction House's prices, trend
// and statistics per item, plus a watchlist. There is no market source yet:
// NCSoft publishes no Aion 2 market API (PLAYNC Developers' open API covers
// Lineage2M only, checked 2026-09-28), questlog.gg has no market data, and the
// community trackers are KR-only user reports. So every price reads "no data"
// and the chart stays empty; the only real number is the item's vendor sell
// price (questlog sellPrice, src/data/db/equip.json). A source plugs in by
// filling the price tiles and `history` below, through a Rust command if it needs
// the network.

const KEY = "pm.market";
type Saved = { sel?: string; watch?: string[] };
// One row per name and grade (the scrape lists some items twice), as gear.ts.
const seen = new Set<string>();
const ALL = [...itemById.values()].filter((i) => !seen.has(i.name + i.grade) && seen.add(i.name + i.grade));
const CATS = [...new Set(ALL.map((i) => i.cat ?? ""))].filter(Boolean).sort();

export default function Market({ t, lang, settings, save, go, onError, setHeader }: PageProps) {
  const title = t("nav.marketplace");
  useEffect(() => setHeader({ title }), [setHeader, title]);
  const saved: Saved = useMemo(() => {
    try {
      return JSON.parse(settings[KEY] ?? "{}") ?? {};
    } catch {
      return {};
    }
  }, [settings]);
  const set = (patch: Saved) => save(KEY, JSON.stringify({ ...saved, ...patch })).catch(onError);
  const watch = saved.watch ?? [];
  const eq = useEquip();

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [onlyWatch, setOnlyWatch] = useState(false);
  const pool = onlyWatch ? watch.map((id) => itemById.get(id)).filter((r): r is DbRow => !!r) : ALL;
  const shown = matches(pool, q).filter((r) => !cat || r.cat === cat);
  const item = saved.sel ? itemById.get(saved.sel) : undefined;
  const watched = !!item && watch.includes(item.id);
  const toggleWatch = (id: string) => set({ watch: watch.includes(id) ? watch.filter((x) => x !== id) : [...watch, id] });

  // ponytail: no market source before launch; the chart below is what it will fill.
  const history: [time: number, price: number][] = [];
  const kinah = (n?: number) => (n === undefined ? "—" : t("market.kinah", { n: fmt(n, lang) }));
  const day = (ms: number) => new Date(ms).toLocaleDateString(lang, { day: "numeric", month: "short" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1400 }}>
      <div className="notice" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <PlugsIcon aria-hidden="true" style={{ fontSize: 22, flex: "none", color: "var(--pm-warn)", marginTop: 2 }} />
        <div>
          <div style={{ color: "var(--pm-t1)", fontSize: 14 }}>{t("market.sourceTitle")}</div>
          <div style={{ fontSize: 13, maxWidth: "90ch" }}>{t("market.sourceText")}</div>
        </div>
      </div>

      <section className="card">
        <div className="cardHead">
          <h2 className="kicker">{t("market.stats")}</h2>
        </div>
        <div className="cTiles" style={{ marginTop: 12 }}>
          {(["tracked", "listings", "volume", "change"] as const).map((k) => (
            // Only the watch list count is known; the rest needs a market source.
            <Tile key={k} label={t(`market.stat.${k}`)} value={k === "tracked" ? fmt(watch.length, lang) : "—"} sub={k === "tracked" ? undefined : t("market.noData")} />
          ))}
        </div>
      </section>

      <div className="cLayout">
        <PickPanel
          t={t}
          lang={lang}
          q={q}
          setQ={setQ}
          placeholder={t("market.search")}
          rows={shown}
          sel={item?.id}
          onPick={(r) => set({ sel: r.id })}
          sub={(r) => [term(r.cat), term(r.sub), r.lv && `Lv ${r.lv}`].filter(Boolean).join(" · ")}
          empty={t(onlyWatch && !watch.length ? "market.watchEmpty" : "calc.noMatch")}
          filters={
            <div style={{ display: "flex", gap: 6, alignItems: "end" }}>
              <label className="field" style={{ flex: 1 }}>
                {t("market.category")}
                <select className="input sm" style={{ width: "100%" }} value={cat} onChange={(e) => setCat(e.target.value)}>
                  <option value="">{t("crafting.all")}</option>
                  {CATS.map((c) => (
                    <option key={c} value={c}>
                      {term(c)}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="wChip" style={{ height: 34, borderRadius: 6 }} aria-pressed={onlyWatch} onClick={() => setOnlyWatch(!onlyWatch)}>
                <StarIcon aria-hidden="true" weight={onlyWatch ? "fill" : "regular"} style={{ verticalAlign: "-0.15em" }} /> {t("market.watchlist", { n: watch.length })}
              </button>
            </div>
          }
        />

        {!item ? (
          <section className="card">
            <EmptyState icon={<StorefrontIcon aria-hidden="true" />} title={t("market.pickTitle")} text={t("market.pickText")} />
          </section>
        ) : (
          <div className="cMain">
            <section className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <EntryHead row={item} sub={[term(item.cat), term(item.sub), item.lv && `Lv ${item.lv}`].filter(Boolean).join(" · ")} />
                </div>
                <button type="button" className="btn" aria-pressed={watched} onClick={() => toggleWatch(item.id)}>
                  <StarIcon aria-hidden="true" weight={watched ? "fill" : "regular"} style={{ color: watched ? "var(--pm-warn)" : undefined }} />
                  {t("market.watch")}
                </button>
                <button type="button" className="btn" onClick={() => openEntry(go, "items", item.id)}>
                  {t("market.openDb")}
                </button>
              </div>
              <div className="cTiles">
                {(["low", "avg7", "count"] as const).map((k) => (
                  <Tile key={k} label={t(`market.${k}`)} value="—" sub={t("market.noData")} />
                ))}
                <Tile label={t("market.vendor")} value={kinah(eq?.[item.id]?.sell)} sub={t("market.vendorSub")} />
              </div>
            </section>

            <section className="card">
              <div className="cardHead">
                <h2 className="kicker">{t("market.trend")}</h2>
              </div>
              {history.length > 1 ? (
                <div style={{ marginTop: 12 }}>
                  <LineChart points={history} label={t("market.trend")} fx={day} fy={(y) => kinah(y)} />
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  <EmptyState icon={<ChartLineIcon aria-hidden="true" />} title={t("market.trendEmptyTitle")} text={t("market.trendEmptyText")} />
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
