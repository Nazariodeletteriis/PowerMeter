import { useMemo, useState, type ReactNode } from "react";
import { ArrowRightIcon, CheckCircleIcon, HammerIcon } from "@phosphor-icons/react";
import type { GameRecord, SplendentRecipe } from "../../data/db/types";
import { activeId, readCharacters } from "../characters";
import type { T } from "../i18n";
import { EmptyState, fmt } from "../ui";
import type { PageProps } from "./types";
import { chainOf, forRace, indexRecipes, materialsOf, sectionOf, SECTIONS, sumMaterials, type Index, type Part, type Race, type Recipe, type RecipeData } from "./crafting/tree";
import { DataState, EntryHead, EntryLink, FilterBox, GameIcon, gd, gradeColor, Nd, None, RecordCard, Section, TypePage, useGd, useIcons, type Open } from "./world/db";
import "./organizer/organizer.css";
import "./world/world.css";
import "./crafting/crafting.css";

// Crafting: the planner (profession tabs, item list, the picked step and the next one with their materials, and
// what the user still misses) and, opened from the Database, one recipe's card. Logic: ./crafting/tree.ts.

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
      wide
      card={(id, open) => <RecordCard t={t} category="recipe" id={id}>{(r) => <RecipeCard t={t} lang={lang} rec={r} open={open} />}</RecordCard>}
      list={(open) => <Planner {...props} open={open} />}
    />
  );
}

// ===== Planner =====

/** Per character (pm.activeCharacter id): faction when the character has none, open tab, picked item and the
 * pieces the user owns, by item name. The 0.5.0 fields (goal, plans) are dropped on the next save. */
