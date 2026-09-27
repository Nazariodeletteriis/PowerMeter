import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowBendDownRightIcon, HammerIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
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
/** `luck`: an upgrade recipe's Splendent piece comes from combo luck, not from upgrading the normal one. */
type Saved = { race?: string; sel?: string; n?: number; exp?: boolean; luck?: boolean; have?: Record<string, number> };
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
  const upBase = sel && ix?.upBase.get(sel.id);
  const luck = !!upBase && !!saved.luck;
  const tree = sel && ix && buildTree(sel, count, ix, chances, have, !!saved.exp, luck);
  const sum = tree && ix && totals(tree, ix);
  // From the tree without owned parts: an owned tier must not cut the chain.
  const isGear = (k: Node) => !!k.recipe && GEAR.includes(itemById.get(k.id)?.cat ?? "");
  const chain: Node[] = [];
  for (let n = sel && ix && buildTree(sel, 1, ix, chances, {}, false, luck); n; n = n.kids.find(isGear)) chain.unshift(n);

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

  /** An item as a small bordered chip: icon, name, ×qty. `hi` marks the piece the plan needs. */
  const chip = (id: string, qty?: number, hi?: boolean) => {
    const row = itemRow(id);
    return (
      <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 8px 3px 3px", borderRadius: 6, border: `1px solid ${hi ? "var(--pm-red)" : "var(--pm-line)"}`, background: hi ? "var(--pm-tint)" : undefined, fontSize: 12 }}>
        <Icon row={row} size={22} />
        <ItemName row={row} go={go} />
        {qty !== undefined && <span className="mono" style={{ color: "var(--pm-t2)" }}>×{fmt(qty, lang)}</span>}
      </span>
    );
  };
  /** One outcome of a craft: the item, its chance, and whether the plan needs it. */
  const outcome = (label: string, id: string, pct: number, tag?: string) => (
    <div style={{ flex: "1 1 220px", display: "flex", flexDirection: "column", gap: 6, padding: 10, borderRadius: 6, border: `1px solid ${tag ? "var(--pm-red)" : "var(--pm-line)"}`, background: tag ? "var(--pm-tint)" : undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11 }}>
        <span className="kicker" style={{ color: tag ? "var(--pm-redt)" : undefined }}>{label}</span>
        <span className="mono" style={{ color: "var(--pm-t2)" }}>{pct}%</span>
      </div>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Icon row={itemRow(id)} size={32} />
        <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <ItemName row={itemRow(id)} go={go} />
          <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{rarity(itemRow(id))}</span>
        </span>
      </span>
      {tag && <span style={{ fontSize: 11, color: "var(--pm-redt)" }}>{tag}</span>}
    </div>
  );
  const renderStep = (n: Node, i: number) => {
    const r = n.recipe!;
    const next: Node | undefined = chain[i + 1];
    const gear = n.kids.find(isGear);
    const mats = n.kids.filter((k) => k !== gear);
    const upgrade = ix!.upBase.has(r.id);
    const split = !upgrade && r.combo && r.combo !== r.out![0];
    const p = (chances[r.id] ?? 0) / 10000;
    // What this step must yield: the next step's input, else the plan's goal.
    const want = next ? next.kids.find(isGear)?.id : chain[chain.length - 1].id;
    const tagOf = (id: string) => (id !== want ? undefined : next ? t("crafting.neededFor", { n: i + 2 }) : t("crafting.goal"));
    const up = next || upgrade || upBase ? undefined : ix!.upOf.get(r.id);
    return (
      <li key={n.id} style={{ display: "grid", gridTemplateColumns: "28px minmax(0,1fr)", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span className="mono" style={{ width: 28, height: 28, flex: "none", display: "grid", placeItems: "center", borderRadius: "50%", border: "1px solid var(--pm-line)", fontSize: 12, color: "var(--pm-t1)" }}>{i + 1}</span>
          {next && <span aria-hidden="true" style={{ flex: 1, width: 1, background: "var(--pm-line)", marginTop: 4 }} />}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: next ? 20 : 0, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="linkBtn" aria-current={r === sel || undefined} style={{ fontSize: 14, fontWeight: 500, color: "var(--pm-t1)", textAlign: "left" }} onClick={() => set({ sel: r.id })}>
              {t(upgrade ? "crafting.stepUpgrade" : "crafting.stepCraft", { name: r.name })}
            </button>
            <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{[term(r.cat), r.lv && `Lv ${r.lv}`, split && p > 0 && p < 1 && t("crafting.avgCrafts", { n: fmt(Math.round(1 / p), lang) })].filter(Boolean).join(" · ")}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--pm-t3)", width: "100%" }}>{t("crafting.uses")}</span>
            {gear && chip(gear.id, gear.qty, true)}
            {mats.map((k) => chip(k.id, k.qty))}
          </div>
          {upgrade && <div style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t("crafting.kinaUnknown")}</div>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {split ? (
              <>
                {outcome(t("crafting.normal"), r.out![0], Math.round((1 - p) * 100), tagOf(r.out![0]))}
                {outcome(t("crafting.splendent"), r.combo!, Math.round(p * 100), tagOf(r.combo!))}
              </>
            ) : (
              outcome(t("crafting.result"), r.out![0], 100, tagOf(r.out![0]))
            )}
          </div>
          {up && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12, color: "var(--pm-t2)" }}>
              <ArrowBendDownRightIcon aria-hidden="true" style={{ color: "var(--pm-t3)" }} />
              {t("crafting.upgradeHint")}
              <button type="button" className="btn sm" onClick={() => set({ sel: up.id, luck: false })}>
                {t("crafting.upgradePlan")}
              </button>
            </div>
          )}
        </div>
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
              {upBase && (
                <div style={{ display: "flex", gap: 6 }} role="group" aria-label={t("crafting.route")}>
                  <button type="button" className="wChip" aria-pressed={!luck} onClick={() => set({ luck: false })}>
                    {t("crafting.routeUpgrade")}
                  </button>
                  <button type="button" className="wChip" aria-pressed={luck} onClick={() => set({ luck: true })}>
                    {t("crafting.routeLuck", { p: Math.round((chances[upBase.id] ?? 0) / 100) })}
                  </button>
                </div>
              )}
            </div>
          </section>

          {chain.length > 1 && (
            <Card title={t("crafting.steps")}>
              <ol style={{ listStyle: "none", margin: "14px 0 0", padding: 0 }}>{chain.map(renderStep)}</ol>
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
