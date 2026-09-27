import { useEffect, useState } from "react";
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
import { CollectionBonus } from "./characters/collections";
import type { PageProps } from "./types";
import { DB_TYPES, dbCount, DbList, EntryCard, matches, openEntry, PAGE_OF, selKey, useDb, type DbRow, type DbType } from "./world/db";
import "./world/world.css";

/** sessionStorage key the item page reads to know which entry to show (an id, or a name from the builder). */
export const SELECTED_ITEM = selKey("items");

// Prototype pDb.cats icons.
const ICONS: Record<DbType, Icon> = {
  items: BookOpenIcon,
  itemSets: GearSixIcon,
  recipes: HammerIcon,
  quests: ScrollIcon,
  achievements: TrophyIcon,
  dungeons: CastleTurretIcon,
  titles: CrownSimpleIcon,
  npcs: PersonIcon,
  wings: FeatherIcon,
  pets: CatIcon,
  gathering: PlantIcon,
  skills: PersonSimpleRunIcon,
  daevanionBoards: SquaresFourIcon,
  daevanionNodes: LightningIcon,
};

export default function Database({ t, lang, go, setHeader }: PageProps) {
  const title = t("shell.databaseTitle");
  useEffect(() => setHeader({ title }), [setHeader, title]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<DbType | null>(null);
  // An entry of a type without its own page (set by openEntry).
  const [open, setOpen] = useState<DbRow | { type: DbType; id: string } | null>(() => {
    const type = sessionStorage.getItem("world.dbType") as DbType | null;
    const id = type && sessionStorage.getItem(selKey(type));
    return type && id ? { type, id } : null;
  });
  const query = q.trim();
  const searching = query.length >= 3;
  // Searching loads every type; a category only its own.
  const rows = useDb(searching ? DB_TYPES : cat ? [cat] : open ? [open.type] : []);
  const found = rows && matches(cat ? rows.filter((r) => r.type === cat) : rows, searching ? query : "");
  const entry = open && ("name" in open ? open : rows?.find((r) => r.type === open.type && r.id === open.id));
  const pick = (r: DbRow) => {
    if (PAGE_OF[r.type]) return openEntry(go, r.type, r.id);
    sessionStorage.setItem("world.dbType", r.type);
    sessionStorage.setItem(selKey(r.type), r.id);
    setOpen(r);
  };
  const close = () => {
    sessionStorage.removeItem("world.dbType");
    setOpen(null);
  };

  if (open) {
    return (
      <div style={{ maxWidth: 1100 }}>
        <button type="button" className="btn sm" style={{ marginBottom: 12 }} onClick={close}>
          <ArrowLeftIcon aria-hidden="true" />
          {t("db.back")}
        </button>
        {entry ? (
          <EntryCard
            t={t}
            row={entry}
            open={pick}
            extra={(entry.type === "wings" || entry.type === "titles" || entry.type === "pets") && <CollectionBonus t={t} lang={lang} kind={entry.type} id={entry.id} />}
          />
        ) : <div style={{ color: "var(--pm-t2)" }}>{t("db.loading")}</div>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="wDbHint">{t("world.db.hint")}</div>
      <div className="wDbSearch">
        <MagnifyingGlassIcon aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("world.db.placeholder")} aria-label={t("world.db.placeholder")} />
        {query.length > 0 && !searching && <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t("world.db.short")}</span>}
      </div>

      {!cat && !searching ? (
        <>
          <h2 className="kicker" style={{ marginBottom: 12 }}>
            {t("world.db.browse")}
          </h2>
          <div className="wDbCats">
            {DB_TYPES.map((id) => {
              const Ic = ICONS[id];
              return (
                <button key={id} type="button" className="wBtn wDbCat" onClick={() => setCat(id)}>
                  <span className="ic">
                    <Ic aria-hidden="true" />
                  </span>
                  <span>
                    <span style={{ display: "block", fontWeight: 500 }}>{t(`world.cat.${id}`)}</span>
                    <span className="mono" style={{ display: "block", fontSize: 11, color: "var(--pm-t3)" }}>
                      {t("world.db.entries", { n: dbCount(id).toLocaleString() })}
                    </span>
                  </span>
                </button>
              );
            })}
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
            {found && <span style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("world.db.results", { n: found.length.toLocaleString() })}</span>}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {[null, ...DB_TYPES].map((id) => (
              <button key={id ?? "all"} type="button" className="wChip" aria-pressed={id === cat} onClick={() => setCat(id)}>
                {id ? t(`world.cat.${id}`) : t("world.db.all")}
              </button>
            ))}
          </div>
          {!found ? (
            <div style={{ color: "var(--pm-t2)" }}>{t("db.loading")}</div>
          ) : found.length === 0 ? (
            <div style={{ padding: "30px 0", color: "var(--pm-t2)" }}>
              <div style={{ fontSize: 16, color: "var(--pm-t1)", marginBottom: 4 }}>{t("world.db.noResults", { q })}</div>
              {t("world.db.noResultsHint")}
            </div>
          ) : (
            <DbList key={`${cat}:${query}`} t={t} rows={found} onPick={pick} showType={!cat} />
          )}
        </>
      )}
    </div>
  );
}
