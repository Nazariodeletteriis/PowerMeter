import { useState } from "react";
import {
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  SquaresFourIcon,
  StackIcon,
  TrashIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { REGIONS } from "../Onboarding";
import { planClass } from "../skills";
import { ClassAvatar, CLASSES, RELEASED_CLASSES } from "../ui";
import {
  BUILD_REGIONS,
  BUILD_TAGS,
  closeBuild,
  DANGER,
  DeleteBuildModal,
  MY_BUILDS_KEY,
  openBuild,
  readMyBuilds,
  useMem,
} from "./characters/shared";
import States from "./shared/States";
import type { PageProps } from "./types";

const ALL = "";
const PAGE_SIZE = 12; // three rows of four (four rows of three on a narrow window)
const TABS = [
  ["all", "characters.builds.all", SquaresFourIcon],
  ["mine", "characters.builds.mine", UserIcon],
  ["liked", "characters.builds.liked", HeartIcon],
] as const;

/** One card: a build of yours. */
type Card = { key: string; t: string; cls: string; reg: string; tags: string[]; au: string };

/** Page buttons: all of them up to 7, else first, last and the current one's neighbours (0 = gap). */
function pageNums(page: number, pages: number) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const mid = [page - 1, page, page + 1].filter((n) => n > 1 && n < pages);
  return [1, ...(mid[0] > 2 ? [0] : []), ...mid, ...(mid[mid.length - 1] < pages - 1 ? [0] : []), pages];
}

