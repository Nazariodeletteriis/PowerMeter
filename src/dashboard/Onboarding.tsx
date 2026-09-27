import { useEffect, useRef, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  CheckCircleIcon,
  CircleDashedIcon,
  DiscordLogoIcon,
  InfoIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import type { SaveSetting, Settings } from "./App";
import { LANGUAGE_SETTING, LANGUAGES, type Key, type T } from "./i18n";
import { USER_NAME_KEY } from "./Shell";
import { CLASSES, Logo } from "./ui";
import { usePoll } from "./usePoll";

// Region names are short codes, so they are not translated. Only the EU/NA
// servers PowerMeter supports are offered; a saved "kr"/"tw" falls back to EU.
export const REGIONS = [
  { value: "global-eu", label: "EU" },
  { value: "us-na", label: "NA" },
];
// Prototype order (Brawler has no art yet and is not offered).
const CLASS_OPTIONS = ["Sorcerer", "Gladiator", "Templar", "Assassin", "Ranger", "Spiritmaster", "Cleric", "Chanter"];

// The meter keeps the character name in localStorage under USER_NAME_KEY
// (core.js storageKeys.userName) and pushes it to the backend with
// set_character_name. All windows share one origin, so the meter reads it.
const NAME_MAX_LENGTH = 32;
const STEPS = 5;
const NPCAP_URL = "https://npcap.com/#download";

const checkNpcap = () => invoke<boolean>("npcap_installed");
const checkAdmin = () => invoke<boolean>("is_admin");
const checkGame = () => invoke<string | null>("get_aion2_window_title");

type Props = { t: T; lang: string; settings: Settings; save: SaveSetting; startStep: number };

export function Onboarding({ t, lang, settings, save, startStep }: Props) {
  const [step, setStep] = useState(startStep);
  const nav = {
    t,
    step,
    onBack: () => setStep((s) => s - 1),
    onNext: () => setStep((s) => s + 1),
  };
  switch (step) {
    case 1:
      return <Welcome {...nav} lang={lang} save={save} />;
    case 2:
      return <Requirements {...nav} />;
    case 3:
      return <Character {...nav} settings={settings} save={save} />;
    case 4:
      return <Account {...nav} />;
    default:
      return <Disclaimer {...nav} save={save} />;
  }
}

type StepProps = { t: T; step: number; onBack: () => void; onNext: () => void };

/** Runs an invoke-backed action, tracking busy state and the error to show. */
function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function Frame({
  t,
  step,
  onBack,
  title,
  hero,
  gap = hero ? 14 : 12,
  error,
  next,
  children,
}: StepProps & { title: ReactNode; hero?: boolean; gap?: number; error?: string; next: ReactNode; children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  // Each step mounts its own Frame: moving focus to the title lets keyboard
  // and screen reader users follow the step change.
  useEffect(() => heading.current?.focus(), []);
  return (
    <main className="onboarding">
      <div className="onbColumn">
        <div className="onbDots" aria-hidden="true">
          {Array.from({ length: STEPS }, (_, k) => (
            <span key={k} className={k < step ? "on" : undefined} />
          ))}
        </div>
        <div className="onbStep">{t("onboarding.step", { n: step, total: STEPS })}</div>
        <div className="onbBody" style={{ gap }}>
          {hero && <Logo size={44} />}
          <h1 ref={heading} tabIndex={-1} className={hero ? "hero" : undefined}>
            {title}
          </h1>
          {children}
          {error && (
            <p className="error" role="alert">
              {t("common.error", { message: error })}
            </p>
          )}
        </div>
        <div className="onbFoot">
          {/* Shown on step 1 too, like the prototype, but inert there. */}
          <button type="button" className="btn lg" onClick={onBack} disabled={step === 1}>
            {t("common.back")}
          </button>
          {next}
        </div>
      </div>
    </main>
  );
}

function NextButton({ t, onNext, disabled }: StepProps & { disabled?: boolean }) {
  return (
    <button type="button" className="btn fill lg next" onClick={onNext} disabled={disabled}>
      {t("common.continue")}
    </button>
  );
}

function Welcome(props: StepProps & { lang: string; save: SaveSetting }) {
  const { t, lang, save } = props;
  const { busy, error, run } = useAction();
  const changeLanguage = (language: string) =>
    run(async () => {
      // Same order as tauriBridge.js setSetting: set_language also writes the
      // setting, so calling it first would swallow the setting-changed event.
      await save(LANGUAGE_SETTING, language);
      await invoke("set_language", { language });
    });
  return (
    <Frame {...props} hero title={t("welcome.title")} error={error} next={<NextButton {...props} />}>
      <p className="lead">{t("welcome.body")}</p>
      <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: "var(--pm-t2)" }}>{t("welcome.language")}</span>
        <select className="input sm" value={lang} disabled={busy} onChange={(e) => changeLanguage(e.target.value)}>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name}
            </option>
          ))}
        </select>
      </label>
    </Frame>
  );
}

