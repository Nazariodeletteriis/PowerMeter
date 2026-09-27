import { useEffect, useState, type CSSProperties } from "react";
import {
  ArrowLeftIcon,
  BirdIcon,
  CaretDownIcon,
  ChartBarIcon,
  ChatCircleIcon,
  ColumnsIcon,
  CopyIcon,
  CrownSimpleIcon,
  DatabaseIcon,
  DiamondIcon,
  EyeIcon,
  FloppyDiskIcon,
  GraphIcon,
  HeartIcon,
  LightningIcon,
  LockSimpleIcon,
  MagnifyingGlassIcon,
  PawPrintIcon,
  PictureInPictureIcon,
  PlusCircleIcon,
  PlusIcon,
  ScalesIcon,
  ShareNetworkIcon,
  SparkleIcon,
  TargetIcon,
  TextAlignLeftIcon,
  TShirtIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  MY_BUILD_ICONS,
  SAMPLE_BUILD_SCORE,
  SAMPLE_COLLECTIONS,
  SAMPLE_COMMENTS,
  SAMPLE_ME,
  SAMPLE_MY_BUILDS,
  SAMPLE_PICKER,
  SAMPLE_SLOTS,
  SAMPLE_SOURCES,
  SAMPLE_STATS,
  SAMPLE_SUBS,
  SLOT_GROUPS,
  BUILD_TAGS,
} from "../sample/characters";
import { ItemIcon } from "../items";
import { dvSummary } from "./daevanion";
import { REGIONS } from "../Onboarding";
import { classSkills, planClass, SkillIcon } from "../skills";
import { art, ClassAvatar, CLASSES, fmt, RARITY } from "../ui";
import { ago, SectionHead, useMem, useToast, type BuildSrc } from "./characters/shared";
import { ShareModal } from "./shared/ShareModal";
import type { PageProps } from "./types";

const COLL_ICONS = { tshirt: TShirtIcon, paw: PawPrintIcon, bird: BirdIcon, diamond: DiamondIcon, crown: CrownSimpleIcon, columns: ColumnsIcon, sparkle: SparkleIcon };
const TABS = [
  ["equip", TShirtIcon],
  ["skills", LightningIcon],
  ["daev", GraphIcon],
  ["desc", TextAlignLeftIcon],
  ["comm", ChatCircleIcon],
] as const;
const LABEL: CSSProperties = { fontSize: 11, color: "var(--pm-t3)", marginBottom: 6 };

