import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { CaretDownIcon, CaretLeftIcon, CaretRightIcon, CaretUpIcon, ColumnsIcon, MagnifyingGlassIcon, PushPinIcon, ScalesIcon, TrashIcon, XIcon } from "@phosphor-icons/react";
import DATA from "../../data/items.json";
import { RARITY } from "../ui";
import { baseStats, maxEnh, pieceLevel, rarityOf, statName, useGearData, type Item } from "./characters/gear";
import { CompareModal, statText } from "./gearviewer/compare";
import type { PageProps } from "./types";
import { DbIcon, openEntry, term } from "./world/db";
import "./world/world.css";
import "./gearviewer/gear.css";

// questlog.gg/aion-2/gear-viewer: the same data its page reads
// (characterBuilder.getEquipmentItems = src/data/db/equip.json, stat names =
// statFormat.getStatFormat = stats.json), shown at max enhancement like theirs:
// base + top enhancement row + top breakthrough row, Gear Score = item level +
// enhancement levels + 5 per breakthrough level. Gauntlets (Brawler) are not in
// its slot lists, so Brawler-only gear never shows.

const SLOTS: Record<string, string[]> = {
  weapons: ["sword", "dagger", "mace", "greatsword", "staff", "bow", "magicbook", "orb", "guarder"],
  armors: ["helmet", "shoulder", "torso", "belt", "pants", "gloves", "cape", "boots"],
  accessories: ["earring", "necklace", "ring", "bracelet", "amulet", "brooch", "seal", "rune", "pendant"],
};
const ALL_SLOTS = Object.values(SLOTS).flat();
const TABS = ["all", "weapons", "armors", "accessories"] as const;
type Tab = (typeof TABS)[number];
export type GearRow = { item: Item; stats: Record<string, number>; score: number };
/** Sortable non-stat columns. */
type SortKey = "__level" | "__score" | (string & {});