function Requirements(props: StepProps) {
  const { t } = props;
  const npcap = usePoll(checkNpcap, 2000);
  const admin = usePoll(checkAdmin, 2000);
  const game = usePoll(checkGame, 2000);
  const { busy, error, run } = useAction();
  const ready = npcap.data === true && admin.data === true;
  // Download and launch the official installer; if that fails, fall back to
  // the download page so the user is never stuck.
  const installNpcap = () =>
    run(() => invoke("install_npcap")).then((ok) => ok || invoke("open_url", { url: NPCAP_URL }));
  return (
    <Frame
      {...props}
      title={t("req.title")}
      gap={10}
      error={error}
      next={<NextButton {...props} disabled={!ready} />}
    >
      <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* The app only ships for Windows x64, so running it proves this one. */}
        <Req t={t} label="req.windows" state="ok" />
        <Req
          t={t}
          label="req.npcap"
          state={npcap.error ? "bad" : npcap.data === undefined ? "pending" : npcap.data ? "ok" : "bad"}
          hint={npcap.error ?? (npcap.data ? undefined : t(busy ? "req.npcapDownloading" : "req.npcapHint"))}
        >
          {!npcap.data && (
            <button type="button" className="btn fill sm" onClick={installNpcap} disabled={busy}>
              {t("req.npcapInstall")}
            </button>
          )}
        </Req>
        <Req
          t={t}
          label="req.admin"
          state={admin.error ? "bad" : admin.data === undefined ? "pending" : admin.data ? "ok" : "warn"}
          hint={admin.error ?? (admin.data === false ? t("req.adminHint") : undefined)}
        />
        <Req
          t={t}
          label="req.game"
          optional
          state={game.data ? "ok" : "pending"}
          hint={game.error}
        />
      </ul>
      {!ready && <p className="onbInfo">{t("req.blocked")}</p>}
    </Frame>
  );
}

const REQ_ICON = {
  ok: [CheckCircleIcon, "#3FBF7F", "req.ok"],
  bad: [XCircleIcon, "#FF4D4D", "req.missing"],
  warn: [WarningCircleIcon, "#E8B03A", "req.missing"],
  pending: [CircleDashedIcon, "var(--pm-t3)", "req.notDetected"],
} as const;

function Req({
  t,
  label,
  state,
  hint,
  optional,
  children,
}: {
  t: T;
  label: Key;
  state: keyof typeof REQ_ICON;
  hint?: string;
  optional?: boolean;
  children?: ReactNode;
}) {
  const [Icon, color, text] = REQ_ICON[state];
  const faded = optional && state !== "ok";
  return (
    <li className={hint ? "reqRow tall" : "reqRow"}>
      <Icon weight={state === "pending" ? "regular" : "fill"} style={{ color }} aria-hidden="true" />
      <div className="what" style={faded ? { color: "var(--pm-t2)" } : undefined}>
        <div>
          {t(label)}
          {optional && <span style={{ color: "var(--pm-t3)" }}> {t("common.optional")}</span>}
          <span className="srOnly">: {t(text)}</span>
        </div>
        {hint && <div className="hint">{hint}</div>}
      </div>
      {children}
    </li>
  );
}

