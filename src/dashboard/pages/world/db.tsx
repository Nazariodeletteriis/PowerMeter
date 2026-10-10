import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ArrowLeftIcon, CaretLeftIcon, CaretRightIcon, CloudArrowDownIcon, CubeIcon, MagnifyingGlassIcon, WarningIcon } from "@phosphor-icons/react";
import type { BuilderData, Category, CategoryCount, Dungeon, DungeonBoss, GameRecord, GearPiece, IconUrls, ListRow, MonsterDrop, Planner, SearchHit } from "../../../data/db/types";
import type { T } from "../../i18n";
import { EmptyState } from "../../ui";
import type { PageProps } from "../types";
import "./world.css";

// Game data archive (src-tauri/src/gamedata.rs): shared pieces of the Database pages.
// Names are English, as in the archive; a null value is shown as "n.d.", never as 0.

export const gd = {
  get: (category: Category, id: string) => invoke<GameRecord | null>("gamedata_get", { category, id }),
  search: (query: string, category?: Category) => invoke<SearchHit[]>("gamedata_search", { query, category, limit: 200 }),
  list: (category: Category) => invoke<ListRow[]>("gamedata_list", { category }),
  counts: () => invoke<CategoryCount[]>("gamedata_counts"),
  rows: <R,>(table: string, column: string, value: string) => invoke<R[]>("gamedata_rows", { table, column, value }),
  icons: (icons: string[]) => invoke<IconUrls>("gamedata_icons", { icons }),
  drops: (monsterId: string) => invoke<MonsterDrop[]>("gamedata_monster_drops", { monsterId }),
  dungeons: () => invoke<{ dungeons: Dungeon[]; bosses: DungeonBoss[] }>("gamedata_dungeons"),
  gear: () => invoke<GearPiece[]>("gamedata_gear"),
  planner: (cls: string) => invoke<Planner>("gamedata_planner", { class: cls }),
  builder: (cls: string) => invoke<BuilderData>("gamedata_builder", { class: cls }),
  sync: () => invoke("gamedata_sync"),
};

/** Page (nav.ts id) that shows each category. */
export const PAGE_OF: Partial<Record<Category, string>> = {
  item: "item",
  monster: "npc",
  quest: "quest",
  dungeon: "dungeon",
  recipe: "crafting",
  skill: "dbskill",
};
const selKey = (c: Category) => `pm.db.${c}`;

/** Opens a record on its own page (the page reads the id from sessionStorage). */
export function openEntry(go: (page: string) => void, category: Category, id: string) {
  const page = PAGE_OF[category];
  if (!page) return;
  sessionStorage.setItem(selKey(category), id);
  go(page);
}
/** Opens a category's page on its list. */
export function openList(go: (page: string) => void, category: Category) {
  sessionStorage.removeItem(selKey(category));
  go(PAGE_OF[category]!);
}
export type Open = (category: Category, id: string) => void;

// Prototype rarity colors (RAR) on the game's grade names.
const GRADE: Record<string, string> = {
  Common: "#9C9494",
  Rare: "#6CC46A",
  Legend: "#4F93EA",
  Unique: "#F0A63A",
  Special: "#B377E8",
  Epic: "#FF4040",
};
export const gradeColor = (g?: string | null) => (g && GRADE[g]) || "var(--pm-grey)";

/** Number in the user's language, or "n.d." when not published. */
export function Nd({ t, value, lang, unit = "" }: { t: T; value: number | null | undefined; lang: string; unit?: string }) {
  if (value == null)
    return (
      <span className="wNd" title={t("world.db.ndTitle")}>
        {t("world.db.nd")}
      </span>
    );
  return <>{value.toLocaleString(lang, { maximumFractionDigits: 2 }) + unit}</>;
}

export type Loaded<D> = { data?: D; error?: string; retry: () => void };

/** Runs `load` when `key` changes (and on retry). */
export function useGd<D>(load: () => Promise<D>, key: string): Loaded<D> {
  const [state, setState] = useState<{ key: string; data?: D; error?: string }>({ key: "" });
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    load().then(
      (data) => alive && setState({ key, data }),
      (e) => alive && setState({ key, error: String(e) }),
    );
    return () => {
      alive = false;
    };
  }, [key, n]); // eslint-disable-line react-hooks/exhaustive-deps
  // A new key shows "loading", not the previous record.
  const cur = state.key === key ? state : {};
  return { ...cur, retry: () => setN((x) => x + 1) };
}

/** Image URLs for icon names (missing ones fall back to a glyph). */
export function useIcons(names: (string | null | undefined)[]): IconUrls {
  const list = [...new Set(names.filter((n): n is string => !!n))].sort();
  return useGd(() => (list.length ? gd.icons(list) : Promise.resolve({})), list.join("|")).data ?? {};
}