const KEY = "pm.craftPlan";
type Saved = { race?: Race; cat?: string; sub?: string; sel?: string; have?: Record<string, number> };
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
  const saved: Saved = store[charId ?? "_"] ?? {};
  const set = (patch: Saved) => {
    const { race, cat, sub, sel, have } = { ...saved, ...patch };
    save(KEY, JSON.stringify({ ...store, [charId ?? "_"]: { race, cat, sub, sel, have } })).catch(onError);
  };

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
  const sel = saved.sel && ix?.part.has(saved.sel) ? saved.sel : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
      <div className="orgTabs" role="tablist" aria-label={t("world.craft.title")}>
        {CATS.map((c) => (
          <button key={c} id={`cr-${c}`} type="button" role="tab" aria-selected={c === cat} aria-controls="cr-panel" className="orgTab" onClick={() => set({ cat: c, sub: "" })}>
            {c}
          </button>
        ))}
      </div>
      <div id="cr-panel" role="tabpanel" aria-labelledby={`cr-${cat}`} className="crGrid">
        <section className="card crList">
          <div className="crChips" role="group" aria-label={cat}>
            {["", ...SECTIONS[cat]].map((s) => (
              <button key={s} type="button" className="wChip" aria-pressed={s === sub} onClick={() => set({ sub: s })}>
                {s || t("craft.all")}
              </button>
            ))}
          </div>
          {!char?.faction && (
            <div className="crChips" role="group" aria-label={t("craft.faction")}>
              {(["Light", "Dark"] as const).map((r) => (
                <button key={r} type="button" className="wChip" aria-pressed={race === r} onClick={() => set({ race: r })}>
                  {t(`world.race.${r}`)}
                </button>
              ))}
            </div>
          )}
          <FilterBox t={t} q={q} setQ={setQ} count={all ? shown.length : undefined} />
          <div className="crRows">
            {!all ? (
              <DataState t={t} error={recipes.error} retry={recipes.retry} />
            ) : shown.length === 0 ? (
              <None>{t("world.db.noResults", { q: q.trim() })}</None>
            ) : (
              shown.map((p) => (
                <button key={p.name} type="button" className="wBtn crRow" title={p.name} aria-current={p.name === sel || undefined} onClick={() => set({ sel: p.name })}>
                  <GameIcon url={p.icon ? listIcons[p.icon] : undefined} grade={p.grade} size={40} glyph={<HammerIcon />} />
                  <span style={{ minWidth: 0 }}>
                    <span className="crRowName" style={{ color: gradeColor(p.grade) }}>
                      {p.name}
                    </span>
                    <span className="crRowMeta">{[p.grade, p.level != null && t("world.db.lv", { n: p.level })].filter(Boolean).join(" · ")}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </section>

        {!ix || !sel ? (
          <section className="card">
            <EmptyState icon={<HammerIcon size={32} aria-hidden="true" />} title={t("craft.pick")} text={t("craft.pickText")} />
          </section>
        ) : (
          <Steps
            t={t}
            lang={lang}
            ix={ix}
            race={race}
            sel={sel}
            have={saved.have ?? {}}
            who={char?.name}
            open={open}
            pick={(name) => set({ sel: name })}
            setHave={(have) => set({ have })}
          />
        )}
      </div>
    </div>
  );
}

/** The picked item and what it takes, the next step of its chain and what that takes, then the materials of both. */
function Steps({
  t,
  lang,
  ix,
  race,
  sel,
  have,
  who,
  open,
  pick,
  setHave,
}: {
  t: T;
  lang: string;
  ix: Index;
  race: Race;
  sel: string;
  have: Record<string, number>;
  who?: string;
  open: Open;
  pick: (name: string) => void;
  setHave: (have: Record<string, number>) => void;
}) {
  const chain = chainOf(sel, ix);
  const at = chain.indexOf(sel);
  const next = chain[at + 1];
  const mats = materialsOf(sel, ix);
  const nextMats = next ? materialsOf(next, ix) : [];
  const part = (name: string): Part => ix.part.get(name) ?? { code: name, name };
  const rows = sumMaterials([mats, nextMats], sel).map((r) => ({ ...r, missing: Math.max(0, r.qty - (Number(have[r.name]) || 0)) }));
  const icons = useIcons([part(sel).icon, next && part(next).icon, ...mats.map((p) => p.icon), ...nextMats.map((p) => p.icon)]);
  const missing = rows.filter((r) => r.missing > 0).length;
  const sum = (k: "qty" | "missing") => rows.reduce((s, r) => s + r[k], 0);

  const setOwned = (name: string, v: number) => {
    const out = { ...have };
    const k = Math.max(0, Math.floor(v) || 0);
    if (k) out[name] = k;
    else delete out[name];
    setHave(out);
  };
  const head = (name: string, size: number) => {
    const p = part(name);
    return (
      <>
        <GameIcon url={p.icon ? icons[p.icon] : undefined} grade={p.grade} size={size} glyph={<HammerIcon />} />
        <span style={{ minWidth: 0 }}>
          <span className="crName" style={{ color: gradeColor(p.grade) }}>
            {name}
          </span>
          <span className="crMeta">{[p.grade, p.level != null && t("world.db.lv", { n: p.level }), t(`world.race.${race}`)].filter(Boolean).join(" · ")}</span>
        </span>
      </>
    );
  };
  const materials = (name: string, list: Part[]) => {
    const per = ix.recipe.get(name)?.data_json.recipe.count ?? 1;
    return (
      <div className="crStepMats">
        <div className="crMatsHead">
          <h3 className="wLabel">{t("craft.materials")}</h3>
          {per > 1 && <span className="crNote">{t("craft.yield", { n: fmt(per, lang) })}</span>}
        </div>
        {list.length === 0 ? (
          <None>{t("craft.noInputs")}</None>
        ) : (
          <ul className="crMats">
            {list.map((m, i) => (
              <li key={`${m.name}:${i}`} className="crMat">
                <GameIcon url={m.icon ? icons[m.icon] : undefined} grade={m.grade} size={36} />
                <button type="button" className="wBtn crMatName" style={{ color: gradeColor(m.grade) }} onClick={() => open("item", m.code)}>
                  {m.name}
                </button>
                <span className="mono crQty">×{fmt(m.count ?? 1, lang)}</span>
              </li>
            ))}
          </ul>
        )}
        {ix.normal.has(name) && <p className="crNote">{t("craft.splendentHint")}</p>}
      </div>
    );
  };
  const recipe = ix.recipe.get(sel);

  return (
    <div className="crDetail">
      <section className="card crStep" aria-label={sel}>
        <div className="crStepItem">
          <h3 className="wLabel">{chain.length > 1 ? t("craft.step", { n: fmt(at + 1, lang), m: fmt(chain.length, lang) }) : t("craft.item")}</h3>
          <button type="button" className="wBtn crHead" onClick={() => open("item", part(sel).code)}>
            {head(sel, 72)}
          </button>
          {recipe && (
            <button type="button" className="btn sm" style={{ alignSelf: "flex-start" }} onClick={() => open("recipe", recipe.id)}>
              <HammerIcon aria-hidden="true" />
              {t("craft.recipe")}
            </button>
          )}
        </div>
        {materials(sel, mats)}
      </section>

      {next ? (
        <section className="card crStep" aria-label={t("craft.next")}>
          <div className="crStepItem">
            <h3 className="wLabel">{t("craft.nextOf", { n: fmt(at + 2, lang), m: fmt(chain.length, lang) })}</h3>
            <button type="button" className="wBtn crGo" onClick={() => pick(next)}>
              <span className="crHead">{head(next, 56)}</span>
              <span className="btn sm">
                {t("craft.goNext")}
                <ArrowRightIcon aria-hidden="true" />
              </span>
            </button>
          </div>
          {materials(next, nextMats)}
        </section>
      ) : (
        <section className="card crLast">
          <h3 className="wLabel">{t("craft.next")}</h3>
          <None>{t(chain.length > 1 ? "craft.lastStep" : "craft.noChain")}</None>
        </section>
      )}

      {rows.length > 0 && (
        <section className="card">
          <div className="crTableHead">
            <h3 className="wLabel" style={{ margin: 0 }}>
              {t(next ? "craft.tableBoth" : "craft.tableOne")}
            </h3>
            <span style={{ color: missing ? "var(--pm-redt)" : "var(--pm-okt)" }} aria-live="polite">
              {missing ? t("craft.missingOf", { n: fmt(missing, lang), m: fmt(rows.length, lang) }) : t("craft.ready")}
            </span>
            <span className="crSaved">
              {who && t("craft.savedFor", { name: who })}
              {Object.keys(have).length > 0 && (
                <button type="button" className="linkBtn" onClick={() => confirm(t("craft.confirmClear")) && setHave({})}>
                  {t("craft.clear")}
                </button>
              )}
            </span>
          </div>
          <div className="gridHead crCols">
            <span />
            <span>{t("craft.material")}</span>
            <span className="num">{t("craft.need")}</span>
            <span className="num">{t("craft.have")}</span>
            <span className="num">{t("craft.missing")}</span>
          </div>
          {rows.map((r) => {
            const p = part(r.name);
            return (
              <div key={r.name} className="gridRow hover crCols">
                <GameIcon url={p.icon ? icons[p.icon] : undefined} grade={p.grade} size={28} />
                <button type="button" className="wBtn crMatName" style={{ color: gradeColor(p.grade) }} onClick={() => open("item", p.code)}>
                  {r.name}
                </button>
                <span className="num">{fmt(r.qty, lang)}</span>
                <input
                  className="input sm mono crHave"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  aria-label={`${t("craft.have")}: ${r.name}`}
                  value={have[r.name] ?? ""}
                  placeholder="0"
                  onChange={(e) => setOwned(r.name, Number(e.target.value))}
                />
                <Left t={t} lang={lang} n={r.missing} />
              </div>
            );
          })}
          <div className="gridRow crCols crTotal">
            <span />
            <span>{t("craft.total")}</span>
            <span className="num">{fmt(sum("qty"), lang)}</span>
            <span />
            <Left t={t} lang={lang} n={sum("missing")} />
          </div>
        </section>
      )}
    </div>
  );
}

/** Missing amount in red, or a check when nothing is missing (not by color alone). */
function Left({ t, lang, n }: { t: T; lang: string; n: number }) {
  return n ? (
    <span className="num" style={{ color: "var(--pm-redt)" }}>
      {fmt(n, lang)}
    </span>
  ) : (
    <span className="crOk">
      <CheckCircleIcon size={18} weight="fill" aria-hidden="true" />
      <span className="srOnly">{t("craft.complete")}</span>
    </span>
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
