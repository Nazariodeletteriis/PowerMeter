import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emitTo, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Settings } from "./App";
import { errorText, initialLanguage, LANGUAGE_SETTING, translator } from "./i18n";
import "./controls.css";

/** overlay_state (powermeter.rs). */
type State = { main: boolean; history: boolean; map: boolean; cubes: boolean; grid: boolean; gridHidden: boolean; gridStep: number };
const STEPS = [8, 16, 32];
const HIDDEN_KEY = "pm.grid.hidden";
const STEP_KEY = "pm.grid.step";
const POLL_MS = 1000;

function Switch({ on, label, onToggle }: { on: boolean; label: string; onToggle: () => void }) {
  return (
    <div className="ctRow">
      <span>{label}</span>
      <button type="button" role="switch" aria-checked={on} aria-label={label} className="ctSwitch" onClick={onToggle}>
        <span />
      </button>
    </div>
  );
}

/** Parts of the meter shown or hidden from Controls: setting key, value that hides it, label key. */
const PARTS: [string, string, string][] = [
  ["dpsMeter.showPing", "false", "overlays.ping"],
  ["pm.eventAlerts.off", "1", "overlays.eventAlerts"],
  ["pm.counters.off", "1", "overlays.counters"],
];

/**
 * The Controls window over the game (powermeter.rs open_controls_window): a switch for each PowerMeter window that
 * floats over the game, so it is shown or hidden without going to the dashboard, and "Move windows" with its grid.
 */
export function Controls() {
  const [settings, setSettings] = useState<Settings>({});
  const [state, setState] = useState<State>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    document.documentElement.classList.add("mmDoc");
    invoke<Settings>("get_settings").then(setSettings, () => {});
    const unlisten = listen<{ key: string; value: string }>("setting-changed", ({ payload }) => {
      setSettings((s) => ({ ...s, [payload.key]: String(payload.value) }));
    });
    const read = () => invoke<State>("overlay_state").then(setState, () => {});
    read();
    const timer = setInterval(read, POLL_MS);
    return () => {
      clearInterval(timer);
      unlisten.then((stop) => stop(), () => {});
    };
  }, []);

  const lang = initialLanguage(settings[LANGUAGE_SETTING]);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const t = translator(lang);

  const run = (action: () => Promise<unknown>) =>
    void action()
      .then(() => invoke<State>("overlay_state").then(setState))
      .catch((e) => setError(String(e)));

  const hidden = settings[HIDDEN_KEY] === "1";
  const step = Number(settings[STEP_KEY]) || 16;
  const grid = (on: boolean, h = hidden, s = step) => run(() => invoke("set_grid", { on, hidden: h, step: s }));
  const save = (key: string, value: string) => {
    setSettings((x) => ({ ...x, [key]: value }));
    return invoke("update_settings", { key, value });
  };

  const windows: { id: keyof State; label: string; open: () => Promise<unknown>; close: () => Promise<unknown> }[] = [
    { id: "main", label: t("overlays.meter"), open: () => invoke("show_overlay"), close: () => invoke("hide_overlay") },
    {
      id: "history",
      label: t("overlays.history"),
      open: () => invoke("request_details_view", { payload: { kind: "history" } }),
      close: () => invoke("close_overlay_window", { label: "history" }),
    },
    { id: "map", label: t("overlays.map"), open: () => invoke("open_map_window"), close: () => invoke("close_overlay_window", { label: "map" }) },
    { id: "cubes", label: t("overlays.cubes"), open: () => invoke("open_cube_window"), close: () => invoke("close_overlay_window", { label: "cubes" }) },
  ];

  return (
    <div className="ctWin">
      <header className="ctHead" data-tauri-drag-region>
        <span data-tauri-drag-region>{t("overlays.title")}</span>
        <button type="button" className="ctClose" aria-label={t("window.close")} title={t("window.close")} onClick={() => {
          void getCurrentWindow().close(); // the grid goes with it (lib.rs)
        }}>
          ×
        </button>
      </header>

      <section className="ctSection" aria-labelledby="ct-windows">
        <h2 id="ct-windows">{t("overlays.windows")}</h2>
        {windows.map((w) => (
          <Switch key={w.id} on={!!state?.[w.id]} label={w.label} onToggle={() => run(state?.[w.id] ? w.close : w.open)} />
        ))}
        <div className="ctRow">
          <span>{t("overlays.dummy")}</span>
          <button type="button" className="ctBtn" onClick={() => run(() => invoke("show_overlay").then(() => emitTo("main", "pm-trainer-toggle")))}>
            {t("overlays.dummyStart")}
          </button>
        </div>
      </section>

      <section className="ctSection" aria-labelledby="ct-parts">
        <h2 id="ct-parts">{t("overlays.inMeter")}</h2>
        {PARTS.map(([key, off, label]) => {
          const on = settings[key] !== off;
          return <Switch key={key} on={on} label={t(label)} onToggle={() => run(() => save(key, on ? off : off === "false" ? "true" : "0"))} />;
        })}
      </section>

      <section className="ctSection" aria-labelledby="ct-layout">
        <h2 id="ct-layout">{t("overlays.layout")}</h2>
        <Switch on={!!state?.grid} label={t("overlays.move")} onToggle={() => grid(!state?.grid)} />
        <p className="ctHint">{t("overlays.moveHint")}</p>
        <Switch
          on={hidden}
          label={t("overlays.hideGrid")}
          onToggle={() => {
            const next = !hidden;
            run(() => save(HIDDEN_KEY, next ? "1" : "0"));
            if (state?.grid) grid(true, next);
          }}
        />
        <div className="ctRow">
          <span id="ct-step">{t("overlays.gridSize")}</span>
          <div className="ctSeg" role="group" aria-labelledby="ct-step">
            {STEPS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={s === step}
                onClick={() => {
                  run(() => save(STEP_KEY, String(s)));
                  if (state?.grid) grid(true, hidden, s);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <p className="ctError" role="alert">
          {errorText(t, error)}
        </p>
      )}
    </div>
  );
}

/** The alignment grid over the game's screen while "Move windows" is on (set_grid): lines only, clicks pass through. */
export function Grid() {
  const [step, setStep] = useState(() => (window as { __PM_GRID__?: number }).__PM_GRID__ ?? 16);
  useEffect(() => {
    document.documentElement.classList.add("mmDoc");
    const unlisten = listen<number>("grid-step", ({ payload }) => setStep(payload));
    return () => {
      unlisten.then((stop) => stop(), () => {});
    };
  }, []);
  return <div className="ctGrid" style={{ backgroundSize: `${step}px ${step}px, ${step}px ${step}px, ${step * 4}px ${step * 4}px, ${step * 4}px ${step * 4}px` }} />;
}