// Prototype pg.builds (pBuilds).
export default function Builds({ t, name, go, settings, save, onError }: PageProps) {
  // Community builds (all, favourites) wait for official data: "Your builds" opens first.
  const [f, setF] = useMem("bf", { reg: ALL, cls: ALL, tag: ALL, q: "", tab: "mine", page: 1 });
  // Builds created or cloned in the Character Builder (newest first).
  const myBuilds = readMyBuilds(settings[MY_BUILDS_KEY]);
  // The build waiting for "Delete?" in the modal.
  const [del, setDel] = useState<{ t: string; cls: string } | null>(null);
  /** Delete one of your builds. */
  const remove = (b: { t: string; cls: string }) => {
    setDel(null);
    closeBuild(b.t);
    save(MY_BUILDS_KEY, JSON.stringify(myBuilds.filter((x) => x.t !== b.t))).catch(onError);
  };
  // Any filter change goes back to the first page.
  const upd = (o: Partial<typeof f>) => setF({ ...f, page: 1, ...o });
  const mineTab = f.tab === "mine";

  const reg = REGIONS.find((r) => r.value === settings["pm.region"])?.label ?? BUILD_REGIONS[0];
  const q = f.q.trim().toLowerCase();
  const filtered = !!(f.reg || f.cls || f.tag || q);
  const list: Card[] = myBuilds
    .map((m) => ({ key: m.t, t: m.t, cls: m.cls, reg, tags: m.tags ?? [], au: name }))
    .filter(
      (x) =>
        (!f.reg || x.reg === f.reg) &&
        (!f.cls || x.cls === f.cls) &&
        (!f.tag || x.tags.includes(f.tag)) &&
        (x.t.toLowerCase().includes(q) || x.au.toLowerCase().includes(q)),
    );
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(f.page, pages);
  const shown = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const chip = (v: string, label: string, cur: string, key: "reg" | "tag") => (
    <button key={label} type="button" className="chChip" aria-pressed={v === cur} onClick={() => upd({ [key]: v })}>
      {label}
    </button>
  );

  const card = (x: Card) => {
    const col = CLASSES[x.cls][1];
    const global = x.reg === "EU";
    const open = () => openBuild({ t: x.t, au: name, cls: x.cls, own: true, tags: x.tags }, go);
    return (
      // The whole card opens the build on click; the title button is the keyboard path.
      <div key={x.key} className="chBuildCard" onClick={open}>
        <div className="chBuildArt" style={{ background: `linear-gradient(160deg,${col}55 0%,var(--pm-s2) 70%)` }}>
          <ClassAvatar cls={x.cls} size={24} />
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ minWidth: 0 }}>
            <button type="button" className="chBtnReset chBuildTitle" onClick={(e) => (e.stopPropagation(), open())}>
              {x.t}
            </button>
            <div style={{ fontSize: 11, color: "var(--pm-t3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {x.cls}
            </div>
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            <span className="chPill" style={{ background: "var(--pm-s3)", display: "flex", gap: 4, alignItems: "center" }}>
              <StackIcon aria-hidden="true" />
              {t("characters.buildsCount.one", { n: 1 })}
            </span>
            <span className="chPill" style={{ background: global ? "#3FBF7F1f" : "#4F93EA1f", color: global ? "#5FD99A" : "#7FB2F0" }}>
              {x.reg}
            </span>
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {x.tags.map((tag) => (
              <span key={tag} className="chPill" style={{ border: "1px solid var(--pm-line)", color: "var(--pm-t2)" }}>
                {tag}
              </span>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 5, alignItems: "center", minWidth: 0 }}>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: "var(--pm-t2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.au}</span>
            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, border: "1px solid var(--pm-red)", color: "var(--pm-redt)", flex: "none" }}>
              {t("characters.builds.yours")}
            </span>
          </div>
          {/* Edit and delete, spelled out. */}
          <div style={{ display: "flex", gap: 6, paddingTop: 8, borderTop: "1px solid var(--pm-line)" }}>
            <button type="button" className="btn sm" style={{ flex: 1 }} onClick={(e) => (e.stopPropagation(), open())}>
              <PencilSimpleIcon aria-hidden="true" />
              {t("characters.builds.edit")}
            </button>
            <button
              type="button"
              className="btn sm"
              style={{ flex: 1, ...DANGER }}
              aria-label={`${t("characters.delete")} ${x.t}`}
              onClick={(e) => (e.stopPropagation(), setDel(x))}
            >
              <TrashIcon aria-hidden="true" />
              {t("characters.delete")}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "230px minmax(0,1fr)", gap: 16, alignItems: "start" }}>
      <aside
        style={{
          background: "var(--pm-s1)",
          border: "1px solid var(--pm-line)",
          borderRadius: 8,
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          position: "sticky",
          top: 0,
        }}
      >
        <label className="chSearch" style={{ height: 32, padding: "0 10px", gap: 8 }}>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            value={f.q}
            onChange={(e) => upd({ q: e.target.value })}
            placeholder={t("characters.builds.search")}
            aria-label={t("characters.builds.search")}
            style={{ fontSize: 13.33 }}
          />
        </label>
        <div className="kicker">{t("characters.builds.region")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {[ALL, ...BUILD_REGIONS].map((v) => chip(v, v || t("characters.builds.allF"), f.reg, "reg"))}
        </div>
        <div className="kicker">{t("characters.builds.class")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {[ALL, ...RELEASED_CLASSES].map((v) => (
            <button key={v || "all"} type="button" className="chBtnReset chClassRow" aria-pressed={v === f.cls} onClick={() => upd({ cls: v })}>
              {v ? (
                <ClassAvatar cls={v} size={20} />
              ) : (
                <span
                  aria-hidden="true"
                  style={{ width: 20, height: 20, borderRadius: 4, display: "grid", placeItems: "center", fontSize: 8, fontWeight: 700, color: "var(--pm-t2)", border: "1px solid var(--pm-t2)" }}
                >
                  ∗
                </span>
              )}
              <span style={{ flex: 1 }}>{v || t("characters.builds.allF")}</span>
              {v === f.cls && <CheckIcon aria-hidden="true" style={{ color: "var(--pm-redt)" }} />}
            </button>
          ))}
        </div>
        <div className="kicker">{t("characters.builds.tag")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {[ALL, ...BUILD_TAGS].map((v) => chip(v, v || t("characters.builds.allM"), f.tag, "tag"))}
        </div>
      </aside>

      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, borderBottom: "1px solid var(--pm-line)", marginBottom: 14 }}>
          {TABS.map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              className="chTab"
              aria-pressed={f.tab === id}
              onClick={() => upd({ tab: id })}
            >
              <Icon aria-hidden="true" />
              {t(label)}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: "var(--pm-t3)", marginRight: 10 }} aria-live="polite">
            {mineTab &&
              t(list.length === 1 ? "characters.buildsCount.one" : "characters.buildsCount.other", { n: list.length })}
          </span>
          <button
            type="button"
            className="btn sm fill"
            style={{ padding: "0 12px", marginBottom: 5 }}
            onClick={() => openBuild({ t: "", au: name, cls: planClass(settings["pm.class"]), own: true, isNew: true }, go)}
          >
            <PlusIcon aria-hidden="true" />
            {t("characters.builds.create")}
          </button>
        </div>
        {!mineTab ? (
          <States t={t} />
        ) : (
          <>
            {list.length === 0 && (
              <div style={{ padding: "40px 0", color: "var(--pm-t2)" }}>
                <div style={{ fontSize: 16, color: "var(--pm-t1)", marginBottom: 4 }}>{t(filtered ? "characters.builds.emptyTitle" : "characters.builds.noneTitle")}</div>
                {t(filtered ? "characters.builds.emptyText" : "characters.builds.noneText")}
              </div>
            )}
            <div className="chBuildGrid">{shown.map(card)}</div>
            {pages > 1 && (
              <nav aria-label={t("characters.builds.pages")} style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 16 }}>
                <button type="button" className="chPage" aria-label={t("characters.builds.prev")} disabled={page === 1} onClick={() => upd({ page: page - 1 })}>
                  <CaretLeftIcon aria-hidden="true" />
                </button>
                {pageNums(page, pages).map((n, i) =>
                  n ? (
                    <button key={n} type="button" className="chPage" aria-current={n === page ? "page" : undefined} onClick={() => upd({ page: n })}>
                      {n}
                    </button>
                  ) : (
                    <span key={`gap${i}`} aria-hidden="true" style={{ width: 20, display: "grid", placeItems: "center", color: "var(--pm-t3)" }}>
                      …
                    </span>
                  ),
                )}
                <button type="button" className="chPage" aria-label={t("characters.builds.next")} disabled={page === pages} onClick={() => upd({ page: page + 1 })}>
                  <CaretRightIcon aria-hidden="true" />
                </button>
              </nav>
            )}
          </>
        )}
      </div>
      {del && <DeleteBuildModal t={t} build={del.t} onDelete={() => remove(del)} onClose={() => setDel(null)} />}
    </div>
  );
}
