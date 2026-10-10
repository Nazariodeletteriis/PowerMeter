import type { ReactNode } from "react";
import { HammerIcon } from "@phosphor-icons/react";
import type { GameRecord, SplendentRecipe } from "../../data/db/types";
import type { T } from "../i18n";
import type { PageProps } from "./types";
import { EntryHead, EntryLink, gd, Nd, None, RecordCard, Section, TypePage, useGd, useIcons, type Open } from "./world/db";
import "./world/world.css";

type Part = { code: string; name: string; grade?: string; icon?: string; count?: number; level?: number; slot?: string };
type RecipeData = {
  recipe: { output: Part; count?: number; type?: string; race?: string };
  categoryLabel?: string;
  subCategoryLabel?: string;
  components?: Part[];
  successionInputs?: Part[];
};

export default function Crafting({ t, lang, go, setHeader }: PageProps) {
  return (
    <TypePage
      t={t}
      go={go}
      setHeader={setHeader}
      category="recipe"
      title={t("world.craft.title")}
      glyph={<HammerIcon />}
      card={(id, open) => <RecordCard t={t} category="recipe" id={id}>{(r) => <RecipeCard t={t} lang={lang} rec={r} open={open} />}</RecordCard>}
    />
  );
}

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
