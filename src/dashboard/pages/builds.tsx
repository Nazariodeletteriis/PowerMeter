import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowSquareOutIcon,
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
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { REGIONS } from "../Onboarding";
import { planClass } from "../skills";
import { ClassAvatar, CLASSES, EmptyState, RELEASED_CLASSES } from "../ui";
import { GEAR_KEY, gearKey, readGear, type BuildGear } from "./characters/gear";
import { communityGear, COMMUNITY_REGIONS, QUESTLOG_BUILD_URL, searchCommunity, type CommunityBuild } from "./characters/questlog";
import {
  BUILD_REGIONS,
  BUILD_TAGS,
  closeBuild,
  DANGER,
  DeleteBuildModal,
  LIKED_KEY,
  MY_BUILDS_KEY,
  openBuild,
  readLiked,
  readMyBuilds,
  tagLabel,
  toggleLiked,
  useMem,
  type BuildSrc,
  type QlOpened,
} from "./characters/shared";
import type { PageProps } from "./types";

// Standard class portraits, hotlinked at runtime (never bundled): NCSoft's game
// CDN has only the class emblems (UT_Class_<Class>_Large.png), so these are the
// ones questlog.gg serves for its build cards. The hashed names change when
// questlog redeploys; a failed load falls back to the class icon on the tint.
// No Brawler portrait exists yet.
const PORTRAIT_BASE = "";
const PORTRAIT: Record<string, string> = {
  Gladiator: "gladiator.BX_aSO0C.webp",
  Templar: "templar.BY_wrmrR.webp",
  Assassin: "assassin.C_F4-F8z.webp",
  Ranger: "ranger.Dmc84MYb.webp",
  Sorcerer: "sorcerer.CSSgJHSN.webp",
  Spiritmaster: "elementalist.ODaonq0L.webp",
  Cleric: "cleric.Dz3xHG9D.webp",
  Chanter: "chanter.BTjTO8gb.webp",
};

const ALL = "";
const PAGE_SIZE = 12; // three rows of four (four rows of three on a narrow window); questlog pages hold 18
const SEARCH_DELAY = 350; // ms of typing pause before asking questlog
const TABS = [
  ["all", "characters.builds.all", SquaresFourIcon],
  ["mine", "characters.builds.mine", UserIcon],
  ["liked", "characters.builds.liked", HeartIcon],
] as const;

/** One card: a build of yours (`mine`) or a questlog community build (`ql`). */
type Card = { key: string; t: string; cls: string; reg: string; tags: string[]; likes: number; au: string; avatar?: string; mine?: BuildSrc; ql?: CommunityBuild };
const fromQl = (b: CommunityBuild): Card => ({ key: b.slug, t: b.t, cls: b.cls, reg: b.reg, tags: b.tags.map(tagLabel), likes: b.likes, au: b.au, avatar: b.avatar, ql: b });

/** Page buttons: all of them up to 7, else first, last and the current one's neighbours (0 = gap). */
function pageNums(page: number, pages: number) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const mid = [page - 1, page, page + 1].filter((n) => n > 1 && n < pages);
  return [1, ...(mid[0] > 2 ? [0] : []), ...mid, ...(mid[mid.length - 1] < pages - 1 ? [0] : []), pages];
}

