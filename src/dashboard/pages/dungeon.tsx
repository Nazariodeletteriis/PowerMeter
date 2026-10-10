import { useState } from "react";
import { CastleTurretIcon, CrownSimpleIcon, SkullIcon } from "@phosphor-icons/react";
import type { Dungeon as DungeonRow, DungeonBoss } from "../../data/db/types";
import type { T } from "../i18n";
import type { PageProps } from "./types";
import { DataState, DbList, EntryHead, EntryLink, FilterBox, gd, Nd, None, Section, TypePage, useGd, type Open } from "./world/db";
import "./world/world.css";

// The archive lists every difficulty/tier of a dungeon as its own entry (351 for 279 dungeons):
// the list shows each dungeon once, its card every entry.

type Data = { dungeons: DungeonRow[]; bosses: DungeonBoss[] };
const load = () => gd.dungeons();
const groupKey = (d: DungeonRow) => d.name ?? d.dungeon_id;

export default function DungeonPage({ t, lang, go, setHeader }: PageProps) {
  const data = useGd(load, "dungeons");
  return (
    <TypePage
      t={t}
      go={go}
      setHeader={setHeader}
      category="dungeon"
      title={t("world.dungeon.title")}
      list={(open) => (data.data ? <DungeonList t={t} data={data.data} open={open} /> : <DataState t={t} error={data.error} retry={data.retry} />)}
      card={(id, open) =>
        data.data ? <DungeonCard t={t} lang={lang} data={data.data} id={id} open={open} /> : <DataState t={t} error={data.error} retry={data.retry} />
      }
    />
  );
}

function DungeonList({ t, data, open }: { t: T; data: Data; open: Open }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<string | null>(null);
  // One row per name: the first entry opens the card.
  const groups = new Map<string, DungeonRow[]>();
  for (const d of data.dungeons) groups.set(groupKey(d), [...(groups.get(groupKey(d)) ?? []), d]);
  const types = [...new Set(data.dungeons.map((d) => d.type_label).filter((x): x is string => !!x))].sort();
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const rows = [...groups.values()]
    .filter((g) => !type || g.some((d) => d.type_label === type))
    .filter((g) => words.every((w) => `${g[0].name} ${g[0].location_name ?? ""}`.toLowerCase().includes(w)))
    .map((g) => {
      const levels = g.map((d) => d.min_level).filter((l): l is number => l != null);
      const kind = [...new Set(g.map((d) => d.type_label).filter(Boolean))].join(", ");
      return {
        id: g[0].dungeon_id,
        name: g[0].name,
        kind: g.length > 1 ? `${kind} · ${t("world.dungeon.variants", { n: g.length })}` : kind,
        level: levels.length ? Math.min(...levels) : null,
        grade: null,
        icon: null,
      };
    });
  return (
    <>
      <FilterBox t={t} q={q} setQ={setQ} count={rows.length} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }} role="group" aria-label={t("world.dungeon.type")}>
        {[null, ...types].map((id) => (
          <button key={id ?? "all"} type="button" className="wChip" aria-pressed={id === type} onClick={() => setType(id)}>
            {id ?? t("world.db.all")}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <None>{t("world.db.noResults", { q: q.trim() })}</None>
      ) : (
        <DbList key={`${q}|${type}`} t={t} glyph={<CastleTurretIcon />} rows={rows} onPick={(r) => open("dungeon", r.id)} />
      )}
    </>
  );
}

function DungeonCard({ t, lang, data, id, open }: { t: T; lang: string; data: Data; id: string; open: Open }) {
  const picked = data.dungeons.find((d) => d.dungeon_id === id);
  const rec = useGd(() => gd.get("dungeon", id), id);
  if (!picked)
    return (
      <section className="card">
        <None>{t("world.db.missing")}</None>
      </section>
    );
  const entries = data.dungeons.filter((d) => groupKey(d) === groupKey(picked));
  const description = (rec.data?.data_json as { description?: string } | undefined)?.description;
  const variant = (d: DungeonRow) => [d.tier_name ?? d.tier, d.type_label].filter(Boolean).join(" · ") || d.dungeon_id;

  return (
    <div className="wStack">
      <section className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <EntryHead name={picked.name ?? picked.dungeon_id} sub={[picked.type_label, picked.location_name].filter(Boolean).join(" · ")} glyph={<CastleTurretIcon />} />
        {description && <div style={{ color: "var(--pm-t2)", whiteSpace: "pre-line", lineHeight: 1.55, maxWidth: "75ch" }}>{description}</div>}
      </section>
      <Section title={t("world.dungeon.entries", { n: entries.length })}>
        <div className="wTableWrap">
          <table className="wTable">
            <thead>
              <tr>
                <th scope="col">{t("world.dungeon.variant")}</th>
                <th scope="col">{t("world.dungeon.minLevel")}</th>
                <th scope="col">{t("world.dungeon.itemLevel")}</th>
                <th scope="col">{t("world.dungeon.weekly")}</th>
                <th scope="col">{t("world.dungeon.reset")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((d) => (
                <tr key={d.dungeon_id} aria-current={d.dungeon_id === id || undefined}>
                  <td style={{ fontFamily: "inherit", color: d.dungeon_id === id ? "var(--pm-t1)" : "var(--pm-t2)" }}>{variant(d)}</td>
                  <td>
                    <Nd t={t} lang={lang} value={d.min_level} />
                  </td>
                  <td>
                    <Nd t={t} lang={lang} value={d.item_level} />
                  </td>
                  <td>
                    <Nd t={t} lang={lang} value={d.entries} />
                  </td>
                  <td style={{ fontFamily: "inherit" }}>{d.reset_day ? t(`world.day.${d.reset_day}`) : <span className="wNd">{t("world.db.nd")}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title={t("world.dungeon.bosses")}>
        {entries.every((d) => !data.bosses.some((b) => b.dungeon_id === d.dungeon_id)) ? (
          <None>{t("world.dungeon.noBosses")}</None>
        ) : (
          entries.map((d) => {
            const bosses = data.bosses.filter((b) => b.dungeon_id === d.dungeon_id);
            if (!bosses.length) return null;
            return (
              <div key={d.dungeon_id} style={{ marginBottom: 10 }}>
                {entries.length > 1 && <h4 className="wLabel">{variant(d)}</h4>}
                {bosses.map((b) => (
                  <EntryLink
                    key={b.boss_index}
                    glyph={b.final ? <CrownSimpleIcon /> : <SkullIcon />}
                    name={b.name ?? "?"}
                    onOpen={b.monster_id ? () => open("monster", b.monster_id!) : undefined}
                    aside={<>{b.final ? `${t("world.dungeon.final")} · ` : ""}{b.level != null ? t("world.db.lv", { n: b.level }) : t("world.db.nd")}</>}
                  />
                ))}
              </div>
            );
          })
        )}
      </Section>
    </div>
  );
}
