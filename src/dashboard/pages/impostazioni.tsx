import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import {
  BellIcon,
  CheckIcon,
  DatabaseIcon,
  DiscordLogoIcon,
  GaugeIcon,
  HeartIcon,
  InfoIcon,
  KeyboardIcon,
  PictureInPictureIcon,
  ShieldCheckIcon,
  SlidersIcon,
  TrashIcon,
  UploadSimpleIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { LANGUAGE_SETTING, LANGUAGES, type Key } from "../i18n";
import { PATREON_URL, USER_NAME_KEY, WIDGET_SETTINGS, type CaptureStatus } from "../Shell";
import { chime, POPUP_KEY, POPUP_SECONDS_KEY, popupSeconds, VOLUME_KEY } from "../chime";
import { usePoll } from "../usePoll";
import { useEntitlement } from "../entitlement";
import { ProfileAvatar } from "../ui";
import { THEME_SETTING, THEMES, themeOf } from "./system/theme";
import "./system/system.css";
import type { PageProps } from "./types";

const REPO_URL = "https://github.com/Nazariodeletteriis/PowerMeter";
const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const PHOTO_SIZE = 256; // stored photo: square JPEG, small enough for settings.json
const NAME_MAX_LENGTH = 32; // same cap as onboarding
// Profile settings; the character name keeps its own storage (USER_NAME_KEY).
const PROFILE = { first: "pm.profile.first", last: "pm.profile.last", source: "pm.profile.photoSource", photo: "pm.profile.photo" };
type PhotoSource = "discord" | "upload" | "none";
/** pm_account / pm_login (src-tauri/src/pm_account.rs). */
type Account = { id: string; name: string; avatarUrl: string | null };

const TABS = [
  ["generale", "organizer.set.general", SlidersIcon],
  ["meter", "organizer.set.meter", GaugeIcon],
  ["widget", "widgetset.tab", PictureInPictureIcon],
  ["scorciatoie", "organizer.set.shortcuts", KeyboardIcon],
  ["account", "organizer.set.account", UserCircleIcon],
  ["dati", "organizer.set.data", DatabaseIcon],
  ["notifiche", "organizer.set.notifications", BellIcon],
  ["info", "organizer.set.about", InfoIcon],
] as const;
// Prototype order for the language list.
const LANG_ORDER = ["it", "en", "de", "fr", "es", "pt", "ru", "ja", "ko", "zh-Hans", "zh-Hant"];
const TARGET_MODES = [
  ["bossTargets", "BOSS"],
  ["pveTargets", "PVE"],
  ["pvpTargets", "PVP"],
  // The widget's other two modes (core.js TARGET_MODES).
  ["lastHitByMe", "TARGET"],
  ["allTargets", "ALL"],
] as const;

// The DPS widget's options (the meter window's settings, public/src/js/core.js), with the defaults
// it uses when unset: what the Widget DPS tab shows and what its reset writes back. Each one reaches
// the meter live: update_settings broadcasts it and core.js applyRemoteSettingChange applies it.
const WIDGET_DEFAULTS: Record<string, string> = {
  "dpsMeter.windowOpacity": "60",
  "dpsMeter.meterFillOpacity": "80",
  "dpsMeter.bossNameSize": "15",
  "dpsMeter.slimMode": "false",
  "dpsMeter.detailsMonitor": "off",
  "dpsMeter.mainPlayerNamesBold": "true",
  "dpsMeter.mainPlayerDpsBold": "true",
  "dpsMeter.playerLimit": "6",
  "dpsMeter.defaultMeterMode": "bossTargets",
  "dpsMeter.pinMeToTop": "false",
  "dpsMeter.autoHideMeter": "false",
  "dpsMeter.showPing": "true",
  "dpsMeter.showTotalDps": "true",
  "dpsMeter.roundDps": "false",
  "dpsMeter.showSuspendBtn": "false",
  [VOLUME_KEY]: "50",
  [POPUP_KEY]: "1",
  [POPUP_SECONDS_KEY]: "8",
};
const MONITOR = "dpsMeter.detailsMonitor";
const LOGS = { debug: ["dpsMeter.debugLoggingEnabled", "set_debug_logging"], packets: ["dpsMeter.saveRawPackets", "set_packet_logging"] } as const;
/** list_monitors (src-tauri/src/lib.rs). */
type Monitor = { index: number; width: number; height: number; isPrimary?: boolean; side?: string };

/** A key the backend's hotkey parser registers (platform/hotkeys.rs parse_hotkey_label), as it names it; null otherwise. */
function hotkeyName(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^F([1-9]|1[0-2])$/.test(code)) return code;
  if (code.startsWith("Arrow")) return code.slice(5);
  return ["PageUp", "PageDown", "Home", "End", "Insert", "Delete", "Space", "Enter", "Backspace"].includes(code) ? code : null;
}

