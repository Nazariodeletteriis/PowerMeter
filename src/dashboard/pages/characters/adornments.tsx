// Builder Wings and Titles tabs: the build's wing (enchant level) and equipped title, laid out as the Equipment tab
// (picked entry, its stats, search list). Their stats reach the totals in builder.tsx.
import { useMemo, useState } from "react";
import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react";
import type { GameRecord } from "../../../data/db/types";
import { DataState, GameIcon, gd, gradeColor, useGd, useIcons } from "../world/db";
import type { Faction } from "../../characters";
import type { PageProps } from "../types";
import { raceFits, titleRace, titleStats, type PetEffect, type WingPick } from "./calc";

type T = PageProps["t"];

/** data_json of a "wing" record (only what the Builder reads). */
export type WingRecord = Pick<GameRecord, "id" | "name"> & {
  data_json: {
    wing?: { grade?: string; icon?: string; race?: string; enchantGroup?: string; stats?: { stat: string; value: number }[] | null };
    adornment?: { enchantMax?: number; hasOwnedEffect?: boolean };
  };
};
/** src/data/titles.json: stats are [English display label, raw value] (percent stats ×100). */
export type Title = { id: number; category: string; name: string; grade: string; equipped: [string, number][]; owned: [string, number][]; how: string };
const TITLE_CATEGORIES = ["adventure", "challenge", "quest", "dungeon", "item", "growth"];
const GRADES = ["Common", "Rare", "Legend", "Unique", "Epic", "Special"];

/** Stat rows as the Equipment tab lists them: name, value in display units. */
function StatRows({ lang, rows, name }: { lang: string; rows: PetEffect[]; name: (k: string) => string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 12px", fontSize: 12 }}>
      {rows.map(([k, v, pct], i) => (
        <span key={k + i} style={{ display: "contents" }}>
          <span style={{ color: "var(--pm-t2)" }}>{name(k)}</span>
          <span className="mono">+{v.toLocaleString(lang, { maximumFractionDigits: 2 }) + (pct ? "%" : "")}</span>
        </span>
      ))}
    </div>
  );
}
const Label = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ fontSize: 11, color: "var(--pm-t3)", marginBottom: 6, ...style }}>{children}</div>
);
const Note = ({ children }: { children: React.ReactNode }) => <div style={{ fontSize: 11, color: "var(--pm-t3)", marginTop: 8 }}>{children}</div>;

/** The picked entry: icon, name in its grade color, a sub line, the remove button. */
function Picked({ t, icon, grade, name, sub, onRemove }: { t: T; icon?: string; grade?: string; name: string; sub: string; onRemove: () => void }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--pm-line)", background: "var(--pm-s2)" }}>
        {icon !== undefined && <GameIcon url={icon || undefined} grade={grade} size={30} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: gradeColor(grade), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
          <div style={{ fontSize: 10, color: "var(--pm-t3)" }}>{sub}</div>
        </div>
      </div>
      <button type="button" className="chIconBtn" style={{ height: 44, width: 40 }} title={t("planner.builder.remove")} aria-label={t("planner.builder.remove")} onClick={onRemove}>
        <XIcon aria-hidden="true" />
      </button>
    </div>
  );
}

function Search({ value, set, label }: { value: string; set: (v: string) => void; label: string }) {
  return (
    <label className="chSearch" style={{ marginBottom: 6 }}>
      <MagnifyingGlassIcon aria-hidden="true" />
      <input value={value} onChange={(e) => set(e.target.value)} placeholder={label} aria-label={label} />
    </label>
  );
}
const matches = (q: string, text: string) => q.trim().toLowerCase().split(/\s+/).filter(Boolean).every((w) => text.toLowerCase().includes(w));

