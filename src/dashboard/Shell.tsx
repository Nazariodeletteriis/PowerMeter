import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import logo from "../assets/logo.png";
import type { SaveSetting, Settings } from "./App";
import { Home } from "./Home";
import type { Key, T } from "./i18n";
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

export type MeterStatus = "checking" | "noGame" | "waiting" | "connected" | "error";

const getCaptureStatus = () => invoke<CaptureStatus>("get_capture_status");
const getGameTitle = () => invoke<string | null>("get_aion2_window_title");

// Sidebar per brief 5.1. Home, Settings and the two R1 entries below work
// today; the rest show the release they are planned for (docs/ROADMAP.md).

// R1 entries open the engine's own windows until the dashboard pages exist.
const ACTIONS: Partial<Record<Key, () => Promise<unknown>>> = {
  "nav.dpsMeter": () => invoke("show_overlay"),
  "nav.fightHistory": () => invoke("request_details_view", { payload: { kind: "history" } }),
};
const NAV: { group?: Key; items: [Key, string][] }[] = [
  {
    group: "nav.combat",
    items: [
      ["nav.dpsMeter", "R1"],
      ["nav.fightHistory", "R1"],
      ["nav.onlineLogs", "R2"],
      ["nav.rankings", "R2"],
      ["nav.classStats", "R2"],
    ],
  },
  {
    group: "nav.characters",
    items: [
      ["nav.myCharacters", "R3"],
      ["nav.builds", "R3"],
      ["nav.skillPlanner", "R3"],
      ["nav.daevanion", "R3"],
    ],
  },
  {
    group: "nav.database",
    items: [
      ["nav.search", "R3"],
      ["nav.items", "R3"],
      ["nav.skills", "R3"],
      ["nav.npcs", "R3"],
      ["nav.quests", "R3"],
      ["nav.dungeons", "R3"],
    ],
  },
  {
    group: "nav.world",
    items: [
      ["nav.map", "R4"],
      ["nav.crafting", "R4"],
      ["nav.calculators", "R4"],
      ["nav.armory", "R4"],
    ],
  },
  {
    group: "nav.organizer",
    items: [
      ["nav.tasks", "R5"],
      ["nav.timers", "R5"],
      ["nav.shopping", "R5"],
      ["nav.flowMap", "R5"],
    ],
  },
  { items: [["nav.supporter", "R6"]] },
];

type Props = { t: T; lang: string; settings: Settings; save: SaveSetting };

export function Shell({ t, lang, settings, save }: Props) {
  const capture = usePoll(getCaptureStatus, 2000);
  const game = usePoll(getGameTitle, 2000);
  const [version, setVersion] = useState("");
  const [error, setError] = useState<string>();

  useEffect(() => {
    invoke<string>("get_app_version").then(setVersion, (e) => setError(String(e)));
  }, []);

  // get_capture_status only says whether a game connection is locked; the
  // window title separates "game not running" from "waiting for traffic".
  // "In combat" is not observable from these two calls.
  const status: MeterStatus = capture.error
    ? "error"
    : !capture.data
      ? "checking"
      : capture.data.locked
        ? "connected"
        : game.data
          ? "waiting"
          : "noGame";

  const openSettings = () =>
    invoke("open_settings_window").then(
      () => setError(undefined),
      (e) => setError(String(e)),
    );

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="PowerMeter">
        <div className="brand">
          <img src={logo} alt="" width={28} height={28} />
          <span>PowerMeter</span>
        </div>
        <span className="navItem active" aria-current="page">
          {t("nav.home")}
        </span>
        {NAV.map(({ group, items }) => (
          <div className={group ? "navGroup" : "navGroup bottom"} key={group ?? items[0][0]}>
            {group && <h2>{t(group)}</h2>}
            <ul>
              {items.map(([key, release]) => {
                const action = ACTIONS[key];
                return action ? (
                  <li key={key}>
                    <button
                      type="button"
                      className="navItem"
                      onClick={() => action().then(() => setError(undefined), (e) => setError(String(e)))}
                    >
                      {t(key)}
                    </button>
                  </li>
                ) : (
                  <li key={key} className="navItem disabled">
                    <span>{t(key)}</span>
                    <span className="badge">{t("nav.soon", { release })}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <button type="button" className="navItem" onClick={openSettings}>
          {t("nav.settings")}
        </button>
      </nav>

      <div className="main">
        <header className="topbar">
          <h1>{t("nav.home")}</h1>
          <span className={`pill ${status}`} title={hint(t, status)} role="status">
            {t(`status.${status}`)}
          </span>
          {version && <span className="muted num">v{version}</span>}
        </header>
        {error && (
          <p className="error" role="alert">
            {t("common.error", { message: error })}
          </p>
        )}
        <Home
          t={t}
          lang={lang}
          settings={settings}
          save={save}
          status={status}
          capture={capture.data}
        />
      </div>
    </div>
  );
}

export function hint(t: T, status: MeterStatus) {
  return status === "checking" ? "" : t(`status.${status}Hint`);
}
