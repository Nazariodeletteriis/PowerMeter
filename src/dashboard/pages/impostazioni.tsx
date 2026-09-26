import { useEffect, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  BellIcon,
  DatabaseIcon,
  DiscordLogoIcon,
  GaugeIcon,
  InfoIcon,
  KeyboardIcon,
  PictureInPictureIcon,
  SlidersIcon,
  TrashIcon,
  UploadSimpleIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { LANGUAGE_SETTING, LANGUAGES, type Key } from "../i18n";
import { PATREON_URL, USER_NAME_KEY, type CaptureStatus } from "../Shell";
import { usePoll } from "../usePoll";
import { PALETTE_SETTING, PALETTES } from "./system/theme";
import "./system/system.css";
import type { PageProps } from "./types";

const REPO_URL = "https://github.com/Nazariodeletteriis/PowerMeter";
const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
const NAME_MAX_LENGTH = 32; // same cap as onboarding

const TABS = [
  ["generale", "organizer.set.general", SlidersIcon],
  ["meter", "organizer.set.meter", GaugeIcon],
  ["widget", "organizer.set.widget", PictureInPictureIcon],
  ["scorciatoie", "organizer.set.shortcuts", KeyboardIcon],
  ["account", "organizer.set.account", UserCircleIcon],
  ["dati", "organizer.set.data", DatabaseIcon],
  ["notifiche", "organizer.set.notifications", BellIcon],
  ["info", "organizer.set.about", InfoIcon],
] as const;
// Prototype order for the language list.
const LANG_ORDER = ["it", "en", "de", "fr", "es", "pt", "ru", "ja", "ko", "zh-Hans", "zh-Hant"];
const TARGET_MODES = [
  ["bossTargets", "Boss"],
  ["lastHitByMe", "Last Hit"],
  ["allTargets", "All Targets"],
  ["trainTargets", "Train"],
] as const;
// Switches the engine has no setting for yet: sample state, prototype defaults.
const SAMPLE_SWITCHES = { boot: true, tray: true, autosave: true, autoup: false, pos: true, n1: true, n2: true, n3: true, n4: true };

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

function Switch({ label, on, set }: { label: string; on: boolean; set: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="switch" onClick={() => set(!on)}>
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
  const [sw, setSw] = useState<Record<string, boolean>>(SAMPLE_SWITCHES);
  const [scale, setScale] = useState(100);
  const [clickThrough, setClickThrough] = useState(false);
  const [devices, setDevices] = useState<string[]>([]);
  const [device, setDevice] = useState(""); // "" = automatic
  const [version, setVersion] = useState("");
  const [profile, setProfile] = useState({ first: "", last: "", pg: localStorage.getItem(USER_NAME_KEY) ?? "" });
  const [photo, setPhoto] = useState<"discord" | "upload" | "none">("discord");
  const [photoUrl, setPhotoUrl] = useState("");
  const capture = usePoll(getCapture, 2000).data;

  useEffect(() => {
    run(() => invoke<boolean>("get_click_through").then(setClickThrough));
    run(() => invoke<string[]>("get_available_devices").then(setDevices));
    run(() => invoke<string>("get_app_version").then(setVersion));
  }, []); // once per visit: `run` is a new function every render

  const flag = (id: keyof typeof SAMPLE_SWITCHES, label: string) => (
    <Switch label={label} on={sw[id]} set={(on) => setSw({ ...sw, [id]: on })} />
  );
  const setting = (key: string, value: string) => run(() => save(key, value));
  const open = (url: string) => run(() => invoke("open_url", { url }));
  const button = (text: string, onClick?: () => void) => (
    <button type="button" className="btn" onClick={onClick}>
      {text}
    </button>
  );
  const range = (label: string, value: number, min: number, max: number, set: (v: number) => void) => (
    <div className="setRange">
      <input type="range" aria-label={label} min={min} max={max} value={value} onChange={(e) => set(Number(e.target.value))} />
      <span>{value}%</span>
    </div>
  );
  const hotkey = (label: Key, keys: string, real?: boolean) => (
    <Row key={label} label={t(label)}>
      {/* The engine's own settings window records hotkeys; sample ones are inert. */}
      {real ? (
        <button type="button" className="keyChip" title={t("organizer.set.clickToEdit")} onClick={() => run(() => invoke("open_settings_window"))}>
          {keys}
        </button>
      ) : (
        <span className="keyChip">{keys}</span>
      )}
    </Row>
  );

  const pickPhoto = (file?: File) => {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type) || file.size > PHOTO_MAX_BYTES) {
      run(() => Promise.reject(t("organizer.set.photoInvalid")));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoUrl(String(reader.result));
      setPhoto("upload");
    };
    reader.readAsDataURL(file);
  };
  // Empty means "detect it from the game window", like onboarding.
  const saveCharacter = () => {
    const trimmed = profile.pg.trim();
    if (!trimmed || trimmed === localStorage.getItem(USER_NAME_KEY)) return;
    localStorage.setItem(USER_NAME_KEY, trimmed);
    run(() => invoke("set_character_name", { name: trimmed }));
  };
  const setDeviceTo = (d: string) => {
    setDevice(d);
    run(() => invoke("set_manual_device", { device: d }).then(() => invoke("reset_auto_detection")));
  };

  const palette = PALETTES.find((p) => p === settings[PALETTE_SETTING]) ?? "brace";
  const playerLimit = settings["dpsMeter.playerLimit"] || "6";
  const actor = capture?.localPlayerId ? ` · 0x${capture.localPlayerId.toString(16).toUpperCase()}` : "";
  const photoBg =
    photo === "upload" ? `url(${photoUrl}) center/cover` : photo === "discord" ? "linear-gradient(135deg,#5865F2,#3B44C4)" : "var(--pm-s3)";

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
        <Row label={t("organizer.set.theme")} desc={t("organizer.set.themeHint")}>
          <Select
            label={t("organizer.set.theme")}
            value={palette}
            options={PALETTES.map((p) => [p, t(`organizer.palette.${p}`)])}
            set={(p) => setting(PALETTE_SETTING, p)}
          />
        </Row>
        <Row label={t("organizer.set.startWithWindows")}>{flag("boot", t("organizer.set.startWithWindows"))}</Row>
        <Row label={t("organizer.set.trayOnClose")}>{flag("tray", t("organizer.set.trayOnClose"))}</Row>
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
            value={settings["dpsMeter.defaultMeterMode"] || "bossTargets"}
            options={TARGET_MODES}
            set={(v) => setting("dpsMeter.defaultMeterMode", v)}
          />
        </Row>
        <Row label={t("organizer.set.actor")} desc={t("organizer.set.actorHint")}>
          <Select label={t("organizer.set.actor")} options={same([`${capture?.characterName || name}${actor}`])} />
        </Row>
        <Row label={t("organizer.set.autosave")}>{flag("autosave", t("organizer.set.autosave"))}</Row>
        <Row label={t("organizer.set.autoUpload")}>{flag("autoup", t("organizer.set.autoUpload"))}</Row>
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
          {range(t("organizer.set.opacity"), Number(settings["dpsMeter.windowOpacity"] ?? 60), 0, 100, (v) =>
            setting("dpsMeter.windowOpacity", String(v)),
          )}
        </Row>
        <Row label={t("organizer.set.scale")} desc={t("organizer.set.scaleHint")}>
          {range(t("organizer.set.scale"), scale, 75, 150, setScale)}
        </Row>
        <Row label={t("organizer.set.clickThrough")} desc={t("organizer.set.clickThroughHint")}>
          <Switch
            label={t("organizer.set.clickThrough")}
            on={clickThrough}
            set={(enabled) => run(() => invoke("set_click_through", { enabled }).then(() => setClickThrough(enabled)))}
          />
        </Row>
        <Row label={t("organizer.set.columns")} desc={t("organizer.set.columnsHint")}>
          <Select
            label={t("organizer.set.columns")}
            options={["colsA", "colsB", "colsC"].map((v) => [v, t(`organizer.set.${v}`)])}
          />
        </Row>
        <Row label={t("organizer.set.maxRows")}>
          <Select
            label={t("organizer.set.maxRows")}
            value={playerLimit}
            // Keep a value set in the meter that is not in the prototype's list.
            options={same([...new Set([playerLimit, "6", "8", "12", "24"])].sort((a, b) => +a - +b))}
            set={(v) => setting("dpsMeter.playerLimit", v)}
          />
        </Row>
        <Row label={t("organizer.set.widgetTheme")}>
          <Select
            label={t("organizer.set.widgetTheme")}
            options={["followApp", "highContrast", "minimal"].map((v) => [v, t(`organizer.set.${v}`)])}
          />
        </Row>
        <Row label={t("organizer.set.rememberPosition")}>{flag("pos", t("organizer.set.rememberPosition"))}</Row>
      </>
    ),
    scorciatoie: (
      <>
        {hotkey("organizer.set.keyToggle", settings["dpsMeter.toggleWindowHotkey"] || "Ctrl+Alt+Up", true)}
        {hotkey("organizer.set.keyLock", settings["pm.clickThroughHotkey"] || "Ctrl+Alt+L")}
        {hotkey("organizer.set.keyReset", settings["dpsMeter.hotkey"] || "Ctrl+Alt+Shift+R", true)}
        {hotkey("organizer.set.keyMode", "Ctrl+Shift+M")}
        {hotkey("organizer.set.keyScreenshot", "Ctrl+Shift+S")}
      </>
    ),
    account: (
      <>
        <Row label={t("organizer.set.photo")} desc={t("organizer.set.photoHint")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              role="img"
              aria-label={t("organizer.set.photo")}
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: photoBg,
                boxShadow: "0 0 0 2px var(--pm-line)",
                display: "grid",
                placeItems: "center",
                fontSize: 20,
                fontWeight: 600,
                color: "#FFFFFF",
                flex: "none",
              }}
            >
              {photo === "discord" && name.charAt(0).toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", gap: 6 }}>
                <label className="btn fill" style={{ fontSize: 12 }}>
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
                  className="btn"
                  style={{ fontSize: 12, borderColor: photo === "discord" ? "var(--pm-red)" : undefined }}
                  onClick={() => setPhoto("discord")}
                >
                  <DiscordLogoIcon aria-hidden="true" />
                  {t("organizer.set.useDiscordPhoto")}
                </button>
                <button
                  type="button"
                  className="btn"
                  title={t("organizer.set.removePhoto")}
                  aria-label={t("organizer.set.removePhoto")}
                  style={{ width: 32, padding: 0, color: "var(--pm-t2)" }}
                  onClick={() => setPhoto("none")}
                >
                  <TrashIcon aria-hidden="true" />
                </button>
              </div>
              <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>
                {photo === "upload"
                  ? t("organizer.set.photoUploaded")
                  : photo === "discord"
                    ? `${t("organizer.set.photoFromDiscord")} · kaelthas`
                    : t("organizer.set.noPhoto")}
              </span>
            </div>
          </div>
        </Row>
        <Row label={t("organizer.set.firstName")} desc={t("organizer.set.firstNameHint")}>
          <input
            className="setInput"
            aria-label={t("organizer.set.firstName")}
            value={profile.first}
            placeholder={t("organizer.set.firstNamePh")}
            onChange={(e) => setProfile({ ...profile, first: e.target.value })}
          />
        </Row>
        <Row label={t("organizer.set.lastName")} desc={t("organizer.set.optional")}>
          <input
            className="setInput"
            aria-label={t("organizer.set.lastName")}
            value={profile.last}
            placeholder={t("organizer.set.lastNamePh")}
            onChange={(e) => setProfile({ ...profile, last: e.target.value })}
          />
        </Row>
        <Row label={t("organizer.set.character")} desc={t("organizer.set.characterHint")}>
          <input
            className="setInput"
            aria-label={t("organizer.set.character")}
            value={profile.pg}
            maxLength={NAME_MAX_LENGTH}
            placeholder="Kaelthas"
            onChange={(e) => setProfile({ ...profile, pg: e.target.value })}
            onBlur={saveCharacter}
            onKeyDown={(e) => e.key === "Enter" && saveCharacter()}
          />
        </Row>
        <Row label="Discord" desc={`kaelthas · ${t("organizer.set.linked")}`}>
          {button(t("organizer.set.disconnect"))}
        </Row>
        <Row label="Patreon" desc={t("organizer.set.patreonSince")}>
          {button(t("organizer.set.manage"), () => open(PATREON_URL))}
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
        <Row label={t("organizer.set.logsFolder")} desc="C:\Users\…\PowerMeter\logs · 412 MB">
          {button(t("organizer.set.openFolder"))}
        </Row>
        <Row label={t("organizer.set.clearCache")} desc="84 MB">
          {button(t("organizer.set.clear"))}
        </Row>
      </>
    ),
    notifiche: (
      <>
        <Row label={t("organizer.set.webhook")} desc="https://discord.com/api/webhooks/…">
          {button(t("organizer.set.testNotification"))}
        </Row>
        <Row label={t("organizer.set.notifyTimers")}>{flag("n1", t("organizer.set.notifyTimers"))}</Row>
        <Row label={t("organizer.set.notifyResets")}>{flag("n2", t("organizer.set.notifyResets"))}</Row>
        <Row label={t("organizer.set.notifyRecords")}>{flag("n3", t("organizer.set.notifyRecords"))}</Row>
        <Row label={t("organizer.set.notifyWindows")}>{flag("n4", t("organizer.set.notifyWindows"))}</Row>
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
