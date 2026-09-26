import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ArrowCircleUpIcon, MinusIcon, SquareIcon, XIcon } from "@phosphor-icons/react";
import type { T } from "./i18n";
import { Logo } from "./ui";

/** 34px custom title bar: the window has decorations(false). */
export function TitleBar({ t, onError }: { t: T; onError: (e: unknown) => void }) {
  const [version, setVersion] = useState("");
  useEffect(() => {
    invoke<string>("get_app_version").then(setVersion, onError);
  }, [onError]);

  const win = getCurrentWindow();
  const act = (fn: () => Promise<void>) => () => fn().catch(onError);

  return (
    // Tauri drags (and double-click maximizes) only on the element carrying
    // the attribute; its decorations have pointer-events: none in CSS.
    <header className="titlebar" data-tauri-drag-region>
      <Logo size={18} />
      <div className="brandName">
        Power<span>Meter</span>
      </div>
      <div className="brandBy">
        by Letrion Labs{version && ` · v${version}`}
      </div>
      <div className="winButtons">
        <button type="button" title={t("window.minimize")} aria-label={t("window.minimize")} onClick={act(() => win.minimize())}>
          <MinusIcon />
        </button>
        <button type="button" title={t("window.maximize")} aria-label={t("window.maximize")} onClick={act(() => win.toggleMaximize())}>
          <SquareIcon />
        </button>
        <button type="button" className="close" title={t("window.close")} aria-label={t("window.close")} onClick={act(() => win.close())}>
          <XIcon />
        </button>
      </div>
    </header>
  );
}

export type Update = { version: string; summary: string };

/**
 * Update banner under the title bar. Not mounted yet: today the meter's
 * checkRelease.js finds updates and opens its own update window. Mount it
 * with real data once the dashboard runs that check itself.
 */
export function UpdateBanner({
  t,
  update,
  onNotes,
  onClose,
}: {
  t: T;
  update: Update;
  onNotes: () => void;
  onClose: () => void;
}) {
  return (
    <div className="updateBanner" role="status">
      <ArrowCircleUpIcon aria-hidden="true" />
      <span>
        <b>{t("update.available", { version: update.version })}</b>{" "}
        <span style={{ color: "var(--pm-t2)" }}>· {update.summary}</span>
      </span>
      <button type="button" className="linkBtn" onClick={onNotes}>
        {t("update.notes")}
      </button>
      <button type="button" className="close" title={t("window.close")} aria-label={t("window.close")} onClick={onClose}>
        <XIcon />
      </button>
    </div>
  );
}
