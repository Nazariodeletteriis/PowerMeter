import type { ReactNode } from "react";
import { CubeIcon, HammerIcon, ScrollIcon, SkullIcon, CastleTurretIcon, StorefrontIcon, GiftIcon, TrophyIcon, PlantIcon, CalendarIcon } from "@phosphor-icons/react";
import type { Category, EnhancementGroup, EnhancementValue, GameRecord, ItemStat } from "../../data/db/types";
import type { T } from "../i18n";
import type { PageProps } from "./types";
import { Capped, EntryHead, EntryLink, gd, Nd, None, RecordCard, Section, TypePage, useGd, useIcons, type Open } from "./world/db";
import "./world/world.css";

// Shapes inside an item record's data_json (only the fields shown here).
type Ref = { code?: string; id?: string | number; name?: string; grade?: string; icon?: string };
type Source = {
  type: string;
  monster?: Ref & { level?: number };
  quest?: Ref & { level?: number };
  dungeon?: Ref & { type?: string };
  container?: Ref;
  recipe?: { id: number; output: Ref };
  map?: { name?: string; subzone?: string };
  name?: string;
  text?: string;
  shop?: string;
  note?: string;
};
type ItemData = {
  item: { code: string; name: string; type?: string; grade?: string; icon?: string; slot?: string; level?: number; race?: string };
  facts?: { exchange?: string; requiredLevel?: number };
  usedIn?: { id: number; output: Ref; count?: number }[];
  sources?: Source[];
};

export default function Item({ t, lang, go, setHeader }: PageProps) {
  return (
    <TypePage
      t={t}
      go={go}
      setHeader={setHeader}
      category="item"
      title={t("world.item.title")}
      card={(id, open) => <RecordCard t={t} category="item" id={id}>{(r) => <ItemCard t={t} lang={lang} rec={r} open={open} />}</RecordCard>}
    />
  );
}

const pct = (unit: string) => (unit === "percent" ? "%" : "");

