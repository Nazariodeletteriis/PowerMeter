import { useState, type CSSProperties } from "react";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CastleTurretIcon,
  CatIcon,
  CrownSimpleIcon,
  FeatherIcon,
  GearSixIcon,
  HammerIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  PersonIcon,
  PersonSimpleRunIcon,
  PlantIcon,
  ScrollIcon,
  SquaresFourIcon,
  TrophyIcon,
  type Icon,
} from "@phosphor-icons/react";
import { DB_COUNTS, DB_ITEMS } from "../sample/world";
import { RARITY } from "../ui";
import type { PageProps } from "./types";
import "./world/world.css";

/** sessionStorage key the item page reads to know which entry to show. */
export const SELECTED_ITEM = "world.item";

// Prototype pDb.cats, in its order.
const CATEGORIES: [id: string, icon: Icon][] = [
  ["items", BookOpenIcon],
  ["itemSets", GearSixIcon],
  ["recipes", HammerIcon],
  ["quests", ScrollIcon],
  ["achievements", TrophyIcon],
  ["dungeons", CastleTurretIcon],
  ["titles", CrownSimpleIcon],
  ["npcs", PersonIcon],
  ["wings", FeatherIcon],
  ["pets", CatIcon],
  ["gathering", PlantIcon],
  ["skills", PersonSimpleRunIcon],
  ["daevanionBoards", SquaresFourIcon],
  ["daevanionNodes", LightningIcon],
];

export default function Database({ t, go }: PageProps) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);
  const query = q.toLowerCase();
  const searching = query.length >= 3;
  const rows = DB_ITEMS.filter((i) => (!cat || i.cat === cat) && (!searching || i.name.toLowerCase().includes(query)));

  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="wDbHint">{t("world.db.hint")}</div>
      <div className="wDbSearch">
        <MagnifyingGlassIcon aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("world.db.placeholder")}
          aria-label={t("world.db.placeholder")}
        />
        {query.length > 0 && !searching && <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t("world.db.short")}</span>}
      </div>

      {!cat && !searching ? (
        <>
          <h2 className="kicker" style={{ marginBottom: 12 }}>
            {t("world.db.browse")}
          </h2>
          <div className="wDbCats">
            {CATEGORIES.map(([id, Ic]) => (
              <button key={id} type="button" className="wBtn wDbCat" onClick={() => setCat(id)}>
                <span className="ic">
                  <Ic aria-hidden="true" />
                </span>
                <span>
                  <span style={{ display: "block", fontWeight: 500 }}>{t(`world.cat.${id}`)}</span>
                  <span className="mono" style={{ display: "block", fontSize: 11, color: "var(--pm-t3)" }}>
                    {t("world.db.entries", { n: DB_COUNTS[id] })}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                setCat(null);
                setQ("");
              }}
            >
              <ArrowLeftIcon aria-hidden="true" />
              {t("world.db.categories")}
            </button>
            <span style={{ fontWeight: 500 }}>{cat ? t(`world.cat.${cat}`) : t("world.db.allCategories")}</span>
            <span style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("world.db.results", { n: rows.length })}</span>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {[null, ...CATEGORIES.map(([id]) => id)].map((id) => (
              <button key={id ?? "all"} type="button" className="wChip" aria-pressed={id === cat} onClick={() => setCat(id)}>
                {id ? t(`world.cat.${id}`) : t("world.db.all")}
              </button>
            ))}
          </div>
          {rows.length === 0 && (
            <div style={{ padding: "30px 0", color: "var(--pm-t2)" }}>
              <div style={{ fontSize: 16, color: "var(--pm-t1)", marginBottom: 4 }}>{t("world.db.noResults", { q })}</div>
              {t("world.db.noResultsHint")}
            </div>
          )}
          <div className="card" style={{ padding: "4px 8px" }}>
            {rows.map((r) => {
              const col = r.rarity ? RARITY[r.rarity] : undefined;
              return (
                <button
                  key={r.name}
                  type="button"
                  className="wBtn wDbRow"
                  onClick={() => {
                    sessionStorage.setItem(SELECTED_ITEM, r.name);
                    go("item");
                  }}
                >
                  <span className="ic" style={{ "--c": col ?? "var(--pm-grey)" } as CSSProperties} />
                  <span style={{ color: col ?? "var(--pm-t1)" }}>{r.name}</span>
                  <span style={{ color: "var(--pm-t2)", fontSize: 12 }}>
                    {t(`world.cat.${r.cat}`)} · {t(r.type, { n: r.n ?? "" })}
                  </span>
                  <span className="mono" style={{ fontSize: 12, color: "var(--pm-t2)" }}>
                    Lv {r.lv}
                  </span>
                  <span style={{ fontSize: 12, color: col ?? "var(--pm-t1)" }}>{r.rarity ?? "—"}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
