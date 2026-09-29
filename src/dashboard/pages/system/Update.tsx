import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { animate, cubicBezier, stagger } from "animejs";
import { ArrowsClockwiseIcon, DownloadSimpleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import type { T } from "../../i18n";
import { Modal } from "./Modal";
import "./system.css";

/** latest.json (version, msiUrl) plus what the modal shows when known. */
export type UpdateInfo = {
  version: string;
  msiUrl: string;
  /** ISO date, e.g. "2026-09-25". */
  date?: string;
  sizeMb?: number;
  notes?: string[];
  /** Same notes per UI language (changelog/<lang>.md); `notes` is the English fallback. */
  notesI18n?: Record<string, string[]>;
};

const BTN = { height: 34, padding: "0 14px" };
const RELEASES_URL = "https://github.com/Nazariodeletteriis/PowerMeter/releases/latest";
// Motion: strong ease-out for entrances and the progress chase (animate skill tokens).
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
const PROGRESS_MS = 420; // each progress event retargets the bar and counter over this
const PHASE_MS = 240;

type Phase = "notes" | "download" | "install" | "error";

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Release notes grouped by their leading label ("New: …", "Nouveau : …", "新機能：…"),
 * in the order the labels first appear. The label is already translated in
 * changelog/<lang>.md, so it doubles as the section title with no lookup table.
 * A second separator close to the start marks a feature name ("Gear Viewer: …").
 * Notes without a label go in an untitled group.
 */
type Note = { name?: string; text: string };
const LABEL = /^([^:：]{1,24}?)\s*[:：]\s*(.+)$/s;
const NAME = /^[^:：]{1,50}?\s*[:：]\s*(.+)$/s;

function groupNotes(notes: string[]) {
  const groups = new Map<string, Note[]>();
  for (const n of notes) {
    const [, label = "", rest = n] = n.match(LABEL) ?? [];
    const text = rest.match(NAME)?.[1] ?? rest;
    // The name keeps its own separator and spacing ("Armurerie : ", "装備ビューア：").
    const name = text === rest ? undefined : rest.slice(0, -text.length);
    groups.set(label, [...(groups.get(label) ?? []), { name, text }]);
  }
  return [...groups];
}

/**
 * What is happening, at a glance. Downloading: the designer's Lottie arrow
 * (download.lottie.json, trimmed from docs/design/download.json), looping; the
 * Phosphor arrow stands in until the player chunk has loaded. Installing:
 * arrows turning (anime.js), faded in. Reduced motion: still frames.
 */
function UpdateGlyph({ phase }: { phase: "download" | "install" }) {
  const lottieBox = useRef<HTMLSpanElement>(null);
  const icon = useRef<HTMLSpanElement>(null);
  const [lottieOn, setLottieOn] = useState(false);

  useEffect(() => {
    if (phase !== "download") return;
    let stop = () => {};
    let cancelled = false;
    // Lazy: the SVG-only player (~45 KB gz) loads when a download starts, not at app start.
    Promise.all([import("lottie-web/build/player/lottie_light"), import("./download.lottie.json")])
      .then(([{ default: lottie }, { default: data }]) => {
        if (cancelled || !lottieBox.current) return;
        const reduce = reducedMotion();
        const anim = lottie.loadAnimation({
          container: lottieBox.current,
          renderer: "svg",
          loop: true,
          autoplay: !reduce,
          animationData: structuredClone(data), // the player mutates its input
        });
        if (reduce) anim.goToAndStop(0, true);
        stop = () => anim.destroy();
        setLottieOn(true);
      })
      .catch(() => {}); // keep the Phosphor arrow
    return () => {
      cancelled = true;
      stop();
      setLottieOn(false);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "install" || !icon.current) return;
    const reduce = reducedMotion();
    const fade = animate(icon.current, { opacity: [0, 1], duration: 200, ease: EASE_OUT });
    const spin = reduce ? undefined : animate(icon.current, { rotate: [0, 360], duration: 1600, ease: "linear", loop: true });
    return () => {
      fade.revert();
      spin?.revert();
    };
  }, [phase]);

  return (
    <span className="updGlyph">
      <span ref={lottieBox} className="updLottie" hidden={phase !== "download" || !lottieOn} />
      {!(phase === "download" && lottieOn) && (
        <span ref={icon} style={{ display: "grid" }}>
          {phase === "download" ? <DownloadSimpleIcon aria-hidden="true" /> : <ArrowsClockwiseIcon aria-hidden="true" />}
        </span>
      )}
    </span>
  );
}

/**
 * Prototype md.update, opened from the update banner's "Note di rilascio".
 * "Aggiorna ora" switches the modal in place to download → install (or error):
 * install_update streams `download-progress` (0-100, only when the size is
 * known), starts msiexec and the app exits by itself.
 */
export function UpdateModal({
  t,
  lang,
  update,
  onClose,
}: {
  t: T;
  lang: string;
  update: UpdateInfo;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("notes");
  const notes = update.notesI18n?.[lang] ?? update.notes;
  const [pct, setPct] = useState<number | null>(null); // null: no progress events (yet)
  const [error, setError] = useState("");
  const busy = phase === "download" || phase === "install";

  const panel = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const sweep = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const shown = useRef({ pct: 0 }); // what the bar and counter currently display

  const install = async () => {
    setPct(null);
    setError("");
    setPhase("download");
    shown.current.pct = 0;
    let unlisten = () => {};
    try {
      // Listen before starting so the first events aren't missed.
      unlisten = await listen<number>("download-progress", (e) => setPct(e.payload));
      await invoke("install_update", { msiUrl: update.msiUrl });
      setPct(100);
      setPhase("install"); // msiexec is running; the app closes by itself
    } catch (e) {
      setError(String(e));
      setPhase("error");
    } finally {
      unlisten();
    }
  };

  // Phase change: the new content rises in (opacity only when motion is reduced).
  // Layout effect so the first frame isn't painted before the tween hides it.
  useLayoutEffect(() => {
    if (phase === "notes" || !panel.current) return;
    const reduce = reducedMotion();
    const a = animate(panel.current.children, {
      opacity: [0, 1],
      ...(reduce ? {} : { translateY: [6, 0] }),
      duration: reduce ? 150 : PHASE_MS,
      delay: reduce ? 0 : stagger(40),
      ease: EASE_OUT,
    });
    return () => void a.revert();
  }, [phase]);

  // Progress: bar (scaleX) and counter chase the latest percentage.
  useEffect(() => {
    if (pct === null || !fill.current || !counter.current) return;
    const bar = fill.current;
    const num = counter.current;
    const show = () => (num.textContent = `${Math.round(shown.current.pct)}%`);
    if (reducedMotion()) {
      bar.style.transform = `scaleX(${pct / 100})`;
      shown.current.pct = pct;
      show();
      return;
    }
    const barTween = animate(bar, { scaleX: pct / 100, duration: PROGRESS_MS, ease: EASE_OUT });
    const numTween = animate(shown.current, { pct, duration: PROGRESS_MS, ease: EASE_OUT, onUpdate: show });
    return () => {
      barTween.pause();
      numTween.pause();
    };
  }, [pct, phase]);

  // Size unknown: a segment sweeps the track until the first event (or the end).
  useEffect(() => {
    if (pct !== null || phase !== "download" || !sweep.current || reducedMotion()) return;
    const a = animate(sweep.current, { translateX: ["-100%", "340%"], duration: 1300, ease: "linear", loop: true });
    return () => void a.revert();
  }, [pct, phase]);

  const mb = (n: number) => n.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const meta = [
    update.date &&
      t("organizer.update.released", {
        date: new Date(update.date).toLocaleDateString(lang, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
      }),
    update.sizeMb && `${mb(update.sizeMb)} MB`,
  ].filter(Boolean);

  return (
    <Modal
      width={520}
      // Nothing to go back to while the installer is being fetched or started.
      onClose={busy ? () => {} : onClose}
      title={(id) => (
        <div className="updHeader">
          {phase === "notes" && <span className="updBadge">{t("organizer.update.badge")}</span>}
          <h2 id={id} style={{ fontSize: 17, fontWeight: 500 }}>
            PowerMeter {update.version}
          </h2>
          {phase === "notes" && meta.length > 0 && <div className="updMeta">{meta.join(" · ")}</div>}
        </div>
      )}
    >
      {phase === "notes" ? (
        <>
          {notes && notes.length > 0 && (
            // Focusable so the notes can be scrolled from the keyboard.
            <div className="updNotes" tabIndex={0}>
              {groupNotes(notes).map(([label, items]) => (
                <section key={label}>
                  {label && (
                    <h3>
                      {label} <span className="mono">{items.length}</span>
                    </h3>
                  )}
                  <ul>
                    {items.map((n, i) => (
                      <li key={i}>
                        {n.name && <strong>{n.name}</strong>}
                        {n.text}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
          <div className="updFoot">
            <button type="button" className="btn" style={BTN} autoFocus onClick={onClose}>
              {t("organizer.update.later")}
            </button>
            <button type="button" className="btn fill" style={BTN} onClick={install}>
              {t("organizer.update.now")}
            </button>
          </div>
        </>
      ) : phase === "error" ? (
        <div ref={panel} className="updPanel">
          <div className="updHead">
            <span className="updGlyph err">
              <WarningCircleIcon aria-hidden="true" weight="fill" />
            </span>
            <div className="updText" role="alert">
              <b>{t("organizer.update.failed")}</b>
              <span>{t("organizer.update.failedHint")}</span>
            </div>
          </div>
          {error && <div className="updError mono">{error}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn" style={BTN} onClick={() => invoke("open_url", { url: RELEASES_URL }).catch(() => {})}>
              {t("organizer.update.manual")}
            </button>
            <button type="button" className="btn fill" style={BTN} autoFocus onClick={install}>
              {t("organizer.update.retry")}
            </button>
          </div>
        </div>
      ) : (
        <div ref={panel} className="updPanel" aria-busy="true">
          <div className="updHead">
            <UpdateGlyph phase={phase === "install" ? "install" : "download"} />
            <div className="updText" role="status">
              <b>{t(phase === "download" ? "organizer.update.downloading" : "organizer.update.installing")}</b>
              <span>{t(phase === "download" ? "organizer.update.downloadingHint" : "organizer.update.installingHint")}</span>
            </div>
            {/* Written by the counter tween, not by React. */}
            <span ref={counter} className="updPct mono" aria-hidden="true" hidden={pct === null} />
          </div>
          <div
            className="updTrack"
            role="progressbar"
            aria-label={t("organizer.update.progress")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct ?? undefined}
          >
            {pct === null ? <div ref={sweep} className="updSweep" /> : <div ref={fill} className="updFill" />}
          </div>
          {pct !== null && update.sizeMb && phase === "download" && (
            <div className="updSize mono">
              {t("organizer.update.size", { done: mb((update.sizeMb * pct) / 100), total: mb(update.sizeMb) })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
