import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ArrowCircleUpIcon, MinusIcon, SquareIcon, XIcon } from "@phosphor-icons/react";
import type { T } from "./i18n";
import { UpdateModal, type UpdateInfo } from "./pages/system/Update";
import { Logo } from "./ui";

// Same manifest the meter's checkRelease.js reads (written by build.yml).
const MANIFEST = "https://github.com/Nazariodeletteriis/PowerMeter/releases/latest/download/latest.json";

/** a > b for "1.5.0"-style versions; a release beats its own prerelease. */
function newer(a: string, b: string) {
  const [baseA, preA] = a.replace(/^v/i, "").split("-");
  const [baseB, preB] = b.replace(/^v/i, "").split("-");
  const c = baseA.localeCompare(baseB, undefined, { numeric: true });
  return c > 0 || (c === 0 && !preA && !!preB);
}

/** 34px custom title bar (the window has decorations(false)) and the update banner under it. */
export function TitleBar({ t, lang, onError }: { t: T; lang: string; onError: (e: unknown) => void }) {
  const [version, setVersion] = useState("");
  const [update, setUpdate] = useState<UpdateInfo>();
  const [banner, setBanner] = useState(true);
  const [notes, setNotes] = useState(false);
  useEffect(() => {
    let current = "";
    // No release yet, offline or a bad manifest: no banner and no error.
    const check = () =>
      current &&
      invoke<string>("fetch_url", { url: MANIFEST })
        .then((raw) => {
          const latest = JSON.parse(raw) as UpdateInfo;
          if (newer(latest.version, current)) setUpdate(latest);
        })
        .catch(() => {});
    invoke<string>("get_app_version").then((v) => {
      setVersion((current = v));
      check();
    }, onError);
    // The dashboard stays open for hours: check again periodically and when it regains focus.
    const timer = setInterval(check, 30 * 60_000);
    window.addEventListener("focus", check);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, [onError]);

  const win = getCurrentWindow();
  const act = (fn: () => Promise<void>) => () => fn().catch(onError);

  return (
    <>
      {/* Tauri drags (and double-click maximizes) only on the element carrying
    the attribute; its decorations have pointer-events: none in CSS. */}
      <header className="titlebar" data-tauri-drag-region>
        <Logo size={18} />
        <div className="brandName">
          Power<span>Meter</span>
        </div>
        <div className="brandBy">by Letrion Labs{version && ` · v${version}`}</div>
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
      {update && banner && (
        // latest.json has no summary line, so unlike the prototype the banner shows the version only.
        <div className="updateBanner" role="status">
          <ArrowCircleUpIcon aria-hidden="true" />
          <b>{t("update.available", { version: update.version })}</b>
          <button type="button" className="linkBtn" onClick={() => setNotes(true)}>
            {t("update.notes")}
          </button>
          <button type="button" className="close" title={t("window.close")} aria-label={t("window.close")} onClick={() => setBanner(false)}>
            <XIcon />
          </button>
        </div>
      )}
      {update && notes && <UpdateModal t={t} lang={lang} update={update} onClose={() => setNotes(false)} />}
    </>
  );
}
