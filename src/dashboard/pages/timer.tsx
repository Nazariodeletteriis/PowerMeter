import { useEffect, useRef } from "react";
import { BellIcon, CalendarBlankIcon, DiscordLogoIcon, PlusIcon } from "@phosphor-icons/react";
import { REGIONS } from "../Onboarding";
import { Card, EmptyState } from "../ui";
import { nextDailyReset, nextWeeklyReset } from "./organizer/resets";
import { eventStatus, startsBetween, useGameEvents } from "./organizer/schedule";
import { clock, countdown, dayLabel, useNow } from "./shugo/events";
import "./organizer/organizer.css";
import "./shugo/events.css";
import "./system/system.css";
import type { PageProps } from "./types";

const DAY = 86400;

const SOUND = "pm.eventSound"; // "1" = the user turned the alert on; off by default

/** Short two-tone chime, no audio file. */
function chime() {
  const ctx = new AudioContext();
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
  [880, 1320].forEach((hz, i) => {
    const osc = ctx.createOscillator();
    osc.frequency.value = hz;
    osc.connect(gain);
    osc.start(ctx.currentTime + i * 0.15);
    osc.stop(ctx.currentTime + 0.6);
  });
  setTimeout(() => ctx.close(), 1000);
}

/** Prototype pg.timer: the two resets (custom timers wait for R5 storage) and the archive's event rules. */
export default function Timer({ t, lang, settings, save, run, onError }: PageProps) {
  const now = useNow();
  const events = useGameEvents(onError);
  const sound = settings[SOUND] === "1";

  // ponytail: rings only while this page is open; app-wide alerts need the shell.
  const last = useRef(now);
  useEffect(() => {
    if (sound && events && startsBetween(events, last.current, now)) chime();
    last.current = now;
  }, [now]);

  const rows = (events ?? []).map((e) => ({ e, ...eventStatus(e, now) })).sort((a, b) => a.window.start - b.window.start);

  const region = (REGIONS.find((r) => r.value === settings["pm.region"]) ?? REGIONS[0]).label;
  const left = (to: Date) => Math.max(0, Math.round((to.getTime() - now) / 1000));
  const timers = [
    { name: t("organizer.dailyReset"), sub: t("organizer.dailyResetSub", { region }), left: left(nextDailyReset(new Date(now))), period: DAY, win: true, discord: false },
    { name: t("organizer.weeklyReset"), sub: t("organizer.weeklyResetSub"), left: left(nextWeeklyReset(new Date(now))), period: 7 * DAY, win: true, discord: true },
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
                {countdown(x.left * 1000, t)}
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

      <Card
        title={t("events.timer.title")}
        style={{ marginTop: 14, maxWidth: 760 }}
        aside={
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--pm-t2)" }}>
            {t("events.timer.sound")}
            <button
              type="button"
              role="switch"
              aria-checked={sound}
              aria-label={t("events.timer.sound")}
              className="switch"
              onClick={() => run(() => save(SOUND, sound ? "0" : "1"))}
            >
              <span />
            </button>
          </label>
        }
      >
        {events === undefined ? null : rows.length === 0 ? (
          <EmptyState icon={<CalendarBlankIcon aria-hidden="true" />} title={t("events.timer.emptyTitle")} text={t("events.timer.emptyText")} />
        ) : (
          <div className="evList" style={{ marginTop: 8 }}>
            {rows.map(({ e, window: w, remaining }, i) => (
              <div key={e.event_id} className="evRow" data-first={i === 0}>
                <span className="mono">{clock(w.start, lang)}</span>
                <span>
                  {e.name}
                  <small>{[dayLabel(w.start, now, lang), e.location].filter(Boolean).join(" · ")}</small>
                </span>
                <span className="evLeft" role="timer">
                  {w.active ? (
                    <span className="evState" data-live="true">
                      <span className="dot" aria-hidden="true" />
                      {t("events.endsIn")} {countdown(remaining, t)}
                    </span>
                  ) : (
                    countdown(remaining, t)
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="evNote" style={{ marginTop: 8 }}>{t("events.timer.note")}</p>
      </Card>
    </>
  );
}
