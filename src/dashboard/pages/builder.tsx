import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  CaretDownIcon,
  ChatCircleIcon,
  CopyIcon,
  DatabaseIcon,
  FloppyDiskIcon,
  GraphIcon,
  HeartIcon,
  LightningIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusCircleIcon,
  PlusIcon,
  ShareNetworkIcon,
  TShirtIcon,
  TextAlignLeftIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { REGIONS } from "../Onboarding";
import { classSkills, planClass, SkillIcon } from "../skills";
import { art, ClassAvatar, CLASSES, FactionTag } from "../ui";
import { activeId, readCharacters } from "../characters";
import type { BuilderData, EnhancementGroup, EnhancementValue, GearPiece, PlannerBoardData } from "../../data/db/types";
import { boardMax, buildStats, connected, estimates, GAME_SLOTS, planTotals, plannerNodes, PLAN_KEY, readPlans, savedNodes, statValue, twPiece, type Equipped } from "./characters/calc";
import {
  BUILD_DATA_KEY,
  BUILD_TAGS,
  CAPTURED_BAR_KEY,
  CAPTURED_DAEV_KEY,
  CAPTURED_GEAR_KEY,
  closeBuild,
  DANGER,
  DeleteBuildModal,
  MY_BUILDS_KEY,
  OWN_BUILD,
  readBuildData,
  readCapturedBar,
  readCapturedDaev,
  readCapturedGear,
  readMyBuilds,
  SectionHead,
  useMem,
  useToast,
  type BuildSrc,
  type GearSet,
} from "./characters/shared";
import { onePerPiece } from "./gearviewer";
import { DataState, GameIcon, gd, gradeColor, openEntry, useGd, useIcons } from "./world/db";
import { ShareModal } from "./shared/ShareModal";
import { Modal } from "./system/Modal";
import type { PageProps } from "./types";

const TABS = [
  ["equip", TShirtIcon],
  ["skills", LightningIcon],
  ["daev", GraphIcon],
  ["desc", TextAlignLeftIcon],
  ["comm", ChatCircleIcon],
] as const;

// Equipment slots: id → item slots of the archive it accepts. Brawler gauntlets left out (class not out yet).
const WEAPONS = ["Sword", "Dagger", "Mace", "Greatsword", "Staff", "Bow", "Magicbook", "Orb"];
const SLOT_GROUPS: [group: string, slots: [id: string, accepts: string[]][]][] = [
  ["weapons", [["weapon", WEAPONS], ["offhand", ["Guarder", "Sword", "Dagger"]]]],
  ["armors", ["Helmet", "Shoulder", "Torso", "Pants", "Gloves", "Boots", "Belt", "Cape"].map((s) => [s, [s]])],
  ["accessories", [["Necklace", ["Necklace"]], ["Earring 1", ["Earring"]], ["Earring 2", ["Earring"]], ["Ring 1", ["Ring"]], ["Ring 2", ["Ring"]], ["Bracelet", ["Bracelet"]], ["Bracelet 2", ["Bracelet"]], ["Amulet", ["Amulet"]], ["Rune", ["Rune"]], ["Rune 2", ["Rune"]]]],
  ["arcana", ["ArcanaBell", "ArcanaCompass", "ArcanaGrail", "ArcanaMirror", "ArcanaParchment"].map((s) => [s, [s]])],
];
const SLOTS = SLOT_GROUPS.flatMap(([, list]) => list);
/** The level the builder starts at when the build has none saved. */
const DEFAULT_LEVEL = 45;

/** Game item ids (numeric, from the packets) are Taiwan data; the Builder's own pieces have string codes. */
const isGameId = (id: string) => /^\d+$/.test(id);

/** Published enhancement bonuses of an item (first group; never extrapolated past max_published_level). */
async function enhancementOf(id: string): Promise<EnhancementValue[]> {
  const g = (await gd.rows<EnhancementGroup>("item_enhancement_groups", "item_code", id))[0];
  if (!g?.enchant_group) return [];
  const max = g.max_published_level ?? 0;
  const rows = await gd.rows<EnhancementValue>("enhancement_values", "enchant_group", g.enchant_group);
  return rows.filter((v) => v.status === "published" && v.value_kind === "enhancement_bonus" && v.level >= 1 && v.level <= max && v.value_raw != null);
}

