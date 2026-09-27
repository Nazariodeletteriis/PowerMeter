import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowLeftIcon,
  CaretDownIcon,
  ChartBarIcon,
  ChatCircleIcon,
  CopyIcon,
  DatabaseIcon,
  EyeIcon,
  FloppyDiskIcon,
  GraphIcon,
  HeartIcon,
  LightningIcon,
  LockSimpleIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PictureInPictureIcon,
  PlusCircleIcon,
  PlusIcon,
  ScalesIcon,
  ShareNetworkIcon,
  TargetIcon,
  TextAlignLeftIcon,
  TShirtIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { iconUrl, ItemIcon } from "../items";
import { Collections, equippedArcana, useCollectionStats } from "./characters/collections";
import { dvStats, finalStats, STAT_GROUPS } from "./characters/charstats";
import { dvSummary, readDv } from "./daevanion";
import { REGIONS } from "../Onboarding";
import { classSkills, planClass, SkillIcon } from "../skills";
import { art, ClassAvatar, CLASSES, FactionTag, fmt, RARITY } from "../ui";
import { activeId, readCharacters } from "../characters";
import { BUILD_TAGS, closeBuild, DANGER, DeleteBuildModal, MY_BUILDS_KEY, readMyBuilds, SectionHead, useMem, useToast, type BuildSrc } from "./characters/shared";
import {
  arcanaScore,
  baseStats,
  GEAR_KEY,
  gearKey as keyOf,
  gearScore,
  gearStats,
  itemById,
  magicstoneOptions,
  maxEnh,
  missingSlots,
  newPiece,
  OWN_BUILD,
  rarityOf,
  readGear,
  SLOT_GROUPS,
  SLOTS,
  slotItems,
  sockets,
  soulPool,
  statIsPct,
  statName,
  statValue,
  THEOSTONES,
  useGearData,
  type BuildGear,
  type Gear,
  type Line,
  type Piece,
} from "./characters/gear";
import { SELECTED_ITEM } from "./database";
import { term, useDb } from "./world/db";
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
const PICK_MAX = 60;
const LABEL: CSSProperties = { fontSize: 11, color: "var(--pm-t3)", marginBottom: 6 };

const EMPTY_GEAR: BuildGear = { owned: {}, target: {} };

