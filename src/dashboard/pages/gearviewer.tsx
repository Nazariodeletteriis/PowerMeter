import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { ArrowDownIcon, ArrowUpIcon, CaretDownIcon, CaretUpIcon, PushPinIcon, ScalesIcon, XIcon } from "@phosphor-icons/react";
import type { BuilderData, GearPiece, ItemStat } from "../../data/db/types";
import type { T } from "../i18n";
import { planClass } from "../skills";
import { enhancementOf, enhBonus, enhSteps, fitOpts, inRange, manualValue, readTunes, TUNE_KEY, type Opt, type Tune } from "./gear/enh";
import { Modal } from "./system/Modal";
import type { PageProps } from "./types";
import { DataState, FilterBox, GameIcon, gd, gradeColor, Nd, None, openEntry, Pager, useGd, useIcons } from "./world/db";
import "./world/world.css";
import "./gear/gear.css";

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

export default function GearViewer({ t, lang, go, setHeader, settings, save, onError }: PageProps) {
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
  // Enhancement and bonuses chosen per piece in the compare, kept in the settings.
  const tunes = useMemo(() => readTunes(settings[TUNE_KEY]), [settings[TUNE_KEY]]); // eslint-disable-line react-hooks/exhaustive-deps
  const setTune = (id: string, tune: Tune) => save(TUNE_KEY, JSON.stringify({ ...tunes, [id]: tune })).catch(onError);
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

      {comparing && (
        <Compare
          t={t}
          lang={lang}
          rows={selected.map((id) => byId.get(id)).filter((r): r is Row => !!r)}
          labels={labels}
          cls={planClass(settings["pm.class"]).toLowerCase()}
          tunes={tunes}
          setTune={setTune}
          onClose={() => setComparing(false)}
        />
      )}
    </div>
  );
}

// A compare line: label, value to rank (null = not on the piece), text shown and where it comes from, whether less is better.
type Line = [string, (r: Row) => number | null, (r: Row) => [text: string, from?: string], boolean?];

// Stats where less is better (stat_dictionary keys): the green arrow goes on the lowest value.
// CombatSpeed stays out: on gear it is a +% speed bonus, so more is faster.
const LOWER_IS_BETTER = new Set(["CoolTimeIncrease", "CastingTime"]);

/** What the archive has for a piece beyond its fixed stats: enhancement bonus per level, rolled options with their range. */
type Extra = { levels: Awaited<ReturnType<typeof enhancementOf>>; rolled: ItemStat[] };

/**
 * Selected pieces side by side: per line, an up arrow on the highest value and a down arrow on the lowest, green on
 * the better one. Each piece takes an enhancement level and its bonuses, and every stat counts them in.
 */