/** Icon in a square outlined with the grade color; our CDN image, else a glyph. */
export function GameIcon({ url, grade, size = 28, glyph }: { url?: string; grade?: string | null; size?: number; glyph?: ReactNode }) {
  const [broken, setBroken] = useState<string>();
  return (
    <span className="wIc" style={{ "--c": gradeColor(grade), width: size, height: size } as CSSProperties} aria-hidden="true">
      {url && broken !== url ? <img src={url} alt="" loading="lazy" onError={() => setBroken(url)} /> : (glyph ?? <CubeIcon />)}
    </span>
  );
}

/** Loading, "not downloaded yet" and error states of a read. */
export function DataState({ t, error, retry, rows = 6 }: { t: T; error?: string; retry: () => void; rows?: number }) {
  const [busy, setBusy] = useState(false);
  const [syncError, setSyncError] = useState<string>();
  if (!error)
    return (
      <div aria-busy="true" aria-label={t("world.db.loading")} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="skeleton" style={{ height: 34 }} />
        ))}
      </div>
    );
  const missing = error.includes("not downloaded");
  const download = () => {
    setBusy(true);
    setSyncError(undefined);
    gd.sync().then(retry, (e) => setSyncError(String(e))).finally(() => setBusy(false));
  };
  return (
    <section className="card" role="status">
      {missing ? (
        <EmptyState icon={<CloudArrowDownIcon aria-hidden="true" />} title={t("world.db.notDownloaded")} text={t("world.db.notDownloadedText")}>
          <button type="button" className="btn fill" disabled={busy} onClick={download}>
            {t(busy ? "world.db.downloading" : "world.db.download")}
          </button>
        </EmptyState>
      ) : (
        <EmptyState icon={<WarningIcon aria-hidden="true" />} title={t("world.db.error")} text={error}>
          <button type="button" className="btn" onClick={retry}>
            {t("world.db.retry")}
          </button>
        </EmptyState>
      )}
      {syncError && <div className="error" style={{ marginTop: 8 }}>{syncError}</div>}
    </section>
  );
}

const PAGE_SIZE = 50;

/** Previous / next pages of a long list. */
export function Pager({ t, page, pages, setPage }: { t: T; page: number; pages: number; setPage: (p: number) => void }) {
  if (pages < 2) return null;
  return (
    <div className="wPager">
      <button type="button" className="btn sm" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label={t("world.db.prev")}>
        <CaretLeftIcon aria-hidden="true" />
      </button>
      <span className="mono">{t("world.db.page", { n: page + 1, m: pages })}</span>
      <button type="button" className="btn sm" disabled={page === pages - 1} onClick={() => setPage(page + 1)} aria-label={t("world.db.next")}>
        <CaretRightIcon aria-hidden="true" />
      </button>
    </div>
  );
}

