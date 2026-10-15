import { invoke } from "@tauri-apps/api/core";
import { HourglassIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";
import { euros, PLANS, PLANS_OPEN, refreshEntitlement, useEntitlement, type PaidTier } from "./entitlement";
import type { T } from "./i18n";
import { PATREON_URL } from "./Shell";

type Props = { t: T; lang: string; tier: PaidTier; go: (page: string) => void; onError: (e: unknown) => void; children: ReactNode };

/** A tab the Player plan doesn't include: the real page, blurred and inert, under what unlocks it (any Patreon plan;
 *  not on sale yet: "coming soon"). */
export function Locked({ t, lang, tier, go, onError, children }: Props) {
  const e = useEntitlement();
  const [account, setAccount] = useState<unknown>(); // undefined until pm_account answers
  useEffect(() => {
    invoke("pm_account").then(setAccount, onError);
  }, []);
  const signIn = () => invoke("pm_login").then(setAccount).then(refreshEntitlement).catch(onError);
  return (
    <div className="locked">
      <div className="lockedPreview" inert aria-hidden="true">
        {children}
      </div>
      <section className="card lockedCard" aria-labelledby="lockedTitle">
        <LockSimpleIcon weight="fill" className="lockedIcon" aria-hidden="true" />
        <h2 id="lockedTitle">{PLANS_OPEN ? t("subs.requires") : t("subs.lockedSoon")}</h2>
        {PLANS_OPEN ? (
          <div className="mono lockedPrice">{t("subs.perMonth", { price: euros(lang, PLANS[tier].price) })}</div>
        ) : (
          <span className="badge">{t("subs.comingSoon")}</span>
        )}
        {e?.deviceLimit ? (
          <p className="notice">{t("subs.deviceLimit", { n: e?.maxDevices ?? 1 })}</p>
        ) : account !== undefined && (
          <>
            <p>{account === null ? t("subs.lockedSignedOut") : PLANS_OPEN ? t("subs.lockedText") : t("subs.lockedSoonText")}</p>
            <div className="lockedActions">
              {account === null ? (
                <button type="button" className="btn fill lg" onClick={signIn}>
                  {t("subs.lockedTrial")}
                </button>
              ) : (
                PLANS_OPEN && (
                  <>
                    <button type="button" className="btn fill lg" onClick={() => invoke("open_url", { url: PATREON_URL }).catch(onError)}>
                      {t("subs.subscribe")}
                    </button>
                    <button type="button" className="btn lg" onClick={() => go("supporter")}>
                      {t("subs.link")}
                    </button>
                  </>
                )
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

/** Trial reminder 3 and 1 days before it ends, at most once a day. */
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