function Compare({
  t,
  lang,
  rows,
  labels,
  cls,
  tunes,
  setTune,
  onClose,
}: {
  t: T;
  lang: string;
  rows: Row[];
  labels: Record<string, string>;
  /** Any class: only the stat dictionary of gamedata_builder is read. */
  cls: string;
  tunes: Record<string, Tune>;
  setTune: (id: string, tune: Tune) => void;
  onClose: () => void;
}) {
  const icons = useIcons(rows.map((r) => r.icon));
  const ids = rows.map((r) => r.id);
  const extra = useGd(
    () =>
      Promise.all(
        ids.map(async (id): Promise<Extra> => ({
          levels: await enhancementOf(gd.rows, id),
          rolled: (await gd.rows<ItemStat>("item_stats", "item_code", id)).filter((s) => s.is_rolled),
        })),
      ).then((l) => Object.fromEntries(ids.map((id, i) => [id, l[i]]))),
    ids.join("|"),
  );
  const dict = useGd(() => gd.builder(cls).then((b) => b.stats), cls);
  const label = (k: string) => {
    const d = dict.data?.find((s) => s.stat_key === k);
    return labels[k] ?? (d ? d.name + (d.percent ? " %" : "") : k);
  };
  const num = (v: number) => v.toLocaleString(lang, { maximumFractionDigits: 2 });

  // Each piece as set: level within the ones it has, bonuses that hold for it, the stats they add.
  const tuned = (r: Row) => {
    const x = extra.data?.[r.id];
    const tune = tunes[r.id] ?? { enh: 0, opts: [] };
    const steps = x ? enhSteps(x.levels) : [0];
    const enh = steps.filter((s) => s <= tune.enh).pop() ?? 0;
    const opts = x ? fitOpts(tune.opts, x.rolled) : [];
    const add: Record<string, number> = {};
    for (const [k, v] of [...(x ? enhBonus(x.levels, enh) : []), ...opts]) add[k] = (add[k] ?? 0) + v;
    return { x, steps, enh, opts, add };
  };
  const set = rows.map(tuned);
  const at = (r: Row) => set[rows.indexOf(r)];
  const keys = [...new Set(rows.flatMap((r, i) => [...Object.keys(r.stats), ...Object.keys(set[i].add)]))].sort((a, b) => label(a).localeCompare(label(b)));

  const lines: Line[] = [
    [t("world.gear.level"), (r) => r.level, (r) => [r.level == null ? t("world.db.nd") : num(r.level)]],
    [t("world.gear.maxEnh"), (r) => r.max_enh, (r) => [r.max_enh == null ? t("world.db.nd") : `+${r.max_enh}`]],
    // A stat listed twice counts as its sum; enhancement and bonuses add to it.
    ...keys.map((k): Line => [
      label(k),
      (r) => (r.stats[k] || at(r).add[k] != null ? (r.stats[k] ?? []).reduce((a, b) => a + b, 0) + (at(r).add[k] ?? 0) : null),
      (r) => {
        const base = r.stats[k];
        const plus = at(r).add[k];
        if (!base) return [plus == null ? "-" : num(plus)];
        if (plus == null) return [base.map(num).join(" + ")];
        // The total, then where it comes from: the piece's own value, then enhancement and bonuses.
        return [num(base.reduce((a, b) => a + b, 0) + plus), `${base.map(num).join(" + ")} ${plus < 0 ? "-" : "+"} ${num(Math.abs(plus))}`];
      },
      LOWER_IS_BETTER.has(k),
    ]),
  ];

  return (
    <Modal
      width={Math.min(1120, 260 + 220 * rows.length)}
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
      <p style={{ fontSize: 12, color: "var(--pm-t2)", margin: "0 0 12px" }}>{t("database.gear.tune.note")}</p>
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
            {!extra.data ? (
              <tr>
                <td colSpan={rows.length + 1}>
                  <DataState t={t} error={extra.error} retry={extra.retry} rows={2} />
                </td>
              </tr>
            ) : (
              <>
                <tr className="gvTune">
                  <th scope="row">{t("database.gear.tune.enh")}</th>
                  {rows.map((r, i) => {
                    const { steps, enh, opts, x } = set[i];
                    const last = Math.max(0, ...x!.levels.map((v) => v.level));
                    return (
                      <td key={r.id}>
                        {steps.length > 1 ? (
                          <select
                            className="input sm mono"
                            value={enh}
                            aria-label={t("database.gear.tune.enhFor", { name: r.name ?? r.id })}
                            onChange={(e) => setTune(r.id, { enh: Number(e.target.value), opts })}
                          >
                            {steps.map((l) => (
                              <option key={l} value={l}>
                                +{l}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ color: "var(--pm-t3)" }}>{t("planner.builder.noEnh")}</span>
                        )}
                        {last > 0 && enh > last && <div className="gvHint">{t("planner.builder.enhPastPublished", { n: last })}</div>}
                      </td>
                    );
                  })}
                </tr>
                <tr className="gvTune">
                  <th scope="row">{t("database.gear.tune.bonus")}</th>
                  {rows.map((r, i) => (
                    <td key={r.id}>
                      <Bonuses
                        t={t}
                        lang={lang}
                        name={r.name ?? r.id}
                        rolled={set[i].x!.rolled}
                        dict={dict.data ?? []}
                        opts={set[i].opts}
                        label={label}
                        set={(opts) => setTune(r.id, { enh: set[i].enh, opts })}
                      />
                    </td>
                  ))}
                </tr>
              </>
            )}
            {lines.map(([name, rank, text, lower]) => {
              const vals = rows.map(rank);
              const have = vals.filter((v): v is number => v != null);
              const hi = Math.max(...have);
              const lo = Math.min(...have);
              return (
                <tr key={name}>
                  <th scope="row" style={{ textAlign: "left", color: "var(--pm-t2)" }}>
                    {name}
                  </th>
                  {rows.map((r, i) => {
                    // Arrows only where the pieces differ.
                    const mark = hi === lo || vals[i] == null ? null : vals[i] === hi ? "hi" : vals[i] === lo ? "lo" : null;
                    const [shown, from] = text(r);
                    return (
                      // data-mark sets the color: "hi" is green (better), "lo" red; flipped where less is better.
                      <td key={r.id} className="gvNum" data-mark={mark ? ((mark === "hi") !== !!lower ? "hi" : "lo") : undefined}>
                        {shown}
                        {mark && (
                          <>
                            {mark === "hi" ? <ArrowUpIcon className="gvMark" weight="bold" aria-hidden="true" /> : <ArrowDownIcon className="gvMark" weight="bold" aria-hidden="true" />}
                            <span className="srOnly">{t(mark === "hi" ? "database.gear.highest" : "database.gear.lowest")}</span>
                          </>
                        )}
                        {from && <span className="gvFrom">{from}</span>}
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

/**
 * The bonuses of one piece: picked from the options the archive lists for it, each value inside its range; when the
 * archive lists none, any stat of the stat dictionary, added by hand and marked as manual.
 */
function Bonuses({
  t,
  lang,
  name,
  rolled,
  dict,
  opts,
  label,
  set,
}: {
  t: T;
  lang: string;
  name: string;
  rolled: ItemStat[];
  dict: BuilderData["stats"];
  opts: Opt[];
  label: (k: string) => string;
  set: (opts: Opt[]) => void;
}) {
  const num = (v: number) => v.toLocaleString(lang, { maximumFractionDigits: 2 });
  const manual = rolled.length === 0;
  const taken = new Set(opts.map(([k]) => k));
  const free = manual ? dict.filter((s) => !taken.has(s.stat_key)).map((s) => s.stat_key) : rolled.filter((s) => !taken.has(s.stat_key)).map((s) => s.stat_key);
  const range = (s: ItemStat) => `${num(s.min_display ?? 0)}-${num(s.max_display ?? 0)}${s.unit === "percent" ? "%" : ""}`;
  const add = (k: string) => {
    const s = rolled.find((r) => r.stat_key === k);
    // An option starts at its top roll; a hand-added stat at 0, to be typed in.
    set([...opts, s ? [k, inRange(s, s.max_display ?? 0), 0] : [k, 0, 1]]);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 190 }}>
      {manual && <div className="gvHint">{t("database.gear.tune.manualNote")}</div>}
      {opts.map(([k, v, m], i) => {
        const s = rolled.find((r) => r.stat_key === k);
        return (
          <div key={k}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ flex: 1, minWidth: 0, color: "var(--pm-t1)", whiteSpace: "normal" }}>{label(k)}</span>
              {m === 1 && <span className="wTag">{t("database.gear.tune.manual")}</span>}
              <button
                type="button"
                className="btn sm"
                style={{ width: 30, padding: 0 }}
                title={t("database.gear.tune.remove", { stat: label(k) })}
                aria-label={t("database.gear.tune.remove", { stat: label(k) })}
                onClick={() => set(opts.filter((_, j) => j !== i))}
              >
                <XIcon aria-hidden="true" />
              </button>
            </div>
            <OptValue
              value={v}
              label={t("database.gear.tune.valueOf", { stat: label(k) })}
              min={s?.min_display ?? undefined}
              max={s?.max_display ?? undefined}
              step={s?.unit === "percent" ? 0.01 : s ? 1 : 0.01}
              fit={(n) => (s ? inRange(s, n) : manualValue(n))}
              hint={s ? t("database.gear.tune.range", { range: range(s) }) : undefined}
              bad={s ? t("database.gear.tune.between", { range: range(s) }) : t("database.gear.tune.number")}
              commit={(n) => set(opts.map((o, j): Opt => (j === i ? [k, n, m] : o)))}
            />
          </div>
        );
      })}
      {opts.length === 0 && <span style={{ color: "var(--pm-t3)" }}>{t("database.gear.tune.none")}</span>}
      {free.length > 0 && (
        <select className="input sm gvAdd" value="" aria-label={t("database.gear.tune.addFor", { name })} onChange={(e) => e.target.value && add(e.target.value)}>
          <option value="">{t("database.gear.tune.add")}</option>
          {free
            .map((k) => [k, label(k)] as const)
            .sort((a, b) => a[1].localeCompare(b[1]))
            .map(([k, l]) => {
              const s = rolled.find((r) => r.stat_key === k);
              return (
                <option key={k} value={k}>
                  {s ? `${l} (${range(s)})` : l}
                </option>
              );
            })}
        </select>
      )}
    </div>
  );
}

/** A bonus value: typed freely, set (and brought into its range) when you leave the field or press Enter. */
function OptValue({
  value,
  label,
  min,
  max,
  step,
  fit,
  hint,
  bad,
  commit,
}: {
  value: number;
  label: string;
  min?: number;
  max?: number;
  step: number;
  fit: (n: number) => number;
  hint?: string;
  bad: string;
  commit: (n: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const n = Number(text);
  const wrong = text.trim() === "" || !Number.isFinite(n) || (min != null && n < min) || (max != null && n > max);
  const done = () => {
    if (text.trim() === "" || !Number.isFinite(n)) return setText(String(value));
    const v = fit(n);
    setText(String(v));
    if (v !== value) commit(v);
  };
  const id = useId();
  return (
    <div style={{ marginTop: 4 }}>
      <input
        type="number"
        inputMode="decimal"
        className="input sm mono"
        style={{ width: "100%", textAlign: "right" }}
        value={text}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        aria-invalid={wrong || undefined}
        aria-describedby={id}
        onChange={(e) => setText(e.target.value)}
        onBlur={done}
        onKeyDown={(e) => e.key === "Enter" && done()}
      />
      <div id={id} className="gvHint" data-bad={wrong || undefined} aria-live="polite">
        {wrong ? bad : hint}
      </div>
    </div>
  );
}
