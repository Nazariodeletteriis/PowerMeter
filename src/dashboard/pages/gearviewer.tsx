import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { ArrowDownIcon, ArrowUpIcon, CaretDownIcon, CaretUpIcon, PushPinIcon, ScalesIcon, XIcon } from "@phosphor-icons/react";
import type { GearPiece } from "../../data/db/types";
import type { T } from "../i18n";
import { Modal } from "./system/Modal";
import type { PageProps } from "./types";
import { DataState, FilterBox, GameIcon, gd, gradeColor, Nd, None, openEntry, Pager, useGd, useIcons } from "./world/db";
import "./world/world.css";

// Equipment of the archive with its fixed stats and highest published enhancement level.
// Gauntlets are Brawler gear: the class is not out yet, so they are left out.
export const SLOTS: Record<string, string[]> = {
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

// Pinned pieces (ids), kept on this machine only.
const PINS_KEY = "pm.gear.pins";
function readPins(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(PINS_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
// Rows sliding to their new place when pins change (FLIP).
const MOVE: KeyframeAnimationOptions = { duration: 260, easing: "cubic-bezier(0.77, 0, 0.175, 1)" };

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
  const [selected, setSelected] = useState<string[]>([]);
  const [pins, setPins] = useState(readPins);
  const [comparing, setComparing] = useState(false);
  const body = useRef<HTMLTableSectionElement>(null);
  const before = useRef<Map<string, number>>(undefined);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const storePins = (next: string[]) => {
    if (body.current) before.current = new Map([...body.current.rows].map((tr) => [tr.dataset.id!, tr.getBoundingClientRect().top]));
    setPins(next);
    try {
      localStorage.setItem(PINS_KEY, JSON.stringify(next));
    } catch {
      // Storage full or blocked: the pins still hold for this session.
    }
  };
  const pinSelected = () => {
    storePins([...pins, ...selected.filter((id) => !pins.includes(id))]);
    setSelected([]);
  };
  // Every row that changed place glides from where it was; none when motion is reduced.
  useLayoutEffect(() => {
    const old = before.current;
    before.current = undefined;
    if (!old || !body.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (const tr of body.current.rows) {
      const dy = (old.get(tr.dataset.id!) ?? NaN) - tr.getBoundingClientRect().top;
      if (dy) tr.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], MOVE);
    }
  }, [pins]);

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const inTab = rows.filter((r) => (tab === "all" || SLOTS[tab].includes(r.slot!)) && (!slot || r.slot === slot));
  const filtered = inTab.filter((r) => {
    if (grades.length && !grades.includes(r.grade ?? "")) return false;
    // Name or any stat the piece has.
    const hay = [r.name, ...Object.keys(r.stats).map((k) => labels[k])].join(" ").toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  // Pinned pieces stay on top whatever the tab, filters or page.
  const pinned = pins.map((id) => byId.get(id)).filter((r): r is Row => !!r);
  const cols = [...new Set([...pinned, ...filtered].flatMap((r) => Object.keys(r.stats)))].sort((a, b) => labels[a].localeCompare(labels[b]));
  const value = (r: Row, k: SortKey) => (k === "__level" ? (r.level ?? -1) : k === "__enh" ? (r.max_enh ?? -1) : (r.stats[k]?.[0] ?? -1));
  const rest = filtered.filter((r) => !pins.includes(r.id));
  const sorted = sort ? [...rest].sort((a, b) => (value(a, sort.key) - value(b, sort.key)) * sort.dir) : rest;
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const cur = Math.min(page, pages - 1);
  const shown = sorted.slice(cur * PAGE_SIZE, (cur + 1) * PAGE_SIZE);
  const icons = useIcons([...pinned, ...shown].map((r) => r.icon));
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
              <th scope="col" className="gvCheck">
                <span className="srOnly">{t("database.gear.selectCol")}</span>
              </th>
              <th scope="col" style={{ textAlign: "left" }}>
                {t("world.gear.item")}
              </th>
              {head("__level", t("world.gear.level"))}
              {head("__enh", t("world.gear.maxEnh"))}
              {cols.map((c) => head(c, labels[c]))}
            </tr>
          </thead>
          <tbody ref={body}>
            {[...pinned, ...shown].map((r, i) => (
              <tr
                key={r.id}
                data-id={r.id}
                className={i < pinned.length ? (i === pinned.length - 1 ? "gvPinned gvPinnedLast" : "gvPinned") : undefined}
                data-selected={selected.includes(r.id) || undefined}
                onClick={(e: MouseEvent) => {
                  // The whole row selects; its own controls keep their action.
                  if (!(e.target as HTMLElement).closest("button, input, a")) toggle(r.id);
                }}
              >
                <td className="gvCheck">
                  <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggle(r.id)} aria-label={t("database.gear.select", { name: r.name ?? r.id })} />
                </td>
                <td>
                  <div className="gvItem">
                    <GameIcon url={r.icon ? icons[r.icon] : undefined} grade={r.grade} />
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <button type="button" className="wBtn" style={{ color: gradeColor(r.grade) }} onClick={() => openEntry(go, "item", r.id)}>
                        {r.name ?? r.id}
                      </button>
                      <span style={{ display: "block", fontSize: 11, color: "var(--pm-t3)" }}>
                        {r.slot} · {r.grade}
                      </span>
                    </span>
                    {i < pinned.length && (
                      <button
                        type="button"
                        className="gvUnpin"
                        onClick={() => storePins(pins.filter((id) => id !== r.id))}
                        title={t("database.gear.unpin")}
                        aria-label={t("database.gear.unpinItem", { name: r.name ?? r.id })}
                      >
                        <PushPinIcon weight="fill" aria-hidden="true" />
                      </button>
                    )}
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
        {pinned.length + shown.length === 0 && (
          <div style={{ padding: 20 }}>
            <None>{t("world.gear.none")}</None>
          </div>
        )}
      </div>
      <Pager t={t} page={cur} pages={pages} setPage={setPage} />

      {/* Selection bar: always mounted so it can slide in and out; inert while hidden. */}
      <div className="gvBar" data-open={selected.length > 0} inert={selected.length === 0} role="toolbar" aria-label={t("database.gear.selection")}>
        <span aria-live="polite" style={{ marginRight: "auto" }}>
          {t("database.gear.selected", { n: selected.length })}
        </span>
        {selected.some((id) => !pins.includes(id)) && (
          <button type="button" className="btn sm" onClick={pinSelected}>
            <PushPinIcon aria-hidden="true" />
            {t("database.gear.pin")}
          </button>
        )}
        <button type="button" className="btn sm fill" disabled={selected.length < 2} title={selected.length < 2 ? t("database.gear.compareHint") : undefined} onClick={() => setComparing(true)}>
          <ScalesIcon aria-hidden="true" />
          {t("database.gear.compare")}
        </button>
        <button type="button" className="btn sm" onClick={() => setSelected([])} aria-label={t("database.gear.clear")} title={t("database.gear.clear")}>
          <XIcon aria-hidden="true" />
        </button>
      </div>

      {comparing && <Compare t={t} lang={lang} rows={selected.map((id) => byId.get(id)).filter((r): r is Row => !!r)} labels={labels} onClose={() => setComparing(false)} />}
    </div>
  );
}

// A compare line: label, value to rank (null = not on the piece), text shown, whether less is better.
type Line = [string, (r: Row) => number | null, (r: Row) => string, boolean?];

// Stats where less is better (stat_dictionary keys): the green arrow goes on the lowest value.
// CombatSpeed stays out: on gear it is a +% speed bonus, so more is faster.
const LOWER_IS_BETTER = new Set(["CoolTimeIncrease", "CastingTime"]);

/** Selected pieces side by side: per line, an up arrow on the highest value and a down arrow on the lowest, green on the better one. */
function Compare({ t, lang, rows, labels, onClose }: { t: T; lang: string; rows: Row[]; labels: Record<string, string>; onClose: () => void }) {
  const icons = useIcons(rows.map((r) => r.icon));
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r.stats)))].sort((a, b) => labels[a].localeCompare(labels[b]));
  const num = (v: number) => v.toLocaleString(lang, { maximumFractionDigits: 2 });
  const lines: Line[] = [
    [t("world.gear.level"), (r) => r.level, (r) => (r.level == null ? t("world.db.nd") : num(r.level))],
    [t("world.gear.maxEnh"), (r) => r.max_enh, (r) => (r.max_enh == null ? t("world.db.nd") : `+${r.max_enh}`)],
    // A stat listed twice counts as its sum.
    ...keys.map((k): Line => [
      labels[k],
      (r) => (r.stats[k] ? r.stats[k].reduce((a, b) => a + b, 0) : null),
      (r) => (r.stats[k] ? r.stats[k].map(num).join(" + ") : "-"),
      LOWER_IS_BETTER.has(k),
    ]),
  ];
  return (
    <Modal
      width={Math.min(1000, 240 + 170 * rows.length)}
      onClose={onClose}
      title={(id) => (
        <div style={{ display: "flex", alignItems: "center" }}>
          <h2 id={id} style={{ flex: 1, fontSize: 15, fontWeight: 600, margin: 0 }}>
            {t("database.gear.compareTitle", { n: rows.length })}
          </h2>
          <button type="button" className="btn sm" onClick={onClose} autoFocus>
            {t("database.gear.close")}
          </button>
        </div>
      )}
    >
      <div className="gvCmpWrap">
        <table className="gvTable">
          <thead>
            <tr>
              <th scope="col" style={{ textAlign: "left" }}>
                {t("database.gear.stat")}
              </th>
              {rows.map((r) => (
                <th key={r.id} scope="col" style={{ textAlign: "left" }}>
                  <div className="gvItem" style={{ minWidth: 0, whiteSpace: "normal" }}>
                    <GameIcon url={r.icon ? icons[r.icon] : undefined} grade={r.grade} />
                    <span style={{ color: gradeColor(r.grade) }}>{r.name ?? r.id}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map(([label, rank, text, lower]) => {
              const vals = rows.map(rank);
              const have = vals.filter((v): v is number => v != null);
              const hi = Math.max(...have);
              const lo = Math.min(...have);
              return (
                <tr key={label}>
                  <th scope="row" style={{ textAlign: "left", color: "var(--pm-t2)" }}>
                    {label}
                  </th>
                  {rows.map((r, i) => {
                    // Arrows only where the pieces differ.
                    const mark = hi === lo || vals[i] == null ? null : vals[i] === hi ? "hi" : vals[i] === lo ? "lo" : null;
                    return (
                      // data-mark sets the color: "hi" is green (better), "lo" red; flipped where less is better.
                      <td key={r.id} className="gvNum" data-mark={mark ? ((mark === "hi") !== !!lower ? "hi" : "lo") : undefined}>
                        {text(r)}
                        {mark && (
                          <>
                            {mark === "hi" ? <ArrowUpIcon className="gvMark" weight="bold" aria-hidden="true" /> : <ArrowDownIcon className="gvMark" weight="bold" aria-hidden="true" />}
                            <span className="srOnly">{t(mark === "hi" ? "database.gear.highest" : "database.gear.lowest")}</span>
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