const PINS_KEY = "pm.gearPins";
const PAGE_SIZE = 50;
const readPins = (json?: string): string[] => {
  try {
    const v = JSON.parse(json ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

// Many pieces exist twice under different ids (one per faction) with the same
// stats: keep one row each, or the list shows everything twice.
const onePerPiece = (rows: GearRow[]) => {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = `${r.item.name}|${r.item.sub}|${r.score}|${JSON.stringify(r.stats)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const sortValue = (r: GearRow, k: SortKey) => (k === "__level" ? (r.item.lv ?? 0) : k === "__score" ? r.score : (r.stats[k] ?? 0));

export default function GearViewer({ t, lang, go, setHeader, settings, save, onError }: PageProps) {
  const title = t("gear.title");
  useEffect(() => setHeader({ title }), [setHeader, title]);
  const ready = useGearData();
  const rows = useMemo<GearRow[]>(
    () =>
      ready
        ? onePerPiece((DATA as Item[])
            .filter((i) => ["weapon", "armor", "accessory", "equip"].includes(i.cat) && ALL_SLOTS.includes(i.sub ?? ""))
            .map((item) => {
              const top = { id: item.id, enh: maxEnh(item.id), subs: [] };
              return { item, stats: baseStats(top), score: pieceLevel(top) };
            })
            .filter((r) => r.score > 0) // not in equip.json: no stats to show
            .sort((a, b) => (b.item.lv ?? 0) - (a.item.lv ?? 0) || b.item.grade - a.item.grade || a.item.name.localeCompare(b.item.name)))
        : [],
    [ready],
  );
  const byId = useMemo(() => new Map(rows.map((r) => [r.item.id, r])), [rows]);

  const [tab, setTab] = useState<Tab>("weapons");
  const [slot, setSlot] = useState("");
  const [grades, setGrades] = useState<number[]>([]);
  const [q, setQ] = useState("");
  const [cols, setCols] = useState<string[]>([]); // empty = every column
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [pins, setPins] = useState(() => readPins(settings[PINS_KEY]));
  const [comparing, setComparing] = useState(false);

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const inTab = rows.filter((r) => (tab === "all" || SLOTS[tab].includes(r.item.sub!)) && (!slot || r.item.sub === slot));
  const gradeOptions = [...new Set(inTab.map((r) => r.item.grade))].sort((a, b) => b - a);
  const filtered = inTab.filter((r) => {
    if (grades.length && !grades.includes(r.item.grade)) return false;
    if (!words.length) return true;
    // Name or any stat the item has, like questlog's search.
    const hay = [r.item.name, ...Object.keys(r.stats).map(statName)].join(" ").toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  const allCols = [...new Set(filtered.flatMap((r) => Object.keys(r.stats)))].sort((a, b) => statName(a).localeCompare(statName(b)));
  const shown = cols.length ? allCols.filter((c) => cols.includes(c)) : allCols;
  const sorted = sort ? [...filtered].sort((a, b) => (sortValue(a, sort.key) - sortValue(b, sort.key)) * sort.dir) : filtered;
  const pinned = pins.map((id) => byId.get(id)).filter((r): r is GearRow => !!r);
  const list = sorted.filter((r) => !pins.includes(r.item.id));
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const cur = Math.min(page, pages - 1);

  const resetPage = () => setPage(0);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const storePins = (next: string[]) => {
    setPins(next);
    save(PINS_KEY, JSON.stringify(next)).catch(onError);
  };
  const pin = () => {
    storePins([...pins, ...selected.filter((id) => !pins.includes(id))]);
    setSelected([]);
  };
  const sortBy = (key: SortKey) => {
    // Descending first (best first), then ascending, then off.
    setSort((s) => (s?.key !== key ? { key, dir: -1 } : s.dir === -1 ? { key, dir: 1 } : null));
    resetPage();
  };
  const openItem = (id: string) => openEntry(go, "items", id);

  const head = (key: SortKey, label: string) => {
    const on = sort?.key === key;
    return (
      <th key={key} scope="col" aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className="gvNum">
        <button type="button" className="gvSort" onClick={() => sortBy(key)}>
          <span>{label}</span>
          {on ? sort.dir === 1 ? <CaretUpIcon aria-hidden="true" /> : <CaretDownIcon aria-hidden="true" /> : <CaretDownIcon aria-hidden="true" style={{ opacity: 0 }} />}
        </button>
      </th>
    );
  };
  const row = (r: GearRow, isPinned: boolean) => {
    const rar = rarityOf(r.item);
    const col = RARITY[rar] ?? "var(--pm-grey)";
    const sel = selected.includes(r.item.id);
    return (
      <tr key={r.item.id} className={isPinned ? "gvPinned" : undefined} aria-selected={sel}>
        <td className="gvCheck">
          {isPinned ? (
            <button type="button" className="gvIconBtn" onClick={() => storePins(pins.filter((id) => id !== r.item.id))} title={t("gear.unpin")} aria-label={t("gear.unpinItem", { name: r.item.name })}>
              <TrashIcon aria-hidden="true" />
            </button>
          ) : (
            <input type="checkbox" checked={sel} onChange={() => toggle(r.item.id)} aria-label={t("gear.selectItem", { name: r.item.name })} />
          )}
        </td>
        <td>
          <div className="gvItem">
            <span className="gvIc" style={{ "--c": col } as CSSProperties}>
              <DbIcon row={{ ...r.item, type: "items" }} />
            </span>
            <span style={{ minWidth: 0 }}>
              <button type="button" className="wBtn gvName" style={{ color: col }} onClick={() => openItem(r.item.id)}>
                {r.item.name}
              </button>
              <span className="gvSub">
                {term(r.item.sub)} · {rar}
              </span>
            </span>
            {isPinned && <PushPinIcon aria-label={t("gear.pinned")} className="gvPinMark" />}
          </div>
        </td>
        <td className="gvNum">{r.item.lv ?? "–"}</td>
        <td className="gvNum">{r.score.toLocaleString(lang)}</td>
        {shown.map((c) => (
          <td key={c} className="gvNum">
            {r.stats[c] ? statText(c, r.stats[c], lang) : <span style={{ color: "var(--pm-t3)" }}>–</span>}
          </td>
        ))}
      </tr>
    );
  };

  return (
    <div className="gv">
      <div className="gvTabs" role="group" aria-label={t("gear.category")}>
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            className="wChip"
            aria-pressed={id === tab}
            onClick={() => {
              setTab(id);
              setSlot("");
              setGrades([]);
              resetPage();
            }}
          >
            {t(`gear.tab.${id}`)}
          </button>
        ))}
      </div>

      <div className="gvFilters">
        <label className="gvSearch">
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              resetPage();
            }}
            placeholder={t("gear.search")}
            aria-label={t("gear.search")}
          />
          {q && (
            <button type="button" className="gvIconBtn" onClick={() => setQ("")} aria-label={t("gear.clearSearch")}>
              <XIcon aria-hidden="true" />
            </button>
          )}
        </label>
        <label className="field gvField">
          {t("gear.type")}
          <select
            className="input sm"
            value={slot}
            onChange={(e) => {
              setSlot(e.target.value);
              resetPage();
            }}
          >
            <option value="">{t("gear.allTypes")}</option>
            {(tab === "all" ? ALL_SLOTS : SLOTS[tab])
              .filter((s) => rows.some((r) => r.item.sub === s))
              .map((s) => (
                <option key={s} value={s}>
                  {term(s)}
                </option>
              ))}
          </select>
        </label>
        <details className="gvCols">
          <summary className="btn">
            <ColumnsIcon aria-hidden="true" />
            {t("gear.columns")}
            {cols.length > 0 && <span className="badge">{shown.length}</span>}
          </summary>
          <div className="gvColsPop card">
            <button type="button" className="linkBtn" onClick={() => setCols([])}>
              {t("gear.allColumns")}
            </button>
            {allCols.map((c) => (
              <label key={c} className="check">
                <input
                  type="checkbox"
                  checked={shown.includes(c)}
                  onChange={() => setCols((prev) => {
                    const base = prev.length ? prev : allCols;
                    const next = base.includes(c) ? base.filter((x) => x !== c) : [...base, c];
                    return next.length === allCols.length ? [] : next;
                  })}
                />
                {statName(c)}
              </label>
            ))}
          </div>
        </details>
      </div>

      <div className="gvGrades" role="group" aria-label={t("gear.grade")}>
        <span className="kicker">{t("gear.grade")}</span>
        {gradeOptions.map((g) => {
          const rar = rarityOf({ grade: g });
          return (
            <button
              key={g}
              type="button"
              className="wChip"
              aria-pressed={grades.includes(g)}
              style={{ color: RARITY[rar] }}
              onClick={() => {
                setGrades((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]));
                resetPage();
              }}
            >
              {rar}
            </button>
          );
        })}
        <span className="gvCount" aria-live="polite">
          {ready ? t("gear.results", { n: filtered.length.toLocaleString(lang) }) : t("db.loading")}
        </span>
      </div>

      <div className="gvTableWrap card">
        <table className="gvTable">
          <thead>
            <tr>
              <th scope="col" className="gvCheck">
                <span className="srOnly">{t("gear.select")}</span>
              </th>
              <th scope="col" style={{ textAlign: "left" }}>
                {t("gear.item")}
              </th>
              {head("__level", t("gear.level"))}
              {head("__score", t("gear.score"))}
              {shown.map((c) => head(c, statName(c)))}
            </tr>
          </thead>
          <tbody>
            {pinned.map((r) => row(r, true))}
            {list.slice(cur * PAGE_SIZE, (cur + 1) * PAGE_SIZE).map((r) => row(r, false))}
          </tbody>
        </table>
        {ready && list.length === 0 && (
          <div className="gvEmpty">
            <div style={{ color: "var(--pm-t1)", fontSize: 15, marginBottom: 4 }}>{t("gear.none")}</div>
            {t("gear.noneHint")}
          </div>
        )}
      </div>
      {pages > 1 && (
        <div className="gvPager">
          <button type="button" className="btn sm" disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label={t("db.prev")}>
            <CaretLeftIcon aria-hidden="true" />
          </button>
          <span className="mono">{t("db.page", { n: cur + 1, m: pages })}</span>
          <button type="button" className="btn sm" disabled={cur === pages - 1} onClick={() => setPage(cur + 1)} aria-label={t("db.next")}>
            <CaretRightIcon aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Selection bar: always mounted so it can slide out; inert while hidden. */}
      <div className="gvDock">
        <div className="gvBar" data-open={selected.length > 0} inert={selected.length === 0} role="toolbar" aria-label={t("gear.selection")}>
          <span className="gvBarCount" aria-live="polite">
            {t("gear.selected", { n: selected.length })}
          </span>
          <button type="button" className="btn sm" onClick={pin}>
            <PushPinIcon aria-hidden="true" />
            {t("gear.pin")}
          </button>
          <button type="button" className="btn sm fill" disabled={selected.length < 2} title={selected.length < 2 ? t("gear.compareHint") : undefined} onClick={() => setComparing(true)}>
            <ScalesIcon aria-hidden="true" />
            {t("gear.compare")}
          </button>
          <button type="button" className="btn sm" onClick={() => setSelected([])}>
            <XIcon aria-hidden="true" />
            {t("gear.clearAll")}
          </button>
        </div>
      </div>

      {comparing && (
        <CompareModal
          t={t}
          lang={lang}
          rows={selected.map((id) => byId.get(id)).filter((r): r is GearRow => !!r)}
          onRemove={(id) => {
            const next = selected.filter((x) => x !== id);
            setSelected(next);
            if (!next.length) setComparing(false);
          }}
          onOpen={openItem}
          onClose={() => setComparing(false)}
        />
      )}
    </div>
  );
}
