import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  CheckCircleIcon,
  CheckIcon,
  CopyIcon,
  DiscordLogoIcon,
  RedditLogoIcon,
  XIcon,
  XLogoIcon,
} from "@phosphor-icons/react";
import type { T } from "../../i18n";
import type { Ago } from "../../sample/characters";
import "./characters.css";

// Page state that survives switching page, like the prototype's single state
// object: the shell unmounts a page when you leave it.
// ponytail: module memory, lost on reload; persist via settings if users ask.
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
export type BuildSrc = { t: string; au: string; cls: string; own: boolean; isNew?: boolean; likes?: number };
/** Open a build in the builder, resetting the view like the prototype. */
export function openBuild(src: BuildSrc, go: (page: string) => void) {
  Object.assign(mem, { bSrc: src, bmode: "dummy", slot: "mh" });
  if (src.isNew) Object.assign(mem, { bview: "owned", itemOv: {} });
  go("builder");
}

/** "2 ore fa"; minutes and weeks use the short form like the prototype. */
export function ago(lang: string, [n, unit]: Ago) {
  const style = unit === "minute" || unit === "week" ? "short" : "long";
  return new Intl.RelativeTimeFormat(lang, { numeric: "always", style }).format(-n, unit);
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

const SHARE_URL = "powermeter.letrionlabs.it/e/9Uiga7pj";
const VISIBILITY = ["public", "unlisted", "private"] as const;

/**
 * Share modal (prototype md.share). The prototype uses the log version for
 * builds too, texts included; the report page has its own copy of this modal.
 */
export function ShareModal({ t, onClose, onError }: { t: T; onClose: () => void; onError: (e: unknown) => void }) {
  const [copied, setCopied] = useState(false);
  const [vis, setVis] = useState<(typeof VISIBILITY)[number]>("unlisted");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const copy = () => navigator.clipboard.writeText(`https://${SHARE_URL}`).then(() => setCopied(true), onError);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal chShare" role="dialog" aria-modal="true" aria-labelledby="chShareTitle" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <h2 id="chShareTitle" style={{ fontSize: 17, fontWeight: 500, flex: 1 }}>
            {t("characters.share.title")}
          </h2>
          <button type="button" className="chShareClose" onClick={onClose} aria-label={t("window.close")}>
            <XIcon aria-hidden="true" />
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="chShareUrl mono">{SHARE_URL}</div>
          {copied ? (
            <button type="button" className="btn lg chCopied" aria-live="polite">
              <CheckIcon aria-hidden="true" />
              {t("characters.share.copied")}
            </button>
          ) : (
            <button type="button" className="btn lg fill" onClick={copy}>
              <CopyIcon aria-hidden="true" />
              {t("characters.share.copy")}
            </button>
          )}
        </div>
        <div role="radiogroup" aria-labelledby="chShareVis" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div id="chShareVis" style={{ fontSize: 11, color: "var(--pm-t3)" }}>
            {t("characters.share.visibility")}
          </div>
          {VISIBILITY.map((v) => (
            <button key={v} type="button" role="radio" aria-checked={v === vis} className="chVisOpt" onClick={() => setVis(v)}>
              <span className="chRadio">
                <span />
              </span>
              <span style={{ flex: 1 }}>{t(`characters.share.${v}`)}</span>
              <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t(`characters.share.${v}Hint`)}</span>
            </button>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--pm-t3)", marginBottom: 6 }}>{t("characters.share.discordPreview")}</div>
          <div className="chDiscord">
            <div style={{ flex: 1, minWidth: 0, fontFamily: "Inter,sans-serif" }}>
              <div style={{ fontSize: 11, color: "#B5BAC1" }}>PowerMeter</div>
              <div style={{ fontSize: 14, color: "#00A8FC", fontWeight: 600, margin: "2px 0" }}>
                Vorathis the Ashbound · {t("characters.share.killIn", { d: "5:12" })}
              </div>
              <div style={{ fontSize: 12, color: "#DBDEE1" }}>
                1. Kaelthas (Sorcerer) 18.420 · 2. Nyxara (Assassin) 17.950 · 3. Vharok (Gladiator) 14.310
              </div>
              <div className="chOgImage">{t("characters.share.ogImage")}</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn">
            <DiscordLogoIcon aria-hidden="true" />
            Discord
          </button>
          <button type="button" className="btn">
            <RedditLogoIcon aria-hidden="true" />
            Reddit
          </button>
          <button type="button" className="btn">
            <XLogoIcon aria-hidden="true" />X
          </button>
        </div>
      </div>
    </div>
  );
}
