import { useState } from "react";
import {
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SquaresFourIcon,
  StackIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { BUILD_REGIONS, BUILD_TAGS, SAMPLE_BUILDS, SAMPLE_ME } from "../sample/characters";
import { planClass } from "../skills";
import { ClassAvatar, CLASSES, RELEASED_CLASSES } from "../ui";
import { ago, openBuild, useMem } from "./characters/shared";
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
const PAGE_SIZE = 6;
const TABS = [
  ["all", "characters.builds.all", SquaresFourIcon],
  ["mine", "characters.builds.mine", UserIcon],
  ["liked", "characters.builds.liked", HeartIcon],
] as const;

// Prototype pg.builds (pBuilds).
export default function Builds({ t, lang, go, settings }: PageProps) {
  const [f, setF] = useMem("bf", { reg: ALL, cls: ALL, tag: ALL, q: "", tab: "all", page: 1 });
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const [liked, setLiked] = useMem<Record<string, boolean>>("liked", {});
  // Any filter change goes back to the first page.
  const upd = (o: Partial<typeof f>) => setF({ ...f, page: 1, ...o });

  let list = SAMPLE_BUILDS.filter(
    (x) =>
      (!f.reg || x.reg === f.reg) &&
      (!f.cls || x.cls === f.cls) &&
      (!f.tag || x.tags.includes(f.tag)) &&
      x.t.toLowerCase().includes(f.q.toLowerCase()),
  );
  if (f.tab === "mine") list = list.filter((x) => x.au === SAMPLE_ME);
  // ponytail: the prototype fakes "liked" as every third build; real likes come with accounts.
  if (f.tab === "liked") list = list.filter((_, i) => i % 3 === 0);
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const page = Math.min(f.page, pages);
  const shown = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const chip = (v: string, label: string, cur: string, key: "reg" | "tag") => (
    <button key={label} type="button" className="chChip" aria-pressed={v === cur} onClick={() => upd({ [key]: v })}>
      {label}
    </button>
  );

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
            <button key={id} type="button" className="chTab" aria-pressed={f.tab === id} onClick={() => upd({ tab: id })}>
              <Icon aria-hidden="true" />
              {t(label)}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: "var(--pm-t3)", marginRight: 10 }} aria-live="polite">
            {t(list.length === 1 ? "characters.buildsCount.one" : "characters.buildsCount.other", { n: list.length })}
          </span>
          <button
            type="button"
            className="btn sm fill"
            style={{ padding: "0 12px", marginBottom: 5 }}
            onClick={() => openBuild({ t: "", au: SAMPLE_ME, cls: planClass(settings["pm.class"]), own: true, isNew: true }, go)}
          >
            <PlusIcon aria-hidden="true" />
            {t("characters.builds.create")}
          </button>
        </div>
        {list.length === 0 && (
          <div style={{ padding: "40px 0", color: "var(--pm-t2)" }}>
            <div style={{ fontSize: 16, color: "var(--pm-t1)", marginBottom: 4 }}>{t("characters.builds.emptyTitle")}</div>
            {t("characters.builds.emptyText")}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(330px,1fr))", gap: 10 }}>
          {shown.map((x) => {
            const L = !!liked[x.t];
            const col = CLASSES[x.cls][1];
            const global = x.reg === "EU";
            const open = () => openBuild({ t: x.t, au: x.au, cls: x.cls, own: x.au === SAMPLE_ME, likes: x.likes }, go);
            return (
              // The whole card opens the build on click; the title button is the keyboard path.
              <div key={x.t} className="chBuildCard" onClick={open}>
                <div style={{ width: 84, flex: "none", position: "relative", background: `linear-gradient(160deg,${col}55 0%,var(--pm-s2) 70%)` }}>
                  {PORTRAIT[x.cls] && !broken[x.cls] ? (
                    <img
                      src={PORTRAIT_BASE + PORTRAIT[x.cls]}
                      alt=""
                      loading="lazy"
                      draggable={false}
                      onError={() => setBroken({ ...broken, [x.cls]: true })}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 12%" }}
                    />
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
                        {x.cls} · {x.sub}
                      </div>
                    </div>
                    <button
                      type="button"
                      title={t("characters.like")}
                      aria-label={t("characters.like")}
                      aria-pressed={L}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLiked({ ...liked, [x.t]: !L });
                      }}
                      style={{ height: 24, padding: "0 7px", borderRadius: 5, border: "1px solid var(--pm-line)", background: "transparent", color: L ? "var(--pm-redt)" : "var(--pm-t2)", cursor: "pointer", display: "flex", gap: 4, alignItems: "center", fontSize: 11, flex: "none" }}
                    >
                      <HeartIcon weight={L ? "fill" : "regular"} aria-hidden="true" />
                      {x.likes + (L ? 1 : 0)}
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    <span className="chPill" style={{ background: "var(--pm-s3)", display: "flex", gap: 4, alignItems: "center" }}>
                      <StackIcon aria-hidden="true" />
                      {t(x.n === 1 ? "characters.buildsCount.one" : "characters.buildsCount.other", { n: x.n })}
                    </span>
                    <span className="chPill" style={{ background: global ? "#3FBF7F1f" : "#4F93EA1f", color: global ? "#5FD99A" : "#7FB2F0" }}>
                      {x.reg}
                    </span>
                  </div>
                  <div style={{ flex: 1 }} />
                  <div style={{ display: "flex", gap: 5, alignItems: "center", minWidth: 0 }}>
                    {x.tags.map((tag) => (
                      <span key={tag} className="chPill" style={{ border: "1px solid var(--pm-line)", color: "var(--pm-t2)" }}>
                        {tag}
                      </span>
                    ))}
                    <span style={{ fontSize: 10, color: "var(--pm-t3)", whiteSpace: "nowrap" }}>{ago(lang, x.ago)}</span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 11, color: "var(--pm-t2)", whiteSpace: "nowrap" }}>{x.au}</span>
                    {x.au === SAMPLE_ME && (
                      <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 3, border: "1px solid var(--pm-red)", color: "var(--pm-redt)" }}>
                        {t("characters.builds.yours")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {pages > 1 && (
          <nav aria-label={t("characters.builds.pages")} style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 16 }}>
            <button type="button" className="chPage" aria-label={t("characters.builds.prev")} disabled={page === 1} onClick={() => upd({ page: page - 1 })}>
              <CaretLeftIcon aria-hidden="true" />
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" className="chPage" aria-current={n === page ? "page" : undefined} onClick={() => upd({ page: n })}>
                {n}
              </button>
            ))}
            <button type="button" className="chPage" aria-label={t("characters.builds.next")} disabled={page === pages} onClick={() => upd({ page: page + 1 })}>
              <CaretRightIcon aria-hidden="true" />
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
