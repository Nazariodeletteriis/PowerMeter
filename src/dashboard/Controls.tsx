import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emit, emitTo, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { CaretRightIcon } from "@phosphor-icons/react";
import type { Settings } from "./App";
import { WIDGET_SETTINGS } from "./Shell";
import { errorText, initialLanguage, LANGUAGE_SETTING, translator } from "./i18n";
import "./controls.css";

/** overlay_state (powermeter.rs). */
type State = { main: boolean; history: boolean; map: boolean; cubes: boolean; grid: boolean; gridHidden: boolean; gridStep: number };
/** What the meter says about itself (pmWidget.js emitMeterState): the dummy test running, the Compact layout. */
type MeterState = { dummy: boolean; compact: boolean };
const STEPS = [8, 16, 32];
const HIDDEN_KEY = "pm.grid.hidden";
const STEP_KEY = "pm.grid.step";
const POLL_MS = 1000;

/**
 * The compact meter's preferences: one JSON in the settings, applied by the meter (pmWidget.js usePrefs, which
 * reads every value back through the same lists). Only the fields below are ever written.
 */
const PREFS_KEY = "pm.compactPrefs";
const PREFS_VERSION = 2;
const SWITCHES = ["icons", "rank", "bars", "header", "cp", "cTotal", "cRate", "cShare", "cDeaths"] as const;
const ROW_COUNTS = [3, 5, 8];
const BGS = ["clear", "soft", "full"] as const;
/** Bar colours: "class" paints each bar in its class colour (its swatch: the class colours round the dial). */
const ACCENTS = { class: "var(--ct-class-swatch)", theme: "var(--pm-red)", azure: "#4cc2ff", violet: "#a78bfa", green: "#34d399", amber: "#fbbf24", pink: "#fb7185" };
type Prefs = Record<(typeof SWITCHES)[number] | "dense", boolean> & { rows: number; bg: (typeof BGS)[number]; accent: keyof typeof ACCENTS };
type Layout = Omit<Prefs, "accent">;
const PRESETS: Record<"min" | "std" | "full", Layout> = {
  min: { icons: false, rank: false, bars: true, header: false, cp: true, cTotal: false, cRate: true, cShare: false, cDeaths: false, dense: true, rows: 5, bg: "clear" },
  std: { icons: true, rank: false, bars: true, header: true, cp: true, cTotal: true, cRate: true, cShare: true, cDeaths: false, dense: true, rows: 5, bg: "soft" },
  full: { icons: true, rank: true, bars: true, header: true, cp: true, cTotal: true, cRate: true, cShare: true, cDeaths: true, dense: false, rows: 8, bg: "full" },
};
const readPrefs = (raw: string | undefined): Prefs => {
  let saved: Record<string, unknown> = {};
  try {
    saved = JSON.parse(raw || "{}") ?? {};
  } catch {
    // unreadable: the defaults, as the meter does
  }
  const prefs: Prefs = { ...PRESETS.std, accent: "class" };
  for (const key of [...SWITCHES, "dense"] as const) if (typeof saved[key] === "boolean") prefs[key] = saved[key];
  if (ROW_COUNTS.includes(saved.rows as number)) prefs.rows = saved.rows as number;
  if (BGS.includes(saved.bg as Prefs["bg"])) prefs.bg = saved.bg as Prefs["bg"];
  if (Object.keys(ACCENTS).includes(saved.accent as string)) prefs.accent = saved.accent as Prefs["accent"];
  return prefs;
};

/** The character bar's counters (src/widget/charBar.ts draws them): game id, label key. Unset = Odyle only. */
const COUNTER_KEY = "pm.counters.show.";
const COUNTERS: [string, string][] = [
  ["60000001", "overlays.counterOdyle"],
  ["4", "overlays.counterNightmare"],
  ["101", "overlays.counterDailyDungeon"],
  ["8", "overlays.counterBeritraKeys"],
  ["1", "overlays.counterShugoKeys"],
];

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

