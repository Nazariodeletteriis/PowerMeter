import { useMemo, useState, type ReactNode } from "react";
import { CaretDownIcon, CaretRightIcon, CheckCircleIcon, CircleIcon, HammerIcon } from "@phosphor-icons/react";
import type { GameRecord, SplendentRecipe } from "../../data/db/types";
import { activeId, readCharacters } from "../characters";
import type { T } from "../i18n";
import { EmptyState, fmt } from "../ui";
import type { PageProps } from "./types";
import { buildTree, chainOf, forRace, indexRecipes, sectionOf, SECTIONS, totals, type Index, type Node, type Part, type Race, type Recipe, type RecipeData } from "./crafting/tree";
import { DataState, EntryHead, EntryLink, FilterBox, GameIcon, gd, gradeColor, Nd, None, RecordCard, Section, TypePage, useGd, useIcons, type Open } from "./world/db";
import "./organizer/organizer.css";
import "./world/world.css";

// Crafting: the planner (profession tabs, item list, upgrade chain, recipe tree, inventory and missing
// materials) and, opened from the Database, one recipe's card. Logic: ./crafting/tree.ts.

export default function Crafting(props: PageProps) {
  const { t, lang, go, setHeader } = props;
  return (
    <TypePage
      t={t}
      go={go}
      setHeader={setHeader}
      category="recipe"
      title={t("world.craft.title")}
      glyph={<HammerIcon />}
      card={(id, open) => <RecordCard t={t} category="recipe" id={id}>{(r) => <RecipeCard t={t} lang={lang} rec={r} open={open} />}</RecordCard>}
      list={(open) => <Planner {...props} open={open} />}
    />
  );
}

// ===== Planner =====

/** Per character (pm.activeCharacter id): faction when the character has none, open tab, goal and one plan per goal. */
const KEY = "pm.craftPlan";
type Plan = { start?: string; n?: number; have?: Record<string, number> };
type Saved = { race?: Race; cat?: string; sub?: string; goal?: string; plans?: Record<string, Plan> };
const CATS = Object.keys(SECTIONS);