// Prototype pg.builds (pBuilds).
export default function Builds({ t, name, go, run, settings, save, onError }: PageProps) {
  const [f, setF] = useMem("bf", { reg: ALL, cls: ALL, tag: ALL, q: "", tab: "all", page: 1 });
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  // Favourite community builds (snapshots), shared with the Character Builder.
  const liked = readLiked(settings[LIKED_KEY]);
  const isFav = (slug: string) => liked.some((x) => x.slug === slug);
  // Builds created or cloned in the Character Builder (newest first).
  const myBuilds = readMyBuilds(settings[MY_BUILDS_KEY]);
  // The builder's saved gear (same module memory as builder.tsx and item.tsx).
  const [stored, setStored] = useMem<Record<string, BuildGear>>("gear", readGear(settings[GEAR_KEY]));
  // The build waiting for "Delete?" in the modal.
  const [del, setDel] = useState<{ t: string; cls: string } | null>(null);
  /** Delete one of your builds, with its gear. */
  const remove = (b: { t: string; cls: string }) => {
    setDel(null);
    closeBuild(b.t);
    save(MY_BUILDS_KEY, JSON.stringify(myBuilds.filter((x) => x.t !== b.t))).catch(onError);
    const { [gearKey(b.t, b.cls)]: _gone, ...rest } = stored;
    setStored(rest);
    save(GEAR_KEY, JSON.stringify(rest)).catch(onError);
  };
  // Any filter change goes back to the first page.
  const upd = (o: Partial<typeof f>) => setF({ ...f, page: 1, ...o });
  const mineTab = f.tab === "mine";
  // Your builds carry your server region (EU/NA); community builds questlog's (Global/KR).
  const regions = mineTab ? BUILD_REGIONS : COMMUNITY_REGIONS;

  // "All builds": questlog's list, live, paged on their side. The last page stays in
  // module memory, so coming back from the builder doesn't ask again.
  const [dq, setDq] = useState(f.q);
  useEffect(() => {
    const id = setTimeout(() => setDq(f.q), SEARCH_DELAY);
    return () => clearTimeout(id);
  }, [f.q]);
  const qKey = JSON.stringify([dq.trim(), f.page, f.cls, f.tag, f.reg]);
  const [res, setRes] = useMem<{ key: string; builds: CommunityBuild[]; pages: number } | null>("qlList", null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const community = f.tab === "all";
  useEffect(() => {
    if (!community || res?.key === qKey) return;
    let live = true;
    setFailed(false);
    searchCommunity({ q: dq, page: f.page, cls: f.cls, tag: f.tag, reg: f.reg }).then(
      (r) => live && setRes({ key: qKey, ...r }),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [community, qKey, attempt]); // eslint-disable-line react-hooks/exhaustive-deps
  const loading = community && !failed && res?.key !== qKey;

  // Opening a community build: its gear comes from questlog, then the builder shows it read-only.
  const [opened, setOpened] = useMem<QlOpened>("ql", {});
  const [opening, setOpening] = useState("");
  const [openFailed, setOpenFailed] = useState<CommunityBuild | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false; // left the page while questlog answered: don't jump to the builder
    };
  }, []);
  const openQl = (b: CommunityBuild) => {
    if (opening) return;
    const show = () => openBuild({ t: b.t, au: b.au, cls: b.cls, own: false, likes: b.likes, tags: b.tags.map(tagLabel), ql: b.slug }, go);
    if (opened[b.slug]) return show();
    setOpening(b.slug);
    setOpenFailed(null);
    communityGear(b).then(
      (gear) => {
        setOpened({ ...opened, [b.slug]: { card: b, gear } });
        if (alive.current) show();
      },
      () => {
        if (!alive.current) return;
        setOpening("");
        setOpenFailed(b);
      },
    );
  };

  const reg = REGIONS.find((r) => r.value === settings["pm.region"])?.label ?? BUILD_REGIONS[0];
  const q = f.q.trim().toLowerCase();
  const filtered = !!(f.reg || f.cls || f.tag || q);
  // Your builds and favourites are filtered and paged here; questlog does it for "All builds".
  const local: Card[] = mineTab
    ? myBuilds.map((m) => ({ key: m.t, t: m.t, cls: m.cls, reg, tags: m.tags ?? [], likes: 0, au: name, mine: m }))
    : liked.map(fromQl);
  const list = community
    ? (res?.key === qKey ? res.builds : []).map(fromQl)
    : local.filter(
        (x) =>
          (!f.reg || x.reg === f.reg) &&
          (!f.cls || x.cls === f.cls) &&
          (!f.tag || x.tags.includes(f.tag)) &&
          (x.t.toLowerCase().includes(q) || x.au.toLowerCase().includes(q)),
      );
  const pages = community ? (res?.key === qKey ? res.pages : 1) : Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(f.page, pages);
  const shown = community ? list : list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const chip = (v: string, label: string, cur: string, key: "reg" | "tag") => (
    <button key={label} type="button" className="chChip" aria-pressed={v === cur} onClick={() => upd({ [key]: v })}>
      {label}
    </button>
  );

  const card = (x: Card) => {
    const fav = !!x.ql && isFav(x.ql.slug);
    const col = CLASSES[x.cls][1];
    const global = x.reg === "EU" || x.reg === "Global";
    const open = () => (x.ql ? openQl(x.ql) : openBuild({ t: x.t, au: name, cls: x.cls, own: true, tags: x.tags }, go));
    return (
      // The whole card opens the build on click; the title button is the keyboard path.
      <div key={x.key} className="chBuildCard" data-fav={fav || undefined} aria-busy={opening === x.key || undefined} onClick={open}>
        <div className="chBuildArt" style={{ background: `linear-gradient(160deg,${col}55 0%,var(--pm-s2) 70%)` }}>
          {PORTRAIT[x.cls] && !broken[x.cls] ? (
            <img src={PORTRAIT_BASE + PORTRAIT[x.cls]} alt="" loading="lazy" draggable={false} onError={() => setBroken({ ...broken, [x.cls]: true })} />
          ) : (
            <span style={{ position: "absolute", left: "50%", top: "44%", transform: "translate(-50%,-50%)", fontSize: 9, color: "var(--pm-t3)" }}>
              {t("characters.builds.portrait")}
            </span>
          )}
          <ClassAvatar cls={x.cls} size={24} />
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <button type="button" className="chBtnReset chBuildTitle" onClick={(e) => (e.stopPropagation(), open())}>
                {x.t}
              </button>
              <div style={{ fontSize: 11, color: "var(--pm-t3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {x.cls}
              </div>
            </div>
            {/* Favourites: community builds only; questlog's count, +1 when it's one of yours. */}
            {x.ql && (
              <button
                type="button"
                title={t("characters.builds.fav")}
                aria-label={t("characters.builds.fav")}
                aria-pressed={fav}
                onClick={(e) => {
                  e.stopPropagation();
                  save(LIKED_KEY, toggleLiked(liked, x.ql!)).catch(onError);
                }}
                style={{ height: 24, padding: "0 7px", borderRadius: 5, border: `1px solid ${fav ? "var(--pm-red)" : "var(--pm-line)"}`, background: "transparent", color: fav ? "var(--pm-redt)" : "var(--pm-t2)", cursor: "pointer", display: "flex", gap: 4, alignItems: "center", fontSize: 11, flex: "none" }}
              >
                <HeartIcon weight={fav ? "fill" : "regular"} aria-hidden="true" />
                {x.likes + (fav ? 1 : 0)}
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {x.mine && (
              <span className="chPill" style={{ background: "var(--pm-s3)", display: "flex", gap: 4, alignItems: "center" }}>
                <StackIcon aria-hidden="true" />
                {t("characters.buildsCount.one", { n: 1 })}
              </span>
            )}
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
            {x.avatar && !broken[x.avatar] && (
              <img src={x.avatar} alt="" loading="lazy" draggable={false} onError={() => setBroken({ ...broken, [x.avatar!]: true })} style={{ width: 16, height: 16, borderRadius: "50%", flex: "none" }} />
            )}
            <span style={{ fontSize: 11, color: "var(--pm-t2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.au}</span>
            {(x.mine || fav) && (
              <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, border: "1px solid var(--pm-red)", color: "var(--pm-redt)", flex: "none" }}>
                {t(x.mine ? "characters.builds.yours" : "characters.builds.favBadge")}
              </span>
            )}
          </div>
          {/* Your own builds (created or cloned): edit and delete, spelled out. */}
          {x.mine && (
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
          )}
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
          {[ALL, ...regions].map((v) => chip(v, v || t("characters.builds.allF"), f.reg, "reg"))}
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
              // The region filter stays only between tabs with the same regions.
              onClick={() => upd({ tab: id, reg: (id === "mine") === mineTab ? f.reg : ALL })}
            >
              <Icon aria-hidden="true" />
              {t(label)}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: "var(--pm-t3)", marginRight: 10 }} aria-live="polite">
            {community
              ? loading && t("characters.builds.loading")
              : t(list.length === 1 ? "characters.buildsCount.one" : "characters.buildsCount.other", { n: list.length })}
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
        {openFailed && (
          <div role="alert" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 12, borderRadius: 8, background: "var(--pm-s1)", border: "1px solid var(--pm-line)", boxShadow: "inset 3px 0 0 var(--pm-red)" }}>
            <WarningCircleIcon aria-hidden="true" style={{ fontSize: 16, color: "var(--pm-redt)", flex: "none" }} />
            <span style={{ flex: 1, minWidth: 0 }}>{t("characters.builds.openError", { build: openFailed.t })}</span>
            <button type="button" className="btn sm" onClick={() => openQl(openFailed)}>
              {t("characters.builds.retry")}
            </button>
          </div>
        )}
        {community && failed ? (
          <EmptyState icon={<WarningCircleIcon aria-hidden="true" />} title={t("characters.builds.errorTitle")} text={t("characters.builds.errorText")}>
            <button type="button" className="btn" onClick={() => setAttempt(attempt + 1)}>
              {t("characters.builds.retry")}
            </button>
          </EmptyState>
        ) : loading ? (
          // Card-shaped placeholders while questlog answers.
          <div className="chBuildGrid" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="skeleton" style={{ height: 236, borderRadius: 8 }} />
            ))}
          </div>
        ) : (
          list.length === 0 && (
            <div style={{ padding: "40px 0", color: "var(--pm-t2)" }}>
              <div style={{ fontSize: 16, color: "var(--pm-t1)", marginBottom: 4 }}>
                {t(filtered ? "characters.builds.emptyTitle" : f.tab === "liked" ? "characters.builds.noFavTitle" : "characters.builds.noneTitle")}
              </div>
              {t(filtered ? "characters.builds.emptyText" : f.tab === "liked" ? "characters.builds.noFavText" : "characters.builds.noneText")}
            </div>
          )
        )}
        {!loading && !(community && failed) && <div className="chBuildGrid">{shown.map(card)}</div>}
        {pages > 1 && !(community && failed) && (
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
        {/* Community builds come from questlog.gg: credit and link to the source. */}
        {!mineTab && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--pm-line)" }}>
            <button type="button" className="chBtnReset" onClick={() => run(() => invoke("open_url", { url: QUESTLOG_BUILD_URL }))} style={{ fontSize: 12, color: "var(--pm-t2)", display: "inline-flex", alignItems: "center", gap: 5 }}>
              {t("characters.builds.credit")}
              <ArrowSquareOutIcon aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      {del && <DeleteBuildModal t={t} build={del.t} onDelete={() => remove(del)} onClose={() => setDel(null)} />}
    </div>
  );
}