// Prototype pg.builder (pBuilder + pX + pBRO).
export default function Builder({ t, lang, name, go, onError, setHeader, settings, save: saveSetting }: PageProps) {
  // New and default builds use the active character's class (onboarding).
  const myCls = planClass(settings["pm.class"]);
  const chars = readCharacters(settings);
  const [src, setSrc] = useMem<BuildSrc>("bSrc", { t: OWN_BUILD, au: name, cls: myCls, own: true });
  const faction = chars.find((c) => c.id === (src.char ?? activeId(settings, chars)))?.faction;
  // Your own build follows the active character: switching character re-targets it
  // (not one opened from a character's card: looking at it must not change anything).
  useEffect(() => {
    if (src.own && !src.isNew && !src.char && src.cls !== myCls) setSrc({ ...src, cls: myCls });
  }, [myCls]); // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useMem("ctab", "skills");
  const [newName, setNewName] = useMem("newName", "");
  const [newTags, setNewTags] = useMem<string[]>("newTags", []);
  // Builds created or cloned here, listed under "Your builds" (builds.tsx); one per title.
  const myBuilds = readMyBuilds(settings[MY_BUILDS_KEY]);
  const addMine = (b: BuildSrc) => saveSetting(MY_BUILDS_KEY, JSON.stringify([b, ...myBuilds.filter((x) => x.t !== b.t)])).catch(onError);
  const [bOpen, setBOpen] = useState(false);
  const [share, setShare] = useState(false);
  const [noClone, setNoClone] = useState(false);
  const [del, setDel] = useState(false);
  // Rename field of a build of yours, tied to the title it was typed for (any other build shows its own title).
  const [draft, setDraft] = useState({ of: "", v: "" });
  const nameField = draft.of === src.t ? draft.v : src.t;
  const [toast, showToast] = useToast();

  // Level and gear sets of this build: saved in pm.buildData, edited here until Save (one build at a time).
  const allData = readBuildData(settings[BUILD_DATA_KEY]);
  const saved = allData[src.t] ?? {};
  const char = chars.find((c) => c.id === (src.char ?? activeId(settings, chars)));
  // Your builds of the character's class wear what the game shows it wearing (CaptureSync), enhancement
  // included; slots the game does not send (Arcana) keep what was picked.
  const captured = src.own && char?.cls === src.cls ? readCapturedGear(settings[CAPTURED_GEAR_KEY])[char.id] : undefined;
  // And the skill bar it has in game, in bar order.
  const gameBar = (src.own && char?.cls === src.cls ? readCapturedBar(settings[CAPTURED_BAR_KEY])[char.id] : undefined)?.flatMap((id) => classSkills(src.cls).find((sk) => sk.id === id) ?? []);
  const wornGear = (g: GearSet = {}): GearSet => {
    if (!captured) return g;
    const kept = Object.entries(g).filter(([s]) => !Object.values(GAME_SLOTS).includes(s));
    return { ...Object.fromEntries(kept), ...captured };
  };
  const [edit, setEdit] = useMem<{ t: string; lvl: number; gear: GearSet; want?: GearSet } | null>("bEdit", null);
  const cur = edit?.t === src.t ? edit : { t: src.t, lvl: saved.lvl ?? char?.level ?? DEFAULT_LEVEL, gear: wornGear(saved.gear), want: saved.want };
  const update = (p: Partial<typeof cur>) => setEdit({ ...cur, ...p });
  const storeData = (title: string, from?: string) => {
    const next = { ...allData, [title]: { lvl: cur.lvl, gear: cur.gear, want: cur.want } };
    if (from !== undefined && from !== title) delete next[from];
    setEdit({ ...cur, t: title });
    saveSetting(BUILD_DATA_KEY, JSON.stringify(next)).catch(onError);
  };
  const [slot, setSlot] = useMem("bSlot", "weapon");
  // Gear set the slots, the Equipment tab, the stats and the estimates show: the worn one or the target one.
  const [which, setWhich] = useMem<"gear" | "want">("bSet", "gear");
  const want = cur.want ?? cur.gear; // the target starts as what you wear
  const shown = which === "gear" ? cur.gear : want;
  const differs = (s: string) => cur.gear[s]?.id !== want[s]?.id || cur.gear[s]?.enh !== want[s]?.enh;
  const missing = SLOTS.filter(([id]) => differs(id)).length;

  const clsKey = src.cls.toLowerCase(); // archive class names: the app's, lowercase
  const pieces = useGd(gd.gear, "gear");
  const calcData = useGd(() => gd.builder(clsKey), clsKey);
  const planner = useGd(() => gd.planner(clsKey), clsKey);
  const ids = [...new Set([...Object.values(cur.gear), ...Object.values(want)].map((g) => g.id))].sort();
  const gameIds = ids.filter(isGameId);
  const tw = useGd(() => (gameIds.length ? gd.twGear(gameIds) : Promise.resolve([])).then((rows) => rows.map(twPiece)), gameIds.join("|"));
  const enh = useGd(
    () => Promise.all(ids.map((id) => (isGameId(id) ? [] : enhancementOf(id)))).then((l) => Object.fromEntries(ids.map((id, i) => [id, l[i]]))),
    ids.join("|"),
  );
  const levelsOf = (id: string) => (isGameId(id) ? tw.data?.find((x) => x.piece.id === id)?.levels : enh.data?.[id]);
  const byId = useMemo(() => new Map([...(pieces.data ?? []), ...(tw.data ?? []).map((x) => x.piece)].map((p) => [p.id, p])), [pieces.data, tw.data]);
  const equippedOf = (gear: GearSet): (Equipped & { slot: string })[] =>
    Object.entries(gear).flatMap(([s, g]) => {
      const piece = byId.get(g.id);
      if (!piece) return [];
      const bonus = (levelsOf(g.id) ?? []).filter((v) => v.level === g.enh).map((v) => [v.stat_key, statValue(v.value_raw!, v.percent === 1)] as [string, number]);
      return [{ slot: s, piece, enh: g.enh, bonus }];
    });
  const worn = equippedOf(cur.gear);
  const equipped = which === "gear" ? worn : equippedOf(shown);
  const nodes = useMemo(() => (planner.data ? plannerNodes(planner.data) : []), [planner.data]);
  // Your builds of the character's class take the Daevanion nodes it has in game (CaptureSync), others the planner's.
  const gameDaev = src.own && char?.cls === src.cls ? readCapturedDaev(settings[CAPTURED_DAEV_KEY])[char.id] : undefined;
  const picked = useMemo(
    () => (gameDaev ? gameDaev.map((n) => `${src.cls.toLowerCase()}:${n}`) : savedNodes(readPlans(settings[PLAN_KEY]), src.cls)),
    [JSON.stringify(gameDaev), settings[PLAN_KEY], src.cls], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const plan = useMemo(() => planTotals(nodes, picked), [nodes, picked]);
  const taken = useMemo(() => new Set(connected(nodes, picked)), [nodes, picked]);
  const totalsOf = (gear: (Equipped & { slot: string })[]) => (calcData.data ? buildStats(calcData.data, cur.lvl, gear, plan) : {});
  const totals = totalsOf(equipped);
  const wornTotals = which === "want" ? totalsOf(worn) : undefined;
  const wornHere = worn.find((x) => x.slot === slot);
  const est = calcData.data && estimates(totals, calcData.data.skills);
  const levels = calcData.data?.base.map((b) => b.level) ?? [];
  const icons = useIcons(equipped.map((e) => e.piece.icon));
  const maxByBoard = useMemo(() => boardMax(nodes), [nodes]);

  const isNew = !!src.isNew;
  // Created or cloned here: renamable and deletable (the default own build is neither).
  const isMine = src.own && !isNew && myBuilds.some((x) => x.t === src.t);
  // The name Save would give it; titles are keys, so no two builds share one.
  const typed = (isNew ? newName || t("characters.builder.newBuild") : nameField).trim();
  const nameTaken = typed !== src.t && (typed === OWN_BUILD || myBuilds.some((x) => x.t === typed));
  const badName = (isNew || isMine) && (!typed || nameTaken);
  const [, clsCol] = CLASSES[src.cls];
  // Your builds of the active character's class, the default one first (the "my builds" menu).
  const ownList: BuildSrc[] = [{ t: OWN_BUILD, au: name, cls: myCls, own: true }, ...myBuilds.filter((x) => x.cls === myCls)];
  const ownIdx = src.own && !isNew ? ownList.findIndex((x) => x.t === src.t) : -1;
  const titleOf = (b: string) => (b === OWN_BUILD ? t("characters.builder.defaultBuild") : b);
  const title = isNew ? newName || t("characters.builder.newBuild") : titleOf(src.t);
  const crumb = t("shell.crumb.builder");
  useEffect(() => setHeader({ title, crumb }), [setHeader, title, crumb]);

  // Share: the build as text (links wait for the uploads, R2).
  const shareText = [`${title} — ${src.cls} · ${name}`, "PowerMeter"].join("\n");

  const copySuffix = t("characters.builder.copySuffix");
  const clone = () => {
    // Only a build of the active character's class can become one of yours.
    if (src.cls !== myCls) return setNoClone(true);
    showToast({ title: t("characters.builder.clonedTitle"), text: t("characters.builder.clonedText") });
    const base = titleOf(src.t);
    const copy = (base.endsWith(copySuffix) ? base.slice(0, -copySuffix.length) : base) + copySuffix;
    const mine = { t: copy, au: name, cls: src.cls, own: true, tags: src.tags };
    addMine(mine);
    storeData(copy);
    setSrc(mine);
  };
  const save = () => {
    if (badName) return;
    showToast(
      isNew
        ? { title: t("characters.builder.createdTitle"), text: t("characters.builder.createdText") }
        : { title: t("characters.builder.savedTitle"), text: t("characters.builder.savedText") },
    );
    if (isNew) {
      const mine = { t: typed, au: name, cls: src.cls, own: true, tags: newTags };
      addMine(mine);
      storeData(typed);
      setSrc(mine);
    } else if (isMine && typed !== src.t) {
      // Rename: same place in "Your builds".
      const renamed = { ...src, t: typed };
      saveSetting(MY_BUILDS_KEY, JSON.stringify(myBuilds.map((x) => (x.t === src.t ? renamed : x)))).catch(onError);
      storeData(typed, src.t);
      setSrc(renamed);
    } else storeData(src.t);
  };
  /** Delete this build of yours (after the modal) and go back to the list. */
  const remove = () => {
    closeBuild(src.t);
    const { [src.t]: _gone, ...rest } = allData; // eslint-disable-line @typescript-eslint/no-unused-vars
    saveSetting(BUILD_DATA_KEY, JSON.stringify(rest)).catch(onError);
    saveSetting(MY_BUILDS_KEY, JSON.stringify(myBuilds.filter((x) => x.t !== src.t))).catch(onError);
    go("builds");
  };

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
        {/* No likes or comment system yet, so there are none to count. */}
        <span style={{ fontSize: 12, color: "var(--pm-t3)", display: "flex", gap: 10 }}>
          <span aria-label={t("planner.builder.likes", { n: 0 })}>
            <HeartIcon aria-hidden="true" style={{ verticalAlign: "-2px" }} /> 0
          </span>
          <span aria-label={t("characters.builder.comments", { n: 0 })}>
            <ChatCircleIcon aria-hidden="true" style={{ verticalAlign: "-2px" }} /> 0
          </span>
        </span>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn sm" onClick={clone}>
          <CopyIcon aria-hidden="true" />
          {t("characters.duplicate")}
        </button>
        <button type="button" className="btn sm" onClick={() => setShare(true)}>
          <ShareNetworkIcon aria-hidden="true" />
          {t("characters.share.button")}
        </button>
        <button type="button" className="btn sm fill" style={{ padding: "0 12px" }} disabled={badName} onClick={save}>
          <FloppyDiskIcon aria-hidden="true" />
          {isNew ? t("characters.builds.create") : t("characters.save")}
        </button>
      </div>

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
          {nameTaken && <NameTaken t={t} />}
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
      {isMine && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "10px 14px", margin: "-4px 0 12px", borderRadius: 8, background: "var(--pm-s1)", border: "1px solid var(--pm-line)", boxShadow: "inset 3px 0 0 var(--pm-red)" }}>
          <PencilSimpleIcon aria-hidden="true" style={{ fontSize: 18, color: "var(--pm-redt)", flex: "none" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{t("characters.builder.editTitle")}</div>
            <div style={{ fontSize: 12, color: "var(--pm-t2)" }}>{t("characters.builder.editText")}</div>
          </div>
          <input
            className="input"
            value={nameField}
            onChange={(e) => setDraft({ of: src.t, v: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder={t("characters.builder.namePlaceholder")}
            aria-label={t("characters.builder.namePlaceholder")}
            aria-invalid={badName}
            style={{ height: 32, width: 260 }}
          />
          {/* Here, not in the toolbar: one more button there wraps it onto two rows. */}
          <button type="button" className="btn" style={DANGER} onClick={() => setDel(true)}>
            <TrashIcon aria-hidden="true" />
            {t("characters.delete")}
          </button>
          {nameTaken && <NameTaken t={t} />}
        </div>
      )}
      {toast}

      {/* Header band: class, title, "my builds" menu. */}
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
              <CaretDownIcon aria-hidden="true" style={{ color: "var(--pm-t3)" }} />
            </button>
            <div style={{ fontSize: 12, color: "var(--pm-t2)" }}>
              {name} · {src.cls}
              {faction && (
                <>
                  {" · "}
                  <FactionTag faction={faction} label={t(`collections.${faction}`)} />
                </>
              )}
              {ownIdx >= 0 && ` · ${t("characters.builder.buildOf", { i: ownIdx + 1, n: ownList.length })}`}
            </div>
            {bOpen && (
              <div className="chPop" style={{ left: 0, top: 52, zIndex: 6, width: 280, padding: 6, gap: 4 }}>
                {ownList.map((mb) => (
                  <button
                    key={mb.t}
                    type="button"
                    className="chBtnReset chMyBuild"
                    aria-current={mb.t === src.t && !isNew ? "true" : undefined}
                    style={{ borderColor: mb.t === src.t && !isNew ? "var(--pm-red)" : undefined }}
                    onClick={() => {
                      setBOpen(false);
                      setSrc(mb);
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{titleOf(mb.t)}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="chBtnReset"
                  style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 34, padding: "0 10px", color: "var(--pm-redt)", fontSize: 12 }}
                  onClick={() => {
                    // Same reset as "Crea build" (openBuild), applied in place.
                    setBOpen(false);
                    setSrc({ t: "", au: name, cls: myCls, own: true, isNew: true });
                    setNewName("");
                    setNewTags([]);
                  }}
                >
                  <PlusIcon aria-hidden="true" />
                  {t("characters.builder.newBuild")}
                </button>
              </div>
            )}
          </div>
          <div style={{ flex: 1 }} />
          <label className="field" style={{ margin: 0, minWidth: 90 }}>
            {t("planner.builder.level")}
            <select className="input sm" value={cur.lvl} onChange={(e) => update({ lvl: Number(e.target.value) })} disabled={!levels.length}>
              {(levels.length ? levels : [cur.lvl]).map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <Estimate t={t} lang={lang} label="Combat Power" value={est?.cp} help={t("planner.builder.cpHelp")} big />
          <Estimate t={t} lang={lang} label="DPS" value={est?.dps} help={t("planner.builder.dpsHelp")} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(380px,1fr)", gap: 12, alignItems: "start" }}>
        {!pieces.data || !calcData.data ? (
          <DataState t={t} error={pieces.error ?? calcData.error} retry={() => (pieces.retry(), calcData.retry())} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div className="chSeg" role="group" aria-label={t("characters.builder.set.label")}>
                {(["gear", "want"] as const).map((k) => (
                  <button key={k} type="button" aria-pressed={which === k} onClick={() => setWhich(k)}>
                    {t(`characters.builder.set.${k}`)}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: 12, color: "var(--pm-t2)" }}>
                {which === "gear" ? t("characters.builder.set.gearHint") : t("characters.builder.set.wantHint", { n: missing })}
              </span>
            </div>
            {SLOT_GROUPS.map(([group, list]) => (
              <section key={group} className="bSlots">
                <SectionHead title={t(`planner.builder.group.${group}`)} style={{ marginBottom: 10 }} />
                <div className="bSlotGrid">
                  {list.map(([id]) => {
                    const e = equipped.find((x) => x.slot === id);
                    const diff = which === "want" && differs(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        className="chBtnReset bSlot"
                        data-diff={diff || undefined}
                        title={diff ? t("characters.builder.set.differs") : undefined}
                        aria-pressed={slot === id}
                        onClick={() => (setSlot(id), setTab("equip"))}
                      >
                        {diff && <span className="srOnly">{t("characters.builder.set.differs")}</span>}
                        <GameIcon url={e?.piece.icon ? icons[e.piece.icon] : undefined} grade={e?.piece.grade} size={38} glyph={<span />} />
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: 10, color: "var(--pm-t3)", display: "flex", gap: 6 }}>
                            <span style={{ flex: 1 }}>{slotLabel(t, id)}</span>
                            {e && e.enh > 0 && <span className="mono" style={{ color: "var(--pm-t1)" }}>+{e.enh}</span>}
                          </span>
                          <span style={{ display: "block", fontSize: 12, color: e ? gradeColor(e.piece.grade) : "var(--pm-t3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {e ? (e.piece.name ?? e.piece.id) : t("planner.builder.empty")}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
        <div style={{ background: "var(--pm-s1)", border: "1px solid var(--pm-line)", borderRadius: 8, minWidth: 0, display: "flex", position: "sticky", top: 0 }}>
          <div role="tablist" aria-orientation="vertical" style={{ width: 48, flex: "none", borderRight: "1px solid var(--pm-line)", display: "flex", flexDirection: "column", gap: 4, padding: "8px 6px" }}>
            {TABS.map(([id, Icon]) => {
              const label = t(`characters.builder.tab.${id}`, { n: 0 });
              return (
                <button key={id} type="button" role="tab" aria-selected={tab === id} className="chRailBtn" title={label} aria-label={label} onClick={() => setTab(id)}>
                  <Icon aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <div role="tabpanel" style={{ flex: 1, minWidth: 0 }}>
            {tab === "equip" && (
              <EquipPanel
                t={t}
                lang={lang}
                slot={slot}
                pieces={pieces.data ?? []}
                equipped={equipped.find((x) => x.slot === slot)}
                levels={shown[slot] ? levelsOf(shown[slot].id) : undefined}
                wornNote={
                  which === "want" && differs(slot)
                    ? t("characters.builder.set.wornIs", { item: wornHere ? `${wornHere.piece.name ?? wornHere.piece.id}${wornHere.enh ? ` +${wornHere.enh}` : ""}` : t("planner.builder.empty") })
                    : undefined
                }
                set={(g) => {
                  const next = { ...shown };
                  if (g) next[slot] = g;
                  else delete next[slot];
                  update(which === "gear" ? { gear: next } : { want: next });
                }}
                openItem={(id) => openEntry(go, "item", id)}
              />
            )}
            {tab === "daev" && (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {(planner.data?.boards ?? []).map((b) => {
                  const d = b.data_json as unknown as PlannerBoardData;
                  // The god's Daevanion skills taken on this board, levels added up.
                  const skills = new Map<string, { title: string; levels: number }>();
                  for (const n of nodes) {
                    if (n.board !== d.board || !n.skill || !taken.has(n.id)) continue;
                    const x = skills.get(n.skill.id) ?? { title: n.title ?? n.skill.id, levels: 0 };
                    skills.set(n.skill.id, { ...x, levels: x.levels + n.skill.levels });
                  }
                  return (
                    <details key={b.id} style={{ borderBottom: "1px solid var(--pm-line)" }}>
                      <summary style={{ display: "flex", gap: 10, alignItems: "center", minHeight: 34, cursor: "pointer" }}>
                        <span style={{ flex: 1 }}>{d.title}</span>
                        <span className="mono" style={{ fontSize: 12 }}>
                          {plan.spent[d.board] ?? 0} / {maxByBoard[d.board] ?? 0}
                        </span>
                      </summary>
                      <div style={{ padding: "0 0 10px", display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "var(--pm-t2)" }}>
                        {skills.size === 0 && <span>{t("characters.builder.daevNoSkills")}</span>}
                        {[...skills.values()].map((x) => (
                          <span key={x.title} style={{ display: "flex", gap: 8 }}>
                            <span style={{ flex: 1, color: "var(--pm-t1)" }}>{x.title}</span>
                            <span className="mono">+{x.levels}</span>
                          </span>
                        ))}
                      </div>
                    </details>
                  );
                })}
                <div>
                  <button type="button" className="btn sm" onClick={() => go("daevanion")}>
                    {t("planner.builder.openPlanner")}
                  </button>
                </div>
              </div>
            )}
            {tab === "skills" && (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 12, color: "var(--pm-t2)" }}>{t("characters.builder.linkedSkills")}</div>
                {!gameBar?.length && <div style={{ fontSize: 13, color: "var(--pm-t2)" }}>{t("characters.builder.skillBarNone")}</div>}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {(gameBar ?? []).map((sk) => (
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
                {/* Comments need the server (shared builds): visible empty state until then. */}
                <div style={{ padding: "24px 0", color: "var(--pm-t2)", fontSize: 13 }}>
                  <div style={{ fontSize: 14, color: "var(--pm-t1)", marginBottom: 4 }}>{t("characters.builder.commentsEmptyTitle")}</div>
                  {t("characters.builder.commentsEmptyText")}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {calcData.data && <StatsPanel t={t} lang={lang} data={calcData.data} totals={totals} base={wornTotals} />}
      {noClone && (
        <Modal
          width={420}
          onClose={() => setNoClone(false)}
          title={(id) => (
            <div style={{ display: "flex", alignItems: "center" }}>
              <h2 id={id} style={{ fontSize: 17, fontWeight: 500, flex: 1 }}>
                {t("characters.builder.noCloneTitle")}
              </h2>
              <button type="button" className="shareClose" autoFocus onClick={() => setNoClone(false)} title={t("window.close")} aria-label={t("window.close")}>
                <XIcon aria-hidden="true" />
              </button>
            </div>
          )}
        >
          <div style={{ color: "var(--pm-t2)" }}>{t("characters.builder.noCloneText", { cls: src.cls, mine: myCls })}</div>
        </Modal>
      )}
      {del && <DeleteBuildModal t={t} build={src.t} onDelete={remove} onClose={() => setDel(false)} />}
      {share && <ShareModal t={t} lang={lang} kind="build" text={shareText} onClose={() => setShare(false)} onError={onError} />}
    </>
  );
}

/** Under the build name field: the title is already used by another build. */
function NameTaken({ t }: { t: PageProps["t"] }) {
  return (
    <div role="alert" style={{ flexBasis: "100%", paddingLeft: 30, fontSize: 12, color: "var(--pm-redt)" }}>
      {t("characters.builder.nameTaken")}
    </div>
  );
}

/** Header figure marked as an estimate (the archive has no Combat Power formula). */
function Estimate({ t, lang, label, value, help, big }: { t: PageProps["t"]; lang: string; label: string; value?: number; help: string; big?: boolean }) {
  return (
    <div title={help} style={{ paddingLeft: 18, borderLeft: "1px solid var(--pm-line)" }}>
      <div className="kicker" style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {label}
        <span className="bEst">{t("planner.builder.estimate")}</span>
      </div>
      <div className="mono" style={{ fontSize: big ? 30 : 20, lineHeight: 1.1 }}>
        {value == null ? <span className="wNd">{t("world.db.nd")}</span> : value.toLocaleString(lang)}
      </div>
    </div>
  );
}

const slotLabel = (t: PageProps["t"], id: string) => (id === "weapon" || id === "offhand" ? t(`planner.builder.slot.${id}`) : id.replace(/^Arcana/, "Arcana "));

/** Right rail "Equipment" tab: the item in the selected slot, its enhancement level (published levels only) and stats. */
function EquipPanel({
  t,
  lang,
  slot,
  pieces,
  equipped,
  levels,
  wornNote,
  set,
  openItem,
}: {
  t: PageProps["t"];
  lang: string;
  slot: string;
  pieces: GearPiece[];
  equipped?: Equipped;
  levels?: EnhancementValue[];
  /** Target set only, when the slot differs: what you wear there now. */
  wornNote?: string;
  set: (g: { id: string; enh: number } | null) => void;
  openItem: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const accepts = SLOTS.find(([id]) => id === slot)?.[1] ?? [];
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const list = useMemo(() => onePerPiece(pieces.filter((p) => accepts.includes(p.slot ?? ""))), [pieces, slot]); // eslint-disable-line react-hooks/exhaustive-deps
  const found = list.filter((p) => words.every((w) => `${p.name ?? ""} ${p.slot ?? ""}`.toLowerCase().includes(w))).slice(0, 30);
  const p = equipped?.piece;
  const icons = useIcons([...found.map((x) => x.icon), p?.icon]);
  const steps = [0, ...new Set((levels ?? []).map((v) => v.level))].sort((a, b) => a - b);
  const fmt = (v: number) => v.toLocaleString(lang, { maximumFractionDigits: 2 });

  return (
    <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 11, color: "var(--pm-t3)", marginBottom: 6 }}>{t("planner.builder.equipped", { slot: slotLabel(t, slot) })}</div>
        {p ? (
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, height: 44, padding: "0 8px", borderRadius: 6, border: "1px solid var(--pm-line)", background: "var(--pm-s2)" }}>
              <GameIcon url={p.icon ? icons[p.icon] : undefined} grade={p.grade} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: gradeColor(p.grade), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name ?? p.id}</div>
                <div style={{ fontSize: 10, color: "var(--pm-t3)" }}>
                  {p.grade} · {t("world.db.lv", { n: p.level ?? "-" })}
                </div>
              </div>
            </div>
            <button type="button" className="chIconBtn" style={{ height: 44, width: 40 }} title={t("planner.builder.remove")} aria-label={t("planner.builder.remove")} onClick={() => set(null)}>
              <XIcon aria-hidden="true" />
            </button>
            {!isGameId(p.id) && (
              <button type="button" className="chIconBtn" style={{ height: 44, width: 40 }} title={t("planner.builder.openDb")} aria-label={t("planner.builder.openDb")} onClick={() => openItem(p.id)}>
                <DatabaseIcon aria-hidden="true" />
              </button>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("planner.builder.empty")}</div>
        )}
        {wornNote && <div style={{ fontSize: 11, color: "var(--pm-t2)", marginTop: 6 }}>{wornNote}</div>}
      </div>

      {p && equipped && (
        <>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--pm-t3)", marginBottom: 8 }}>
              <span>{t("planner.builder.enh")}</span>
              <span className="mono" style={{ color: "var(--pm-t1)" }}>
                +{equipped.enh}
              </span>
            </div>
            {steps.length > 1 ? (
              <div role="group" aria-label={t("planner.builder.enh")} style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {steps.map((l) => (
                  <button key={l} type="button" className="wChip mono" style={{ height: 24, padding: "0 8px" }} aria-pressed={l === equipped.enh} onClick={() => set({ id: p.id, enh: l })}>
                    +{l}
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("planner.builder.noEnh")}</div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--pm-t3)", marginBottom: 6 }}>{t("planner.builder.mainStats")}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 12px", fontSize: 12 }}>
              {(p.stats_json ?? []).map(([k, label, v, unit], i) => {
                const b = equipped.bonus.find(([bk]) => bk === k);
                return (
                  <span key={k + i} style={{ display: "contents" }}>
                    <span style={{ color: "var(--pm-t2)" }}>{label ?? k}</span>
                    <span className="mono">
                      {v == null ? t("world.db.nd") : fmt(v) + (unit === "percent" ? "%" : "")}
                      {b && <span style={{ color: "#5FD99A" }}> +{fmt(b[1])}</span>}
                    </span>
                  </span>
                );
              })}
            </div>
            <div style={{ fontSize: 11, color: "var(--pm-t3)", marginTop: 8 }}>{t("planner.builder.rolledNote")}</div>
          </div>
        </>
      )}

      <div style={{ borderTop: "1px solid var(--pm-line)", paddingTop: 12 }}>
        <label className="chSearch" style={{ marginBottom: 6 }}>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("planner.builder.pick")} aria-label={t("planner.builder.pick")} />
        </label>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 320, overflow: "auto" }}>
          {found.map((x) => (
            <button key={x.id} type="button" className="chBtnReset bPick" aria-pressed={x.id === p?.id} onClick={() => set({ id: x.id, enh: 0 })}>
              <GameIcon url={x.icon ? icons[x.icon] : undefined} grade={x.grade} size={24} />
              <span style={{ flex: 1, minWidth: 0, color: gradeColor(x.grade), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.name ?? x.id}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--pm-t3)" }}>
                {x.level != null && t("world.db.lv", { n: x.level })}
              </span>
            </button>
          ))}
          {found.length === 0 && <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("world.db.noResults", { q: q.trim() })}</div>}
        </div>
      </div>
    </div>
  );
}

/**
 * Bottom "Statistics" panel: every stat the build has, grouped as in the stat dictionary, with a filter.
 * `base` (target set shown): the worn set's totals, each stat then shows its change against them.
 */
function StatsPanel({ t, lang, data, totals, base }: { t: PageProps["t"]; lang: string; data: BuilderData; totals: Record<string, number>; base?: Record<string, number> }) {
  const [grp, setGrp] = useMem("bStatGrp", "");
  const [q, setQ] = useState("");
  const dict = new Map(data.stats.map((s) => [s.stat_key, s]));
  const rows = [...new Set([...Object.keys(totals), ...Object.keys(base ?? {})])]
    .map((k) => ({ k, v: totals[k] ?? 0, delta: base ? (totals[k] ?? 0) - (base[k] ?? 0) : 0, d: dict.get(k), g: dict.get(k)?.grp ?? "Other" }))
    .filter((r) => r.v !== 0 || r.delta !== 0);
  const groups = [...new Set(rows.map((r) => r.g))].sort();
  const words = q.trim().toLowerCase();
  const shown = rows.filter((r) => (!grp || r.g === grp) && (r.d?.name ?? r.k).toLowerCase().includes(words));
  const grpLabel = (g: string) => t(`planner.grp.${g}`);
  return (
    <section style={{ marginTop: 12, background: "var(--pm-s1)", border: "1px solid var(--pm-line)", borderRadius: 8, padding: "12px 14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <h2 style={{ fontWeight: 500, fontSize: 14 }}>{t("planner.builder.stats")}</h2>
        {base && <span style={{ fontSize: 12, color: "var(--pm-t2)" }}>{t("characters.builder.set.deltaNote")}</span>}
        <div role="group" aria-label={t("planner.builder.stats")} style={{ display: "flex", gap: 5, flexWrap: "wrap", flex: 1 }}>
          {["", ...groups].map((g) => (
            <button key={g} type="button" className="wChip" style={{ height: 26, fontSize: 11 }} aria-pressed={grp === g} onClick={() => setGrp(g)}>
              {g ? grpLabel(g) : t("planner.builder.allGroups")}
            </button>
          ))}
        </div>
        <label className="chSearch" style={{ width: 200 }}>
          <MagnifyingGlassIcon aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("planner.builder.statsSearch")} aria-label={t("planner.builder.statsSearch")} />
        </label>
      </div>
      {shown.length === 0 && <div style={{ color: "var(--pm-t3)", fontSize: 12 }}>{t("planner.builder.noStats")}</div>}
      <div style={{ columns: "4 200px", columnGap: 24 }}>
        {groups
          .filter((g) => shown.some((r) => r.g === g))
          .map((g) => (
            <div key={g} style={{ breakInside: "avoid", marginBottom: 12 }}>
              <div style={{ fontSize: 10, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--pm-redt)", paddingBottom: 4 }}>{grpLabel(g)}</div>
              {shown
                .filter((r) => r.g === g)
                .sort((a, b) => (a.d?.name ?? a.k).localeCompare(b.d?.name ?? b.k))
                .map((r) => (
                  <div key={r.k} className="dvRow" style={{ minHeight: 22 }}>
                    <span>{r.d?.name ?? r.k}</span>
                    <span className="mono">
                      {r.v.toLocaleString(lang, { maximumFractionDigits: 2 })}
                      {r.d?.percent ? "%" : ""}
                      {Math.abs(r.delta) >= 0.005 && (
                        <span style={{ marginLeft: 6, color: r.delta > 0 ? "var(--pm-okt)" : "var(--pm-err)" }}>
                          {r.delta.toLocaleString(lang, { maximumFractionDigits: 2, signDisplay: "always" })}
                          {r.d?.percent ? "%" : ""}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
            </div>
          ))}
      </div>
    </section>
  );
}