/** List rows: icon, name in the grade color, kind, level. */
export function DbList({ t, rows, onPick, glyph }: { t: T; rows: ListRow[]; onPick: (r: ListRow) => void; glyph?: ReactNode }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const cur = Math.min(page, pages - 1);
  const shown = rows.slice(cur * PAGE_SIZE, (cur + 1) * PAGE_SIZE);
  const icons = useIcons(shown.map((r) => r.icon));
  return (
    <>
      <div>
        {shown.map((r) => (
          <button key={r.id} type="button" className="wBtn wDbRow" onClick={() => onPick(r)}>
            <GameIcon url={r.icon ? icons[r.icon] : undefined} grade={r.grade} glyph={glyph} />
            <span style={{ color: r.grade ? gradeColor(r.grade) : undefined, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {r.name ?? r.id}
            </span>
            <span style={{ fontSize: 12, color: "var(--pm-t2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.kind}</span>
            <span className="mono" style={{ fontSize: 12, color: "var(--pm-t2)" }}>
              {r.level != null && t("world.db.lv", { n: r.level })}
            </span>
            <span style={{ fontSize: 12, color: "var(--pm-t3)" }}>{r.grade}</span>
          </button>
        ))}
      </div>
      <Pager t={t} page={cur} pages={pages} setPage={setPage} />
    </>
  );
}

/** Big icon, name and a subtitle (top of a record card). */
export function EntryHead({ name, sub, grade, icon, glyph }: { name: string; sub?: ReactNode; grade?: string | null; icon?: string; glyph?: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <GameIcon url={icon} grade={grade} size={72} glyph={glyph} />
      <div style={{ minWidth: 0 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: grade ? gradeColor(grade) : undefined }}>{name}</h2>
        {sub && <div style={{ fontSize: 12, color: "var(--pm-t2)", marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

/** A linked record in a card: small icon, name (opens it), something on the right. */
export function EntryLink({
  name,
  onOpen,
  icon,
  grade,
  glyph,
  aside,
}: {
  name: string;
  onOpen?: () => void;
  icon?: string;
  grade?: string | null;
  glyph?: ReactNode;
  aside?: ReactNode;
}) {
  const label = <span style={{ color: grade ? gradeColor(grade) : undefined }}>{name}</span>;
  return (
    <div className="wLink">
      <GameIcon url={icon} grade={grade} size={24} glyph={glyph} />
      {onOpen ? (
        <button type="button" className="wBtn wLinkName" onClick={onOpen}>
          {label}
        </button>
      ) : (
        <span className="wLinkName">{label}</span>
      )}
      {aside != null && <span className="mono" style={{ fontSize: 12, color: "var(--pm-t2)" }}>{aside}</span>}
    </div>
  );
}

/** Card section with the small uppercase label. */
export function Section({ title, children, style }: { title: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <section className="card" style={style}>
      <h3 className="wLabel">{title}</h3>
      {children}
    </section>
  );
}

/** Text shown in a section with nothing to list. */
export const None = ({ children }: { children: ReactNode }) => <div style={{ fontSize: 13, color: "var(--pm-t2)" }}>{children}</div>;

/** Long lists in a card: the first `max`, then a "show all" button. */
export function Capped<I>({ t, items, max = 20, render }: { t: T; items: I[]; max?: number; render: (item: I, i: number) => ReactNode }) {
  const [all, setAll] = useState(false);
  return (
    <>
      {(all ? items : items.slice(0, max)).map(render)}
      {!all && items.length > max && (
        <button type="button" className="linkBtn" style={{ marginTop: 6 }} onClick={() => setAll(true)}>
          {t("world.db.showAll", { n: items.length })}
        </button>
      )}
    </>
  );
}

/**
 * A category's page: its list with a filter, or one record's card (opened from
 * here, from search or from another page through openEntry).
 */
export function TypePage({
  t,
  go,
  setHeader,
  category,
  title,
  glyph,
  card,
  list,
}: Pick<PageProps, "t" | "go" | "setHeader"> & {
  category: Category;
  title: string;
  glyph?: ReactNode;
  card: (id: string, open: Open) => ReactNode;
  /** Replaces the default list (e.g. dungeons grouped by name). */
  list?: (open: Open) => ReactNode;
}) {
  useEffect(() => setHeader({ title }), [setHeader, title]);
  const [sel, setSel] = useState(() => sessionStorage.getItem(selKey(category)));
  const box = useRef<HTMLDivElement>(null);
  const open: Open = (cat, id) => {
    if (PAGE_OF[cat] !== PAGE_OF[category]) return openEntry(go, cat, id);
    sessionStorage.setItem(selKey(cat), id);
    setSel(id);
    box.current?.closest(".content")?.scrollTo(0, 0); // the shell's scroll area
  };
  const back = () => {
    sessionStorage.removeItem(selKey(category));
    setSel(null);
  };

  if (sel)
    return (
      <div ref={box} style={{ maxWidth: 1100 }}>
        <button type="button" className="btn sm" style={{ marginBottom: 12 }} onClick={back}>
          <ArrowLeftIcon aria-hidden="true" />
          {t("world.db.back")}
        </button>
        {card(sel, open)}
      </div>
    );
  return <div style={{ maxWidth: 1100 }}>{list ? list(open) : <CategoryList t={t} category={category} glyph={glyph} onPick={(r) => open(category, r.id)} />}</div>;
}

/** Name filter over a list (the whole category is loaded: at most ~9k rows). */
export function FilterBox({ t, q, setQ, count }: { t: T; q: string; setQ: (q: string) => void; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <label className="wDbSearch sm">
        <MagnifyingGlassIcon aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("world.db.filter")} aria-label={t("world.db.filter")} />
      </label>
      {count != null && (
        <span style={{ fontSize: 12, color: "var(--pm-t3)" }} aria-live="polite">
          {t("world.db.results", { n: count.toLocaleString() })}
        </span>
      )}
    </div>
  );
}

function CategoryList({ t, category, glyph, onPick }: { t: T; category: Category; glyph?: ReactNode; onPick: (r: ListRow) => void }) {
  const rows = useGd(() => gd.list(category), category);
  const [q, setQ] = useState("");
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const found = rows.data?.filter((r) => {
    const hay = `${r.name ?? ""} ${r.kind ?? ""} ${r.id}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  return (
    <>
      <FilterBox t={t} q={q} setQ={setQ} count={found?.length} />
      {!found ? (
        <DataState t={t} error={rows.error} retry={rows.retry} />
      ) : found.length === 0 ? (
        <None>{t("world.db.noResults", { q: q.trim() })}</None>
      ) : (
        <DbList key={q} t={t} rows={found} onPick={onPick} glyph={glyph} />
      )}
    </>
  );
}

/** Loads one record and shows its card, or the loading / missing / error state. */
export function RecordCard({ t, category, id, children }: { t: T; category: Category; id: string; children: (r: GameRecord) => ReactNode }) {
  const rec = useGd(() => gd.get(category, id), `${category}:${id}`);
  if (rec.data === undefined) return <DataState t={t} error={rec.error} retry={rec.retry} />;
  if (rec.data === null)
    return (
      <section className="card">
        <None>{t("world.db.missing")}</None>
      </section>
    );
  return <>{children(rec.data)}</>;
}
