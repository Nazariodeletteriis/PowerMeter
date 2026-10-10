import { useEffect, useMemo, useState } from "react";
import { CaretDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import type { GearPiece } from "../../data/db/types";
import type { PageProps } from "./types";
import { DataState, FilterBox, GameIcon, gd, gradeColor, Nd, None, openEntry, Pager, useGd, useIcons } from "./world/db";
import "./world/world.css";

// Equipment of the archive with its fixed stats and highest published enhancement level.
// Gauntlets are Brawler gear: the class is not out yet, so they are left out.
const SLOTS: Record<string, string[]> = {
  weapons: ["Sword", "Dagger", "Mace", "Greatsword", "Staff", "Bow", "Magicbook", "Orb", "Guarder"],
  armors: ["Helmet", "Shoulder", "Torso", "Belt", "Pants", "Gloves", "Cape", "Boots"],
  accessories: ["Earring", "Necklace", "Ring", "Bracelet", "Amulet", "Rune", "ArcanaBell", "ArcanaCompass", "ArcanaGrail", "ArcanaMirror", "ArcanaParchment"],
};
const ALL_SLOTS = Object.values(SLOTS).flat();
const TABS = ["all", "weapons", "armors", "accessories"] as const;
type Tab = (typeof TABS)[number];
const GRADES = ["Epic", "Unique", "Legend", "Special", "Rare", "Common"];
const PAGE_SIZE = 50;
type Row = GearPiece & { stats: Record<string, number[]> };
type SortKey = "__level" | "__enh" | (string & {});

/**
 * Most pieces exist under two or more ids (one per faction or drop table) with the same name,
 * slot, grade, level and stats: one row each, or the list shows every piece twice (bug 8).
 */
export function onePerPiece(pieces: GearPiece[]): GearPiece[] {
  const seen = new Set<string>();
  return pieces.filter((p) => {
    const key = JSON.stringify([p.name, p.slot, p.grade, p.level, p.max_enh, p.stats_json]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function GearViewer({ t, lang, go, setHeader }: PageProps) {
  const title = t("world.gear.title");
  useEffect(() => setHeader({ title }), [setHeader, title]);
  const data = useGd(gd.gear, "gear");
  const { rows, labels } = useMemo(() => {
    const labels: Record<string, string> = {};
    const rows: Row[] = onePerPiece(data.data ?? [])
      .filter((p) => ALL_SLOTS.includes(p.slot ?? ""))
      .map((p) => {
        const stats: Record<string, number[]> = {};
        for (const [key, label, value, unit] of p.stats_json ?? []) {
          if (value == null) continue;
          // A stat can be listed twice (two lines in the item): both are shown, not summed.
          (stats[key] ??= []).push(value);
          labels[key] = (label ?? key) + (unit === "percent" ? " %" : "");
        }
        return { ...p, stats };
      });
    return { rows, labels };
  }, [data.data]);

  const [tab, setTab] = useState<Tab>("weapons");
  const [slot, setSlot] = useState("");
  const [grades, setGrades] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const inTab = rows.filter((r) => (tab === "all" || SLOTS[tab].includes(r.slot!)) && (!slot || r.slot === slot));
  const filtered = inTab.filter((r) => {
    if (grades.length && !grades.includes(r.grade ?? "")) return false;
    // Name or any stat the piece has.
    const hay = [r.name, ...Object.keys(r.stats).map((k) => labels[k])].join(" ").toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  const cols = [...new Set(filtered.flatMap((r) => Object.keys(r.stats)))].sort((a, b) => labels[a].localeCompare(labels[b]));
  const value = (r: Row, k: SortKey) => (k === "__level" ? (r.level ?? -1) : k === "__enh" ? (r.max_enh ?? -1) : (r.stats[k]?.[0] ?? -1));
  const sorted = sort ? [...filtered].sort((a, b) => (value(a, sort.key) - value(b, sort.key)) * sort.dir) : filtered;
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const cur = Math.min(page, pages - 1);
  const shown = sorted.slice(cur * PAGE_SIZE, (cur + 1) * PAGE_SIZE);
  const icons = useIcons(shown.map((r) => r.icon));
  const reset = () => setPage(0);

  const head = (key: SortKey, label: string) => {
    const on = sort?.key === key;
    return (
      <th key={key} scope="col" aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className="gvNum">
        <button
          type="button"
          className="gvSort"
          onClick={() => {
            // Best first, then ascending, then off.
            setSort((s) => (s?.key !== key ? { key, dir: -1 } : s.dir === -1 ? { key, dir: 1 } : null));
            reset();
          }}
        >
          {label}
          {on && sort.dir === 1 ? <CaretUpIcon aria-hidden="true" /> : <CaretDownIcon aria-hidden="true" style={{ opacity: on ? 1 : 0 }} />}
        </button>
      </th>
    );
  };

  if (!data.data) return <DataState t={t} error={data.error} retry={data.retry} />;

  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }} role="group" aria-label={t("world.gear.category")}>
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            className="wChip"
            aria-pressed={id === tab}
            onClick={() => {
              setTab(id);
              setSlot("");
              reset();
            }}
          >
            {t(`world.gear.tab.${id}`)}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <FilterBox
            t={t}
            q={q}
            setQ={(v) => {
              setQ(v);
              reset();
            }}
            count={filtered.length}
          />
        </div>
        <label className="field" style={{ marginBottom: 12 }}>
          {t("world.gear.slot")}
          <select
            className="input sm"
            value={slot}
            onChange={(e) => {
              setSlot(e.target.value);
              reset();
            }}
          >
            <option value="">{t("world.gear.allSlots")}</option>
            {(tab === "all" ? ALL_SLOTS : SLOTS[tab])
              .filter((s) => rows.some((r) => r.slot === s))
              .map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
          </select>
        </label>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }} role="group" aria-label={t("world.gear.grade")}>
        <span className="kicker" style={{ marginRight: 4 }}>
          {t("world.gear.grade")}
        </span>
        {GRADES.filter((g) => inTab.some((r) => r.grade === g)).map((g) => (
          <button
            key={g}
            type="button"
            className="wChip"
            aria-pressed={grades.includes(g)}
            style={{ color: gradeColor(g) }}
            onClick={() => {
              setGrades((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]));
              reset();
            }}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="card gvTableWrap">
        <table className="gvTable">
          <thead>
            <tr>
              <th scope="col" style={{ textAlign: "left" }}>
                {t("world.gear.item")}
              </th>
              {head("__level", t("world.gear.level"))}
              {head("__enh", t("world.gear.maxEnh"))}
              {cols.map((c) => head(c, labels[c]))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className="gvItem">
                    <GameIcon url={r.icon ? icons[r.icon] : undefined} grade={r.grade} />
                    <span style={{ minWidth: 0 }}>
                      <button type="button" className="wBtn" style={{ color: gradeColor(r.grade) }} onClick={() => openEntry(go, "item", r.id)}>
                        {r.name ?? r.id}
                      </button>
                      <span style={{ display: "block", fontSize: 11, color: "var(--pm-t3)" }}>
                        {r.slot} · {r.grade}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="gvNum">
                  <Nd t={t} lang={lang} value={r.level} />
                </td>
                <td className="gvNum">{r.max_enh == null ? <span className="wNd">{t("world.db.nd")}</span> : `+${r.max_enh}`}</td>
                {cols.map((c) => (
                  <td key={c} className="gvNum">
                    {r.stats[c] ? r.stats[c].map((v) => v.toLocaleString(lang, { maximumFractionDigits: 2 })).join(" + ") : <span style={{ color: "var(--pm-t3)" }}>-</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 20 }}>
            <None>{t("world.gear.none")}</None>
          </div>
        )}
      </div>
      <Pager t={t} page={cur} pages={pages} setPage={setPage} />
    </div>
  );
}
