import { useState, type ReactNode } from "react";
import { CubeIcon, HammerIcon, ScrollIcon, SkullIcon, CastleTurretIcon, StorefrontIcon, GiftIcon, TrophyIcon, PlantIcon, CalendarIcon } from "@phosphor-icons/react";
import type { Category, EnhancementGroup, EnhancementValue, GameRecord, ItemStat, ListRow } from "../../data/db/types";
import type { T } from "../i18n";
import type { PageProps } from "./types";
import { ClassAvatar, RELEASED_CLASSES } from "../ui";
import { SLOTS } from "./gearviewer";
import { Capped, DataState, DbList, EntryHead, EntryLink, FilterBox, gd, gradeColor, Nd, None, RecordCard, Section, TypePage, useGd, useIcons, type Open } from "./world/db";
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
  // Held here, not in the list: opening an item and going back keeps the filters.
  const [filters, setFilters] = useState(NO_FILTERS);
  return (
    <TypePage
      t={t}
      go={go}
      setHeader={setHeader}
      category="item"
      title={t("world.item.title")}
      card={(id, open) => <RecordCard t={t} category="item" id={id}>{(r) => <ItemCard t={t} lang={lang} rec={r} open={open} />}</RecordCard>}
      list={(open) => <ItemList t={t} f={filters} setF={setFilters} onPick={(r) => open("item", r.id)} />}
    />
  );
}

// List filters on the fields gamedata_list returns for an item: kind (slot or type), grade, level, trade, faction, source.
const KINDS: Record<string, string[]> = { ...SLOTS, usable: ["Usable"], misc: ["Misc"], currency: ["Currency"] };
const GRADES = ["Common", "Rare", "Legend", "Unique", "Special", "Epic"]; // lowest to highest
// facts.exchange values: a soul-bound item is not tradable.
const TRADES: Record<string, string[]> = { tradable: ["Exchangeable"], bound: ["NonExchangeable", "SoulBind", "SoulBind_Acquire"] };
// item.race: Light = Elyos, Dark = Asmodian; "All"/"None" items fit either.
const FACTIONS: Record<string, string> = { elyos: "Light", asmodian: "Dark" };
// Weapon slot -> class, as in each class's skills in the archive (skill.weapon): one weapon per class.
// The shield goes with the Templar's sword; gauntlets are the Brawler's (not out yet). Non-weapons fit every class.
const WEAPON_CLASS: Record<string, string> = {
  Greatsword: "Gladiator",
  Sword: "Templar",
  Guarder: "Templar",
  Dagger: "Assassin",
  Bow: "Ranger",
  Magicbook: "Sorcerer",
  Orb: "Spiritmaster",
  Mace: "Cleric",
  Staff: "Chanter",
  Gauntlet: "Brawler",
};
const SOURCE_TYPES = ["monster", "quest", "dungeon", "craft", "shop", "container", "gather", "event", "achievement"];
type Filters = { q: string; kind: string; slot: string; cls: string; grades: string[]; min: string; max: string; trade: string; faction: string; sources: string[] };
const NO_FILTERS: Filters = { q: "", kind: "", slot: "", cls: "", grades: [], min: "", max: "", trade: "", faction: "", sources: [] };

