import { useEffect, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
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
  SlidersIcon,
  TrashIcon,
  UploadSimpleIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { LANGUAGE_SETTING, LANGUAGES, type Key } from "../i18n";
import { PATREON_URL, USER_NAME_KEY, type CaptureStatus } from "../Shell";
import { usePoll } from "../usePoll";
import { ProfileAvatar } from "../ui";
import { PALETTE_SETTING, PALETTES } from "./system/theme";
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
  ["trainTargets", "Train"],
  ["pvpTargets", "PvP"],
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
  const capture = usePoll(getCapture, 2000).data;

  useEffect(() => {
    run(() => invoke<boolean>("get_click_through").then(setClickThrough));
    // On failure: treat as signed out so "Sign in" stays usable.
    run(() => invoke<Account | null>("pm_account").then(setAccount, (e) => (setAccount(null), Promise.reject(e))));
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

  const palette = PALETTES.find((p) => p === settings[PALETTE_SETTING]) ?? "brace";
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
                placeholder="Kaelthas"
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
        {/* Supporter status doesn't exist yet (R6): an honest invitation, no fake "since" date. */}
        <Row label="Patreon" desc={t("organizer.set.patreonHint")}>
          <button type="button" className="btn" onClick={() => open(PATREON_URL)}>
            <HeartIcon aria-hidden="true" />
            {t("organizer.set.becomeSupporter")}
          </button>
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