function Planner({ t, lang, settings, save, onError, open }: PageProps & { open: Open }) {
  const recipes = useGd(gd.recipes, "recipes");
  const chars = readCharacters(settings);
  const charId = activeId(settings, chars);
  const char = chars.find((c) => c.id === charId);
  const raw = settings[KEY];
  const store: Record<string, Saved> = useMemo(() => {
    try {
      return JSON.parse(raw ?? "{}") ?? {};
    } catch {
      return {};
    }
  }, [raw]);
  const saved = store[charId ?? "_"] ?? {};
  const set = (patch: Saved) => save(KEY, JSON.stringify({ ...store, [charId ?? "_"]: { ...saved, ...patch } })).catch(onError);

  const race: Race = char?.faction === "asmodian" ? "Dark" : char?.faction === "elyos" ? "Light" : (saved.race ?? "Light");
  const cat = saved.cat && SECTIONS[saved.cat] ? saved.cat : CATS[0];
  const sub = saved.sub && SECTIONS[cat].includes(saved.sub) ? saved.sub : "";
  const all = recipes.data as Recipe[] | undefined;
  const ix = useMemo(() => all && indexRecipes(all, race), [all, race]);

  const [q, setQ] = useState("");
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const items = useMemo(() => {
    const names = new Set<string>();
    for (const r of all ?? []) {
      const d = r.data_json;
      if (forRace(r, race) && d.categoryLabel === cat && (!sub || sectionOf(d) === sub)) names.add(d.recipe.output.name);
    }
    return [...names].map((n) => ix!.part.get(n)!).sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || a.name.localeCompare(b.name));
  }, [all, ix, race, cat, sub]);
  const shown = items.filter((p) => words.every((w) => p.name.toLowerCase().includes(w)));
  const listIcons = useIcons(shown.map((p) => p.icon));

  // Picking a piece: the goal is the last step of its chain; a piece in between is where the plan starts (owned).
  const pick = (name: string) => {
    const chain = chainOf(name, ix!);
    const goal = chain[chain.length - 1];
    const start = name !== goal && name !== chain[0] ? name : undefined;
    set({ goal, plans: { ...saved.plans, [goal]: { ...saved.plans?.[goal], start } } });
  };
  const goal = saved.goal && ix?.part.has(saved.goal) ? saved.goal : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      <div className="orgTabs" role="tablist" aria-label={t("world.craft.title")}>
        {CATS.map((c) => (
          <button key={c} id={`cr-${c}`} type="button" role="tab" aria-selected={c === cat} aria-controls="cr-panel" className="orgTab" onClick={() => set({ cat: c, sub: "" })}>
            {c}
          </button>
        ))}
      </div>
      <div id="cr-panel" role="tabpanel" aria-labelledby={`cr-${cat}`} style={{ display: "grid", gridTemplateColumns: "300px minmax(0,1fr)", gap: 16, alignItems: "start" }}>
        <section className="card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10, position: "sticky", top: 0, maxHeight: "calc(100vh - 150px)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} role="group" aria-label={cat}>
            {["", ...SECTIONS[cat]].map((s) => (
              <button key={s} type="button" className="wChip" aria-pressed={s === sub} onClick={() => set({ sub: s })}>
                {s || t("craft.all")}
              </button>
            ))}
          </div>
          {!char?.faction && (
            <div style={{ display: "flex", gap: 6 }} role="group" aria-label={t("craft.faction")}>
              {(["Light", "Dark"] as const).map((r) => (
                <button key={r} type="button" className="wChip" aria-pressed={race === r} onClick={() => set({ race: r })}>
                  {t(`world.race.${r}`)}
                </button>
              ))}
            </div>
          )}
          <FilterBox t={t} q={q} setQ={setQ} count={all ? shown.length : undefined} />
          <div style={{ overflowY: "auto", margin: "-12px -4px 0", minHeight: 0 }}>
            {!all ? (
              <DataState t={t} error={recipes.error} retry={recipes.retry} />
            ) : shown.length === 0 ? (
              <None>{t("world.db.noResults", { q: q.trim() })}</None>
            ) : (
              shown.map((p) => {
                const on = p.name === goal || p.name === saved.plans?.[goal ?? ""]?.start;
                return (
                  <button
                    key={p.name}
                    type="button"
                    className="wBtn wDbRow"
                    aria-current={on || undefined}
                    style={{ gridTemplateColumns: "28px minmax(0,1fr) auto", minHeight: 38, background: on ? "var(--pm-s2)" : undefined, boxShadow: on ? "inset 2px 0 0 var(--pm-red)" : undefined }}
                    onClick={() => pick(p.name)}
                  >
                    <GameIcon url={p.icon ? listIcons[p.icon] : undefined} grade={p.grade} glyph={<HammerIcon />} />
                    <span style={{ color: gradeColor(p.grade), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    <span className="mono" style={{ fontSize: 11, color: "var(--pm-t3)", whiteSpace: "nowrap" }}>
                      {p.level != null && t("world.db.lv", { n: p.level })}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {!ix || !goal ? (
          <section className="card">
            <EmptyState icon={<HammerIcon size={32} aria-hidden="true" />} title={t("craft.pick")} text={t("craft.pickText")} />
          </section>
        ) : (
          <PlanView
            key={`${race}:${goal}`}
            t={t}
            lang={lang}
            ix={ix}
            race={race}
            goal={goal}
            plan={saved.plans?.[goal] ?? {}}
            who={char?.name}
            open={open}
            setGoal={(g) => set({ goal: g })}
            setPlan={(p) => set({ plans: { ...saved.plans, [goal]: { ...saved.plans?.[goal], ...p } } })}
          />
        )}
      </div>
    </div>
  );
}

/** First node of the tree with this name (depth first, the order the inventory is spent in). */
function find(n: Node, name: string): Node | undefined {
  if (n.name === name) return n;
  for (const k of n.kids) {
    const f = find(k, name);
    if (f) return f;
  }
  return undefined;
}
const names = (n: Node): string[] => [n.name, ...n.kids.flatMap(names)];

function PlanView({
  t,
  lang,
  ix,
  race,
  goal,
  plan,
  who,
  open,
  setGoal,
  setPlan,
}: {
  t: T;
  lang: string;
  ix: Index;
  race: Race;
  goal: string;
  plan: Plan;
  who?: string;
  open: Open;
  setGoal: (goal: string) => void;
  setPlan: (patch: Plan) => void;
}) {
  const chain = chainOf(goal, ix);
  const below = chain.slice(0, chain.indexOf(goal));
  const start = plan.start && below.includes(plan.start) ? plan.start : undefined;
  const n = plan.n ?? 1;
  const have = plan.have ?? {};
  // The starting piece counts as one more owned.
  const tree = buildTree(goal, n, ix, start ? { ...have, [start]: (have[start] ?? 0) + 1 } : have);
  const sum = totals(tree);
  const steps = [...below.slice(start ? below.indexOf(start) : 0), goal];
  const icons = useIcons([...new Set(names(tree))].map((x) => ix.part.get(x)?.icon));
  const part = (name: string): Part => ix.part.get(name) ?? { code: name, name };
  const recipe = ix.recipe.get(goal);
  const missing = sum.filter((r) => r.missing > 0).length;

  const setHave = (name: string, v: number) => {
    const next = { ...have };
    const k = Math.max(0, Math.floor(v) || 0);
    if (k) next[name] = k;
    else delete next[name];
    setPlan({ have: next });
  };
  // Done = the pieces this spot still needs go into the inventory; undo takes them back out.
  const toggleDone = (k: Node) => setHave(k.name, (have[k.name] ?? 0) + (k.owned >= k.qty ? -k.owned : k.qty - k.owned));

  const item = (name: string) => {
    const p = part(name);
    return (
      <button type="button" className="linkBtn" style={{ fontSize: 13, color: gradeColor(p.grade), textAlign: "left" }} onClick={() => open("item", p.code)}>
        {name}
      </button>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <EntryHead
          name={goal}
          grade={part(goal).grade}
          icon={part(goal).icon ? icons[part(goal).icon!] : undefined}
          glyph={<HammerIcon />}
          sub={[recipe?.data_json.categoryLabel, recipe && sectionOf(recipe.data_json), part(goal).level != null && t("world.db.lv", { n: part(goal).level! }), t(`world.race.${race}`)]
            .filter(Boolean)
            .join(" · ")}
        />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          {chain.length > 1 && (
            <>
              <label className="field">
                {t("craft.start")}
                <select className="input sm" value={start ?? ""} onChange={(e) => setPlan({ start: e.target.value || undefined })}>
                  <option value="">{t("craft.fromScratch")}</option>
                  {below.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                {t("craft.goal")}
                <select className="input sm" value={goal} onChange={(e) => setGoal(e.target.value)}>
                  {chain.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label className="field">
            {t("craft.count")}
            <input
              className="input sm mono"
              type="number"
              min={1}
              max={999}
              style={{ width: 90 }}
              value={n}
              onChange={(e) => setPlan({ n: Math.min(999, Math.max(1, Math.floor(Number(e.target.value)) || 1)) })}
            />
          </label>
          {recipe && (
            <button type="button" className="btn sm" onClick={() => open("recipe", recipe.id)}>
              <HammerIcon aria-hidden="true" />
              {t("craft.recipe")}
            </button>
          )}
        </div>
      </section>

      {steps.length > 1 && (
        <Section title={t("craft.steps")}>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" }}>
            {steps.map((s, i) => {
              const node = find(tree, s);
              const done = !node || node.owned >= node.qty;
              const p = part(s);
              const status =
                s === start
                  ? t("craft.stepStart")
                  : done
                    ? t("craft.stepDone")
                    : node!.splendent
                      ? t("craft.stepSplendent")
                      : t("craft.stepCraft", { n: fmt(node!.crafts, lang) });
              return (
                <li key={s} className="gridRow" style={{ gridTemplateColumns: "22px 24px minmax(0,1fr) auto", borderBottom: i === steps.length - 1 ? 0 : undefined }}>
                  {done ? <CheckCircleIcon size={18} weight="fill" style={{ color: "var(--pm-okt)" }} aria-hidden="true" /> : <CircleIcon size={18} style={{ color: "var(--pm-t3)" }} aria-hidden="true" />}
                  <GameIcon url={p.icon ? icons[p.icon] : undefined} grade={p.grade} size={24} />
                  <span style={{ minWidth: 0, display: "flex", gap: 8, alignItems: "baseline" }}>
                    {item(s)}
                    {p.level != null && <span className="mono" style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t("world.db.lv", { n: p.level })}</span>}
                  </span>
                  <span style={{ fontSize: 12, color: done ? "var(--pm-okt)" : "var(--pm-t2)" }}>{status}</span>
                </li>
              );
            })}
          </ol>
        </Section>
      )}

      <Section title={t("craft.totals")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 12, marginTop: -4 }}>
          <span style={{ color: missing ? "var(--pm-redt)" : "var(--pm-okt)" }} aria-live="polite">
            {missing ? t("craft.missingN", { n: missing }) : t("craft.ready")}
          </span>
          <span style={{ display: "flex", gap: 12, alignItems: "center", color: "var(--pm-t3)" }}>
            {who && t("craft.savedFor", { name: who })}
            {Object.keys(have).length > 0 && (
              <button type="button" className="linkBtn" onClick={() => confirm(t("craft.confirmClear", { name: goal })) && setPlan({ have: {} })}>
                {t("craft.clear")}
              </button>
            )}
          </span>
        </div>
        {(
          [
            ["craft.raw", sum.filter((r) => !r.crafted)],
            ["craft.parts", sum.filter((r) => r.crafted)],
          ] as const
        ).map(
          ([k, rows]) =>
            rows.length > 0 && (
              <div key={k} style={{ marginTop: 12 }}>
                <div className="gridHead" style={{ gridTemplateColumns: "24px minmax(0,1fr) 64px 84px 64px" }}>
                  <span />
                  <span>{t(k)}</span>
                  <span style={{ textAlign: "right" }}>{t("craft.need")}</span>
                  <span style={{ textAlign: "right" }}>{t("craft.have")}</span>
                  <span style={{ textAlign: "right" }}>{t("craft.missing")}</span>
                </div>
                {rows.map((r) => {
                  const p = part(r.name);
                  return (
                    <div key={r.name} className="gridRow" style={{ gridTemplateColumns: "24px minmax(0,1fr) 64px 84px 64px" }}>
                      <GameIcon url={p.icon ? icons[p.icon] : undefined} grade={p.grade} size={24} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item(r.name)}</span>
                      <span className="mono" style={{ textAlign: "right" }}>
                        {fmt(r.qty, lang)}
                      </span>
                      <input
                        className="input sm mono"
                        type="number"
                        min={0}
                        inputMode="numeric"
                        style={{ width: "100%", height: 28, textAlign: "right" }}
                        aria-label={`${t("craft.have")}: ${r.name}`}
                        value={have[r.name] ?? ""}
                        placeholder="0"
                        onChange={(e) => setHave(r.name, Number(e.target.value))}
                      />
                      <span className="mono" style={{ textAlign: "right", color: r.missing ? "var(--pm-redt)" : "var(--pm-okt)" }}>
                        {fmt(r.missing, lang)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ),
        )}
      </Section>

      <TreeCard t={t} lang={lang} tree={tree} start={start} icons={icons} part={part} item={item} toggleDone={toggleDone} />
    </div>
  );
}

function TreeCard({
  t,
  lang,
  tree,
  start,
  icons,
  part,
  item,
  toggleDone,
}: {
  t: T;
  lang: string;
  tree: Node;
  start?: string;
  icons: Record<string, string>;
  part: (name: string) => Part;
  item: (name: string) => ReactNode;
  toggleDone: (n: Node) => void;
}) {
  // Every branch open by default; "collapse all" flips the default, single toggles override it.
  const [fold, setFold] = useState<{ def: boolean; over: Record<string, boolean> }>({ def: true, over: {} });
  const isOpen = (key: string) => fold.over[key] ?? fold.def;
  const hasSplendent = (n: Node): boolean => !!n.splendent || n.kids.some(hasSplendent);

  const row = (n: Node, key: string, depth: number): ReactNode => {
    const p = part(n.name);
    const done = n.owned >= n.qty;
    const expanded = isOpen(key);
    const crafted = !!n.recipe || !!n.splendent;
    return (
      <li key={key}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32, flexWrap: "wrap" }}>
          {n.kids.length > 0 ? (
            <button
              type="button"
              className="wBtn"
              style={{ width: 20, height: 20, display: "grid", placeItems: "center", color: "var(--pm-t2)" }}
              aria-expanded={expanded}
              aria-label={t("craft.toggle", { name: n.name })}
              onClick={() => setFold({ ...fold, over: { ...fold.over, [key]: !expanded } })}
            >
              {expanded ? <CaretDownIcon aria-hidden="true" /> : <CaretRightIcon aria-hidden="true" />}
            </button>
          ) : (
            <span style={{ width: 20 }} />
          )}
          <GameIcon url={p.icon ? icons[p.icon] : undefined} grade={p.grade} size={22} />
          <span style={{ opacity: depth && done ? 0.6 : 1 }}>{item(n.name)}</span>
          <span className="mono" style={{ fontSize: 12, color: "var(--pm-t2)" }}>
            ×{fmt(n.qty, lang)}
          </span>
          {n.crafts > 0 && <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t("craft.crafts", { n: fmt(n.crafts, lang) })}</span>}
          {n.name === start && <span className="badge">{t("craft.stepStart")}</span>}
          {n.owned > 0 && n.name !== start && <span className="badge">{t("craft.owned", { n: fmt(n.owned, lang) })}</span>}
          {n.splendent && <span className="badge" title={t("craft.splendentHint")}>{t("craft.splendent")}</span>}
          {n.loop && <span className="badge">{t("craft.loop")}</span>}
          {crafted && depth > 0 && n.name !== start && (
            <button
              type="button"
              className="wBtn"
              style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: done ? "var(--pm-okt)" : "var(--pm-t3)" }}
              aria-pressed={done}
              onClick={() => toggleDone(n)}
            >
              {done ? <CheckCircleIcon size={16} weight="fill" aria-hidden="true" /> : <CircleIcon size={16} aria-hidden="true" />}
              {t(done ? "craft.stepDone" : "craft.markDone")}
            </button>
          )}
        </div>
        {n.kids.length > 0 && expanded && (
          <ul style={{ listStyle: "none", margin: 0, padding: "0 0 0 14px", marginLeft: 10, borderLeft: "1px solid var(--pm-line)" }}>
            {n.kids.map((k, i) => row(k, `${key}.${i}`, depth + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <Section title={t("craft.tree")}>
      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginTop: -4, marginBottom: 8 }}>
        {hasSplendent(tree) ? <span style={{ fontSize: 12, color: "var(--pm-t3)", maxWidth: "70ch" }}>{t("craft.splendentHint")}</span> : <span />}
        <span style={{ display: "flex", gap: 6 }}>
          <button type="button" className="btn sm" onClick={() => setFold({ def: true, over: {} })}>
            {t("craft.expandAll")}
          </button>
          <button type="button" className="btn sm" onClick={() => setFold({ def: false, over: {} })}>
            {t("craft.collapseAll")}
          </button>
        </span>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: 13 }}>{row(tree, "0", 0)}</ul>
    </Section>
  );
}

// ===== One recipe (opened from the Database) =====

function RecipeCard({ t, lang, rec, open }: { t: T; lang: string; rec: GameRecord; open: Open }) {
  const d = rec.data_json as unknown as RecipeData;
  const out = d.recipe.output;
  const parts = d.components ?? [];
  // Alternative bases often repeat one piece under several ids: list each piece once.
  const bases = (d.successionInputs ?? []).filter((p, i, all) => all.findIndex((x) => x.name === p.name && x.grade === p.grade && x.level === p.level) === i);
  // Splendent recipes: the kinah cost is not published on Global ("n.d.").
  const splendent = useGd(() => gd.rows<SplendentRecipe>("splendent_recipes", "recipe_id", rec.id), rec.id).data?.[0];
  const icons = useIcons([out.icon, ...parts.map((p) => p.icon), ...bases.map((p) => p.icon)]);
  const item = (p: Part, aside?: ReactNode) => (
    <EntryLink key={p.code} name={p.name} grade={p.grade} icon={p.icon ? icons[p.icon] : undefined} onOpen={() => open("item", p.code)} aside={aside} />
  );
  const sub = [d.categoryLabel, d.subCategoryLabel, d.recipe.race && d.recipe.race !== "All" && t(`world.race.${d.recipe.race}`)].filter(Boolean).join(" · ");

  return (
    <div className="wTwo">
      <div className="wStack">
        <section className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <EntryHead name={rec.name ?? out.name} sub={sub} grade={out.grade} icon={out.icon ? icons[out.icon] : undefined} glyph={<HammerIcon />} />
          <div>
            <h3 className="wLabel">{t("world.craft.makes")}</h3>
            {item(out, <>×<Nd t={t} lang={lang} value={d.recipe.count ?? null} /></>)}
          </div>
          {splendent && (
            <div className="wFacts">
              <span>{t("world.craft.kinah")}</span>
              <span className="mono">
                <Nd t={t} lang={lang} value={splendent.kinah} />
              </span>
            </div>
          )}
        </section>
      </div>
      <div className="wStack">
        <Section title={t("world.craft.materials")}>
          {parts.length === 0 ? <None>{t("world.db.none")}</None> : parts.map((p) => item(p, <>×<Nd t={t} lang={lang} value={p.count ?? null} /></>))}
        </Section>
        {bases.length > 0 && (
          <Section title={t("world.craft.base")}>
            <None>{t("world.craft.baseHint")}</None>
            {bases.map((p) => item(p))}
          </Section>
        )}
      </div>
    </div>
  );
}
