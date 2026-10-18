import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { CheckCircleIcon, TrashIcon } from "@phosphor-icons/react";
import type { T } from "../../i18n";
import { Modal } from "../system/Modal";
import { PET_EXP_MAX, type PetEffect, type PetSet, type PetState } from "./calc";
import "./characters.css";

// Page state that survives switching page, like the prototype's single state
// object: the shell unmounts a page when you leave it.
// ponytail: module memory, lost on reload; persist via settings if users ask
// (done for your builds, pm.myBuilds).
const mem: Record<string, unknown> = {};
export function useMem<V>(key: string, init: V) {
  const [value, setValue] = useState<V>(() => (key in mem ? (mem[key] as V) : init));
  const set = (next: V) => {
    mem[key] = next;
    setValue(next);
  };
  return [value, set] as const;
}
/** Write page state from outside the page (the packet capture); the page reads it when it mounts. */
export function setMem(key: string, value: unknown) {
  mem[key] = value;
}

/** The build the Character Builder shows (prototype bSrc). */
/** `char`: id of the character whose card opened it; the build then stays on that character instead of following the active one. */
export type BuildSrc = { t: string; au: string; cls: string; own: boolean; isNew?: boolean; tags?: string[]; char?: string };
/** Title of a character's default own build; shown as characters.builder.defaultBuild. */
export const OWN_BUILD = "pm.default";
/** Build filters: regions and tags (tags are game/community terms, not translated). */
export const BUILD_REGIONS = ["EU", "NA"];
export const BUILD_TAGS = ["PvE", "PvP", "Arena", "Dungeon", "Siege", "Large-Scale", "Beginner Friendly", "Budget Build", "Endgame Build", "Tank", "DPS", "Healer", "Support"];
/** Builds created or cloned in the Character Builder, newest first: settings["pm.myBuilds"] = BuildSrc[]. */
export const MY_BUILDS_KEY = "pm.myBuilds";
export function readMyBuilds(json?: string): BuildSrc[] {
  try {
    const v = JSON.parse(json ?? "");
    return Array.isArray(v) ? v : [];
  } catch {
    return []; // missing or hand-edited: no builds of your own yet
  }
}
/**
 * Level and gear sets of each build, by title: settings["pm.buildData"]. A set: slot → archive item id + enhancement level.
 * `gear`: what the character wears (the packet capture will write the worn equipment here, once it exists).
 * `want`: the target set, filled by hand; missing until first edited, and then it starts from `gear`.
 */
export const BUILD_DATA_KEY = "pm.buildData";
/**
 * Item per slot. From the game only (CaptureSync): `lvl` the item level it shows, `bonus` its bonus stats and `stones`
 * its manastones (stat key, or "#id" for a stat id not identified yet; raw value / tier 1-3).
 */
export type GearSet = Record<string, { id: string; enh: number; lvl?: number; bonus?: [stat: string, raw: number][]; stones?: [stat: string, tier: number][] }>;
/** Equipment worn in game, per roster character (CaptureSync): settings["pm.capturedGear"] = { [charId]: GearSet of game item ids }. */
export const CAPTURED_GEAR_KEY = "pm.capturedGear";
export function readCapturedGear(json?: string): Record<string, GearSet> {
  try {
    const v = JSON.parse(json ?? "");
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    // Up to 0.4.6 a slot held the bare item id, without the enhancement.
    return Object.fromEntries(
      Object.entries(v as Record<string, Record<string, string | GearSet[string]>>).map(([c, g]) => [
        c,
        Object.fromEntries(Object.entries(g).map(([s, x]) => [s, typeof x === "string" ? { id: x, enh: 0 } : x])),
      ]),
    );
  } catch {
    return {}; // missing or hand-edited
  }
}
/**
 * Skill bar of the game, per roster character (CaptureSync): settings["pm.capturedBar"] = { [charId]: { "set,row,column": skill id } },
 * set 1-3 of the game's bar window, row 0 (the keys' row) to 3, columns as in BAR_SLOTS.
 */
export const CAPTURED_BAR_KEY = "pm.capturedBar";
/** Game bar slot of each column of the game's bar window, left to right (equip_parser.rs); slot 0 has row 0 only. */
export const BAR_SLOTS = [2, 3, 4, 5, 20, 21, 22, 23, 6, 7, 0, 1];
export function readCapturedBar(json?: string): Record<string, Record<string, string>> {
  try {
    const v = JSON.parse(json ?? "");
    // Up to 0.4.8 a character held a bare list (bar 1, row 0): left out until the game sends the bar again.
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    return Object.fromEntries(Object.entries(v as Record<string, Record<string, string>>).filter(([, g]) => g && typeof g === "object" && !Array.isArray(g)));
  } catch {
    return {}; // missing or hand-edited
  }
}
/** Daevanion nodes taken in game, per roster character (CaptureSync): settings["pm.capturedDaev"] = { [charId]: node numbers }. */
export const CAPTURED_DAEV_KEY = "pm.capturedDaev";
export function readCapturedDaev(json?: string): Record<string, number[]> {
  try {
    const v = JSON.parse(json ?? "");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {}; // missing or hand-edited
  }
}
/** Pets marked by hand, per roster character: settings["pm.pets"] = { [charId]: { owned: { [creature code]: PetState } } }. */
export const PETS_KEY = "pm.pets";
/**
 * Pets read from the game (CaptureSync), per roster character: settings["pm.capturedPets"] = { [charId]: { owned,
 * effects } }, owned as in pm.pets, effects the Pet window's list (PetEffect). They win over pm.pets (ownedPets).
 */