function ItemCard({ t, lang, rec, open }: { t: T; lang: string; rec: GameRecord; open: Open }) {
  const d = rec.data_json as unknown as ItemData;
  const it = d.item;
  const stats = useGd(() => gd.rows<ItemStat>("item_stats", "item_code", rec.id), rec.id);
  const sources = d.sources ?? [];
  const usedIn = d.usedIn ?? [];
  const icons = useIcons([it.icon, ...sources.map((s) => s.container?.icon ?? s.recipe?.output.icon), ...usedIn.map((u) => u.output.icon)]);
  const fixed = stats.data?.filter((s) => !s.is_rolled) ?? [];
  const rolled = stats.data?.filter((s) => s.is_rolled) ?? [];
  const labels = Object.fromEntries((stats.data ?? []).map((s) => [s.stat_key, s.label ?? s.stat_key]));
  const sub = [it.grade, it.slot ?? it.type, it.level != null && t("world.db.lv", { n: it.level }), it.race && it.race !== "All" && it.race !== "None" && t(`world.race.${it.race}`)]
    .filter(Boolean)
    .join(" · ");
  const by = (type: string) => sources.filter((s) => s.type === type);
  const link = (cat: Category, id: string | number | undefined) => (id == null ? undefined : () => open(cat, String(id)));

  return (
    <div className="wTwo">
      <div className="wStack">
        <section className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <EntryHead name={rec.name ?? it.name} sub={sub} grade={it.grade} icon={it.icon ? icons[it.icon] : undefined} />
          <div className="wFacts">
            {d.facts?.requiredLevel != null && (
              <>
                <span>{t("world.item.requiredLevel")}</span>
                <span className="mono">{d.facts.requiredLevel}</span>
              </>
            )}
            {d.facts?.exchange && (
              <>
                <span>{t("world.item.trade")}</span>
                <span>{t(d.facts.exchange === "Exchangeable" ? "world.item.tradable" : "world.item.notTradable")}</span>
              </>
            )}
          </div>
          {stats.data && (fixed.length > 0 || rolled.length > 0) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <h3 className="wLabel">{t("world.item.stats")}</h3>
                <div className="wFacts" style={{ gridTemplateColumns: "1fr auto" }}>
                  {fixed.map((s) => (
                    <div key={s.stat_key + s.fixed_display} style={{ display: "contents" }}>
                      <span>{s.label ?? s.stat_key}</span>
                      <span className="mono">
                        <Nd t={t} lang={lang} value={s.fixed_display} unit={pct(s.unit)} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {rolled.length > 0 && (
                <div>
                  <h3 className="wLabel">{t("world.item.substats")}</h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {rolled.map((s) => (
                      <span key={s.stat_key} className="wTag">
                        {s.label ?? s.stat_key} <Nd t={t} lang={lang} value={s.min_display} unit={pct(s.unit)} />-<Nd t={t} lang={lang} value={s.max_display} unit={pct(s.unit)} />
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {stats.error && <div className="error">{stats.error}</div>}
        </section>
        {it.type === "Equip" && <Enhancement t={t} lang={lang} code={rec.id} labels={labels} />}
      </div>

      <div className="wStack">
        <Section title={t("world.item.sources")}>
          {sources.length === 0 && <None>{t("world.db.none")}</None>}
          <Capped
            t={t}
            items={by("monster")}
            render={(s, i) => (
              <EntryLink key={`m${i}`} glyph={<SkullIcon />} name={s.monster?.name ?? "?"} onOpen={link("monster", s.monster?.id)} aside={s.monster?.level != null && t("world.db.lv", { n: s.monster.level })} />
            )}
          />
          <Capped
            t={t}
            items={by("quest")}
            render={(s, i) => (
              <EntryLink key={`q${i}`} glyph={<ScrollIcon />} name={s.quest?.name ?? "?"} onOpen={link("quest", s.quest?.id)} aside={s.quest?.level != null && t("world.db.lv", { n: s.quest.level })} />
            )}
          />
          {by("dungeon").map((s, i) => (
            <EntryLink key={`d${i}`} glyph={<CastleTurretIcon />} name={[s.dungeon?.name, s.note].filter(Boolean).join(" · ")} onOpen={link("dungeon", s.dungeon?.id)} />
          ))}
          {by("craft").map((s, i) => (
            <EntryLink key={`c${i}`} glyph={<HammerIcon />} name={[s.recipe?.output.name ?? t("world.cat.recipe"), s.note].filter(Boolean).join(" · ")} grade={s.recipe?.output.grade} onOpen={link("recipe", s.recipe?.id)} />
          ))}
          <Capped
            t={t}
            items={by("container")}
            render={(s, i) => (
              <EntryLink
                key={`b${i}`}
                glyph={<GiftIcon />}
                name={s.container?.name ?? "?"}
                grade={s.container?.grade}
                icon={s.container?.icon ? icons[s.container.icon] : undefined}
                onOpen={link("item", s.container?.code)}
              />
            )}
          />
          {sources
            .filter((s) => ["shop", "event", "achievement", "gather", "other"].includes(s.type))
            .map((s, i) => (
              <EntryLink key={`o${i}`} glyph={OTHER_ICON[s.type]} name={[s.shop ?? s.name ?? s.text ?? (s.map && [s.map.name, s.map.subzone].filter(Boolean).join(", ")), s.note].filter(Boolean).join(" · ")} />
            ))}
        </Section>
        <Section title={t("world.item.usedIn")}>
          {usedIn.length === 0 ? (
            <None>{t("world.item.usedInNone")}</None>
          ) : (
            <Capped
              t={t}
              items={usedIn}
              render={(u) => (
                <EntryLink key={u.id} name={u.output.name ?? String(u.id)} grade={u.output.grade} icon={u.output.icon ? icons[u.output.icon] : undefined} onOpen={() => open("recipe", String(u.id))} />
              )}
            />
          )}
        </Section>
      </div>
    </div>
  );
}

const OTHER_ICON: Record<string, ReactNode> = {
  shop: <StorefrontIcon />,
  event: <CalendarIcon />,
  achievement: <TrophyIcon />,
  gather: <PlantIcon />,
  other: <CubeIcon />,
};

/** Enhancement bonus per level, read from the item's group: only published levels, never extrapolated. */
function Enhancement({ t, lang, code, labels }: { t: T; lang: string; code: string; labels: Record<string, string> }) {
  const groups = useGd(() => gd.rows<EnhancementGroup>("item_enhancement_groups", "item_code", code), code);
  const g = groups.data?.[0];
  const values = useGd(() => (g?.enchant_group ? gd.rows<EnhancementValue>("enhancement_values", "enchant_group", g.enchant_group) : Promise.resolve([])), g?.enchant_group ?? "");
  const max = g?.max_published_level ?? 0;
  const rows = (values.data ?? []).filter((v) => v.status === "published" && v.level >= 1 && v.level <= max);
  const keys = [...new Set(rows.map((v) => v.stat_key))];
  const levels = [...new Set(rows.map((v) => v.level))].sort((a, b) => a - b);
  const cell = (level: number, key: string) => rows.find((v) => v.level === level && v.stat_key === key);
  // A group can report totals per level instead of bonuses: shown as they are, without "+".
  const plus = (v: EnhancementValue) => (v.value_kind === "enhancement_bonus" ? "+" : "");

  return (
    <Section title={max ? t("world.item.enhancement", { n: max }) : t("world.item.enhancementTitle")}>
      {groups.error || values.error ? (
        <div className="error">{groups.error ?? values.error}</div>
      ) : !groups.data || !values.data ? (
        <None>{t("world.db.loading")}</None>
      ) : levels.length === 0 ? (
        <None>
          {t("world.item.enhancementNone")} <span className="wNd">{t("world.db.nd")}</span>
        </None>
      ) : (
        <div className="wTableWrap">
          <table className="wTable">
            <thead>
              <tr>
                <th scope="col">{t("world.item.level")}</th>
                {keys.map((k) => (
                  <th key={k} scope="col">
                    {labels[k] ?? k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {levels.map((l) => (
                <tr key={l}>
                  <th scope="row" style={{ textAlign: "left", color: "var(--pm-t1)" }}>
                    +{l}
                  </th>
                  {keys.map((k) => {
                    const v = cell(l, k);
                    return (
                      <td key={k}>
                        {v ? (
                          <>
                            {plus(v)}
                            <Nd t={t} lang={lang} value={v.value_raw == null ? null : v.percent ? v.value_raw / 100 : v.value_raw} unit={v.percent ? "%" : ""} />
                          </>
                        ) : (
                          <span className="wNd">{t("world.db.nd")}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}