export function WingsTab({
  t,
  lang,
  faction,
  pick,
  wing,
  stats,
  set,
  statName,
}: {
  t: T;
  lang: string;
  faction?: Faction;
  pick?: WingPick;
  /** The picked wing's record, once loaded. */
  wing?: WingRecord | null;
  /** The picked wing's stats at its level: own ones, then the enchant group's. */
  stats: { own: PetEffect[]; level: PetEffect[] };
  set: (w: WingPick | undefined) => void;
  statName: (k: string) => string;
}) {
  const [q, setQ] = useState("");
  // Every wing with its data (the list query has no race or grade for wings): 80 local reads.
  const all = useGd(() => gd.list("wing").then((rows) => Promise.all(rows.map((r) => gd.get("wing", r.id) as Promise<WingRecord | null>))), "wings");
  const list = useMemo(() => (all.data ?? []).filter((w): w is WingRecord => !!w && raceFits(w.data_json.wing?.race, faction)), [all.data, faction]);
  const found = list.filter((w) => matches(q, w.name ?? w.id));
  const icons = useIcons([...found.map((w) => w.data_json.wing?.icon), wing?.data_json.wing?.icon]);
  const w = wing?.data_json.wing;
  const max = wing?.data_json.adornment?.enchantMax ?? 0;
  const raceLabel = (r?: string) => (r === "Light" ? t("collections.elyos") : r === "Dark" ? t("collections.asmodian") : "");

  return (
    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <Label>{t("characters.builder.tab.wings")}</Label>
        {pick && wing !== undefined ? (
          // A saved wing missing from the game data (null) keeps its id and can still be removed.
          <Picked
            t={t}
            icon={w?.icon ? (icons[w.icon] ?? "") : ""}
            grade={w?.grade}
            name={wing?.name ?? t("planner.builder.unknownItem", { id: pick.id })}
            sub={[w?.grade, raceLabel(w?.race)].filter(Boolean).join(" · ")}
            onRemove={() => set(undefined)}
          />
        ) : (
          <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{pick ? t("world.db.loading") : t("planner.builder.empty")}</div>
        )}
      </div>

      {pick && wing && (
        <>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--pm-t3)", marginBottom: 8 }}>
              <span>{t("planner.builder.enh")}</span>
              <span className="mono" style={{ color: "var(--pm-t1)" }}>+{pick.enh}</span>
            </div>
            {max > 0 ? (
              <div role="group" aria-label={t("planner.builder.enh")} style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {Array.from({ length: max + 1 }, (_, l) => (
                  <button key={l} type="button" className="wChip mono" style={{ height: 24, padding: "0 8px" }} aria-pressed={l === pick.enh} onClick={() => set({ id: pick.id, enh: l })}>
                    +{l}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("characters.builder.wings.noEnh")}</div>
            )}
          </div>
          <div>
            <Label>{t("planner.builder.mainStats")}</Label>
            {stats.own.length ? <StatRows lang={lang} rows={stats.own} name={statName} /> : <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("characters.builder.wings.noStats")}</div>}
            {stats.level.length > 0 && (
              <>
                <Label style={{ margin: "10px 0 6px" }}>{t("characters.builder.wings.atLevel", { n: pick.enh })}</Label>
                <StatRows lang={lang} rows={stats.level} name={statName} />
              </>
            )}
            {stats.level.some(([k]) => k === "FPMax") && <Note>{t("characters.builder.wings.flightNote")}</Note>}
            {wing.data_json.adornment?.hasOwnedEffect && <Note>{t("characters.builder.wings.ownedNote")}</Note>}
          </div>
        </>
      )}

      <div style={{ borderTop: "1px solid var(--pm-line)", paddingTop: 12 }}>
        <Search value={q} set={setQ} label={t("characters.builder.wings.search")} />
        {!all.data ? (
          <DataState t={t} error={all.error} retry={all.retry} rows={4} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 320, overflow: "auto" }}>
            {found.map((x) => {
              const xw = x.data_json.wing;
              return (
                <button key={x.id} type="button" className="chBtnReset bPick" aria-pressed={x.id === pick?.id} onClick={() => set({ id: x.id, enh: x.id === pick?.id ? pick.enh : 0 })}>
                  <GameIcon url={xw?.icon ? icons[xw.icon] : undefined} grade={xw?.grade} size={24} />
                  <span style={{ flex: 1, minWidth: 0, color: gradeColor(xw?.grade), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.name ?? x.id}</span>
                  <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{xw?.grade}</span>
                </button>
              );
            })}
            {found.length === 0 && <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("world.db.noResults", { q: q.trim() })}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export function TitlesTab({
  t,
  lang,
  faction,
  titles,
  error,
  retry,
  picked,
  set,
  dict,
  statName,
}: {
  t: T;
  lang: string;
  faction?: Faction;
  titles?: Title[];
  error?: string;
  retry: () => void;
  picked?: Title;
  set: (id: number | undefined) => void;
  dict: Parameters<typeof titleStats>[1];
  statName: (k: string) => string;
}) {
  const [q, setQ] = useState("");
  const [grade, setGrade] = useState("");
  const list = useMemo(() => (titles ?? []).filter((x) => raceFits(titleRace(x.id), faction)), [titles, faction]);
  const found = list.filter((x) => (!grade || x.grade === grade) && matches(q, x.name));
  const grades = GRADES.filter((g) => list.some((x) => x.grade === g));
  const catLabel = (c: string) => t(`characters.builder.titles.cat.${c}`);
  // A title's stat rows: on a Builder stat by key, the labels the stat dictionary lacks as given (shown, not added).
  const rowsOf = (l: [string, number][]): PetEffect[] => {
    const { fx, unmapped } = titleStats(l, dict);
    return [...fx, ...unmapped.map(([label, v]): PetEffect => [label, v, false])];
  };
  const eq = picked ? rowsOf(picked.equipped) : [];
  const own = picked ? rowsOf(picked.owned) : [];
  const fmt = (v: number) => v.toLocaleString(lang, { maximumFractionDigits: 2 });
  const summary = (x: Title) =>
    rowsOf(x.equipped)
      .map(([k, v, pct]) => `${statName(k)} +${fmt(v)}${pct ? "%" : ""}`)
      .join(", ");

  return (
    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <Label>{t("characters.builder.titles.equipped")}</Label>
        {picked ? (
          <Picked t={t} grade={picked.grade} name={picked.name} sub={`${catLabel(picked.category)} · ${picked.grade}`} onRemove={() => set(undefined)} />
        ) : (
          <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("planner.builder.empty")}</div>
        )}
      </div>

      {picked && (
        <div>
          <Label>{t("characters.builder.titles.equipEffect")}</Label>
          {eq.length ? <StatRows lang={lang} rows={eq} name={statName} /> : <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("characters.builder.titles.noStats")}</div>}
          {own.length > 0 && (
            <>
              <Label style={{ margin: "10px 0 6px" }}>{t("characters.builder.titles.ownEffect")}</Label>
              <StatRows lang={lang} rows={own} name={statName} />
              <Note>{t("characters.builder.titles.ownNote")}</Note>
            </>
          )}
          {picked.how && (
            <>
              <Label style={{ margin: "10px 0 6px" }}>{t("characters.builder.titles.how")}</Label>
              <div style={{ fontSize: 12, color: "var(--pm-t2)" }}>{picked.how}</div>
            </>
          )}
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--pm-line)", paddingTop: 12 }}>
        <Search value={q} set={setQ} label={t("characters.builder.titles.search")} />
        <div role="group" aria-label={t("characters.builder.titles.grade")} style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {["", ...grades].map((g) => (
            <button key={g} type="button" className="wChip" style={{ height: 24, padding: "0 8px", fontSize: 11, color: g ? gradeColor(g) : undefined }} aria-pressed={grade === g} onClick={() => setGrade(g)}>
              {g || t("characters.builder.titles.allGrades")}
            </button>
          ))}
        </div>
        {!titles ? (
          <DataState t={t} error={error} retry={retry} rows={4} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 360, overflow: "auto" }}>
            {TITLE_CATEGORIES.filter((c) => found.some((x) => x.category === c)).map((c) => (
              <section key={c} aria-label={catLabel(c)} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--pm-redt)", padding: "8px 8px 4px" }}>{catLabel(c)}</div>
                {found
                  .filter((x) => x.category === c)
                  .map((x) => (
                    <button key={x.id} type="button" className="chBtnReset bPick" style={{ alignItems: "flex-start", flexDirection: "column", gap: 0, justifyContent: "center", padding: "4px 8px" }} aria-pressed={x.id === picked?.id} onClick={() => set(x.id)}>
                      <span style={{ color: gradeColor(x.grade), maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.name}</span>
                      {x.equipped.length > 0 && <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{summary(x)}</span>}
                    </button>
                  ))}
              </section>
            ))}
            {found.length === 0 && <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("world.db.noResults", { q: q.trim() })}</div>}
          </div>
        )}
      </div>
    </div>
  );
}
