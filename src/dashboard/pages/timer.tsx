import { useEffect, useState } from "react";
import { BellIcon, DiscordLogoIcon, PlusIcon } from "@phosphor-icons/react";
import { REGIONS } from "../Onboarding";
import { SAMPLE_ORG_TIMERS } from "../sample/organizer";
import type { T } from "../i18n";
import { nextDailyReset, nextWeeklyReset } from "./organizer/resets";
import "./organizer/organizer.css";
import type { PageProps } from "./types";

const DAY = 86400;
const pad = (n: number) => String(n).padStart(2, "0");

/** Prototype cd(): "2g 04:20:00", days only when there are any. */
function countdown(s: number, t: T) {
  const d = Math.floor(s / DAY);
  const hms = `${pad(Math.floor((s % DAY) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return d ? `${t("home.days", { n: d })} ${hms}` : hms;
}

/** Prototype pg.timer. The two resets are real; the rest is sample data. */
export default function Timer({ t, settings }: PageProps) {
  const [opened] = useState(Date.now);
  const [now, setNow] = useState(opened);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const region = (REGIONS.find((r) => r.value === settings["pm.region"]) ?? REGIONS[0]).label;
  const left = (to: Date) => Math.max(0, Math.round((to.getTime() - now) / 1000));
  const elapsed = Math.floor((now - opened) / 1000);
  const timers = [
    { name: t("organizer.dailyReset"), sub: t("organizer.dailyResetSub", { region }), left: left(nextDailyReset(new Date(now))), period: DAY, win: true, discord: false },
    { name: t("organizer.weeklyReset"), sub: t("organizer.weeklyResetSub"), left: left(nextWeeklyReset(new Date(now))), period: 7 * DAY, win: true, discord: true },
    // Sample timers restart when they run out, like a repeating timer would.
    ...SAMPLE_ORG_TIMERS.map((x) => ({ ...x, left: (((x.left - elapsed) % x.period) + x.period) % x.period })),
  ];

  return (
    <>
      <div style={{ display: "flex", gap: 8, margin: "-8px 0 14px" }}>
        {/* ponytail: inert like the prototype until R5 stores custom timers. */}
        <button type="button" className="btn fill">
          <PlusIcon aria-hidden="true" />
          {t("organizer.newTimer")}
        </button>
      </div>
      <div className="orgTimers">
        {timers.map((x) => {
          const soon = x.left < 900;
          return (
            <section key={x.name} className="card" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontWeight: 500 }}>{x.name}</h2>
                  <div style={{ fontSize: 11, color: "var(--pm-t3)" }}>{x.sub}</div>
                </div>
                <div style={{ display: "flex", gap: 6, color: "var(--pm-t3)" }}>
                  {x.win && <BellIcon role="img" alt={t("organizer.notifyWindows")} />}
                  {x.discord && <DiscordLogoIcon role="img" alt={t("organizer.notifyDiscord")} />}
                </div>
              </div>
              <div className="mono" role="timer" style={{ fontSize: 26, color: soon ? "var(--pm-redt)" : "var(--pm-t1)" }}>
                {countdown(x.left, t)}
              </div>
              <div style={{ height: 3, background: "var(--pm-s3)", borderRadius: 2 }}>
                <div
                  style={{ height: "100%", width: `${(100 - (x.left / x.period) * 100).toFixed(1)}%`, background: "var(--pm-red)", borderRadius: 2 }}
                />
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