/** A labelled row of choices, one pressed. */
function Seg<V extends string | number>({ id, label, options, value, onPick }: { id: string; label: string; options: [V, string][]; value: V | undefined; onPick: (v: V) => void }) {
  return (
    <div className="ctGroup">
      <span id={id}>{label}</span>
      <div className="ctSeg" role="group" aria-labelledby={id}>
        {options.map(([v, text]) => (
          <button key={v} type="button" aria-pressed={v === value} onClick={() => onPick(v)}>
            {text}
          </button>
        ))}
      </div>
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
 * The Options window over the game (powermeter.rs open_controls_window, label "controls"), opened by the meter's
 * settings button: the compact meter's preferences, the counters, the dummy test, a switch for each PowerMeter
 * window that floats over the game and "Move windows" with its grid.
 */
export function Controls() {
  const [settings, setSettings] = useState<Settings>({});
  const [state, setState] = useState<State>();
  const [meter, setMeter] = useState<MeterState>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    document.documentElement.classList.add("mmDoc");
    invoke<Settings>("get_settings").then(setSettings, () => {});
    const unlisten = listen<{ key: string; value: string }>("setting-changed", ({ payload }) => {
      setSettings((s) => ({ ...s, [payload.key]: String(payload.value) }));
    });
    const unlistenMeter = listen<MeterState>("pm-meter-state", ({ payload }) => setMeter(payload));
    unlistenMeter.then(() => emitTo("main", "pm-meter-state-request"), () => {});
    const read = () => invoke<State>("overlay_state").then(setState, () => {});
    read();
    const timer = setInterval(read, POLL_MS);
    return () => {
      clearInterval(timer);
      for (const stop of [unlisten, unlistenMeter]) stop.then((f) => f(), () => {});
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

  const prefs = readPrefs(settings[PREFS_KEY]);
  const setPrefs = (change: Partial<Prefs>) => run(() => save(PREFS_KEY, JSON.stringify({ ...prefs, ...change, v: PREFS_VERSION })));
  const preset = (Object.keys(PRESETS) as (keyof typeof PRESETS)[]).find((key) =>
    Object.entries(PRESETS[key]).every(([k, v]) => prefs[k as keyof Layout] === v)
  );
  const counterOn = (id: string) => (settings[COUNTER_KEY + id] ?? (id === "60000001" ? "1" : "0")) === "1";
  // As the meter's old Customise panel: the meter in view, then the test starts or stops there.
  const toggleDummy = () => run(() => invoke("show_overlay").then(() => emitTo("main", "pm-trainer-toggle")));
  // The dashboard on Settings > Widget DPS (tauriBridge.js openWidgetSettings): the flag for a dashboard it opens now.
  const moreSettings = () =>
    run(() => {
      try {
        localStorage.setItem(WIDGET_SETTINGS, "1");
      } catch {
        // storage off: the dashboard already open still gets the event
      }
      return invoke("open_dashboard_window").then(() => emit("pm-open-widget-settings"));
    });

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

      <div className="ctBody">
        {/* The Interface layout ignores these preferences (powermeter-theme.css .meter.slim), so it does not offer them. */}
        {meter?.compact !== false && (
          <section className="ctSection" aria-labelledby="ct-meter">
            <h2 id="ct-meter">{t("overlays.meter")}</h2>
            <Seg
              id="ct-preset"
              label={t("overlays.preset")}
              options={(["min", "std", "full"] as const).map((key) => [key, t(`overlays.presets.${key}`)])}
              value={preset}
              onPick={(key) => setPrefs(PRESETS[key])}
            />
            <div className="ctGroup" role="group" aria-labelledby="ct-elements">
              <span id="ct-elements">{t("overlays.elements")}</span>
              {SWITCHES.map((key) => (
                <Switch key={key} on={prefs[key]} label={t(`overlays.${key}`)} onToggle={() => setPrefs({ [key]: !prefs[key] })} />
              ))}
            </div>
            <Seg
              id="ct-density"
              label={t("overlays.density")}
              options={[["dense", t("overlays.dense")], ["normal", t("overlays.normal")]]}
              value={prefs.dense ? "dense" : "normal"}
              onPick={(v) => setPrefs({ dense: v === "dense" })}
            />
            <Seg id="ct-rows" label={t("overlays.rows")} options={ROW_COUNTS.map((n) => [n, String(n)])} value={prefs.rows} onPick={(rows) => setPrefs({ rows })} />
            <Seg
              id="ct-bg"
              label={t("overlays.bg")}
              options={[["clear", t("overlays.bgClear")], ["soft", t("overlays.bgSoft")], ["full", t("overlays.bgFull")]]}
              value={prefs.bg}
              onPick={(bg) => setPrefs({ bg })}
            />
            <div className="ctGroup">
              <span id="ct-color">{t("overlays.color")}</span>
              <div className="ctSwatches" role="group" aria-labelledby="ct-color">
                {(Object.keys(ACCENTS) as Prefs["accent"][]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={prefs.accent === key}
                    aria-label={t(`overlays.colors.${key}`)}
                    title={t(`overlays.colors.${key}`)}
                    style={{ background: ACCENTS[key] }}
                    onClick={() => setPrefs({ accent: key })}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="ctSection" aria-labelledby="ct-counters">
          <h2 id="ct-counters">{t("overlays.counters")}</h2>
          {COUNTERS.map(([id, label]) => (
            <Switch key={id} on={counterOn(id)} label={t(label)} onToggle={() => run(() => save(COUNTER_KEY + id, counterOn(id) ? "0" : "1"))} />
          ))}
        </section>

        <section className="ctSection" aria-labelledby="ct-mode">
          <h2 id="ct-mode">{t("overlays.mode")}</h2>
          <Switch on={!!meter?.dummy} label={t("overlays.dummy")} onToggle={toggleDummy} />
        </section>

        <section className="ctSection" aria-labelledby="ct-windows">
          <h2 id="ct-windows">{t("overlays.windows")}</h2>
          {windows.map((w) => (
            <Switch key={w.id} on={!!state?.[w.id]} label={w.label} onToggle={() => run(state?.[w.id] ? w.close : w.open)} />
          ))}
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
          <Seg
            id="ct-step"
            label={t("overlays.gridSize")}
            options={STEPS.map((s) => [s, String(s)])}
            value={step}
            onPick={(s) => {
              run(() => save(STEP_KEY, String(s)));
              if (state?.grid) grid(true, hidden, s);
            }}
          />
        </section>

        <button type="button" className="ctLink" onClick={moreSettings}>
          <span>{t("overlays.more")}</span>
          <CaretRightIcon aria-hidden="true" size={12} />
        </button>

        {error && (
          <p className="ctError" role="alert">
            {errorText(t, error)}
          </p>
        )}
      </div>
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