// Prototype pg.builder (pBuilder + pX + pBRO).
export default function Builder({ t, lang, name, go, run, onError, setHeader, settings, save: saveSetting }: PageProps) {
  // New and default builds use the active character's class (onboarding).
  const myCls = planClass(settings["pm.class"]);
  const chars = readCharacters(settings);
  const faction = chars.find((c) => c.id === activeId(settings, chars))?.faction;
  const [src, setSrc] = useMem<BuildSrc>("bSrc", { t: OWN_BUILD, au: name, cls: myCls, own: true });
  // Your own build follows the active character: switching character re-targets it.
  useEffect(() => {
    if (src.own && !src.isNew && src.cls !== myCls) setSrc({ ...src, cls: myCls });
  }, [myCls]); // eslint-disable-line react-hooks/exhaustive-deps
  const [mode, setMode] = useMem("bmode", "dummy");
  const [view, setView] = useMem("bview", "owned");
  const [cur, setCur] = useMem("slot", "mh");
  const [stored, setStored] = useMem<Record<string, BuildGear>>("gear", readGear(settings[GEAR_KEY]));
  const [newGear, setNewGear] = useMem<BuildGear>("newGear", EMPTY_GEAR);
  const [statQ, setStatQ] = useMem("statQ", "");
  const [sCat, setSCat] = useMem("sCat", "");
  const [tab, setTab] = useMem("ctab", "equip");
  const [newName, setNewName] = useMem("newName", "");
  const [newTags, setNewTags] = useMem<string[]>("newTags", []);
  const [liked, setLiked] = useMem<Record<string, boolean>>("liked", {});
  // Builds created or cloned here, listed under "Your builds" (builds.tsx); one per title.
  const myBuilds = readMyBuilds(settings[MY_BUILDS_KEY]);
  const addMine = (b: BuildSrc) => saveSetting(MY_BUILDS_KEY, JSON.stringify([b, ...myBuilds.filter((x) => x.t !== b.t)])).catch(onError);
  const dv = readDv(settings);
  const [itemOpen, setItemOpen] = useState(false);
  const [bOpen, setBOpen] = useState(false);
  const [itemQ, setItemQ] = useState("");
  const [share, setShare] = useState(false);
  const [compare, setCompare] = useState(false);
  const [noClone, setNoClone] = useState(false);
  const [del, setDel] = useState(false);
  // Rename field of a build of yours, tied to the title it was typed for (any other build shows its own title).
  const [draft, setDraft] = useState({ of: "", v: "" });
  const nameField = draft.of === src.t ? draft.v : src.t;
  const [toast, showToast] = useToast();

  const n = (x: number) => fmt(x, lang);
  const ro = !src.own;
  const isNew = !!src.isNew;
  // Created or cloned here: renamable and deletable (the default own build is neither).
  const isMine = src.own && !isNew && myBuilds.some((x) => x.t === src.t);
  // The name Save would give it; titles are keys (gear, likes), so no two builds share one.
  const typed = (isNew ? newName || t("characters.builder.newBuild") : nameField).trim();
  const nameTaken = typed !== src.t && (typed === OWN_BUILD || myBuilds.some((x) => x.t === typed));
  const badName = (isNew || isMine) && (!typed || nameTaken);
  const tgt = view === "target";
  const [, clsCol] = CLASSES[src.cls];
  // Your builds of the active character's class, the default one first (the "my builds" menu).
  const ownList: BuildSrc[] = [{ t: OWN_BUILD, au: name, cls: myCls, own: true }, ...myBuilds.filter((x) => x.cls === myCls)];
  const ownIdx = src.own && !isNew ? ownList.findIndex((x) => x.t === src.t) : -1;
  const titleOf = (b: string) => (b === OWN_BUILD ? t("characters.builder.defaultBuild") : b);
  const title = isNew ? newName || t("characters.builder.newBuild") : titleOf(src.t);
  const crumb = t("shell.crumb.builder");
  useEffect(() => setHeader({ title, crumb }), [setHeader, title, crumb]);

  // Equipment: owned and target per build and class, saved in settings; a
  // build never edited (or new) starts empty.
  const ready = useGearData(); // equip.json: stats, sockets, enhancement levels
  const gearKey = keyOf(src.t, src.cls);
  const saved = stored[gearKey];
  const g: BuildGear = isNew ? newGear : (saved ?? EMPTY_GEAR);
  const storeGear = (key: string, next: BuildGear) => {
    const all = { ...stored, [key]: next };
    setStored(all);
    saveSetting(GEAR_KEY, JSON.stringify(all)).catch(onError);
  };
  const setG = (next: BuildGear) => (isNew ? setNewGear(next) : storeGear(gearKey, next));
  const gear = tgt ? g.target : g.owned;
  const piece = gear[cur] as Piece | undefined;
  const setPiece = (p?: Piece) => {
    const next: Gear = { ...gear };
    if (p) next[cur] = p;
    else delete next[cur];
    setG(tgt ? { ...g, target: next } : { ...g, owned: next });
  };
  const openItem = (item: string) => {
    sessionStorage.setItem(SELECTED_ITEM, item);
    go("item");
  };

  // Slots (pBuilder.slots + pX.slotGroups): dashed in the target view = not owned yet.
  const slots = SLOTS.map(([id, label]) => {
    const p = gear[id];
    const item = itemById(p?.id);
    const want = itemById(g.target[id]?.id);
    const has = !tgt || g.owned[id]?.id === p?.id;
    const rar = rarityOf(item);
    const col = item ? RARITY[rar] : "var(--pm-t3)";
    const lv = item ? p.enh : 0;
    const words = label.replace(/ II$/, " 2").replace(/ I$/, " 1").split(" ");
    return {
      id,
      label,
      item,
      rar,
      lv,
      name: item?.name ?? t("characters.builder.emptySlot"),
      col,
      enh: lv ? `+${lv}` : "",
      bd: !item ? "1.5px dashed var(--pm-grey)" : has ? `1.5px solid ${col}` : `1.5px dashed ${col}`,
      op: !item ? 0.7 : has ? 1 : 0.6,
      // "MH", "E1", "Gu" (Guard) vs "Gl" (Gloves): the fallback when an icon is missing.
      short: words.length > 1 ? words.map((w) => w[0]).join("").slice(0, 2) : label.slice(0, 2),
      // Enhancement levels in red, breakthrough levels (past the item's enhancement cap) in amber.
      pips: Array.from({ length: 20 }, (_, i) => (i < lv ? (i >= 15 ? "#F0A63A" : "var(--pm-red)") : "var(--pm-s3)")),
      // Owned view: the build's target for this slot, when it is another item.
      target: !tgt && want && want.id !== item?.id ? want.name : "",
    };
  });
  const s = slots.find((x) => x.id === cur)!;
  const sel = s.item ? s : { ...s, name: t("characters.builder.pickItem"), col: "var(--pm-t2)", rar: "—" };
  const lvNow = piece?.enh ?? 0;
  const lvMax = maxEnh(piece?.id) || 20; // 20 until equip.json has loaded
  const dec = (x: number) => x.toLocaleString(lang, { maximumFractionDigits: 2 });
  const signed = (x: number) => (x > 0 ? "+" : x < 0 ? "−" : "") + dec(Math.abs(x));
  /** "Damage Boost 5%", "Attack 91": a stat line as the game shows it. */
  const statText = (id: string, v: number) => `${dec(statValue(id, v))}${statIsPct(id) ? "%" : ""}`;
  const mainStats = Object.entries(baseStats(piece)).filter(([, v]) => v);
  const pool = soulPool(piece?.id);
  const sock = sockets(piece?.id);
  const msOpts = useMemo(() => (ready ? magicstoneOptions() : []), [ready]);
  // Magicstone menu grouped by stat name.
  const msGroups = useMemo(() => {
    const groups = new Map<string, typeof msOpts>();
    for (const o of msOpts) groups.set(statName(o[0]), [...(groups.get(statName(o[0])) ?? []), o]);
    return [...groups].sort(([a], [b]) => a.localeCompare(b));
  }, [msOpts]);
  const itemQl = itemQ.toLowerCase();
  const choices = itemOpen ? slotItems(cur, src.cls).filter((i) => i.name.toLowerCase().includes(itemQl)) : [];

  // Gear Score as questlog's calculateTotalGearscore: equipment (gear.ts) +
  // equipped Arcana + Daevanion points spent. Arcana and Daevanion are the
  // active character's: none for someone else's build. Combat Power isn't
  // shown: neither the game data nor questlog has a formula for it.
  const gsExtra = ro ? 0 : arcanaScore(equippedArcana(settings)) + dvSummary(planClass(src.cls), dv).reduce((sum, [, pts]) => sum + pts, 0);
  const gsOwned = gearScore(g.owned) + gsExtra;
  const gsTarget = gearScore(g.target) + gsExtra;
  const gs = tgt ? gsTarget : gsOwned;
  const gsOn = Math.round((gsTarget ? Math.min(1, gsOwned / gsTarget) : 0) * 30);

  // Stats (pBuilder.statGroups): the character's final stats (charstats.ts) with the
  // owned gear, or with the target gear and what it changes. Titles, collections and
  // Daevanion are the active character's: none for someone else's build.
  const ownedStats = gearStats(g.owned);
  const targetStats = gearStats(g.target);
  const coll = useCollectionStats(settings, ro);
  const dvS = ro ? {} : dvStats(planClass(src.cls), dv);
  const ownedF = finalStats(src.cls, ownedStats, coll, dvS);
  const targetF = finalStats(src.cls, targetStats, coll, dvS);
  const shownF = tgt ? targetF : ownedF;
  const q = statQ.toLowerCase();
  const grouped = new Set(STAT_GROUPS.flatMap(([, ids]) => ids));
  const other = Object.keys(shownF).filter((id) => !grouped.has(id));
  const statGroups = [...STAT_GROUPS, ["other", other] as const]
    .map(([g, ids]) => ({
      g,
      rows: ids
        .filter((id) => (shownF[id] || ownedF[id]) && statName(id).toLowerCase().includes(q))
        .map((id) => {
          const v = statValue(id, shownF[id] ?? 0);
          const pct = statIsPct(id);
          // Same rounding as the value: whole numbers, percents to 2 decimals.
          const d = tgt ? Math.round((v - statValue(id, ownedF[id] ?? 0)) * (pct ? 100 : 1)) / (pct ? 100 : 1) : 0;
          return { name: statName(id), v: pct ? dec(v) + "%" : n(Math.round(v)), delta: d ? signed(d) + (pct ? "%" : "") : "", up: d > 0 };
        }),
    }))
    .filter((x) => x.rows.length);
  const statShown = sCat ? statGroups.filter((g) => g.g === sCat) : statGroups;

  // Every slot not covered by the owned gear: the target item not owned yet, or
  // an empty slot with no target (then there is no source to point to).
  // Source: the crafting recipe that makes the item (db recipes); no drop/shop tables yet, so blank otherwise.
  const recipes = useDb(["recipes"]);
  const missing = missingSlots(g).map((id) => {
    const [, label] = SLOTS.find((x) => x[0] === id)!;
    const want = itemById(g.target[id]?.id);
    const recipe = want && recipes?.find((r) => r.out?.[0] === want.id);
    return {
      id,
      label,
      have: itemById(g.owned[id]?.id)?.name ?? "—",
      want,
      col: want ? RARITY[rarityOf(want)] : "var(--pm-t3)",
      kind: recipe ? ("craft" as const) : undefined,
      src: recipe ? [term(recipe.cat), recipe.lv && `Lv ${recipe.lv}`].filter(Boolean).join(" · ") : "",
    };
  });
  const statDiff = [...new Set([...Object.keys(ownedF), ...Object.keys(targetF)])]
    .map((k) => [k, ownedF[k] ?? 0, targetF[k] ?? 0] as const)
    .filter(([, a, b]) => a !== b);
  const slotDiff = slots.filter(({ id }) => g.owned[id]?.id !== g.target[id]?.id || g.owned[id]?.enh !== g.target[id]?.enh);
  const pieceName = (p?: Piece) => (p && itemById(p.id) ? `${itemById(p.id)!.name}${p.enh ? ` +${p.enh}` : ""}` : "—");

  // Share: the gear on screen as text (links wait for the uploads, R2).
  const shareText = [
    `${title} — ${src.cls} · ${src.own ? name : src.au}`,
    ...slots.filter((x) => x.item).map((x) => `${x.label}: ${x.name}${x.enh ? " " + x.enh : ""}`),
    "PowerMeter",
  ].join("\n");

  // Widget: hand the build to the meter's Build mode (pmWidget.js reads it) and
  // show the meter. Every slot counts: owned = slots whose piece is in hand.
  const total = SLOTS.length;
  const widgetJson = JSON.stringify({
    key: gearKey,
    character: name,
    name: title,
    className: src.cls,
    gs: gsOwned,
    gsTarget,
    owned: total - missing.length,
    total,
    progress: (total - missing.length) / total,
    // [short label, rarity, enhancement, owned, target item when missing, icon URL]
    slots: SLOTS.map(([id, label]) => {
      const x = slots.find((y) => y.id === id)!;
      const mine = itemById(g.owned[id]?.id);
      const want = itemById(g.target[id]?.id);
      const shown = mine ?? want;
      return [x.short, rarityOf(shown), g.owned[id]?.enh ?? 0, !missing.some((m) => m.id === id), want?.name ?? label, shown ? iconUrl(shown.icon) : ""];
    }),
    missing: missing.map((m) => ({
      item: m.want?.name ?? `${m.label} · ${t("characters.builder.noTarget")}`,
      rarity: rarityOf(m.want),
      icon: m.want ? iconUrl(m.want.icon) : "",
      source: { kind: m.kind, text: m.src || "—" },
    })),
    stats: Object.entries(ownedStats)
      .slice(0, 6)
      .map(([k, a]) => [statName(k), statText(k, a), statText(k, targetStats[k] ?? 0)]),
  });
  // The meter shows whatever build was handed last: keep it current while this one is edited.
  useEffect(() => {
    try {
      if (JSON.parse(localStorage.getItem("pm.widgetBuild") ?? "null")?.key === gearKey) localStorage.setItem("pm.widgetBuild", widgetJson);
    } catch {
      // unreadable handover: the next Widget click rewrites it
    }
  }, [widgetJson, gearKey]);
  const toWidget = () => {
    localStorage.setItem("pm.widgetBuild", widgetJson);
    localStorage.setItem("pm.widgetMode", "build");
    run(() => invoke("show_overlay"));
  };

  const copySuffix = t("characters.builder.copySuffix");
  const clone = () => {
    // Only a build of the active character's class can become one of yours.
    if (src.cls !== myCls) return setNoClone(true);
    showToast({ title: t("characters.builder.clonedTitle"), text: t("characters.builder.clonedText") });
    const base = titleOf(src.t);
    const copy = (base.endsWith(copySuffix) ? base.slice(0, -copySuffix.length) : base) + copySuffix;
    storeGear(`${copy}|${src.cls}`, g);
    const mine = { t: copy, au: name, cls: src.cls, own: true, tags: src.tags };
    addMine(mine);
    setSrc(mine);
  };
  // A build handed to the meter and then created/renamed changes key: move the handover along,
  // or the effect above stops refreshing it and the meter keeps the pre-save snapshot.
  const rekeyWidget = (to: string) => {
    try {
      const w = JSON.parse(localStorage.getItem("pm.widgetBuild") ?? "null");
      if (w?.key === gearKey) localStorage.setItem("pm.widgetBuild", JSON.stringify({ ...w, key: to }));
    } catch {
      // unreadable handover: the next Widget click rewrites it
    }
  };
  const save = () => {
    if (badName) return;
    showToast(
      isNew
        ? { title: t("characters.builder.createdTitle"), text: t("characters.builder.createdText") }
        : { title: t("characters.builder.savedTitle"), text: t("characters.builder.savedText") },
    );
    if (isNew) {
      rekeyWidget(keyOf(typed, src.cls));
      storeGear(keyOf(typed, src.cls), newGear);
      const mine = { t: typed, au: name, cls: src.cls, own: true, tags: newTags };
      addMine(mine);
      setSrc(mine);
    } else if (isMine && typed !== src.t) {
      // Rename: same place in "Your builds", gear moved to the new title's key.
      const renamed = { ...src, t: typed };
      rekeyWidget(keyOf(typed, src.cls));
      const { [gearKey]: moved, ...rest } = stored;
      const all = moved ? { ...rest, [keyOf(typed, src.cls)]: moved } : rest;
      setStored(all);
      saveSetting(GEAR_KEY, JSON.stringify(all)).catch(onError);
      saveSetting(MY_BUILDS_KEY, JSON.stringify(myBuilds.map((x) => (x.t === src.t ? renamed : x)))).catch(onError);
      setSrc(renamed);
    }
  };
  /** Delete this build of yours (after the modal), with its gear, and go back to the list. */
  const remove = () => {
    closeBuild(src.t);
    const { [gearKey]: _gone, ...rest } = stored;
    setStored(rest);
    saveSetting(GEAR_KEY, JSON.stringify(rest)).catch(onError);
    saveSetting(MY_BUILDS_KEY, JSON.stringify(myBuilds.filter((x) => x.t !== src.t))).catch(onError);
    go("builds");
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

  /** A stat line from an item's [stat, min, max] pool: stat menu, value, Min / Max. `none` = the "no line" choice. */
  const lineRow = (key: string, label: string, line: Line | undefined, from: [string, number, number][], set: (l?: Line) => void, none?: string) => {
    const [stat, v] = line ?? ["", 0];
    const [, mn, mx] = from.find((x) => x[0] === stat) ?? ["", 0, 0];
    return (
      <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <label className="chField" style={{ flex: 1, minWidth: 0 }}>
          <ChartBarIcon aria-hidden="true" style={{ color: "var(--pm-t3)", flex: "none" }} />
          <select
            className="chFieldSelect"
            value={stat}
            aria-label={label}
            onChange={(e) => {
              const p = from.find((x) => x[0] === e.target.value);
              set(p ? [p[0], p[2]] : undefined);
            }}
          >
            {(none !== undefined || !line) && <option value="">{none ?? "—"}</option>}
            {from.map(([id, a, b]) => (
              <option key={id} value={id}>
                {statName(id)} {a === b ? statText(id, a) : `${statText(id, a)} – ${statText(id, b)}`}
              </option>
            ))}
          </select>
          <CaretDownIcon aria-hidden="true" style={{ color: "var(--pm-t3)", flex: "none", pointerEvents: "none" }} />
        </label>
        <span className="mono" style={{ width: 62, height: 30, display: "grid", placeItems: "center", borderRadius: 6, border: "1px solid var(--pm-line)", fontSize: 12, flex: "none" }}>
          {line ? statText(stat, v) : "—"}
        </span>
        <button type="button" className="chMinMax" disabled={!line} aria-pressed={!!line && v === mn} style={{ background: line && v === mn ? "var(--pm-s3)" : "transparent" }} onClick={() => set([stat, mn])}>
          Min
        </button>
        <button
          type="button"
          className="chMinMax"
          disabled={!line}
          aria-pressed={!!line && v === mx}
          style={{ background: line && v === mx ? "#3FBF7F" : "transparent", color: line && v === mx ? "#0A0909" : "var(--pm-t2)", fontWeight: 600 }}
          onClick={() => set([stat, mx])}
        >
          Max
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="chToolbar">
        {/* From "missing pieces", back to the build; from any build, to the list. */}
        <button type="button" className="btn sm" onClick={() => (mode === "missing" ? setMode("dummy") : go("builds"))}>
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
        <button type="button" className="btn sm" onClick={() => setCompare(true)}>
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
        <button type="button" className="btn sm" title={t("characters.builder.widgetHint")} onClick={toWidget}>
          <PictureInPictureIcon aria-hidden="true" />
          Widget
        </button>
        <button type="button" className="btn sm" onClick={() => setShare(true)}>
          <ShareNetworkIcon aria-hidden="true" />
          {t("characters.share.button")}
        </button>
        {!ro && (
          <button type="button" className="btn sm fill" style={{ padding: "0 12px" }} disabled={badName} onClick={save}>
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

      {mode === "missing" && (
        <div style={{ background: "var(--pm-s1)", border: "1px solid var(--pm-line)", borderRadius: 8, padding: "6px 12px", maxWidth: 1000 }}>
          <div style={{ padding: "8px 0", fontWeight: 500 }}>{t("characters.builder.missingN", { n: missing.length })}</div>
          {missing.map((m) => (
            <div key={m.id} style={{ display: "grid", gridTemplateColumns: "100px minmax(0,1fr) minmax(0,1fr) minmax(0,1.1fr) 100px", gap: 12, alignItems: "center", minHeight: 44, borderTop: "1px solid var(--pm-line)" }}>
              <span style={{ color: "var(--pm-t3)", fontSize: 12 }}>{m.label}</span>
              <span style={{ color: "var(--pm-t2)", fontSize: 12 }}>{m.have}</span>
              <span style={{ color: m.col }}>→ {m.want?.name ?? t("characters.builder.noTarget")}</span>
              <span style={{ fontSize: 12, color: "var(--pm-t2)" }}>{m.src}</span>
              {m.want ? (
                <button type="button" className="chBtnReset" style={{ fontSize: 12, color: "var(--pm-redt)" }} onClick={() => openItem(m.want!.name)}>
                  {t("characters.builder.goToSource")}
                </button>
              ) : (
                <button
                  type="button"
                  className="chBtnReset"
                  style={{ fontSize: 12, color: "var(--pm-redt)" }}
                  onClick={() => {
                    setMode("dummy");
                    setView("target");
                    setCur(m.id);
                  }}
                >
                  {t("characters.builder.setTarget")}
                </button>
              )}
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
                  {src.own ? name : t("characters.builder.by", { au: src.au })} · {src.cls}
                  {src.own && faction && (
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
                          setMode("dummy");
                          setCur("mh");
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{titleOf(mb.t)}</span>
                        {/* The build's first owned pieces, by rarity. */}
                        <span style={{ display: "flex", gap: 3 }}>
                          {Object.values(stored[keyOf(mb.t, mb.cls)]?.owned ?? {})
                            .slice(0, 5)
                            .map((p, i) => (
                              <span key={i} style={{ width: 16, height: 16, borderRadius: 3, overflow: "hidden", border: `1.5px solid ${RARITY[rarityOf(itemById(p.id))] ?? "var(--pm-grey)"}` }}>
                                <ItemIcon name={itemById(p.id)?.name ?? ""} />
                              </span>
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
                        setSrc({ t: "", au: name, cls: myCls, own: true, isNew: true });
                        setNewName("");
                        setNewTags([]);
                        setMode("dummy");
                        setView("owned");
                        setCur("mh");
                        setNewGear(EMPTY_GEAR);
                      }}
                    >
                      <PlusIcon aria-hidden="true" />
                      {t("characters.builder.newBuild")}
                    </button>
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }} />
              {/* Gear Score from the pieces' item levels; owned → target on the bar. No Combat Power: see gsNote. */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, width: 300 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span className="kicker">Gear Score</span>
                  <span className="mono" style={{ fontSize: 18 }}>
                    {n(gs)}{" "}
                    {tgt ? (
                      gsTarget !== gsOwned && <span style={{ fontSize: 12, color: gsTarget > gsOwned ? "#5FD99A" : "#FF6B6B" }}>{signed(gsTarget - gsOwned)}</span>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>/ {n(gsTarget)}</span>
                    )}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 2 }} aria-hidden="true">
                  {Array.from({ length: 30 }, (_, i) => (
                    <span key={i} style={{ flex: 1, height: 6, borderRadius: 1, background: i < gsOn ? "var(--pm-red)" : "var(--pm-s3)", transform: "skewX(-20deg)" }} />
                  ))}
                </div>
                <div style={{ fontSize: 10.5, lineHeight: 1.35, color: "var(--pm-t3)" }}>{t("characters.builder.gsNote")}</div>
              </div>
            </div>
            <div style={{ position: "relative", display: "flex", gap: 6, padding: "0 20px 14px", flexWrap: "wrap" }}>
              <Collections t={t} lang={lang} settings={settings} save={saveSetting} onError={onError} readOnly={ro} />
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
                          {x.target && (
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
                  const label = t(`characters.builder.tab.${id}`, { n: 0 });
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
                        <button type="button" className="chBtnReset chItemBtn" aria-expanded={itemOpen}
                          onClick={() => {
                            setItemOpen(!itemOpen);
                            setItemQ("");
                          }}
                        >
                          <span style={{ width: 30, height: 30, borderRadius: 5, border: `1.5px solid ${sel.col}`, background: "var(--pm-s3)", flex: "none" }}>
                            <ItemIcon name={sel.name} />
                          </span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: "block", color: sel.col, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sel.name}</span>
                            <span style={{ display: "block", fontSize: 10, color: "var(--pm-t3)" }}>
                              {sel.rar}
                              {s.item?.lv ? ` · Lv ${s.item.lv}` : ""}
                            </span>
                          </span>
                          <CaretDownIcon aria-hidden="true" style={{ color: "var(--pm-t3)" }} />
                        </button>
                        <button type="button" className="chItemSide" title={t("characters.builder.remove")} aria-label={t("characters.builder.remove")} disabled={!piece} onClick={() => setPiece()}>
                          <XIcon aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="chItemSide"
                          title={t("characters.builder.openDb")}
                          aria-label={t("characters.builder.openDb")}
                          onClick={() => (s.item ? openItem(s.item.name) : go("database"))}
                        >
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
                            {/* ponytail: first PICK_MAX matches, the search narrows the rest; virtualize if a slot ever needs scrolling thousands. */}
                            <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
                              {choices.slice(0, PICK_MAX).map((i) => {
                                const col = RARITY[rarityOf(i)];
                                return (
                                  <button
                                    key={i.id}
                                    type="button"
                                    className="chBtnReset chPickRow"
                                    aria-current={i.id === piece?.id || undefined}
                                    onClick={() => {
                                      // A new item: its own soul imprint pool and sockets; the enhancement level carries over.
                                      setPiece(newPiece(i.id, piece?.enh ?? g.owned[cur]?.enh ?? 0));
                                      setItemOpen(false);
                                      setItemQ("");
                                    }}
                                  >
                                    <span style={{ width: 24, height: 24, borderRadius: 4, border: `1.5px solid ${col}`, flex: "none" }}>
                                      <ItemIcon name={i.name} />
                                    </span>
                                    <span style={{ flex: 1, color: col }}>{i.name}</span>
                                    <span className="mono" style={{ fontSize: 11, color: "var(--pm-t3)" }}>
                                      {rarityOf(i)}
                                      {i.lv ? ` · Lv ${i.lv}` : ""}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--pm-t3)", padding: "4px 8px" }}>
                              {choices.length === 0
                                ? t("characters.builder.noItems")
                                : choices.length > PICK_MAX
                                  ? t("characters.builder.moreItems", { n: n(choices.length - PICK_MAX) })
                                  : t("characters.builder.itemsN", { n: choices.length })}
                            </div>
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
                      <input
                        type="range"
                        className="chRange"
                        min={0}
                        max={lvMax}
                        value={lvNow}
                        disabled={!piece}
                        aria-label={t("characters.builder.enhancement")}
                        onChange={(e) => piece && setPiece({ ...piece, enh: Number(e.target.value) })}
                        style={{ "--p": `${(lvNow / lvMax) * 100}%`, "--c": "#F0A63A" } as CSSProperties}
                      />
                      <div className="chScale" aria-hidden="true">
                        {Array.from({ length: lvMax + 1 }, (_, i) => (
                          <button
                            key={i}
                            type="button"
                            tabIndex={-1}
                            disabled={!piece}
                            onClick={() => piece && setPiece({ ...piece, enh: i })}
                            style={{ color: i === lvNow ? "var(--pm-t1)" : i < lvNow ? "var(--pm-t2)" : "var(--pm-t3)", fontWeight: i === lvNow ? 600 : 400 }}
                          >
                            {i}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={LABEL}>{t("characters.builder.mainStats")}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 12px", fontSize: 12 }}>
                        {mainStats.map(([id, v]) => (
                          <div key={id} style={{ display: "contents" }}>
                            <span style={{ color: "var(--pm-t2)" }}>{statName(id)}</span>
                            <span className="mono">{statText(id, v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {piece && pool.pick > 0 && (
                      <div>
                        <div style={LABEL}>{t("characters.builder.subStats", { n: pool.pick })}</div>
                        {Array.from({ length: pool.pick }, (_, k) => {
                          const line = piece.subs[k] && pool.pool.some(([id]) => id === piece.subs[k][0]) ? piece.subs[k] : undefined;
                          return lineRow(`sub${k}`, t("characters.builder.subStat", { n: k + 1 }), line, pool.pool, (l) => {
                            const subs = Array.from({ length: pool.pick }, (_, j) => (j === k ? l : piece.subs[j]));
                            setPiece({ ...piece, subs: subs.filter((x): x is Line => !!x) });
                          });
                        })}
                      </div>
                    )}
                    {piece && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        {!sock.ph && !sock.gs && !sock.ms && <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--pm-t3)" }}>{t("characters.builder.noSockets")}</div>}
                        {sock.ph && (
                          <div style={{ gridColumn: "1 / -1" }}>
                            <div style={LABEL} title={t("characters.builder.philosopherHint")}>
                              Philosopher's Stone
                            </div>
                            {lineRow("ph", "Philosopher's Stone", piece.ph, pool.pool, (l) => setPiece({ ...piece, ph: l }), t("characters.builder.notFused"))}
                          </div>
                        )}
                        {sock.gs > 0 && (
                          <div style={{ minWidth: 0 }}>
                            <div style={LABEL} title={t("characters.builder.theostoneHint")}>
                              Theostone
                            </div>
                            <label className="chField" style={{ color: piece.gs ? RARITY[rarityOf(itemById(piece.gs))] : "var(--pm-t2)" }}>
                              <select className="chFieldSelect" value={piece.gs ?? ""} aria-label="Theostone" onChange={(e) => setPiece({ ...piece, gs: e.target.value || undefined })}>
                                <option value="">{t("characters.builder.none")}</option>
                                {THEOSTONES.map((i) => (
                                  <option key={i.id} value={i.id}>
                                    {i.name.replace(/^Theostone: /, "")} · {rarityOf(i)}
                                  </option>
                                ))}
                              </select>
                              <CaretDownIcon aria-hidden="true" style={{ color: "var(--pm-t3)", flex: "none", pointerEvents: "none" }} />
                            </label>
                          </div>
                        )}
                        {sock.ms > 0 && (
                          <div style={{ minWidth: 0 }}>
                            <div style={LABEL}>
                              Magicstone ({(piece.ms ?? []).filter(Boolean).length}/{sock.ms})
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              {Array.from({ length: sock.ms }, (_, k) => {
                                const x = piece.ms?.[k] ?? null;
                                const grade = x && msOpts.find(([st, v]) => st === x[0] && v === x[1])?.[2];
                                return (
                                  <label
                                    key={k}
                                    className="chField"
                                    style={x ? { color: RARITY[rarityOf(grade ? { grade } : undefined)] } : { background: "transparent", border: "1px dashed var(--pm-line)", color: "var(--pm-t3)" }}
                                  >
                                    <select
                                      className="chFieldSelect"
                                      value={x ? `${x[0]}:${x[1]}` : ""}
                                      aria-label={`Magicstone ${k + 1}`}
                                      onChange={(e) => {
                                        const [st, v] = e.target.value.split(":");
                                        const ms = Array.from({ length: sock.ms }, (_, j): Line | null => (j === k ? (st ? [st, Number(v)] : null) : (piece.ms?.[j] ?? null)));
                                        setPiece({ ...piece, ms });
                                      }}
                                    >
                                      <option value="">{t("characters.builder.emptySocket")}</option>
                                      {msGroups.map(([label, opts]) => (
                                        <optgroup key={label} label={label}>
                                          {opts.map(([st, v, gr]) => (
                                            <option key={st + v} value={`${st}:${v}`}>
                                              {label} +{statText(st, v)} · {rarityOf({ grade: gr })}
                                            </option>
                                          ))}
                                        </optgroup>
                                      ))}
                                    </select>
                                    <CaretDownIcon aria-hidden="true" style={{ flex: "none", pointerEvents: "none" }} />
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
                    {/* Comments need the server (shared builds): visible empty state until then. */}
                    <div style={{ padding: "24px 0", color: "var(--pm-t2)", fontSize: 13 }}>
                      <div style={{ fontSize: 14, color: "var(--pm-t1)", marginBottom: 4 }}>{t("characters.builder.commentsEmptyTitle")}</div>
                      {t("characters.builder.commentsEmptyText")}
                    </div>
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
                      <span className="mono" style={{ textAlign: "right", fontSize: 10, color: r.up ? "#5FD99A" : "#FF6B6B" }}>
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
      {compare && (
        <Modal
          width={620}
          onClose={() => setCompare(false)}
          title={(id) => (
            <div style={{ display: "flex", alignItems: "center" }}>
              <h2 id={id} style={{ fontSize: 17, fontWeight: 500, flex: 1 }}>
                {t("characters.builder.compareTitle")}
              </h2>
              <button type="button" className="shareClose" onClick={() => setCompare(false)} title={t("window.close")} aria-label={t("window.close")}>
                <XIcon aria-hidden="true" />
              </button>
            </div>
          )}
        >
          {slotDiff.length === 0 && statDiff.length === 0 && <div style={{ color: "var(--pm-t2)" }}>{t("characters.builder.compareSame")}</div>}
          {slotDiff.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "90px minmax(0,1fr) minmax(0,1fr)", gap: "6px 12px", fontSize: 12, maxHeight: 260, overflowY: "auto" }}>
              <span className="kicker">{t("characters.builder.compareSlots")}</span>
              <span className="kicker">{t("characters.builder.owned")}</span>
              <span className="kicker">{t("characters.builder.target")}</span>
              {slotDiff.map((x) => (
                <div key={x.id} style={{ display: "contents" }}>
                  <span style={{ color: "var(--pm-t3)" }}>{x.label}</span>
                  <span style={{ color: "var(--pm-t2)" }}>{pieceName(g.owned[x.id])}</span>
                  <span style={{ color: RARITY[rarityOf(itemById(g.target[x.id]?.id))] ?? "var(--pm-t2)" }}>{pieceName(g.target[x.id])}</span>
                </div>
              ))}
            </div>
          )}
          {statDiff.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 90px 90px 70px", gap: "4px 12px", fontSize: 12, maxHeight: 300, overflowY: "auto" }}>
              <span className="kicker">{t("characters.builder.compareStats")}</span>
              <span className="kicker" style={{ textAlign: "right" }}>{t("characters.builder.owned")}</span>
              <span className="kicker" style={{ textAlign: "right" }}>{t("characters.builder.target")}</span>
              <span className="kicker" style={{ textAlign: "right" }}>Δ</span>
              {statDiff.map(([k, a, b]) => (
                <div key={k} style={{ display: "contents" }}>
                  <span style={{ color: "var(--pm-t2)" }}>{statName(k)}</span>
                  <span className="mono" style={{ textAlign: "right" }}>{statText(k, a)}</span>
                  <span className="mono" style={{ textAlign: "right" }}>{statText(k, b)}</span>
                  <span className="mono" style={{ textAlign: "right", color: b > a ? "#5FD99A" : "#FF6B6B" }}>
                    {signed(statValue(k, b - a))}
                    {statIsPct(k) ? "%" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
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