function ItemList({ t, f, setF, onPick }: { t: T; f: Filters; setF: (f: Filters) => void; onPick: (r: ListRow) => void }) {
  const rows = useGd(() => gd.list("item"), "item");
  const set = (patch: Partial<Filters>) => setF({ ...f, ...patch });
  const words = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const min = f.min === "" ? null : Number(f.min);
  const max = f.max === "" ? null : Number(f.max);
  const found = rows.data?.filter((r) => {
    if (f.kind && !KINDS[f.kind].includes(r.kind ?? "")) return false;
    if (f.slot && r.kind !== f.slot) return false;
    const owner = WEAPON_CLASS[r.kind ?? ""];
    if (f.cls && owner && owner !== f.cls) return false;
    if (f.grades.length && !f.grades.includes(r.grade ?? "")) return false;
    // A level range leaves out items without a level (consumables, materials).
    if (min != null && (r.level == null || r.level < min)) return false;
    if (max != null && (r.level == null || r.level > max)) return false;
    if (f.trade && !TRADES[f.trade].includes(r.exchange ?? "")) return false;
    if (f.faction && r.race !== FACTIONS[f.faction] && r.race !== "All" && r.race !== "None") return false;
    if (f.sources.length && !(r.sources ?? "").split(",").some((x) => f.sources.includes(x))) return false;
    const hay = `${r.name ?? ""} ${r.kind ?? ""} ${r.id}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  const active = JSON.stringify(f) !== JSON.stringify(NO_FILTERS);
  const slots = f.kind && SLOTS[f.kind];

  return (
    <div className="wFiltered">
      <div style={{ minWidth: 0 }}>
        <FilterBox t={t} q={f.q} setQ={(q) => set({ q })} count={found?.length} />
        {!found ? (
          <DataState t={t} error={rows.error} retry={rows.retry} />
        ) : found.length === 0 ? (
          <None>{t("database.noMatch")}</None>
        ) : (
          <DbList key={JSON.stringify(f)} t={t} rows={found} onPick={onPick} />
        )}
      </div>
      <aside className="card wFilters" aria-label={t("database.filters")}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h3 className="wLabel" style={{ margin: 0 }}>
            {t("database.filters")}
          </h3>
          <button type="button" className="linkBtn" disabled={!active} onClick={() => setF(NO_FILTERS)}>
            {t("database.reset")}
          </button>
        </div>
        <div className="wFilterGroup" role="group" aria-label={t("database.category")}>
          <span>{t("database.category")}</span>
          <div>
            {["", ...Object.keys(KINDS)].map((k) => (
              <button key={k} type="button" className="wChip" aria-pressed={f.kind === k} onClick={() => set({ kind: k, slot: "" })}>
                {t(`database.kind.${k || "all"}`)}
              </button>
            ))}
          </div>
        </div>
        {slots && (
          <label className="field">
            {t("world.gear.slot")}
            <select className="input sm" value={f.slot} onChange={(e) => set({ slot: e.target.value })}>
              <option value="">{t("world.gear.allSlots")}</option>
              {slots.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="wFilterGroup" role="group" aria-label={t("char.class")}>
          <span>{t("char.class")}</span>
          <div>
            {["", ...RELEASED_CLASSES].map((c) => (
              <button key={c} type="button" className="wChip" aria-pressed={f.cls === c} onClick={() => set({ cls: c })} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {c && <ClassAvatar cls={c} size={18} />}
                {c || t("database.kind.all")}
              </button>
            ))}
          </div>
        </div>
        <div className="wFilterGroup" role="group" aria-label={t("world.gear.grade")}>
          <span>{t("world.gear.grade")}</span>
          <div>
            {GRADES.map((g) => (
              <button
                key={g}
                type="button"
                className="wChip"
                aria-pressed={f.grades.includes(g)}
                style={{ color: gradeColor(g) }}
                onClick={() => set({ grades: f.grades.includes(g) ? f.grades.filter((x) => x !== g) : [...f.grades, g] })}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="wFilterGroup" role="group" aria-label={t("world.gear.level")}>
          <span>{t("world.gear.level")}</span>
          <div style={{ flexWrap: "nowrap", alignItems: "center" }}>
            <input className="input sm mono" type="number" min={0} inputMode="numeric" value={f.min} onChange={(e) => set({ min: e.target.value })} placeholder={t("database.min")} aria-label={t("database.minLevel")} />
            <span aria-hidden="true">-</span>
            <input className="input sm mono" type="number" min={0} inputMode="numeric" value={f.max} onChange={(e) => set({ max: e.target.value })} placeholder={t("database.max")} aria-label={t("database.maxLevel")} />
          </div>
        </div>
        <div className="wFilterGroup" role="group" aria-label={t("world.item.trade")}>
          <span>{t("world.item.trade")}</span>
          <div>
            {["", ...Object.keys(TRADES)].map((k) => (
              <button key={k} type="button" className="wChip" aria-pressed={f.trade === k} onClick={() => set({ trade: k })}>
                {t(`database.trade.${k || "all"}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="wFilterGroup" role="group" aria-label={t("roster.faction")}>
          <span>{t("roster.faction")}</span>
          <div>
            {["", ...Object.keys(FACTIONS)].map((k) => (
              <button key={k} type="button" className="wChip" aria-pressed={f.faction === k} onClick={() => set({ faction: k })}>
                {k ? t(`collections.${k}`) : t("database.kind.all")}
              </button>
            ))}
          </div>
        </div>
        <div className="wFilterGroup" role="group" aria-label={t("world.item.sources")}>
          <span>{t("world.item.sources")}</span>
          <div>
            {SOURCE_TYPES.map((k) => (
              <button
                key={k}
                type="button"
                className="wChip"
                aria-pressed={f.sources.includes(k)}
                onClick={() => set({ sources: f.sources.includes(k) ? f.sources.filter((x) => x !== k) : [...f.sources, k] })}
              >
                {t(`database.source.${k}`)}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
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