// Prototype pg.builder (pBuilder + pX + pBRO).
export default function Builder({ t, lang, name, go, onError, setHeader, settings }: PageProps) {
  // New and default builds use the active character's class (onboarding).
  const myCls = planClass(settings["pm.class"]);
  const [src, setSrc] = useMem<BuildSrc>("bSrc", { t: "Ashen Burst · PvE e PvP", au: SAMPLE_ME, cls: myCls, own: true });
  // Your own build follows the active character: switching character re-targets it.
  useEffect(() => {
    if (src.own && !src.isNew && src.cls !== myCls) setSrc({ ...src, cls: myCls });
  }, [myCls]); // eslint-disable-line react-hooks/exhaustive-deps
  const [mode, setMode] = useMem("bmode", "dummy");
  const [view, setView] = useMem("bview", "owned");
  const [cur, setCur] = useMem("slot", "mh");
  const [enh, setEnh] = useMem<Record<string, number>>("enh", {});
  const [pot, setPot] = useMem<Record<string, number>>("pot", {});
  const [ov, setOv] = useMem<Record<string, string>>("itemOv", {});
  const [subv, setSubv] = useMem<Record<string, number>>("subv", {});
  const [statQ, setStatQ] = useMem("statQ", "");
  const [sCat, setSCat] = useMem("sCat", "");
  const [tab, setTab] = useMem("ctab", "equip");
  const [newName, setNewName] = useMem("newName", "");
  const [newTags, setNewTags] = useMem<string[]>("newTags", []);
  const [liked, setLiked] = useMem<Record<string, boolean>>("liked", {});
  const [dv] = useMem<Record<string, Record<string, true>>>("dvCls", {});
  const [itemOpen, setItemOpen] = useState(false);
  const [bOpen, setBOpen] = useState(false);
  const [itemQ, setItemQ] = useState("");
  const [share, setShare] = useState(false);
  const [toast, showToast] = useToast();

  const n = (x: number) => fmt(x, lang);
  const ro = !src.own;
  const isNew = !!src.isNew;
  const tgt = view === "target";
  const [, clsCol] = CLASSES[src.cls];
  const title = isNew ? newName || t("characters.builder.newBuild") : src.t;
  const crumb = t("shell.crumb.builder");
  useEffect(() => setHeader({ title, crumb }), [setHeader, title, crumb]);

  // Slots (pBuilder.slots + pX.slotGroups + pBRO isNew overrides).
  const slots = SAMPLE_SLOTS.map(([id, label, name, rar, e, target]) => {
    const owned = name === target || !!ov[id];
    const lv = enh[id] ?? e;
    const col = RARITY[rar];
    const slot = {
      id,
      label,
      rar,
      target,
      lv,
      name: tgt ? target : ov[id] || name,
      col,
      enh: lv ? `+${lv}` : "",
      bd: owned || !tgt ? `1.5px solid ${col}` : `1.5px dashed ${col}`,
      op: !owned && tgt ? 0.6 : 1,
      short: label.split(" ").map((w) => w[0]).join("").slice(0, 2),
      pips: Array.from({ length: 20 }, (_, i) => (i < lv ? (i >= 15 ? "#F0A63A" : "var(--pm-red)") : "var(--pm-s3)")),
      hasStatus: false,
    };
    slot.hasStatus = slot.name !== target;
    if (isNew && !ov[id])
      Object.assign(slot, { name: t("characters.builder.emptySlot"), col: "var(--pm-t3)", enh: "", bd: "1.5px dashed var(--pm-grey)", op: 0.7, pips: slot.pips.map(() => "var(--pm-s3)"), hasStatus: false });
    return slot;
  });
  const s = slots.find((x) => x.id === cur)!;
  const sel = isNew && !ov[cur] ? { ...s, name: t("characters.builder.pickItem"), col: "var(--pm-t2)", rar: "—" } : s;
  const lvNow = s.lv;
  const potNow = pot[cur] ?? 1;
  const mult = 1 + lvNow * 0.035;
  const mainStats: [string, string][] = [
    ["Magic Attack", `${Math.round(1842 * mult)} – ${Math.round(2310 * mult)}`],
    ["Magic Boost", `+${n(1284 * mult)}`],
    ["Casting Speed", "+8%"],
  ];
  const num2 = (x: number, u: string) => (u ? x.toLocaleString(lang, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(Math.round(x))) + u;

  const gs = isNew ? 0 : tgt ? SAMPLE_BUILD_SCORE.gsTarget : SAMPLE_BUILD_SCORE.gs;
  const gsOn = Math.round((gs / SAMPLE_BUILD_SCORE.gsMax) * 30);
  const cpShown = isNew ? "—" : n(tgt ? SAMPLE_BUILD_SCORE.cpTarget : SAMPLE_BUILD_SCORE.cp);
  const cpDelta = !isNew && tgt ? `+${n(SAMPLE_BUILD_SCORE.cpTarget - SAMPLE_BUILD_SCORE.cp)}` : "";

  // Stats (pBuilder.statGroups): the target view adds 5% to every third stat.
  const pct = (v: string) => Number(v.slice(0, -1)).toLocaleString(lang) + "%";
  const q = statQ.toLowerCase();
  const statGroups = SAMPLE_STATS.map(([g, rows]) => ({
    g,
    rows: rows
      .filter(([name]) => name.toLowerCase().includes(q))
      .map(([name, v], k) => {
        if (typeof v !== "number") return { name, v: pct(v), delta: "" };
        const tv = Math.round(v * (k % 3 === 0 ? 1.05 : 1));
        return { name, v: n(tgt ? tv : v), delta: tgt && tv - v ? `+${n(tv - v)}` : "" };
      }),
  })).filter((x) => x.rows.length);
  const statShown = sCat ? statGroups.filter((g) => g.g === sCat) : statGroups;

  const missing = SAMPLE_SLOTS.filter((x) => x[2] !== x[5] && !ov[x[0]]).map(([id, label, have, rar, , want]) => {
    const where = SAMPLE_SOURCES[id];
    return { label, have, want, col: RARITY[rar], src: where?.startsWith("shop:") ? t("characters.builder.shopSrc", { n: n(Number(where.slice(5))) }) : where || "Drop" };
  });

  const copySuffix = t("characters.builder.copySuffix");
  const clone = () => {
    showToast({ title: t("characters.builder.clonedTitle"), text: t("characters.builder.clonedText") });
    setSrc({ t: (src.t.endsWith(copySuffix) ? src.t.slice(0, -copySuffix.length) : src.t) + copySuffix, au: SAMPLE_ME, cls: src.cls, own: true });
  };
  const save = () => {
    showToast(
      isNew
        ? { title: t("characters.builder.createdTitle"), text: t("characters.builder.createdText") }
        : { title: t("characters.builder.savedTitle"), text: t("characters.builder.savedText") },
    );
    if (isNew) setSrc({ t: newName || t("characters.builder.newBuild"), au: SAMPLE_ME, cls: src.cls, own: true });
  };
  const L = !!liked[src.t];
  const likeBuild = () => setLiked({ ...liked, [src.t]: !L });

  const seg = (items: [string, string][], value: string, set: (v: string) => void, style?: CSSProperties) => (
    <div className="chSeg" style={style}>
      {items.map(([id, label]) => (
        <button key={id} type="button" aria-pressed={id === value} onClick={() => set(id)}>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="chToolbar">
        <button type="button" className="btn sm" onClick={() => go("builds")}>
          <ArrowLeftIcon aria-hidden="true" />
          {t("characters.builder.back")}
        </button>
        <span className="chRegion">{(REGIONS.find((r) => r.value === settings["pm.region"]) ?? REGIONS[0]).label}</span>
        <span className="chMiniClass" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--pm-t2)" }}>
          <ClassAvatar cls={src.cls} size={22} />
          {src.cls}
        </span>
        <span style={{ fontSize: 12, color: "var(--pm-t3)", display: "flex", gap: 10 }}>
          <span aria-label={t("characters.builder.likes", { n: 17 })}>
            <HeartIcon aria-hidden="true" style={{ verticalAlign: "-2px" }} /> 17
          </span>
          <span aria-label={t("characters.builder.comments", { n: 2 })}>
            <ChatCircleIcon aria-hidden="true" style={{ verticalAlign: "-2px" }} /> 2
          </span>
        </span>
        {seg([["dummy", t("characters.builder.modeBuilder")], ["missing", t("characters.builder.modeMissing")]], mode, setMode, { marginLeft: 8 })}
        {seg([["owned", t("characters.builder.owned")], ["target", t("characters.builder.target")]], view, setView)}
        <div style={{ flex: 1 }} />
        <button type="button" className="btn sm">
          <ScalesIcon aria-hidden="true" />
          {t("characters.builder.compare")}
        </button>
        {ro ? (
          <button type="button" className="btn sm fill" style={{ padding: "0 12px" }} onClick={clone}>
            <CopyIcon aria-hidden="true" />
            {t("characters.builder.clone")}
          </button>
        ) : (
          <button type="button" className="btn sm" onClick={clone}>
            <CopyIcon aria-hidden="true" />
            {t("characters.duplicate")}
          </button>
        )}
        <button type="button" className="btn sm" title={t("characters.builder.widgetHint")}>
          <PictureInPictureIcon aria-hidden="true" />
          Widget
        </button>
        <button type="button" className="btn sm" onClick={() => setShare(true)}>
          <ShareNetworkIcon aria-hidden="true" />
          {t("characters.share.button")}
        </button>
        {!ro && (
          <button type="button" className="btn sm fill" style={{ padding: "0 12px" }} onClick={save}>
            <FloppyDiskIcon aria-hidden="true" />
            {isNew ? t("characters.builds.create") : t("characters.save")}
          </button>
        )}
      </div>

      {ro && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", margin: "-4px 0 12px", borderRadius: 8, background: "var(--pm-s1)", border: "1px solid var(--pm-line)", boxShadow: "inset 3px 0 0 var(--pm-grey)" }}>
          <EyeIcon aria-hidden="true" style={{ fontSize: 18, color: "var(--pm-t2)", flex: "none" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500 }}>{t("characters.builder.roTitle", { au: src.au })}</div>
            <div style={{ fontSize: 12, color: "var(--pm-t2)" }}>{t("characters.builder.roText")}</div>
          </div>
          <button type="button" className="btn sm" aria-pressed={L} style={{ color: L ? "var(--pm-redt)" : "var(--pm-t1)" }} onClick={likeBuild}>
            <HeartIcon weight={L ? "fill" : "regular"} aria-hidden="true" />
            <span className="srOnly">{t("characters.like")}</span>
            {(src.likes ?? 0) + (L ? 1 : 0)}
          </button>
        </div>
      )}
      {isNew && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "10px 14px", margin: "-4px 0 12px", borderRadius: 8, background: "var(--pm-tint)", border: "1px solid var(--pm-red)" }}>
          <PlusCircleIcon aria-hidden="true" style={{ fontSize: 18, color: "var(--pm-redt)", flex: "none" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{t("characters.builder.newBuild")}</div>
            <div style={{ fontSize: 12, color: "var(--pm-t2)" }}>{t("characters.builder.newText")}</div>
          </div>
          <input
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("characters.builder.namePlaceholder")}
            aria-label={t("characters.builder.namePlaceholder")}
            style={{ height: 32, width: 220 }}
          />
          <div role="group" aria-label={t("characters.builds.tag")} style={{ flexBasis: "100%", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5, paddingLeft: 30 }}>
            <span className="kicker" style={{ marginRight: 4 }}>{t("characters.builds.tag")}</span>
            {BUILD_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className="chChip"
                aria-pressed={newTags.includes(tag)}
                onClick={() => setNewTags(newTags.includes(tag) ? newTags.filter((x) => x !== tag) : [...newTags, tag])}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
      {toast}

      {mode === "missing" && (
        <div style={{ background: "var(--pm-s1)", border: "1px solid var(--pm-line)", borderRadius: 8, padding: "6px 12px", maxWidth: 1000 }}>
          <div style={{ padding: "8px 0", fontWeight: 500 }}>{t("characters.builder.missingN", { n: missing.length })}</div>
          {missing.map((m) => (
            <div key={m.label} style={{ display: "grid", gridTemplateColumns: "100px minmax(0,1fr) minmax(0,1fr) minmax(0,1.1fr) 100px", gap: 12, alignItems: "center", minHeight: 44, borderTop: "1px solid var(--pm-line)" }}>
              <span style={{ color: "var(--pm-t3)", fontSize: 12 }}>{m.label}</span>
              <span style={{ color: "var(--pm-t2)", fontSize: 12 }}>{m.have}</span>
              <span style={{ color: m.col }}>→ {m.want}</span>
              <span style={{ fontSize: 12, color: "var(--pm-t2)" }}>{m.src}</span>
              <button type="button" className="chBtnReset" style={{ fontSize: 12, color: "var(--pm-redt)" }}>
                {t("characters.builder.goToSource")}
              </button>
            </div>
          ))}
        </div>
      )}

      {mode === "dummy" && (
        <>
          {/* Header band: class, title, gear score, combat power, collections. */}
          {/* Only the decoration is clipped (the prototype clipped the whole band, cutting off the "my builds" menu). */}
          <div style={{ position: "relative", borderRadius: 10, marginBottom: 12, background: "linear-gradient(100deg,var(--pm-s2) 0%,var(--pm-s1) 55%,var(--pm-bg) 100%)", border: "1px solid var(--pm-line)" }}>
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: "inherit", overflow: "hidden", pointerEvents: "none" }}>
              <div style={{ position: "absolute", inset: "0 0 auto 0", height: 2, background: "linear-gradient(90deg,transparent,#DB0000 20%,#DB0000 60%,transparent)" }} />
              <div style={{ position: "absolute", right: -60, top: -80, width: 360, height: 360, background: "radial-gradient(circle,rgba(219,0,0,.16),transparent 65%)" }} />
            </div>
            <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 18, padding: "16px 20px", flexWrap: "wrap" }}>
              <div style={{ width: 56, height: 56, transform: "rotate(45deg)", borderRadius: 10, border: `1.5px solid ${clsCol}`, background: `${clsCol}1a`, display: "grid", placeItems: "center", flex: "none" }}>
                <div title={src.cls} style={{ transform: "rotate(-45deg)", width: 34, height: 34, background: art(src.cls) ? `url(${art(src.cls)}) center/contain no-repeat` : undefined }} />
              </div>
              <div style={{ position: "relative", minWidth: 0 }}>
                <button type="button" className="chBtnReset" aria-expanded={bOpen} onClick={() => setBOpen(!bOpen)} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-.015em" }}>{title}</span>
                  {ro ? (
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--pm-grey)", color: "var(--pm-t2)" }}>
                      <LockSimpleIcon aria-hidden="true" style={{ verticalAlign: "-1px" }} /> {t("characters.builder.readOnly")}
                    </span>
                  ) : (
                    <CaretDownIcon aria-hidden="true" style={{ color: "var(--pm-t3)" }} />
                  )}
                </button>
                <div style={{ fontSize: 12, color: "var(--pm-t2)" }}>
                  {src.own ? name : t("characters.builder.by", { au: src.au })} · {src.cls} ·{" "}
                  <span style={{ color: "#F4C77A", display: "inline-flex", alignItems: "center", gap: 3, verticalAlign: -3 }}>
                    <img src={art("asmodian")} alt="" style={{ width: 14, height: 14 }} />
                    Asmodian
                  </span>{" "}
                  · {t("characters.builder.buildOf", { i: 1, n: 2 })}
                </div>
                {bOpen && (
                  <div className="chPop" style={{ left: 0, top: 52, zIndex: 6, width: 280, padding: 6, gap: 4 }}>
                    {SAMPLE_MY_BUILDS.map((mb) => (
                      <button key={mb.n} type="button" className="chBtnReset chMyBuild" style={{ borderColor: mb.on ? "var(--pm-red)" : undefined }} onClick={() => setBOpen(false)}>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{mb.n}</span>
                        <span style={{ display: "flex", gap: 3 }}>
                          {MY_BUILD_ICONS.map((r, i) => (
                            <span key={i} style={{ width: 16, height: 16, borderRadius: 3, border: `1.5px solid ${RARITY[r]}` }} />
                          ))}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      className="chBtnReset"
                      style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 34, padding: "0 10px", color: "var(--pm-redt)", fontSize: 12 }}
                      onClick={() => {
                        // Same reset as "Crea build" (openBuild), applied in place.
                        setBOpen(false);
                        setSrc({ t: "", au: SAMPLE_ME, cls: myCls, own: true, isNew: true });
                        setNewName("");
                        setNewTags([]);
                        setMode("dummy");
                        setView("owned");
                        setCur("mh");
                        setOv({});
                      }}
                    >
                      <PlusIcon aria-hidden="true" />
                      {t("characters.builder.newBuild")}
                    </button>
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 260 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="kicker">Gear Score</span>
                  <span className="mono" style={{ fontSize: 18 }}>
                    {n(gs)} <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>/ {n(SAMPLE_BUILD_SCORE.gsMax)}</span>
                  </span>
                </div>
                <div style={{ display: "flex", gap: 2 }} aria-hidden="true">
                  {Array.from({ length: 30 }, (_, i) => (
                    <span key={i} style={{ flex: 1, height: 6, borderRadius: 1, background: i < gsOn ? "var(--pm-red)" : "var(--pm-s3)", transform: "skewX(-20deg)" }} />
                  ))}
                </div>
              </div>
              <div style={{ paddingLeft: 18, borderLeft: "1px solid var(--pm-line)" }}>
                <div className="kicker">Combat Power</div>
                <div className="mono" style={{ fontSize: 30, lineHeight: 1.1 }}>
                  {cpShown} <span style={{ fontSize: 12, color: "#5FD99A" }}>{cpDelta}</span>
                </div>
              </div>
            </div>
            <div style={{ position: "relative", display: "flex", gap: 6, padding: "0 20px 14px", flexWrap: "wrap" }}>
              {SAMPLE_COLLECTIONS.map(([ic, key, tip, count]) => {
                const Icon = COLL_ICONS[ic as keyof typeof COLL_ICONS];
                return (
                  <div key={key} className="chColl" title={tip.startsWith("tip.") ? t(`characters.coll.${tip}`) : tip || undefined}>
                    <Icon aria-hidden="true" style={{ color: "var(--pm-t2)" }} />
                    <span style={{ color: "var(--pm-t2)" }}>{t(`characters.coll.${key}`)}</span>
                    <span className="mono" style={{ color: "var(--pm-redt)" }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(380px,1fr)", gap: 12, alignItems: "start", marginBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
              {SLOT_GROUPS.map(([g, ids]) => (
                <section key={g} style={{ background: "var(--pm-s1)", border: "1px solid var(--pm-line)", borderRadius: 8, padding: 12 }}>
                  <SectionHead title={t(`characters.slots.${g}`)} style={{ gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t("characters.slots.count", { n: ids.length })}</span>
                  </SectionHead>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(172px,1fr))", gap: 8 }}>
                    {ids.map((id) => {
                      const x = slots.find((y) => y.id === id)!;
                      return (
                        <button
                          key={id}
                          type="button"
                          className="chBtnReset chSlot"
                          aria-pressed={id === cur}
                          onClick={() => {
                            setCur(id);
                            setItemOpen(false);
                          }}
                        >
                          <span style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0, width: "100%" }}>
                            <span style={{ width: 38, height: 38, flex: "none", borderRadius: "50%", border: x.bd, opacity: x.op, background: "radial-gradient(circle at 35% 30%,var(--pm-s3),var(--pm-bg))", display: "grid", placeItems: "center", fontSize: 10, color: "var(--pm-t3)" }}>
                              <ItemIcon name={x.name}>{x.short}</ItemIcon>
                            </span>
                            <span style={{ minWidth: 0, flex: 1 }}>
                              <span style={{ fontSize: 10, color: "var(--pm-t3)", display: "flex", gap: 6 }}>
                                <span style={{ flex: 1 }}>{x.label}</span>
                                <span className="mono" style={{ color: "var(--pm-t1)" }}>
                                  {x.enh}
                                </span>
                              </span>
                              <span style={{ display: "block", fontSize: 12, color: x.col, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.name}</span>
                            </span>
                          </span>
                          <span style={{ display: "flex", gap: 1.5, width: "100%" }} aria-hidden="true">
                            {x.pips.map((c, i) => (
                              <span key={i} style={{ flex: 1, height: 3, borderRadius: 1, background: c }} />
                            ))}
                          </span>
                          {x.hasStatus && (
                            <span style={{ fontSize: 10, color: "var(--pm-t3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
                              <TargetIcon aria-hidden="true" style={{ verticalAlign: "-1px" }} /> {t("characters.builder.targetItem", { item: x.target })}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div style={{ background: "var(--pm-s1)", border: "1px solid var(--pm-line)", borderRadius: 8, minWidth: 0, display: "flex", position: "sticky", top: 0 }}>
              <div role="tablist" aria-orientation="vertical" style={{ width: 48, flex: "none", borderRight: "1px solid var(--pm-line)", display: "flex", flexDirection: "column", gap: 4, padding: "8px 6px" }}>
                {TABS.map(([id, Icon]) => {
                  const label = t(`characters.builder.tab.${id}`, { n: SAMPLE_COMMENTS.length });
                  return (
                    <button key={id} type="button" role="tab" aria-selected={tab === id} className="chRailBtn" title={label} aria-label={label} onClick={() => setTab(id)}>
                      <Icon aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
              {/* Someone else's build: readable, not editable (prototype pointer-events:none). */}
              <fieldset disabled={ro} role="tabpanel" style={{ flex: 1, minWidth: 0, margin: 0, padding: 0, border: 0 }}>
                {tab === "equip" && (
                  <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <div style={LABEL}>{t("characters.builder.equipped", { slot: s.label })}</div>
                      <div
                        style={{ position: "relative", display: "flex", gap: 6 }}
                        onKeyDown={(e) => e.key === "Escape" && setItemOpen(false)}
                      >
                        <button type="button" className="chBtnReset chItemBtn" aria-expanded={itemOpen} onClick={() => setItemOpen(!itemOpen)}>
                          <span style={{ width: 30, height: 30, borderRadius: 5, border: `1.5px solid ${sel.col}`, background: "var(--pm-s3)", flex: "none" }}>
                            <ItemIcon name={sel.name} />
                          </span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: "block", color: sel.col, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sel.name}</span>
                            <span style={{ display: "block", fontSize: 10, color: "var(--pm-t3)" }}>{sel.rar} · Lv 45</span>
                          </span>
                          <CaretDownIcon aria-hidden="true" style={{ color: "var(--pm-t3)" }} />
                        </button>
                        <button
                          type="button"
                          className="chItemSide"
                          title={t("characters.builder.remove")}
                          aria-label={t("characters.builder.remove")}
                          onClick={() => {
                            const rest = { ...ov };
                            delete rest[cur];
                            setOv(rest);
                          }}
                        >
                          <XIcon aria-hidden="true" />
                        </button>
                        <button type="button" className="chItemSide" title={t("characters.builder.openDb")} aria-label={t("characters.builder.openDb")}>
                          <DatabaseIcon aria-hidden="true" />
                        </button>
                        {itemOpen && (
                          <div className="chPop" style={{ left: 0, right: 0, top: 50, zIndex: 5, padding: 8, gap: 2 }}>
                            <input
                              autoFocus
                              className="input"
                              value={itemQ}
                              onChange={(e) => setItemQ(e.target.value)}
                              placeholder={t("characters.builder.searchItems")}
                              aria-label={t("characters.builder.searchItems")}
                              style={{ height: 32, marginBottom: 4 }}
                            />
                            {SAMPLE_PICKER.filter(([name]) => name.toLowerCase().includes(itemQ.toLowerCase())).map(([name, r, c]) => (
                              <button
                                key={name}
                                type="button"
                                className="chBtnReset chPickRow"
                                onClick={() => {
                                  setOv({ ...ov, [cur]: name });
                                  setItemOpen(false);
                                }}
                              >
                                <span style={{ width: 24, height: 24, borderRadius: 4, border: `1.5px solid ${RARITY[r]}`, flex: "none" }}>
                                  <ItemIcon name={name} />
                                </span>
                                <span style={{ flex: 1, color: RARITY[r] }}>{name}</span>
                                <span className="mono" title={t("characters.builder.boostHint")} style={{ fontSize: 12, color: c[0] === "+" ? "#5FD99A" : "#FF6B6B" }}>
                                  {c}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--pm-t3)", marginBottom: 8 }}>
                        <span>{t("characters.builder.enhancement")}</span>
                        <span className="mono" style={{ color: "var(--pm-t1)" }}>
                          +{lvNow}
                        </span>
                      </div>
                      <div className="chTrack">
                        <div style={{ width: `${(lvNow / 20) * 100}%`, background: "#F0A63A" }} />
                        <span style={{ left: `${(lvNow / 20) * 100}%` }} />
                      </div>
                      <div className="chScale" role="group" aria-label={t("characters.builder.enhancement")}>
                        {Array.from({ length: 21 }, (_, i) => (
                          <button
                            key={i}
                            type="button"
                            aria-pressed={i === lvNow}
                            aria-label={`+${i}`}
                            onClick={() => setEnh({ ...enh, [cur]: i })}
                            style={{ color: i === lvNow ? "var(--pm-t1)" : i < lvNow ? "var(--pm-t2)" : "var(--pm-t3)", fontWeight: i === lvNow ? 600 : 400 }}
                          >
                            {i}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ maxWidth: 220 }}>
                      <div style={{ fontSize: 11, color: "var(--pm-t3)", marginBottom: 8 }}>{t("characters.builder.potential")}</div>
                      <div className="chTrack">
                        <div style={{ width: `${(potNow / 4) * 100}%`, background: "var(--pm-red)" }} />
                        <span style={{ left: `${(potNow / 4) * 100}%` }} />
                      </div>
                      <div className="chScale" role="group" aria-label={t("characters.builder.potential")}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <button key={i} type="button" aria-pressed={i === potNow} onClick={() => setPot({ ...pot, [cur]: i })} style={{ color: i === potNow ? "var(--pm-t1)" : "var(--pm-t3)", fontWeight: i === potNow ? 600 : 400 }}>
                            {i}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={LABEL}>{t("characters.builder.mainStats")}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 12px", fontSize: 12 }}>
                        {mainStats.map(([name, v]) => (
                          <div key={name} style={{ display: "contents" }}>
                            <span style={{ color: "var(--pm-t2)" }}>{name}</span>
                            <span className="mono">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={LABEL}>{t("characters.builder.subStats")}</div>
                      {SAMPLE_SUBS.map(([name, mn, mx, u], k) => {
                        const key = cur + k;
                        const v = subv[key] ?? mx;
                        return (
                          <div key={name} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                            <div className="chField" style={{ flex: 1, minWidth: 0 }}>
                              <ChartBarIcon aria-hidden="true" style={{ color: "var(--pm-t3)", flex: "none" }} />
                              <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {name} <span style={{ color: "var(--pm-t3)" }}>{num2(mn, u)} – {num2(mx, u)}</span>
                              </span>
                              <CaretDownIcon aria-hidden="true" style={{ color: "var(--pm-t3)", flex: "none" }} />
                            </div>
                            <span className="mono" style={{ width: 62, height: 30, display: "grid", placeItems: "center", borderRadius: 6, border: "1px solid var(--pm-line)", fontSize: 12, flex: "none" }}>
                              {num2(v, u)}
                            </span>
                            <button type="button" className="chMinMax" aria-pressed={v === mn} style={{ background: v === mn ? "var(--pm-s3)" : "transparent" }} onClick={() => setSubv({ ...subv, [key]: mn })}>
                              Min
                            </button>
                            <button type="button" className="chMinMax" aria-pressed={v === mx} style={{ background: v === mx ? "#3FBF7F" : "transparent", color: v === mx ? "#0A0909" : "var(--pm-t2)", fontWeight: 600 }} onClick={() => setSubv({ ...subv, [key]: mx })}>
                              Max
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <div style={LABEL}>Philosopher's Stone</div>
                        <div className="chField" style={{ color: "var(--pm-t2)" }}>
                          <span style={{ flex: 1 }}>{t("characters.builder.none")}</span>
                          <CaretDownIcon aria-hidden="true" />
                        </div>
                      </div>
                      <div>
                        <div style={LABEL}>Magicstone (2/4)</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {[["#6CC46A", "Magic Boost +24"], ["#F0A63A", "Damage Boost +100"]].map(([c, label]) => (
                            <div key={label} className="chField" style={{ color: c }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
                              {label}
                            </div>
                          ))}
                          <div className="chField" style={{ background: "transparent", border: "1px dashed var(--pm-line)", color: "var(--pm-t3)" }}>
                            {t("characters.builder.emptySocket")}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div style={{ borderTop: "1px solid var(--pm-line)", paddingTop: 12 }}>
                      <div style={LABEL}>{t("characters.builder.setBonus", { set: "Ashen Tide", n: 3, of: 5 })}</div>
                      <div style={{ fontSize: 12, lineHeight: 1.7 }}>
                        <div style={{ color: "#5FD99A" }}>{t("characters.builder.pieces", { n: 2 })}: Magic Boost +120</div>
                        <div style={{ color: "#5FD99A" }}>{t("characters.builder.pieces", { n: 3 })}: Critical Hit +80</div>
                        <div style={{ color: "var(--pm-t3)" }}>{t("characters.builder.pieces", { n: 5 })}: Aether Surge — +6% magic damage for 8 s</div>
                      </div>
                    </div>
                  </div>
                )}
                {tab === "skills" && (
                  <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ fontSize: 12, color: "var(--pm-t2)" }}>{t("characters.builder.linkedSkills")}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {classSkills(src.cls)
                        .filter((sk) => sk.type === "Active")
                        .map((sk) => (
                          <span key={sk.id} title={sk.name} style={{ width: 40, height: 40, borderRadius: 6, background: "var(--pm-s2)", boxShadow: "0 0 0 1px var(--pm-line)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600 }}>
                            <SkillIcon skill={sk} name={sk.name} />
                          </span>
                        ))}
                    </div>
                    <div>
                      <button type="button" className="btn sm" onClick={() => go("skillplan")}>
                        {t("characters.builder.openSkillPlanner")}
                      </button>
                    </div>
                  </div>
                )}
                {tab === "daev" && (
                  <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                    {dvSummary(planClass(src.cls), dv).map(([board, pts, max]) => (
                      <div key={board} style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 34, borderBottom: "1px solid var(--pm-line)" }}>
                        <span style={{ flex: 1 }}>{board}</span>
                        <span className="mono" style={{ fontSize: 12 }}>
                          {pts} / {max}
                        </span>
                      </div>
                    ))}
                    <div>
                      <button type="button" className="btn sm" onClick={() => go("daevanion")}>
                        {t("characters.builder.openDaevanion")}
                      </button>
                    </div>
                  </div>
                )}
                {tab === "desc" && (
                  <div style={{ padding: 16 }}>
                    <textarea
                      placeholder={t("characters.builder.descPlaceholder")}
                      aria-label={t("characters.builder.tab.desc")}
                      style={{ width: "100%", minHeight: 200, boxSizing: "border-box", padding: 10, borderRadius: 6, border: "1px solid var(--pm-line)", background: "var(--pm-s2)", color: "var(--pm-t1)", font: "inherit", resize: "vertical" }}
                    />
                  </div>
                )}
                {tab === "comm" && (
                  <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                    {SAMPLE_COMMENTS.map(([au, when, text]) => (
                      <div key={au} style={{ display: "flex", gap: 10 }}>
                        <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--pm-s3)", flex: "none" }} />
                        <div>
                          <div style={{ fontSize: 12 }}>
                            <b style={{ fontWeight: 500 }}>{au}</b> <span style={{ color: "var(--pm-t3)" }}>· {ago(lang, when)}</span>
                          </div>
                          <div style={{ fontSize: 13, color: "var(--pm-t2)" }}>{text}</div>
                        </div>
                      </div>
                    ))}
                    <input
                      className="input"
                      placeholder={t("characters.builder.commentPlaceholder")}
                      aria-label={t("characters.builder.commentPlaceholder")}
                      style={{ background: "var(--pm-s2)" }}
                    />
                  </div>
                )}
              </fieldset>
            </div>
          </div>

          <section style={{ background: "var(--pm-s1)", border: "1px solid var(--pm-line)", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
              <h2 style={{ fontWeight: 500 }}>{t("characters.stats.title")}</h2>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", flex: 1 }}>
                {["", ...statGroups.map((g) => g.g)].map((c) => (
                  <button key={c || "all"} type="button" className="chChip" style={{ padding: "0 10px" }} aria-pressed={c === sCat} onClick={() => setSCat(c)}>
                    {c ? t(`characters.stats.${c}`) : t("characters.builds.allF")}
                  </button>
                ))}
              </div>
              <label className="chSearch" style={{ width: 200 }}>
                <MagnifyingGlassIcon aria-hidden="true" />
                <input value={statQ} onChange={(e) => setStatQ(e.target.value)} placeholder={t("characters.stats.search")} aria-label={t("characters.stats.search")} />
              </label>
            </div>
            {statGroups.length === 0 && <div style={{ color: "var(--pm-t3)", fontSize: 12 }}>{t("characters.stats.empty")}</div>}
            <div style={{ columns: "4 200px", columnGap: 24 }}>
              {statShown.map((g) => (
                <div key={g.g} style={{ breakInside: "avoid", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--pm-redt)", paddingBottom: 4 }}>{t(`characters.stats.${g.g}`)}</h3>
                  {g.rows.map((r) => (
                    <div key={r.name} className="chStatRow">
                      <span style={{ color: "var(--pm-t2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                      <span className="mono">{r.v}</span>
                      <span className="mono" style={{ textAlign: "right", fontSize: 10, color: "#5FD99A" }}>
                        {r.delta}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      {share && <ShareModal t={t} lang={lang} kind="build" onClose={() => setShare(false)} onError={onError} />}
    </>
  );
}
