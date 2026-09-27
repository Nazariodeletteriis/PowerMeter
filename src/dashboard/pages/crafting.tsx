import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { CaretRightIcon, HammerIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import CHANCE from "../../data/crafting.json";
import { readCharacters, activeId } from "../characters";
import { Card, EmptyState, RARITY, fmt } from "../ui";
import type { PageProps } from "./types";
import { DbIcon, EntryHead, itemById, openEntry, rarity, term, useDb, type DbRow } from "./world/db";
import { buildTree, indexRecipes, totals, type Node, type Recipe } from "./crafting/tree";
import "./world/world.css";

// Crafting calculator: every craftable item of one faction (db recipes), its
// upgrade chain, recipe tree and the materials for N of it, minus what the
// user has. Chains and totals: ./crafting/tree.ts.

const KEY = "pm.crafting";
type Saved = { race?: string; sel?: string; n?: number; exp?: boolean; have?: Record<string, number> };
/** Product item categories, in list order: weapons first. */
const TYPES = ["weapon", "armor", "accessory", "usable", "misc"];
const GRADES = [11, 21, 31, 41];
const GEAR = TYPES.slice(0, 3);
const chances = CHANCE as Record<string, number>;

const itemRow = (id: string): DbRow => itemById.get(id) ?? { id, name: id, type: "items" };
const typeOf = (r: Recipe) => itemById.get(r.out![0])?.cat ?? "misc";

function Icon({ row, size }: { row: DbRow; size: number }) {
  const rar = rarity(row);
  return (
    <span style={{ width: size, height: size, flex: "none", borderRadius: 5, border: `1.5px solid ${rar ? RARITY[rar] : "var(--pm-grey)"}`, background: "var(--pm-s2)" }}>
      <DbIcon row={row} />
    </span>
  );
}

/** Item name in its rarity color; opens the item's database page. */
function ItemName({ row, go }: { row: DbRow; go: PageProps["go"] }) {
  const rar = rarity(row);
  return (
    <button type="button" className="linkBtn" style={{ fontSize: 13, color: rar ? RARITY[rar] : "var(--pm-t1)", textAlign: "left" }} onClick={() => openEntry(go, "items", row.id)}>
      {row.name}
    </button>
  );
}

export default function Crafting({ t, lang, settings, save, go, onError, setHeader }: PageProps) {
  const title = t("nav.crafting");
  useEffect(() => setHeader({ title }), [setHeader, title]);
  const recipes = useDb(["recipes"]) as Recipe[] | undefined;

  const saved: Saved = useMemo(() => {
    try {
      return JSON.parse(settings[KEY] ?? "{}") ?? {};
    } catch {
      return {};
    }
  }, [settings]);
  const set = (patch: Saved) => save(KEY, JSON.stringify({ ...saved, ...patch })).catch(onError);
  const chars = readCharacters(settings);
  const faction = chars.find((c) => c.id === activeId(settings, chars))?.faction;
  const race = saved.race ?? (faction === "asmodian" ? "dark" : "light");
  const count = saved.n ?? 1;
  const have = saved.have ?? {};

  const [q, setQ] = useState("");
  const [prof, setProf] = useState("");
  const [type, setType] = useState("");
  const [grade, setGrade] = useState(0);

  const ix = useMemo(() => recipes && indexRecipes(recipes, race), [recipes, race]);
  const list = useMemo(
    () =>
      (recipes ?? [])
        .filter((r) => r.race === race && r.in?.length && r.out)
        .sort((a, b) => TYPES.indexOf(typeOf(a)) - TYPES.indexOf(typeOf(b)) || (a.sub ?? "").localeCompare(b.sub ?? "") || (a.lv ?? 999) - (b.lv ?? 999) || a.name.localeCompare(b.name)),
    [recipes, race],
  );
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = list.filter(
    (r) => (!prof || r.cat === prof) && (!type || typeOf(r) === type) && (!grade || r.grade === grade) && words.every((w) => r.name.toLowerCase().includes(w)),
  );
  const profs = [...new Set(list.map((r) => r.cat!))].sort();

  // A recipe of the other faction (saved before switching) → its twin by name.
  const pick = recipes?.find((r) => r.id === saved.sel);
  const sel = pick && (pick.race === race ? pick : list.find((r) => r.name === pick.name));
  const tree = sel && ix && buildTree(sel, count, ix, chances, have, !!saved.exp);
  const sum = tree && ix && totals(tree, ix);
  const chain: Node[] = [];
  for (let n = tree; n; n = n.kids.find((k) => k.recipe && GEAR.includes(itemById.get(k.id)?.cat ?? ""))) chain.unshift(n);

  const setHave = (id: string, v: string) => {
    const next = { ...have };
    const n = Math.max(0, Math.floor(Number(v) || 0));
    if (n) next[id] = n;
    else delete next[id];
    set({ have: next });
  };

  const renderNode = (n: Node, root?: boolean) => {
    const row = itemRow(n.id);
    const line = (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minHeight: 30, verticalAlign: "middle" }}>
        <Icon row={row} size={22} />
        <ItemName row={row} go={go} />
        <span className="mono" style={{ fontSize: 12, color: "var(--pm-t2)" }}>
          ×{fmt(n.qty, lang)}
        </span>
        {n.recipe && !root && (
          <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>
            {t("crafting.crafts", { n: fmt(n.crafts, lang) })}
            {n.chance !== undefined && ` · ${t("crafting.chance", { p: Math.round(n.chance * 100) })}`}
          </span>
        )}
        {n.have > 0 && <span className="badge">{t("crafting.owned", { n: fmt(n.have, lang) })}</span>}
      </span>
    );
    if (!n.kids.length) return <li key={n.id}>{line}</li>;
    return (
      <li key={n.id}>
        <details open>
          <summary style={{ cursor: "pointer" }}>{line}</summary>
          <ul style={{ listStyle: "none", margin: 0, padding: "0 0 0 14px", marginLeft: 10, borderLeft: "1px solid var(--pm-line)" }}>{n.kids.map((k) => renderNode(k))}</ul>
        </details>
      </li>
    );
  };

  const matRows = (rows: { id: string; need: number }[]) =>
    rows.map(({ id, need }) => {
      const row = itemRow(id);
      const missing = Math.max(0, need - (have[id] ?? 0));
      return (
        <div key={id} className="gridRow" style={{ gridTemplateColumns: "24px minmax(0,1fr) 64px 84px 64px" }}>
          <Icon row={row} size={24} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <ItemName row={row} go={go} />
          </span>
          <span className="mono" style={{ textAlign: "right" }}>
            {fmt(need, lang)}
          </span>
          <input
            className="input sm mono"
            type="number"
            min={0}
            inputMode="numeric"
            style={{ width: "100%", height: 28, textAlign: "right" }}
            aria-label={`${t("crafting.have")}: ${row.name}`}
            value={have[id] ?? ""}
            placeholder="0"
            onChange={(e) => setHave(id, e.target.value)}
          />
          <span className="mono" style={{ textAlign: "right", color: missing ? "var(--pm-redt)" : "var(--pm-okt)" }}>
            {fmt(missing, lang)}
          </span>
        </div>
      );
    });
  const missingCount = sum ? [...sum.raw, ...sum.parts].filter((r) => r.need > (have[r.id] ?? 0)).length : 0;

  let lastType = "";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "340px minmax(0,1fr)", gap: 16, alignItems: "start", maxWidth: 1400 }}>
      <section className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10, position: "sticky", top: 0, maxHeight: "calc(100vh - 150px)" }}>
        <div style={{ display: "flex", gap: 6 }} role="group" aria-label={t("crafting.faction")}>
          {(["light", "dark"] as const).map((r) => (
            <button key={r} type="button" className="wChip" aria-pressed={race === r} onClick={() => set({ race: r })}>
              {t(r === "light" ? "collections.elyos" : "collections.asmodian")}
            </button>
          ))}
        </div>
        <div className="wDbSearch" style={{ margin: 0 }}>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("crafting.search")} aria-label={t("crafting.search")} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <label className="field">
            {t("crafting.profession")}
            <select className="input sm" style={{ width: "100%", minWidth: 0 }} value={prof} onChange={(e) => setProf(e.target.value)}>
              <option value="">{t("crafting.all")}</option>
              {profs.map((p) => (
                <option key={p} value={p}>
                  {term(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("crafting.type")}
            <select className="input sm" style={{ width: "100%", minWidth: 0 }} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">{t("crafting.all")}</option>
              {TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {t(`crafting.type.${ty}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t("crafting.grade")}
            <select className="input sm" style={{ width: "100%", minWidth: 0 }} value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
              <option value={0}>{t("crafting.all")}</option>
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {rarity({ id: "", name: "", type: "items", grade: g })}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{recipes ? t("crafting.results", { n: shown.length }) : t("db.loading")}</div>
        <div style={{ overflowY: "auto", margin: "0 -4px", minHeight: 0 }}>
          {recipes && !shown.length && <div style={{ padding: "12px 4px", color: "var(--pm-t2)" }}>{t("crafting.noResults")}</div>}
          {shown.map((r) => {
            const ty = typeOf(r);
            const head = ty !== lastType && (lastType = ty);
            const row = itemRow(r.out![0]);
            const rar = rarity(row);
            const on = r.id === sel?.id;
            return (
              <div key={r.id}>
                {head && (
                  <h3 className="kicker" style={{ padding: "10px 4px 4px" }}>
                    {t(`crafting.type.${ty}`)}
                  </h3>
                )}
                <button
                  type="button"
                  className="wBtn wDbRow"
                  aria-current={on || undefined}
                  style={{ gridTemplateColumns: "28px minmax(0,1fr) auto", minHeight: 38, background: on ? "var(--pm-s2)" : undefined, boxShadow: on ? "inset 2px 0 0 var(--pm-red)" : undefined }}
                  onClick={() => set({ sel: r.id })}
                >
                  <span className="ic" style={{ "--c": rar ? RARITY[rar] : "var(--pm-grey)" } as CSSProperties}>
                    <DbIcon row={row} />
                  </span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: rar ? RARITY[rar] : "var(--pm-t1)" }}>
                    {r.name}
                    {r.out![1] > 1 && <span style={{ color: "var(--pm-t2)" }}> ×{r.out![1]}</span>}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--pm-t3)", whiteSpace: "nowrap" }}>{[term(r.sub?.startsWith("misc") ? undefined : r.sub), r.lv && `Lv ${r.lv}`].filter(Boolean).join(" · ")}</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {!sel || !tree || !sum ? (
        <section className="card">
          <EmptyState icon={<HammerIcon size={32} aria-hidden="true" />} title={t("crafting.pick")} text={t("crafting.pickText")} />
        </section>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <section className="card" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <EntryHead row={itemRow(sel.out![0])} sub={[term(sel.cat), sel.lv && `Lv ${sel.lv}`].filter(Boolean).join(" · ")} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label className="field">
                {t("crafting.count")}
                <input className="input sm mono" type="number" min={1} max={999} style={{ width: 110 }} value={count} onChange={(e) => set({ n: Math.min(999, Math.max(1, Math.floor(Number(e.target.value) || 1))) })} />
              </label>
              <label className="check" style={{ fontSize: 12, color: "var(--pm-t2)", maxWidth: 260 }}>
                <input type="checkbox" checked={!!saved.exp} onChange={(e) => set({ exp: e.target.checked })} />
                {t("crafting.expected")}
              </label>
            </div>
          </section>

          {chain.length > 1 && (
            <Card title={t("crafting.chain")}>
              <ol style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {chain.map((n, i) => {
                  const row = itemRow(n.id);
                  const rar = rarity(row);
                  return (
                    <li key={n.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {i > 0 && <CaretRightIcon aria-hidden="true" style={{ color: "var(--pm-t3)" }} />}
                      <button
                        type="button"
                        className="wBtn"
                        aria-current={n.recipe === sel || undefined}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, border: `1px solid ${n.recipe === sel ? "var(--pm-red)" : "var(--pm-line)"}`, maxWidth: 240 }}
                        onClick={() => n.recipe && set({ sel: n.recipe.id })}
                      >
                        <Icon row={row} size={32} />
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 12, color: rar ? RARITY[rar] : "var(--pm-t1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
                          <span style={{ display: "block", fontSize: 11, color: "var(--pm-t3)" }}>
                            {[n.recipe?.lv && `Lv ${n.recipe.lv}`, n.chance !== undefined && t("crafting.chance", { p: Math.round(n.chance * 100) })].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}

            <Card title={t("crafting.materials")} aside={<span style={{ fontSize: 12, color: missingCount ? "var(--pm-redt)" : "var(--pm-okt)" }}>{missingCount ? t("crafting.missingN", { n: missingCount }) : t("crafting.done")}</span>}>
              {(
                [
                  ["crafting.raw", sum.raw],
                  ["crafting.parts", sum.parts],
                ] as const
              ).map(
                ([k, rows]) =>
                  rows.length > 0 && (
                    <div key={k} style={{ marginTop: 12 }}>
                      <div className="gridHead" style={{ gridTemplateColumns: "24px minmax(0,1fr) 64px 84px 64px" }}>
                        <span />
                        <span>{t(k)}</span>
                        <span style={{ textAlign: "right" }}>{t("crafting.need")}</span>
                        <span style={{ textAlign: "right" }}>{t("crafting.have")}</span>
                        <span style={{ textAlign: "right" }}>{t("crafting.missing")}</span>
                      </div>
                      {matRows(rows)}
                    </div>
                  ),
              )}
            </Card>
            <Card title={t("crafting.tree")}>
              <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, fontSize: 13 }}>{renderNode(tree, true)}</ul>
            </Card>
        </div>
      )}
    </div>
  );
}
