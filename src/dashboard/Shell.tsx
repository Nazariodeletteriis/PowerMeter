import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  CaretDoubleLeftIcon,
  CaretDoubleRightIcon,
  CaretDownIcon,
  CaretUpIcon,
  MagnifyingGlassIcon,
  PictureInPictureIcon,
  TrayIcon,
  UserIcon,
} from "@phosphor-icons/react";
import type { SaveSetting, Settings } from "./App";
import { Home } from "./Home";
import type { T } from "./i18n";
import { ALL_PAGES, NAV, NAV_BOTTOM, type NavPage } from "./nav";
import { Palette } from "./Palette";
import { SAMPLE_CHARACTER } from "./sampleData";
import { Supporter } from "./Supporter";
import { ClassAvatar, EmptyState, fmt } from "./ui";
import type { PageProps } from "./pages/types";
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

// Engine windows that stand in for R1 pages until the dashboard has them.
const ENGINE: Record<string, [label: "soon.openMeter" | "soon.openHistory" | "soon.openSettings", () => Promise<unknown>]> = {
  meter: ["soon.openMeter", () => invoke("show_overlay")],
  storico: ["soon.openHistory", () => invoke("request_details_view", { payload: { kind: "history" } })],
  impostazioni: ["soon.openSettings", () => invoke("open_settings_window")],
};

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

export function Shell({ t, lang, settings, save, onError, reviewOnboarding }: Props) {
  const capture = usePoll(getCaptureStatus, 2000);
  const game = usePoll(getGameTitle, 2000);
  const [page, setPage] = useState("home");
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [palette, setPalette] = useState(false);

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
  const run = (action: () => Promise<unknown>) => action().catch(onError);
  const openWidget = () => run(() => invoke("show_overlay"));
  const current = ALL_PAGES.find((x) => x.id === page)!;
  const group = NAV.find((g) => g.items.includes(current))?.label;

  const item = (x: NavPage, indent: boolean) => (
    <button
      key={x.id}
      type="button"
      className={indent ? "navItem indent" : "navItem"}
      title={t(x.label)}
      aria-current={x.id === page ? "page" : undefined}
      onClick={() => setPage(x.id)}
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
          <div
            className={status === "waiting" ? "statusPill pulse" : "statusPill"}
            style={{ "--c": STATUS_COLOR[status] } as CSSProperties}
            title={status === "checking" ? undefined : t(`status.${status}Hint`)}
            role="status"
          >
            <span className="statusDot" />
            <span>{t(`status.${status}`)}</span>
          </div>
          <div className="charChip">
            <ClassAvatar cls={cls} />
            <div className="who">
              <div>{name}</div>
              <div className="sub">
                {cls && `${cls} · `}
                <span className="mono">CP {fmt(SAMPLE_CHARACTER.cp, lang)}</span>
              </div>
            </div>
            <CaretDownIcon aria-hidden="true" />
          </div>
          <button type="button" className="btn fill" onClick={openWidget}>
            <PictureInPictureIcon aria-hidden="true" />
            {t("topbar.openWidget")}
          </button>
          <div className="avatar" title={t("topbar.account")} role="img" aria-label={t("topbar.account")}>
            <UserIcon aria-hidden="true" />
          </div>
        </header>

        <main className="content">
          <div className="pageHead">
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Like the prototype, unbuilt pages show their group as breadcrumb. */}
              {group && <div className="crumb">{t(group)}</div>}
              <h1>{t(current.label)}</h1>
            </div>
          </div>
          {page === "home" ? (
            <Home
              t={t}
              lang={lang}
              settings={settings}
              name={name}
              openWidget={openWidget}
              openHistory={() => run(ENGINE.storico[1])}
              openFight={(fightId) => run(() => invoke("request_details_view", { payload: { kind: "fight", fightId } }))}
              reviewOnboarding={reviewOnboarding}
            />
          ) : page === "supporter" ? (
            <Supporter t={t} name={name} onError={onError} />
          ) : PAGES[page] ? (
            (() => {
              const Page = PAGES[page];
              return <Page t={t} lang={lang} settings={settings} save={save} name={name} go={setPage} run={run} onError={onError} />;
            })()
          ) : (
            <section className="card" style={{ maxWidth: 560 }}>
              <EmptyState icon={<TrayIcon aria-hidden="true" />} title={t("soon.title", { release: current.release })} text={t("soon.text")}>
                {ENGINE[page] && (
                  <button type="button" className="btn fill" onClick={() => run(ENGINE[page][1])}>
                    {t(ENGINE[page][0])}
                  </button>
                )}
              </EmptyState>
            </section>
          )}
        </main>
      </div>

      {palette && (
        <Palette
          t={t}
          onClose={() => setPalette(false)}
          onPick={(id) => {
            setPage(id);
            setPalette(false);
          }}
        />
      )}
    </div>
  );
}