function Character(props: StepProps & { settings: Settings; save: SaveSetting }) {
  const { t, settings, save, onNext } = props;
  const [region, setRegion] = useState(REGIONS.find((r) => r.value === settings["pm.region"])?.value ?? REGIONS[0].value);
  const [name, setName] = useState(() => localStorage.getItem(USER_NAME_KEY) ?? "");
  const [cls, setCls] = useState(settings["pm.class"] || CLASS_OPTIONS[0]);
  const { busy, error, run } = useAction();

  const submit = async () => {
    const trimmed = name.trim();
    const saved = await run(async () => {
      if (!(cls in CLASSES)) throw new Error(`unknown class ${cls}`);
      await save("pm.region", region);
      await save("pm.class", cls);
      // Empty means "detect it from the game window", so keep what the meter has.
      if (trimmed) {
        localStorage.setItem(USER_NAME_KEY, trimmed);
        await invoke("set_character_name", { name: trimmed });
      }
    });
    if (saved) onNext();
  };

  return (
    <Frame
      {...props}
      title={t("char.title")}
      error={error}
      next={
        <button type="submit" form="characterForm" className="btn fill lg next" disabled={busy}>
          {t("common.continue")}
        </button>
      }
    >
      <form
        id="characterForm"
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="field">
          {t("char.region")}
          <select className="input" value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {t("char.name")}
          <input
            className="input"
            value={name}
            maxLength={NAME_MAX_LENGTH}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="field">
          {t("char.class")}
          <select className="input" value={cls} onChange={(e) => setCls(e.target.value)}>
            {CLASS_OPTIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <p className="onbInfo">
          <InfoIcon aria-hidden="true" /> {t("char.nameHint")}
        </p>
      </form>
    </Frame>
  );
}

function Account(props: StepProps) {
  const { t, onNext } = props;
  const { busy, error, run } = useAction();
  const login = () => run(() => invoke("pm_login")).then((ok) => ok && onNext());
  return (
    <Frame
      {...props}
      error={error}
      title={
        <>
          {t("account.title")} <span style={{ color: "var(--pm-t3)", fontSize: 14 }}>{t("common.optional")}</span>
        </>
      }
      next={<NextButton {...props} />}
    >
      <p className="lead">{t("account.body")}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn discordBtn" disabled={busy} onClick={login}>
          <DiscordLogoIcon aria-hidden="true" />
          {t("account.discord")}
        </button>
        <button type="button" className="btn" style={{ height: 40, padding: "0 16px" }} onClick={onNext}>
          {t("account.later")}
        </button>
      </div>
      {busy && <p className="onbInfo">{t("account.browser")}</p>}
    </Frame>
  );
}

function Disclaimer(props: StepProps & { save: SaveSetting }) {
  const { t, save } = props;
  const [accepted, setAccepted] = useState(false);
  const { busy, error, run } = useAction();
  // Completing onboarding flips pm.onboarded, which makes App show the shell.
  const finish = () =>
    run(async () => {
      await save("pm.disclaimerAccepted", "1");
      await save("pm.onboarded", "1");
    });
  return (
    <Frame
      {...props}
      title={t("disclaimer.title")}
      error={error}
      next={
        <button type="button" className="btn fill lg next" disabled={!accepted || busy} onClick={finish}>
          {t("disclaimer.finish")}
        </button>
      }
    >
      <div className="notice">{t("disclaimer.body")}</div>
      <label className="check">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        {t("disclaimer.accept")}
      </label>
    </Frame>
  );
}
