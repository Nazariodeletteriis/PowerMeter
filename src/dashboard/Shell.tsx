import { useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { REPORT_FIGHT_KEY } from "./pages/combat/parts";
import { invoke } from "@tauri-apps/api/core";
import {
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  CaretDownIcon,
  CaretUpIcon,
  MagnifyingGlassIcon,
  PictureInPictureIcon,
} from "@phosphor-icons/react";
import type { SaveSetting, Settings } from "./App";
import { Home } from "./Home";
import type { T } from "./i18n";
import { ALL_PAGES, NAV, NAV_BOTTOM, type NavPage } from "./nav";
import { Palette } from "./Palette";
import { activeId, readCharacters } from "./characters";
import { Supporter } from "./Supporter";
import { ClassAvatar, fmt, ProfileAvatar } from "./ui";
import States from "./pages/shared/States";
import { Diagnosis } from "./pages/system/Diagnosis";
import type { PageHeader, PageProps } from "./pages/types";
import { usePoll } from "./usePoll";

/** Shape of get_capture_status (src-tauri/src/lib.rs). */
export type CaptureStatus = {
  locked: boolean;
  port: number | null;
  device: string;
  ip: string;
  localPlayerId: number | null;
  characterName: string | null;
};

// "In combat" (red pill + fight timer in the prototype) is not observable
// from these calls yet.
export type MeterStatus = "checking" | "noGame" | "waiting" | "connected" | "error";
const STATUS_COLOR: Record<MeterStatus, string> = {
  checking: "var(--pm-muted)",
  noGame: "var(--pm-muted)",
  waiting: "var(--pm-warn)",
  connected: "var(--pm-ok)",
  error: "var(--pm-err)",
};

export const PATREON_URL = "https://www.patreon.com/c/powermeter";
export const USER_NAME_KEY = "dpsMeter.userName";

const getCaptureStatus = () => invoke<CaptureStatus>("get_capture_status");
const getGameTitle = () => invoke<string | null>("get_aion2_window_title");

type Props = {
  t: T;
  lang: string;
  settings: Settings;
  save: SaveSetting;
  onError: (e: unknown) => void;
  reviewOnboarding: (step: number) => void;
};

// Every src/dashboard/pages/<id>.tsx is the page with that nav id (nav.ts),
// so pages are added without touching the shell.
const PAGES = Object.fromEntries(
  Object.entries(
    import.meta.glob<(props: PageProps) => ReactNode>("./pages/*.tsx", { eager: true, import: "default" }),
  ).map(([path, Page]) => [path.slice("./pages/".length, -".tsx".length), Page]),
);

// Under 1200 px the sidebar starts collapsed (PowerMeter's minimum window is 1024×600).
const NARROW = window.matchMedia("(max-width: 1199px)");
const onNarrow = (cb: () => void) => (NARROW.addEventListener("change", cb), () => NARROW.removeEventListener("change", cb));

export function Shell({ t, lang, settings, save, onError, reviewOnboarding }: Props) {
  const capture = usePoll(getCaptureStatus, 2000);
  const game = usePoll(getGameTitle, 2000);
  const [page, setPage] = useState("home");
  const narrow = useSyncExternalStore(onNarrow, () => NARROW.matches);
  // null = follow the window width; once the user toggles, their choice wins.
  const [userCollapsed, setCollapsed] = useState<boolean | null>(null);
  const collapsed = userCollapsed ?? narrow;
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [palette, setPalette] = useState(false);
  const [diagnosis, setDiagnosis] = useState(false);
  const [header, setHeader] = useState<PageHeader>({});
  // Cleared on navigation; the new page sets its own from an effect.
  const go = (id: string) => {
    setHeader({});
    setPage(id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The window title separates "game not running" from "waiting for traffic".
  const status: MeterStatus = capture.error
    ? "error"
    : !capture.data
      ? "checking"
      : capture.data.locked
        ? "connected"
        : game.data
          ? "waiting"
          : "noGame";

  const name = capture.data?.characterName || localStorage.getItem(USER_NAME_KEY) || t("home.notSet");
  const cls = settings["pm.class"];
  const characters = readCharacters(settings);
  const activeChar = characters.find((c) => c.id === activeId(settings, characters));
  const run = (action: () => Promise<unknown>) => action().catch(onError);
  const openWidget = () => run(() => invoke("show_overlay"));
  const current = ALL_PAGES.find((x) => x.id === page)!;
  const group = NAV.find((g) => g.items.includes(current))?.label;
  // Like the prototype, only pages without their own design (the states page)
  // show their group as breadcrumb.
  const crumb = header.crumb ?? (group && (!PAGES[page] || PAGES[page] === States) ? t(group) : undefined);

  const item = (x: NavPage, indent: boolean) => (
    <button
      key={x.id}
      type="button"
      className={indent ? "navItem indent" : "navItem"}
      title={t(x.label)}
      aria-current={x.id === page ? "page" : undefined}
      onClick={() => go(x.id)}
    >
      <x.icon aria-hidden="true" />
      {collapsed ? <span className="srOnly">{t(x.label)}</span> : <span>{t(x.label)}</span>}
    </button>
  );

  return (
    <div className="frame">
      <nav className={collapsed ? "sidebar collapsed" : "sidebar"} aria-label="PowerMeter">
        <div className="navScroll">
          {NAV.map((g) => {
            if (!g.label) return g.items.map((x) => item(x, false));
            const has = g.items.includes(current);
            // Collapsed: groups flatten into one icon column.
            const isOpen = collapsed || (open[g.label] ?? has);
            const GroupIcon = g.icon!;
            return (
              <div key={g.label} style={{ display: "contents" }}>
                {!collapsed && (
                  <button
                    type="button"
                    className={has ? "navGroup has" : "navGroup"}
                    aria-expanded={isOpen}
                    onClick={() => setOpen({ ...open, [g.label!]: !isOpen })}
                  >
                    <GroupIcon aria-hidden="true" />
                    <span className="label">{t(g.label)}</span>
                    {has && !isOpen && <span className="dot" />}
                    {isOpen ? <CaretUpIcon className="caret" aria-hidden="true" /> : <CaretDownIcon className="caret" aria-hidden="true" />}
                  </button>
                )}
                {isOpen && g.items.map((x) => item(x, !collapsed))}
              </div>
            );
          })}
        </div>
        <div className="navBottom">
          {NAV_BOTTOM.map((x) => item(x, false))}
          <button
            type="button"
            className="navItem toggle"
            title={t("nav.toggleSidebar")}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <CaretDoubleRightIcon aria-hidden="true" /> : <CaretDoubleLeftIcon aria-hidden="true" />}
            {collapsed ? <span className="srOnly">{t("nav.toggleSidebar")}</span> : <span>{t("nav.collapse")}</span>}
          </button>
        </div>
      </nav>

      <div className="main">
        <header className="topbar">
          <button type="button" className="searchBox" onClick={() => setPalette(true)}>
            <MagnifyingGlassIcon aria-hidden="true" />
            <span className="label">{t("search.placeholder")}</span>
            <span className="kbd">Ctrl K</span>
          </button>
          <div style={{ flex: 1 }} />
          {status === "error" ? (
            // Prototype: clicking the pill in "Errore" opens the diagnosis.
            <button
              type="button"
              className="statusPill"
              style={{ "--c": STATUS_COLOR.error } as CSSProperties}
              title={`${t("status.errorHint")} ${t("shell.diagnoseHint")}`}
              aria-haspopup="dialog"
              onClick={() => setDiagnosis(true)}
            >
              <span className="statusDot" />
              <span>{t("status.error")}</span>
            </button>
          ) : (
            <div
              className={status === "waiting" ? "statusPill pulse" : "statusPill"}
              style={{ "--c": STATUS_COLOR[status] } as CSSProperties}
              title={status === "checking" ? undefined : t(`status.${status}Hint`)}
              role="status"
            >
              <span className="statusDot" />
              <span>{t(`status.${status}`)}</span>
            </div>
          )}
          <button type="button" className="charChip" title={t("nav.myCharacters")} onClick={() => go("personaggi")}>
            <ClassAvatar cls={cls} />
            <div className="who">
              <div>{name}</div>
              <div className="sub">
                {cls && `${cls} · `}
                <span className="mono">CP {activeChar?.cp ? fmt(activeChar.cp, lang) : "—"}</span>
              </div>
            </div>
          </button>
          <button type="button" className="btn fill" onClick={openWidget}>
            <PictureInPictureIcon aria-hidden="true" />
            {t("topbar.openWidget")}
          </button>
          {/* Same settings the Account tab saves; photo is a data URL or the Discord avatar URL. */}
          <ProfileAvatar
            size={30}
            src={settings["pm.profile.photoSource"] === "none" ? undefined : settings["pm.profile.photo"]}
            name={settings["pm.profile.first"] || capture.data?.characterName || localStorage.getItem(USER_NAME_KEY) || ""}
            label={t("organizer.set.photo")}
          />
        </header>

        <main className="content">
          <div className="pageHead">
            <div style={{ flex: 1, minWidth: 0 }}>
              {crumb && <div className="crumb">{crumb}</div>}
              <h1>{header.title ?? t(current.label)}</h1>
            </div>
          </div>
          {page === "home" ? (
            <Home
              t={t}
              lang={lang}
              settings={settings}
              openWidget={openWidget}
              openHistory={() => go("storico")}
              openCharacters={() => go("personaggi")}
              openFight={(fightId) => {
                sessionStorage.setItem(REPORT_FIGHT_KEY, fightId);
                go("report");
              }}
              reviewOnboarding={reviewOnboarding}
            />
          ) : page === "supporter" ? (
            <Supporter t={t} name={name} onError={onError} />
          ) : (
            (() => {
              const Page = PAGES[page];
              return <Page t={t} lang={lang} settings={settings} save={save} name={name} go={go} run={run} onError={onError} setHeader={setHeader} />;
            })()
          )}
        </main>
      </div>

      {palette && (
        <Palette
          t={t}
          onClose={() => setPalette(false)}
          onPick={(id) => {
            go(id);
            setPalette(false);
          }}
        />
      )}
      {diagnosis && <Diagnosis t={t} onClose={() => setDiagnosis(false)} onError={onError} />}
    </div>
  );
}
