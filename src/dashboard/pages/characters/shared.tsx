import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { CheckCircleIcon, TrashIcon } from "@phosphor-icons/react";
import type { T } from "../../i18n";
import { Modal } from "../system/Modal";
import "./characters.css";

// Page state that survives switching page, like the prototype's single state
// object: the shell unmounts a page when you leave it.
// ponytail: module memory, lost on reload; persist via settings if users ask
// (done for the builder's gear, pm.builderGear, and your builds, pm.myBuilds).
const mem: Record<string, unknown> = {};
export function useMem<V>(key: string, init: V) {
  const [value, setValue] = useState<V>(() => (key in mem ? (mem[key] as V) : init));
  const set = (next: V) => {
    mem[key] = next;
    setValue(next);
  };
  return [value, set] as const;
}

/** The build the Character Builder shows (prototype bSrc). */
export type BuildSrc = { t: string; au: string; cls: string; own: boolean; isNew?: boolean; likes?: number; tags?: string[] };
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
/** A deleted build open in the builder: the builder reopens on its default build. */
export function closeBuild(title: string) {
  if ((mem.bSrc as BuildSrc | undefined)?.t === title) delete mem.bSrc;
}
/** Open a build in the builder, resetting the view like the prototype. */
export function openBuild(src: BuildSrc, go: (page: string) => void) {
  Object.assign(mem, { bSrc: src, bmode: "dummy", slot: "mh" });
  if (src.isNew) Object.assign(mem, { bview: "owned", newGear: { owned: {}, target: {} }, newName: "", newTags: [] });
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
export const DANGER: CSSProperties = { color: "var(--pm-redt)", borderColor: "var(--pm-red)" };

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
