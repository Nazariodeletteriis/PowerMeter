import { invoke } from "@tauri-apps/api/core";
import { CheckIcon, HeartIcon, WifiSlashIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { PLANS, PLANS_OPEN, refreshEntitlement, useEntitlement, type Entitlement, type PaidTier, type Tier } from "./entitlement";
import type { Key, T } from "./i18n";
import { PATREON_URL } from "./Shell";

const A2TOOLS_URL = "https://github.com/taengu/A2Tools-DPS-Meter";
const ADMIN_URL = "https://powermeter.letrionlabs.it/admin";
const MANAGE_URL = "https://www.patreon.com/settings/memberships";
// Same terms the onboarding shows (scripts/sync-legal.mjs); the hash picks the language.
const TERMS_URL = "https://powermeter.letrionlabs.it/terms.html";
const DAY = 86_400_000;

const tierName = (t: T, tier: Tier) => (tier === "free" || tier === "trial" ? t(`subs.tier.${tier}`) : PLANS[tier].name);

// What each plan adds to the one before (notes/patreon-tiers-plan.md, section 0). The paid plans'
// contents are still to be decided (PLANS_OPEN): they show "coming soon".
const PERKS: ["free" | PaidTier, Key[]][] = [
  ["free", ["subs.free.meter", "subs.free.rest"]],
  ["recluta", []],
  ["daeva", []],
  ["empyrean", []],
];

/** Where the current tier comes from. */
function origin(t: T, e: Entitlement, signedIn: boolean, fmt: (ms: number) => string) {
  switch (e.source) {
    case "patreon":
      return e.until ? t("subs.source.patreonUntil", { date: fmt(e.until) }) : t("subs.source.patreon");
    case "trial":
      return t("subs.source.trial", { n: Math.max(0, Math.ceil(((e.trialEndsAt ?? 0) - Date.now()) / DAY)) });
    case "grant":
      return e.until ? t("subs.source.grantUntil", { date: fmt(e.until) }) : t("subs.source.grantForever");
    case "admin":
    case "developer":
    case "dev":
      return t("subs.source.dev");
    default:
      return signedIn ? t("subs.source.free") : t("subs.source.signedOut");
  }
}

/** Prototype pg.supporter: plan, Patreon link, plan comparison, and the admin panel link. */
export function Supporter({ t, lang, onError }: { t: T; lang: string; onError: (e: unknown) => void }) {
  const e = useEntitlement();
  const [account, setAccount] = useState<unknown>(); // undefined until pm_account answers
  const [waiver, setWaiver] = useState(false); // never preselected
  useEffect(() => {
    invoke("pm_account").then(setAccount, onError);
  }, []);
  const open = (url: string) => invoke("open_url", { url }).catch(onError);
  const signIn = () => invoke("pm_login").then(setAccount).then(refreshEntitlement).catch(onError);
  const unlink = () => confirm(t("subs.unlinkConfirm")) && invoke("pm_patreon_unlink").then(refreshEntitlement).catch(onError);
  const date = new Intl.DateTimeFormat(lang, { dateStyle: "medium" });
  const fmt = (ms: number) => date.format(ms);
  // The trial unlocks what Daeva unlocks.
  const current = e && (e.tier === "trial" ? "daeva" : e.tier);
  const [before, after] = t("about.a2tools").split("{link}");
  return (
    <div style={{ maxWidth: 960, display: "grid", gap: 12 }}>
      <div
        style={{
          position: "relative",
          borderRadius: 10,
          padding: 28,
          background: "var(--pm-band)",
          border: "1px solid var(--pm-line)",
          overflow: "hidden",
          marginBottom: 4,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0 0 auto 0",
            height: 2,
            background: "linear-gradient(90deg,transparent,#DB0000 25%,#DB0000 75%,transparent)",
          }}
        />
        <HeartIcon weight="fill" style={{ fontSize: 26, color: "#FF4D4D" }} aria-hidden="true" />
        <h2 style={{ fontSize: 24, fontWeight: 500, margin: "10px 0 8px", letterSpacing: "-.015em", color: "#FAF7F7" }}>
          {t("supporter.title")}
        </h2>
        <p style={{ lineHeight: 1.6, maxWidth: 600, color: "#E8E1E1" }}>{t("subs.heroText")}</p>
      </div>

      {e && (
        <section
          className="card"
          style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}
        >
          <div style={{ minWidth: 0 }}>
            <h3 className="kicker">{t("subs.status")}</h3>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, margin: "6px 0 2px" }}>
              <span style={{ fontSize: 20, fontWeight: 500 }}>{tierName(t, e.tier)}</span>
              {e.debugger && !e.admin && <span className="badge">Debugger</span>}
              {e.founder && (
                <span className="badge" style={{ borderColor: "#DB000088", color: "#FF6B6B" }}>
                  <HeartIcon weight="fill" aria-hidden="true" />
                  Founder
                </span>
              )}
              {e.offline && (
                <span className="badge" title={t("subs.offlineHint")}>
                  <WifiSlashIcon aria-hidden="true" />
                  {t("subs.offline")}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: "var(--pm-t2)" }}>{origin(t, e, account != null, fmt)}</div>
            {e.patreon?.linked && <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("subs.patreonLinked")}</div>}
          </div>
          {account !== undefined &&
            (e.deviceLimit ? (
              <p className="notice" style={{ maxWidth: 420, fontSize: 13 }}>
                {t("subs.deviceLimit", { n: e?.maxDevices ?? 1 })}
              </p>
            ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {account === null ? (
                <button type="button" className="btn fill lg" onClick={signIn}>
                  {t("subs.signIn")}
                </button>
              ) : !PLANS_OPEN && !e.patreon?.linked ? (
                <span className="badge">{t("subs.comingSoon")}</span>
              ) : e.patreon?.linked ? (
                <>
                  <button type="button" className="btn lg" onClick={unlink}>
                    {t("subs.unlink")}
                  </button>
                  <button type="button" className="btn fill lg" onClick={() => open(MANAGE_URL)}>
                    {t("subs.manage")}
                  </button>
                </>
              ) : (
                <>
                  {/* Linking is what starts paid access: the server wants the waiver of the 14-day withdrawal. */}
                  <div style={{ flexBasis: "100%", maxWidth: 420, fontSize: 12, color: "var(--pm-t2)" }}>
                    <label className="check" style={{ alignItems: "flex-start", lineHeight: 1.5 }}>
                      <input type="checkbox" checked={waiver} onChange={(ev) => setWaiver(ev.target.checked)} style={{ flex: "none", marginTop: 2 }} />
                      {t("subs.waiver")}
                    </label>
                    <button type="button" className="linkBtn" style={{ marginLeft: 26 }} onClick={() => open(`${TERMS_URL}#${lang}`)}>
                      {t("legal.terms")}
                    </button>
                  </div>
                  <button type="button" className="btn lg" onClick={() => open(PATREON_URL)}>
                    {t("subs.subscribe")}
                  </button>
                  <button
                    type="button"
                    className="btn fill lg"
                    disabled={!waiver}
                    onClick={() => invoke("pm_patreon_link", { waiver: true }).catch(onError)}
                  >
                    {t("subs.link")}
                  </button>
                </>
              )}
            </div>
            ))}
        </section>
      )}

      <section className="card">
        <h3 className="kicker">{t("subs.plans")}</h3>
        <div className="subsPlans">
          {PERKS.map(([tier, perks], i) => (
            <div key={tier} className="subsPlan" aria-current={tier === current || undefined}>
              <h4>
                {tierName(t, tier)}
                {tier === current && <span className="badge">{e?.tier === "trial" ? tierName(t, "trial") : t("subs.current")}</span>}
                {tier !== "free" && !PLANS_OPEN && <span className="badge">{t("subs.comingSoon")}</span>}
              </h4>
              <div className="mono" style={{ color: "var(--pm-t3)" }}>
                {t("subs.perMonth", { price: tier === "free" ? 0 : PLANS[tier].price })}
              </div>
              <ul>
                {i > 0 && !PLANS_OPEN && <li>{t("subs.plansSoon")}</li>}
                {i > 0 && PLANS_OPEN && <li>{t("subs.everythingIn", { tier: tierName(t, PERKS[i - 1][0]) })}</li>}
                {perks.map((k) => (
                  <li key={k}>
                    <CheckIcon aria-hidden="true" />
                    {t(k)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Admin only (the server checks too): users, grants, roles and bans live in the web panel. */}
      {e?.admin && (
        <section className="card">
          <button type="button" className="btn fill lg" onClick={() => open(ADMIN_URL)}>
            {t("subs.admin.open")}
          </button>
        </section>
      )}

      <p style={{ marginTop: 4, fontSize: 12, color: "var(--pm-t3)" }}>
        {before}
        <button type="button" className="linkBtn" onClick={() => open(A2TOOLS_URL)}>
          A2Tools DPS Meter
        </button>
        {after}
      </p>
    </div>
  );
}