export const CAPTURED_PETS_KEY = "pm.capturedPets";
export type PetsOf = { owned: PetSet; effects: PetEffect[] };
/** Reads either key; anything malformed is dropped (missing or hand-edited). */
export function readPets(json?: string): Record<string, PetsOf> {
  let v: unknown;
  try {
    v = JSON.parse(json ?? "");
  } catch {
    return {};
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, PetsOf> = {};
  for (const [c, x] of Object.entries(v as Record<string, { owned?: unknown; effects?: unknown }>)) {
    const owned: PetSet = {};
    for (const [code, p] of Object.entries(x?.owned && typeof x.owned === "object" ? (x.owned as Record<string, Partial<PetState>>) : {})) {
      if (p?.lvl !== 1 && p?.lvl !== 2 && p?.lvl !== 3) continue;
      const exp = p.lvl === 3 ? 0 : Math.min(PET_EXP_MAX, Math.max(0, Math.round(Number(p.exp) || 0)));
      owned[code] = p.eq ? { lvl: p.lvl, exp, eq: true } : { lvl: p.lvl, exp };
    }
    const effects = (Array.isArray(x?.effects) ? (x.effects as unknown[]) : []).filter(
      (e): e is PetEffect => Array.isArray(e) && typeof e[0] === "string" && typeof e[1] === "number" && Number.isFinite(e[1]),
    ).map(([k, n, p]) => [k, n, !!p] as PetEffect);
    out[c] = { owned, effects };
  }
  return out;
}
export type BuildData = { lvl?: number; gear?: GearSet; want?: GearSet };
export function readBuildData(json?: string): Record<string, BuildData> {
  try {
    const v = JSON.parse(json ?? "");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {}; // missing or hand-edited
  }
}
/** A deleted build open in the builder: the builder reopens on its default build. */
export function closeBuild(title: string) {
  if ((mem.bSrc as BuildSrc | undefined)?.t === title) delete mem.bSrc;
}
/** Open a build in the builder, resetting the view like the prototype. */
export function openBuild(src: BuildSrc, go: (page: string) => void) {
  mem.bSrc = src;
  delete mem.bFor; // opened now: a character switch seen before must not move off it (builder.tsx)
  if (src.isNew) Object.assign(mem, { newName: "", newTags: [] });
  go("builder");
}

/** "Oggi" / "Ieri" / "3 giorni fa". */
export function daysAgo(lang: string, days: number) {
  const s = new Intl.RelativeTimeFormat(lang, { numeric: "auto" }).format(-days, "day");
  return s[0].toUpperCase() + s.slice(1);
}

/** Small uppercase heading with the red dash before it. */
export function SectionHead({ title, children, style }: { title: string; children?: ReactNode; style?: CSSProperties }) {
  return (
    <div className="chSectionHead" style={style}>
      <span className="chDash" />
      <h2 className="kicker">{title}</h2>
      {children}
    </div>
  );
}

/** Red outline for destructive buttons ("Elimina"): no such variant in the prototype's .btn. */
export const DANGER: CSSProperties = { color: "var(--pm-err)", borderColor: "var(--pm-err)" }; // red in every theme

/** "Delete this build?" with Cancel / Delete: an in-app modal, not window.confirm. */
export function DeleteBuildModal({ t, build, onDelete, onClose }: { t: T; build: string; onDelete: () => void; onClose: () => void }) {
  return (
    <Modal width={420} onClose={onClose} title={(id) => <h2 id={id} style={{ fontSize: 17, fontWeight: 500 }}>{t("characters.builds.deleteTitle")}</h2>}>
      <div style={{ color: "var(--pm-t2)" }}>{t("characters.builds.deleteConfirm", { build })}</div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button type="button" className="btn" autoFocus onClick={onClose}>
          {t("roster.cancel")}
        </button>
        <button type="button" className="btn fill" onClick={onDelete}>
          <TrashIcon aria-hidden="true" />
          {t("characters.delete")}
        </button>
      </div>
    </Modal>
  );
}

/** Saved/cloned confirmation, bottom right, gone after 2.6 s (prototype bSaved). */
export function useToast() {
  const [toast, setToast] = useState<{ title: string; text: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);
  const node = toast && (
    <div className="chToast" role="status">
      <CheckCircleIcon aria-hidden="true" />
      <div>
        <div style={{ fontWeight: 500 }}>{toast.title}</div>
        <div style={{ fontSize: 12, color: "var(--pm-t2)" }}>{toast.text}</div>
      </div>
    </div>
  );
  return [node, setToast] as const;
}
