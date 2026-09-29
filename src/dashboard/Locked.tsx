import { invoke } from "@tauri-apps/api/core";
import { HourglassIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";
import { PLANS, refreshEntitlement, useEntitlement, type PaidTier } from "./entitlement";
import type { T } from "./i18n";
import { PATREON_URL } from "./Shell";

type Props = { t: T; tier: PaidTier; go: (page: string) => void; onError: (e: unknown) => void; children: ReactNode };

/** A tab the plan doesn't include: the real page, blurred and inert, under what unlocks it. */
export function Locked({ t, tier, go, onError, children }: Props) {
  const [account, setAccount] = useState<unknown>(); // undefined until pm_account answers
  useEffect(() => {
    invoke("pm_account").then(setAccount, onError);
  }, []);
  const signIn = () => invoke("pm_login").then(setAccount).then(refreshEntitlement).catch(onError);
  const name = PLANS[tier].name;
  return (
    <div className="locked">
      <div className="lockedPreview" inert aria-hidden="true">
        {children}
      </div>
      <section className="card lockedCard" aria-labelledby="lockedTitle">
        <LockSimpleIcon weight="fill" className="lockedIcon" aria-hidden="true" />
        <h2 id="lockedTitle">{t("subs.requires", { tier: name })}</h2>
        <div className="mono lockedPrice">{t("subs.perMonth", { price: PLANS[tier].price })}</div>
        {account !== undefined && (
          <>
            <p>{account === null ? t("subs.lockedSignedOut") : t("subs.lockedText", { tier: name })}</p>
            <div className="lockedActions">
              {account === null ? (
                <button type="button" className="btn fill lg" onClick={signIn}>
                  {t("subs.lockedTrial")}
                </button>
              ) : (
                <>
                  <button type="button" className="btn fill lg" onClick={() => invoke("open_url", { url: PATREON_URL }).catch(onError)}>
                    {t("subs.subscribe")}
                  </button>
                  <button type="button" className="btn lg" onClick={() => go("supporter")}>
                    {t("subs.link")}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

const REMINDER_KEY = "pm.trialReminder";
const today = () => new Date().toDateString();

/** Trial reminder on its days 11 and 13 (3 and 1 days left), at most once a day. */
export function TrialReminder({ t, lang, go }: { t: T; lang: string; go: (page: string) => void }) {
  const e = useEntitlement();
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(REMINDER_KEY) === today();
    } catch {
      return false;
    }
  });
  const end = e?.source === "trial" ? e.trialEndsAt : null;
  const left = end ? Math.ceil((end - Date.now()) / 86_400_000) : 0;
  if (seen || !end || (left !== 3 && left !== 1)) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(REMINDER_KEY, today());
    } catch {
      // storage unavailable: it just shows again next launch
    }
    setSeen(true);
  };
  return (
    <p className="updateBanner" role="status">
      <HourglassIcon aria-hidden="true" />
      {t("subs.reminder", { date: new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(end) })}
      <button
        type="button"
        className="linkBtn"
        onClick={() => {
          dismiss();
          go("supporter");
        }}
      >
        {t("subs.reminderLink")}
      </button>
      <button type="button" className="close" title={t("window.close")} aria-label={t("window.close")} onClick={dismiss}>
        ×
      </button>
    </p>
  );
}
