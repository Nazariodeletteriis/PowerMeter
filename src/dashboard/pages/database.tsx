import { useEffect, useState } from "react";
import { BookOpenIcon, CastleTurretIcon, HammerIcon, MagnifyingGlassIcon, PersonSimpleRunIcon, ScrollIcon, SkullIcon, type Icon } from "@phosphor-icons/react";
import type { Category } from "../../data/db/types";
import type { PageProps } from "./types";
import { DataState, DbList, gd, None, openEntry, openList, useGd } from "./world/db";
import "./world/world.css";

// Categories with a page (prototype pDb.cats icons). Titles, wings and creatures wait for a decision (F10).
const CATS: [Category, Icon][] = [
  ["item", BookOpenIcon],
  ["monster", SkullIcon],
  ["quest", ScrollIcon],
  ["dungeon", CastleTurretIcon],
  ["recipe", HammerIcon],
  ["skill", PersonSimpleRunIcon],
];
const ICON = Object.fromEntries(CATS) as Record<Category, Icon>;

export default function Database({ t, go, setHeader }: PageProps) {
  const title = t("world.db.title");
  useEffect(() => setHeader({ title }), [setHeader, title]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | null>(null);
  const query = q.trim();
  // Search after a short pause in typing.
  const [typed, setTyped] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setTyped(query), 200);
    return () => clearTimeout(id);
  }, [query]);
  const searching = typed.length >= 2;
  const counts = useGd(gd.counts, "counts");
  const hits = useGd(() => (searching ? gd.search(typed, cat ?? undefined) : Promise.resolve([])), `${typed}|${cat}`);
  const found = hits.data?.filter((h) => ICON[h.category]);

  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="wDbHint">{t("world.db.hint")}</div>
      <label className="wDbSearch">
        <MagnifyingGlassIcon aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("world.db.placeholder")} aria-label={t("world.db.placeholder")} />
      </label>

      {!searching ? (
        <>
          <h2 className="kicker" style={{ marginBottom: 12 }}>
            {t("world.db.browse")}
          </h2>
          {counts.error ? (
            <DataState t={t} error={counts.error} retry={counts.retry} />
          ) : (
            <div className="wDbCats">
              {CATS.map(([id, Ic]) => {
                const n = counts.data?.find((c) => c.category === id)?.n;
                return (
                  <button key={id} type="button" className="wBtn wDbCat" onClick={() => openList(go, id)}>
                    <span className="ic">
                      <Ic aria-hidden="true" />
                    </span>
                    <span>
                      <span style={{ display: "block", fontWeight: 500 }}>{t(`world.cat.${id}`)}</span>
                      <span className="mono" style={{ display: "block", fontSize: 11, color: "var(--pm-t3)" }}>
                        {n == null ? " " : t("world.db.entries", { n: n.toLocaleString() })}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }} role="group" aria-label={t("world.db.categories")}>
            {[null, ...CATS.map(([id]) => id)].map((id) => (
              <button key={id ?? "all"} type="button" className="wChip" aria-pressed={id === cat} onClick={() => setCat(id)}>
                {id ? t(`world.cat.${id}`) : t("world.db.all")}
              </button>
            ))}
            {found && (
              <span style={{ fontSize: 12, color: "var(--pm-t3)", marginLeft: 6 }} aria-live="polite">
                {t("world.db.results", { n: found.length.toLocaleString() })}
              </span>
            )}
          </div>
          {!found ? (
            <DataState t={t} error={hits.error} retry={hits.retry} />
          ) : found.length === 0 ? (
            <div style={{ padding: "30px 0" }}>
              <div style={{ fontSize: 16, marginBottom: 4 }}>{t("world.db.noResults", { q: typed })}</div>
              <None>{t("world.db.noResultsHint")}</None>
            </div>
          ) : (
            <DbList
              key={`${typed}|${cat}`}
              t={t}
              rows={found.map((h) => ({ id: `${h.category}:${h.id}`, name: h.name, kind: t(`world.cat.${h.category}`), grade: null, level: null, icon: null }))}
              onPick={(r) => {
                const i = r.id.indexOf(":");
                openEntry(go, r.id.slice(0, i) as Category, r.id.slice(i + 1));
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
