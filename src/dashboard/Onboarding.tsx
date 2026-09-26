import { useEffect, useRef, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import logo from "../assets/logo.png";
import type { SaveSetting, Settings } from "./App";
import { LANGUAGE_SETTING, LANGUAGES, type Key, type T } from "./i18n";
import { usePoll, type Polled } from "./usePoll";

// Region names are shown as the game shows them, so they are not translated.
export const REGIONS = [
  { value: "global-eu", label: "Global / EU" },
  { value: "us-na", label: "US / NA" },
  { value: "kr-tw", label: "KR / TW" },
];

// The meter keeps the character name in localStorage under this key (core.js
// storageKeys.userName) and pushes it to the backend with set_character_name.
// All windows share one origin, so the meter reads what we write here.
export const USER_NAME_KEY = "dpsMeter.userName";
const NAME_MAX_LENGTH = 32;
const STEPS = 5;
const NPCAP_URL = "https://npcap.com/#download";

const checkNpcap = () => invoke<boolean>("npcap_installed");
const checkAdmin = () => invoke<boolean>("is_admin");
const checkGame = () => invoke<string | null>("get_aion2_window_title");

type Props = { t: T; lang: string; settings: Settings; save: SaveSetting };

export function Onboarding({ t, lang, settings, save }: Props) {
  const [step, setStep] = useState(1);
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
      return (
        <Frame {...nav} title="account.title" next={<NextButton {...nav} />}>
          <p>{t("account.body")}</p>
        </Frame>
      );
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
  error,
  next,
  children,
}: StepProps & { title: Key; error?: string; next: ReactNode; children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  // Each step mounts its own Frame: moving focus to the title lets keyboard
  // and screen reader users follow the step change.
  useEffect(() => heading.current?.focus(), []);
  return (
    <main className="onboarding">
      <section className="onboardingCard">
        <header className="onboardingHead">
          <img src={logo} alt="" width={32} height={32} />
          <span className="muted">{t("onboarding.step", { n: step, total: STEPS })}</span>
        </header>
        <h1 ref={heading} tabIndex={-1}>
          {t(title)}
        </h1>
        {children}
        {error && (
          <p className="error" role="alert">
            {t("common.error", { message: error })}
          </p>
        )}
        <footer className="onboardingFoot">
          {step > 1 && (
            <button type="button" onClick={onBack}>
              {t("common.back")}
            </button>
          )}
          {next}
        </footer>
      </section>
    </main>
  );
}

function NextButton({ t, onNext, disabled }: StepProps & { disabled?: boolean }) {
  return (
    <button type="button" className="primary" onClick={onNext} disabled={disabled}>
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
    <Frame {...props} title="welcome.title" error={error} next={<NextButton {...props} />}>
      <p>{t("welcome.body")}</p>
      <label className="field">
        <span>{t("welcome.language")}</span>
        <select value={lang} disabled={busy} onChange={(e) => changeLanguage(e.target.value)}>
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
    run(() => invoke("install_npcap")).then(
      (ok) => ok || invoke("open_url", { url: NPCAP_URL }),
    );
  return (
    <Frame
      {...props}
      title="req.title"
      error={error}
      next={<NextButton {...props} disabled={!ready} />}
    >
      <p>{t("req.body")}</p>
      <ul className="checks">
        <Check t={t} label="req.npcap" state={npcap}>
          <p className="muted">{t(busy ? "req.npcapDownloading" : "req.npcapHint")}</p>
          <button type="button" onClick={installNpcap} disabled={busy}>
            {t("req.npcapInstall")}
          </button>
        </Check>
        <Check t={t} label="req.admin" state={admin}>
          <p className="muted">{t("req.adminHint")}</p>
        </Check>
        <Check
          t={t}
          label="req.game"
          state={{ error: game.error, data: game.data === undefined ? undefined : game.data !== null }}
          optional
        >
          <p className="muted">{t("req.gameHint")}</p>
        </Check>
      </ul>
      {!ready && <p className="muted">{t("req.blocked")}</p>}
    </Frame>
  );
}

function Check({
  t,
  label,
  state,
  optional,
  children,
}: {
  t: T;
  label: Key;
  state: Polled<boolean>;
  optional?: boolean;
  children: ReactNode;
}) {
  const [cls, text] = state.error
    ? ["bad", t("common.error", { message: state.error })]
    : state.data === undefined
      ? ["", t("req.checking")]
      : state.data
        ? ["ok", t("req.ok")]
        : [optional ? "" : "bad", t(optional ? "req.notDetected" : "req.missing")];
  return (
    <li className="check">
      <div className="checkRow">
        <span>{t(label)}</span>
        <span className={`tag ${cls}`}>{text}</span>
      </div>
      {!state.data && children}
    </li>
  );
}

function Character(props: StepProps & { settings: Settings; save: SaveSetting }) {
  const { t, settings, save, onNext } = props;
  const [region, setRegion] = useState(settings["pm.region"] || REGIONS[0].value);
  const [name, setName] = useState(() => localStorage.getItem(USER_NAME_KEY) ?? "");
  const { busy, error, run } = useAction();

  const submit = async () => {
    const trimmed = name.trim();
    const saved = await run(async () => {
      await save("pm.region", region);
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
      title="char.title"
      error={error}
      next={
        <button type="submit" form="characterForm" className="primary" disabled={busy}>
          {t("common.continue")}
        </button>
      }
    >
      <p>{t("char.body")}</p>
      <form
        id="characterForm"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="field">
          <span>{t("char.region")}</span>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("char.name")}</span>
          <input
            value={name}
            maxLength={NAME_MAX_LENGTH}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="nameHint"
            onChange={(e) => setName(e.target.value)}
          />
          <small id="nameHint" className="muted">
            {t("char.nameHint")}
          </small>
        </label>
      </form>
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
      title="disclaimer.title"
      error={error}
      next={
        <button type="button" className="primary" disabled={!accepted || busy} onClick={finish}>
          {t("disclaimer.finish")}
        </button>
      }
    >
      <p>{t("disclaimer.body")}</p>
      <label className="checkbox">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        <span>{t("disclaimer.accept")}</span>
      </label>
    </Frame>
  );
}