const getCapture = () => invoke<CaptureStatus>("get_capture_status");

function Row({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) {
  return (
    <div className="setRow">
      <div className="what">
        <div>{label}</div>
        {desc && <div className="desc">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function Switch({ label, on, set }: { label: string; on: boolean; set?: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="switch" disabled={!set} onClick={() => set?.(!on)}>
      <span />
    </button>
  );
}

function Select({
  label,
  value,
  options,
  set,
}: {
  label: string;
  value?: string;
  options: readonly (readonly [value: string, text: string])[];
  set?: (value: string) => void;
}) {
  return (
    <select className="setSelect" aria-label={label} value={value} onChange={(e) => set?.(e.target.value)}>
      {options.map(([v, text]) => (
        <option key={v} value={v}>
          {text}
        </option>
      ))}
    </select>
  );
}

/** Same values for option and label (sample lists, meter terms). */
const same = (xs: string[]) => xs.map((x) => [x, x] as const);

/** Prototype pg.impostazioni. Options the engine handles use the real settings/commands. */
export default function Impostazioni({ t, lang, settings, save, name, go, run }: PageProps) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("widget"); // prototype default
  const [clickThrough, setClickThrough] = useState(false);
  const [startWithWindows, setStartWithWindows] = useState(false);
  useEffect(() => {
    invoke<boolean>("get_start_with_windows").then(setStartWithWindows, () => {});
  }, []);
  const [devices, setDevices] = useState<string[]>([]);
  const [device, setDevice] = useState(""); // "" = automatic
  const [version, setVersion] = useState("");
  // What is stored now; the form edits `draft` and Save writes it back.
  const stored = {
    first: settings[PROFILE.first] ?? "",
    last: settings[PROFILE.last] ?? "",
    pg: localStorage.getItem(USER_NAME_KEY) ?? "",
    source: (settings[PROFILE.source] || "discord") as PhotoSource,
    photo: settings[PROFILE.photo] ?? "",
  };
  const [draft, setDraft] = useState({ ...stored, upload: stored.source === "upload" ? stored.photo : "" });
  const [savedNow, setSavedNow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [account, setAccount] = useState<Account | null>(); // undefined until pm_account answers
  const [monitors, setMonitors] = useState<Monitor[]>();
  const [mayLog, setMayLog] = useState(false);
  const [recording, setRecording] = useState<string>(); // hotkey setting being recorded
  const [keyHint, setKeyHint] = useState("");
  const capture = usePoll(getCapture, 2000).data;
  const entitlement = useEntitlement();

  // The widget's Settings button while this page is already open (Shell.tsx).
  useEffect(() => {
    const show = () => setTab("widget");
    window.addEventListener(WIDGET_SETTINGS, show);
    return () => window.removeEventListener(WIDGET_SETTINGS, show);
  }, []);

  useEffect(() => {
    run(() => invoke<Monitor[]>("list_monitors").then(setMonitors));
    run(() => invoke<boolean>("pm_may_log").then(setMayLog));
    run(() => invoke<boolean>("get_click_through").then(setClickThrough));
    // On failure: treat as signed out so "Sign in" stays usable.
    run(() => invoke<Account | null>("pm_account").then(setAccount, (e) => (setAccount(null), Promise.reject(e))));
    run(() => invoke<string[]>("get_available_devices").then(setDevices));
    run(() => invoke<string>("get_app_version").then(setVersion));
  }, []); // once per visit: `run` is a new function every render

  // The meter's lock also changes from its own button and the hotkey.
  useEffect(() => {
    const stop = listen<boolean>("pm-click-through", ({ payload }) => setClickThrough(payload));
    return () => void stop.then((s) => s(), () => {});
  }, []);

  // Options the engine has no setting for: a disabled switch. `always` = what the engine
  // already does unconditionally (autosave, window position); the rest is not built yet.
  const fixed = (label: Key, always = false) => (
    <Row label={t(label)} desc={t(always ? "organizer.set.alwaysOn" : "shell.states.soonTitle")}>
      <Switch label={t(label)} on={always} />
    </Row>
  );
  const setting = (key: string, value: string) => run(() => save(key, value));
  const open = (url: string) => run(() => invoke("open_url", { url }));
  const button = (text: string, onClick?: () => void) => (
    <button type="button" className="btn" onClick={onClick}>
      {text}
    </button>
  );
  const range = (
    label: string,
    value: number,
    min: number,
    max: number,
    set: (v: number) => void,
    { step = 1, format = (v: number) => `${v}%` } = {},
  ) => (
    <div className="setRange">
      <input type="range" aria-label={label} aria-valuetext={format(value)} min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} />
      <span>{format(value)}</span>
    </div>
  );
  // Hotkeys are recorded here and saved as the label the backend parses at start (it registers them once).
  const recordKey = (e: KeyboardEvent, key: string) => {
    if (e.key === "Tab") return; // keyboard users can still leave; blur stops the recording
    e.preventDefault();
    if (e.key === "Escape") return setRecording(undefined);
    const name = hotkeyName(e.code);
    if (!name) return; // a modifier on its own so far, or a key that can't be registered
    const mods = [e.ctrlKey && "Ctrl", e.altKey && "Alt", e.shiftKey && "Shift"].filter(Boolean);
    if (!mods.length) return setKeyHint(t("widgetset.needModifier"));
    setRecording(undefined);
    setting(key, [...mods, name].join("+"));
  };
  const hotkey = (label: Key, keys: string, settingKey?: string) => (
    <Row key={label} label={t(label)} desc={settingKey && t("widgetset.restartHint")}>
      {/* The widget's two global hotkeys are real; the prototype's others are inert. */}
      {settingKey ? (
        <button
          type="button"
          className="keyChip"
          aria-pressed={recording === settingKey}
          title={t("organizer.set.clickToEdit")}
          onClick={() => {
            setKeyHint("");
            setRecording(recording === settingKey ? undefined : settingKey);
          }}
          onBlur={() => setRecording(undefined)}
          onKeyDown={(e) => recording === settingKey && recordKey(e, settingKey)}
        >
          <span aria-live="polite">{recording === settingKey ? keyHint || t("widgetset.pressKeys") : keys}</span>
        </button>
      ) : (
        <span className="keyChip">{keys}</span>
      )}
    </Row>
  );

  // Widget DPS tab.
  const widgetValue = (key: string) => settings[key] || WIDGET_DEFAULTS[key];
  const widgetNumber = (key: string) => {
    const n = Number(widgetValue(key));
    return Number.isFinite(n) ? n : Number(WIDGET_DEFAULTS[key]);
  };
  const widgetSwitch = (key: string, label: string, desc?: string) => (
    <Row label={label} desc={desc}>
      <Switch label={label} on={widgetValue(key) === "true"} set={(on) => setting(key, String(on))} />
    </Row>
  );
  const savedMonitor = widgetValue(MONITOR);
  const monitorFound = savedMonitor === "off" || !monitors || monitors.some((m) => String(m.index) === savedMonitor);
  const setMonitor = (value: string) =>
    run(async () => {
      await save(MONITOR, value);
      await (value === "off" ? invoke("close_details_window") : invoke("open_details_window", { monitorIndex: Number(value) }));
    });
  const monitorLabel = (m: Monitor, i: number) => {
    const notes = [m.isPrimary && t("widgetset.monitor.primary"), m.side && t(`widgetset.monitor.side.${m.side}`)].filter(Boolean);
    return `${i + 1} · ${Math.round(m.width)}×${Math.round(m.height)}${notes.length ? ` (${notes.join(", ")})` : ""}`;
  };
  const setLog = (which: keyof typeof LOGS, enabled: boolean) =>
    run(async () => {
      const [key, command] = LOGS[which];
      await invoke(command, { enabled }); // refused without the Debugger or Admin role; it stores the setting
      await save(key, String(enabled));
    });
  const bindActor = (raw: string) => {
    const id = Number(raw) || 0; // empty = back to auto-detection
    if (id !== (capture?.localPlayerId ?? 0)) run(() => invoke("bind_local_actor_id", { actorId: id }));
  };
  const resetWidget = () => {
    if (!window.confirm(t("widgetset.resetConfirm"))) return;
    run(async () => {
      for (const [key, value] of Object.entries(WIDGET_DEFAULTS)) await save(key, value);
      await invoke("close_details_window");
    });
  };
  const volume = widgetNumber(VOLUME_KEY);
  const seconds = popupSeconds(widgetValue(POPUP_SECONDS_KEY));

  const edit = (patch: Partial<typeof draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setSavedNow(false);
  };
  const invalidPhoto = () => Promise.reject(t("organizer.set.photoInvalid"));
  // Center-cropped 256px JPEG so settings.json stays small.
  const pickPhoto = (file?: File) => {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type) || file.size > PHOTO_MAX_BYTES) return run(invalidPhoto);
    run(async () => {
      const img = await createImageBitmap(file).catch(invalidPhoto);
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = PHOTO_SIZE;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#1d1919"; // --pm-s2 behind transparent PNGs (JPEG has no alpha)
      ctx.fillRect(0, 0, PHOTO_SIZE, PHOTO_SIZE);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
      img.close();
      edit({ source: "upload", upload: canvas.toDataURL("image/jpeg", 0.85) });
    });
  };

  const discordPhoto = account?.avatarUrl ?? "";
  const draftPhoto = draft.source === "upload" ? draft.upload : draft.source === "discord" ? discordPhoto : "";
  // Empty character name means "detect it from the game window", like onboarding: nothing to save.
  const pg = draft.pg.trim();
  const pgDirty = !!pg && pg !== stored.pg;
  const dirty =
    pgDirty ||
    draft.first.trim() !== stored.first ||
    draft.last.trim() !== stored.last ||
    draft.source !== stored.source ||
    (draft.source === "upload" && draft.upload !== stored.photo) ||
    // Discord avatar changed since the last save (only once pm_account has answered).
    (draft.source === "discord" && account !== undefined && discordPhoto !== stored.photo);

  const saveProfile = () =>
    run(async () => {
      setSaving(true);
      try {
        await save(PROFILE.first, draft.first.trim());
        await save(PROFILE.last, draft.last.trim());
        await save(PROFILE.source, draft.source);
        await save(PROFILE.photo, draftPhoto);
        if (pgDirty) {
          localStorage.setItem(USER_NAME_KEY, pg);
          await invoke("set_character_name", { name: pg });
        }
        setSavedNow(true);
      } finally {
        setSaving(false);
      }
    });
  // Signing in or out changes what a saved "discord" choice shows: keep the stored photo in step.
  const linkDiscord = (next: Account | null) => {
    setAccount(next);
    if (stored.source === "discord") return save(PROFILE.photo, next?.avatarUrl ?? "");
  };
  const signIn = (then?: () => void) =>
    run(async () => {
      setSigningIn(true);
      try {
        await linkDiscord(await invoke<Account>("pm_login"));
        then?.();
      } finally {
        setSigningIn(false);
      }
    });
  const signOut = () => run(() => invoke("pm_logout").then(() => linkDiscord(null)));
  const setDeviceTo = (d: string) => {
    setDevice(d);
    run(() => invoke("set_manual_device", { device: d }).then(() => invoke("reset_auto_detection")));
  };

  // One theme for the dashboard and every widget window: the same control in General and Widget DPS.
  const themeRow = (label: string) => (
    <Row label={label} desc={t("widgetset.themeHint")}>
      <Select
        label={label}
        value={themeOf(settings)}
        // The design's own first, the others by name (as the widget's old dropdown).
        options={THEMES.map((id) => [id, t(`widgetset.theme.${id}`)] as const).sort((a, b) =>
          a[0] === "powermeter" ? -1 : b[0] === "powermeter" ? 1 : a[1].localeCompare(b[1]),
        )}
        set={(id) => setting(THEME_SETTING, id)}
      />
    </Row>
  );
  const playerLimit = settings["dpsMeter.playerLimit"] || "6";
  const actor = capture?.localPlayerId ? ` · 0x${capture.localPlayerId.toString(16).toUpperCase()}` : "";
  const displayName = `${draft.first.trim()} ${draft.last.trim()}`.trim() || pg || name;
  const photoStatus =
    draft.source === "upload"
      ? t("organizer.set.photoUploaded")
      : draft.source === "none"
        ? t("organizer.set.noPhoto")
        : !account
          ? t("organizer.set.discordPhotoSignIn")
          : account.avatarUrl
            ? `${t("organizer.set.photoFromDiscord")} · ${account.name}`
            : t("organizer.set.discordDefaultAvatar");

  const rows: Record<(typeof TABS)[number][0], ReactNode> = {
    generale: (
      <>
        <Row label={t("organizer.set.language")} desc={t("organizer.set.languageHint")}>
          <Select
            label={t("organizer.set.language")}
            value={lang}
            options={LANG_ORDER.map((c) => [c, LANGUAGES.find((l) => l.code === c)!.name])}
            set={(language) =>
              // Same order as onboarding: set_language also writes the setting.
              run(async () => {
                await save(LANGUAGE_SETTING, language);
                await invoke("set_language", { language });
              })
            }
          />
        </Row>
        {themeRow(t("organizer.set.theme"))}
        <Row label={t("organizer.set.startWithWindows")} desc={t("organizer.set.startWithWindowsHint")}>
          <Switch
            label={t("organizer.set.startWithWindows")}
            on={startWithWindows}
            set={(on) => run(() => invoke("set_start_with_windows", { on }).then(() => setStartWithWindows(on)))}
          />
        </Row>
        {fixed("organizer.set.trayOnClose")}
      </>
    ),
    meter: (
      <>
        <Row label={t("organizer.set.adapter")} desc={t("organizer.set.adapterHint")}>
          <Select
            label={t("organizer.set.adapter")}
            value={device}
            options={[["", [t("organizer.set.auto"), capture?.device].filter(Boolean).join(" · ")], ...same(devices)]}
            set={setDeviceTo}
          />
        </Row>
        <Row label={t("organizer.set.targetMode")}>
          <Select
            label={t("organizer.set.targetMode")}
            value={(settings["dpsMeter.defaultMeterMode"] || "bossTargets").replace("trainTargets", "pveTargets")}
            options={TARGET_MODES}
            set={(v) => setting("dpsMeter.defaultMeterMode", v)}
          />
        </Row>
        <Row label={t("organizer.set.actor")} desc={t("organizer.set.actorHint")}>
          <Select label={t("organizer.set.actor")} options={same([`${capture?.characterName || name}${actor}`])} />
        </Row>
        {fixed("organizer.set.autosave", true)}
        {fixed("organizer.set.autoUpload")}
        <Row label={t("organizer.set.visibility")}>
          <Select
            label={t("organizer.set.visibility")}
            options={["unlisted", "public", "private"].map((v) => [v, t(`organizer.set.vis.${v}`)])}
          />
        </Row>
      </>
    ),
    widget: (
      <>
        <Row label={t("organizer.set.opacity")}>
          {range(t("organizer.set.opacity"), widgetNumber("dpsMeter.windowOpacity"), 0, 100, (v) => setting("dpsMeter.windowOpacity", String(v)), {
            step: 5,
          })}
        </Row>
        <Row label={t("organizer.set.clickThrough")} desc={t("organizer.set.clickThroughHint")}>
          <Switch
            label={t("organizer.set.clickThrough")}
            on={clickThrough}
            set={(enabled) => run(() => invoke("set_click_through", { enabled }).then(() => setClickThrough(enabled)))}
          />
        </Row>
        <Row label={t("organizer.set.maxRows")}>
          <Select
            label={t("organizer.set.maxRows")}
            value={playerLimit}
            // The widget's own list (4-12), and any other saved value.
            options={same([...new Set([playerLimit, "4", "5", "6", "7", "8", "10", "12"])].sort((a, b) => +a - +b))}
            set={(v) => setting("dpsMeter.playerLimit", v)}
          />
        </Row>
        {themeRow(t("organizer.set.widgetTheme"))}
        {fixed("organizer.set.rememberPosition", true)}

        <h3 className="acctSection">{t("widgetset.appearance")}</h3>
        <Row label={t("widgetset.layout")}>
          <Select
            label={t("widgetset.layout")}
            value={widgetValue("dpsMeter.slimMode") === "true" ? "betaSlim" : "beta"}
            options={["beta", "betaSlim"].map((v) => [v, t(`widgetset.layout.${v}`)])}
            set={(v) => setting("dpsMeter.slimMode", String(v === "betaSlim"))}
          />
        </Row>
        <Row
          label={t("widgetset.monitor")}
          desc={!monitorFound ? t("widgetset.monitor.missing") : monitors && monitors.length <= 1 ? t("widgetset.monitor.single") : undefined}
        >
          <Select
            label={t("widgetset.monitor")}
            value={monitorFound ? savedMonitor : "off"}
            options={[["off", t("widgetset.monitor.off")], ...(monitors ?? []).map((m, i) => [String(m.index), monitorLabel(m, i)] as const)]}
            set={setMonitor}
          />
        </Row>
        <Row label={t("widgetset.barOpacity")}>
          {range(t("widgetset.barOpacity"), widgetNumber("dpsMeter.meterFillOpacity"), 10, 100, (v) => setting("dpsMeter.meterFillOpacity", String(v)), {
            step: 5,
          })}
        </Row>
        <Row label={t("widgetset.nameSize")}>
          {range(t("widgetset.nameSize"), widgetNumber("dpsMeter.bossNameSize"), 8, 20, (v) => setting("dpsMeter.bossNameSize", String(v)), {
            step: 0.5,
            format: (v) => `${v}px`,
          })}
        </Row>
        {widgetSwitch("dpsMeter.mainPlayerNamesBold", `${t("widgetset.bold")} · ${t("widgetset.boldNames")}`)}
        {widgetSwitch("dpsMeter.mainPlayerDpsBold", `${t("widgetset.bold")} · ${t("widgetset.boldDps")}`)}

        <h3 className="acctSection">{t("widgetset.meter")}</h3>
        {widgetSwitch("dpsMeter.pinMeToTop", t("widgetset.pinMeToTop"))}
        {widgetSwitch("dpsMeter.autoHideMeter", t("widgetset.autoHideMeter"))}
        {widgetSwitch("dpsMeter.showPing", t("widgetset.showPing"))}
        {widgetSwitch("dpsMeter.showTotalDps", t("widgetset.showTotalDps"))}
        {widgetSwitch("dpsMeter.roundDps", t("widgetset.roundDps"))}
        {widgetSwitch("dpsMeter.showSuspendBtn", t("widgetset.showSuspendBtn"))}

        <h3 className="acctSection">{t("widgetset.events")}</h3>
        <Row label={t("widgetset.volume")} desc={t("widgetset.volumeHint", { page: t("nav.timers") })}>
          {range(t("widgetset.volume"), volume, 0, 100, (v) => setting(VOLUME_KEY, String(v)), { step: 5 })}
          {button(t("widgetset.test"), () => chime(volume))}
        </Row>
        <Row label={t("widgetset.popup")} desc={t("widgetset.popupHint")}>
          <Switch label={t("widgetset.popup")} on={widgetValue(POPUP_KEY) !== "0"} set={(on) => setting(POPUP_KEY, on ? "1" : "0")} />
        </Row>
        <Row label={t("widgetset.popupDuration")} desc={t("widgetset.popupDurationHint")}>
          {range(t("widgetset.popupDuration"), seconds, 3, 30, (v) => setting(POPUP_SECONDS_KEY, String(v)), {
            format: (n) => t("widgetset.seconds", { n }),
          })}
          {button(t("widgetset.preview"), () => run(() => emit("pm-event-popup-test", { seconds })))}
        </Row>

        <h3 className="acctSection">{t("widgetset.connection")}</h3>
        <Row label={t("widgetset.character")} desc={t("widgetset.actorHint")}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>{capture?.characterName || t("widgetset.notDetected")}</span>
            <span aria-hidden="true" style={{ color: "var(--pm-t3)" }}>
              #
            </span>
            <input
              // Follows detection until the user binds one: a new id from the backend redraws it.
              key={capture?.localPlayerId ?? 0}
              className="setInput"
              style={{ width: 120, fontFamily: "var(--pm-mono)" }}
              inputMode="numeric"
              aria-label={t("widgetset.actorId")}
              placeholder="1234"
              defaultValue={capture?.localPlayerId ?? ""}
              onChange={(e) => (e.target.value = e.target.value.replace(/\D/g, ""))}
              onBlur={(e) => bindActor(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          </div>
        </Row>
        <Row
          label={t("widgetset.port")}
          desc={capture?.locked ? `${capture.device || "-"} · ${capture.ip || "-"}:${capture.port ?? "-"}` : t("widgetset.notDetected")}
        >
          {button(t("widgetset.reset"), () => run(() => invoke("reset_auto_detection")))}
        </Row>

        <h3 className="acctSection">{t("widgetset.diagnostics")}</h3>
        <Row label={t("widgetset.debugLogging")} desc={mayLog ? undefined : t("widgetset.logsRestricted")}>
          <Switch
            label={t("widgetset.debugLogging")}
            on={mayLog && settings[LOGS.debug[0]] === "true"}
            set={mayLog ? (on) => setLog("debug", on) : undefined}
          />
        </Row>
        <Row label={t("widgetset.saveRawPackets")} desc={mayLog ? undefined : t("widgetset.logsRestricted")}>
          <Switch
            label={t("widgetset.saveRawPackets")}
            on={mayLog && settings[LOGS.packets[0]] === "true"}
            set={mayLog ? (on) => setLog("packets", on) : undefined}
          />
        </Row>

        <h3 className="acctSection">{t("widgetset.advanced")}</h3>
        <Row label={t("widgetset.resetWidget")} desc={t("widgetset.resetHint")}>
          {button(t("widgetset.reset"), resetWidget)}
        </Row>
      </>
    ),
    scorciatoie: (
      <>
        {hotkey("organizer.set.keyToggle", settings["dpsMeter.toggleWindowHotkey"] || "Ctrl+Alt+Up", "dpsMeter.toggleWindowHotkey")}
        {hotkey("organizer.set.keyLock", settings["pm.clickThroughHotkey"] || "Ctrl+Alt+L")}
        {/* Unset, the backend registers Ctrl+Alt+R (lib.rs). */}
        {hotkey("organizer.set.keyReset", settings["dpsMeter.hotkey"] || "Ctrl+Alt+R", "dpsMeter.hotkey")}
        {hotkey("organizer.set.keyMode", "Ctrl+Shift+M")}
        {hotkey("organizer.set.keyScreenshot", "Ctrl+Shift+S")}
      </>
    ),
    account: (
      <>
        {/* Enter in any field submits: one Save for photo, names and character. */}
        <form
          className="acctForm"
          onSubmit={(e) => {
            e.preventDefault();
            if (dirty && !saving) saveProfile();
          }}
        >
          <div className="acctHero">
            <ProfileAvatar size={76} src={draftPhoto} name={displayName} label={t("organizer.set.photo")} />
            <div className="acctWho">
              <div className="acctName">{displayName}</div>
              <span className={account ? "acctChip on" : "acctChip"}>
                <DiscordLogoIcon aria-hidden="true" weight="fill" />
                {account ? account.name : t("organizer.set.discordNotLinked")}
              </span>
              <div className="acctPhoto">
                <label className="btn sm">
                  <UploadSimpleIcon aria-hidden="true" />
                  {t("organizer.set.uploadPhoto")}
                  <input
                    type="file"
                    accept={PHOTO_TYPES.join(",")}
                    className="srOnly"
                    onChange={(e) => {
                      pickPhoto(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="btn sm"
                  aria-pressed={draft.source === "discord"}
                  disabled={signingIn}
                  // Not signed in: sign in first, then use the avatar.
                  onClick={() => (account ? edit({ source: "discord" }) : signIn(() => edit({ source: "discord" })))}
                >
                  <DiscordLogoIcon aria-hidden="true" />
                  {t("organizer.set.useDiscordPhoto")}
                </button>
                <button
                  type="button"
                  className="btn sm icon"
                  title={t("organizer.set.removePhoto")}
                  aria-label={t("organizer.set.removePhoto")}
                  disabled={draft.source === "none"}
                  onClick={() => edit({ source: "none" })}
                >
                  <TrashIcon aria-hidden="true" />
                </button>
              </div>
              <div className="desc" aria-live="polite">
                {signingIn ? t("account.browser") : photoStatus}
              </div>
            </div>
          </div>

          <div className="acctFields">
            <label className="field">
              {t("organizer.set.firstName")}
              <input
                className="setInput"
                value={draft.first}
                autoComplete="given-name"
                placeholder={t("organizer.set.firstNamePh")}
                aria-describedby="acct-first-hint"
                onChange={(e) => edit({ first: e.target.value })}
              />
              <span id="acct-first-hint" className="desc">
                {t("organizer.set.firstNameHint")}
              </span>
            </label>
            <label className="field">
              {t("organizer.set.lastName")}
              <input
                className="setInput"
                value={draft.last}
                autoComplete="family-name"
                placeholder={t("organizer.set.lastNamePh")}
                aria-describedby="acct-last-hint"
                onChange={(e) => edit({ last: e.target.value })}
              />
              <span id="acct-last-hint" className="desc">
                {t("organizer.set.optional")}
              </span>
            </label>
            <label className="field wide">
              {t("organizer.set.character")}
              <input
                className="setInput"
                value={draft.pg}
                maxLength={NAME_MAX_LENGTH}
                placeholder={t("organizer.set.characterPh")}
                aria-describedby="acct-pg-hint"
                onChange={(e) => edit({ pg: e.target.value })}
              />
              <span id="acct-pg-hint" className="desc">
                {t("organizer.set.characterHint")}
              </span>
            </label>
          </div>

          <div className="acctSave">
            <span role="status" className={dirty ? "unsaved" : "saved"}>
              {dirty ? (
                t("organizer.set.unsaved")
              ) : savedNow ? (
                <>
                  <CheckIcon aria-hidden="true" />
                  {t("organizer.set.saved")}
                </>
              ) : null}
            </span>
            <button type="submit" className="btn fill" disabled={!dirty || saving}>
              {t("organizer.set.saveProfile")}
            </button>
          </div>
        </form>

        <h3 className="acctSection">{t("organizer.set.connectedAccounts")}</h3>
        <Row label="Discord" desc={account ? `${account.name} · ${t("organizer.set.linked")}` : signingIn ? t("account.browser") : t("account.body")}>
          {account ? (
            button(t("organizer.set.disconnect"), signOut)
          ) : (
            <button type="button" className="btn" disabled={signingIn || account === undefined} onClick={() => signIn()}>
              <DiscordLogoIcon aria-hidden="true" />
              {t("account.discord")}
            </button>
          )}
        </Row>
        {entitlement?.admin && (
          <Row label={t("nav.admin")} desc={t("admin.settingsHint")}>
            <button type="button" className="btn" onClick={() => go("admin")}>
              <ShieldCheckIcon aria-hidden="true" />
              {t("admin.open")}
            </button>
          </Row>
        )}
        {/* Supporter status doesn't exist yet (R6): an honest invitation, no fake "since" date. */}
        <Row label="Patreon" desc={t("organizer.set.patreonHint")}>
          <button type="button" className="btn" onClick={() => open(PATREON_URL)}>
            <HeartIcon aria-hidden="true" />
            {t("organizer.set.becomeSupporter")}
          </button>
        </Row>
        <Row label={t("organizer.set.autoUpload")} desc={t("organizer.set.autoUploadHint")}>
          <Switch
            label={t("organizer.set.autoUpload")}
            on={settings["pm.autoUpload"] !== "false"}
            set={(on) => setting("pm.autoUpload", String(on))}
          />
        </Row>
      </>
    ),
    dati: (
      <>
        <Row label={t("organizer.set.exportAll")} desc={t("organizer.set.exportAllHint")}>
          {button(t("organizer.set.export"))}
        </Row>
        <Row label={t("organizer.set.import")} desc={t("organizer.set.importHint")}>
          {button(t("organizer.set.import"))}
        </Row>
        <Row label={t("organizer.set.logsFolder")}>
          {button(t("organizer.set.openFolder"))}
        </Row>
        <Row label={t("organizer.set.clearCache")}>
          {button(t("organizer.set.clear"))}
        </Row>
      </>
    ),
    notifiche: (
      <>
        <Row label={t("organizer.set.webhook")} desc="https://discord.com/api/webhooks/…">
          {button(t("organizer.set.testNotification"))}
        </Row>
        {fixed("organizer.set.notifyTimers")}
        {fixed("organizer.set.notifyResets")}
        {fixed("organizer.set.notifyRecords")}
        {fixed("organizer.set.notifyWindows")}
      </>
    ),
    info: (
      <>
        <Row label={t("organizer.set.version")} desc={version && `PowerMeter ${version}`}>
          {button(t("organizer.set.checkUpdates"), () => open(`${REPO_URL}/releases`))}
        </Row>
        <Row label={t("organizer.set.license")} desc="GPL-3.0">
          {button(t("organizer.set.read"), () => open(`${REPO_URL}/blob/main/LICENSE`))}
        </Row>
        <Row label={t("organizer.set.disclaimer")} desc={t("organizer.set.disclaimerText")}>
          {button(t("organizer.set.credits"), () => go("supporter"))}
        </Row>
      </>
    ),
  };

  const current = TABS.find(([id]) => id === tab)!;
  return (
    <div className="setLayout">
      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }} aria-label={t("nav.settings")}>
        {TABS.map(([id, label, Icon]) => (
          <button key={id} type="button" className="setTab" aria-current={id === tab} onClick={() => setTab(id)}>
            <Icon aria-hidden="true" />
            {t(label)}
            {id === "account" && dirty && (
              <span className="dot" style={{ marginLeft: "auto", background: "var(--pm-warn)" }} title={t("organizer.set.unsaved")}>
                <span className="srOnly">{t("organizer.set.unsaved")}</span>
              </span>
            )}
          </button>
        ))}
      </nav>
      <section className="card" style={{ padding: "6px 18px" }}>
        <h2 style={{ fontSize: 16, fontWeight: 500, padding: "12px 0 6px" }}>{t(current[1])}</h2>
        {rows[tab]}
      </section>
    </div>
  );
}
