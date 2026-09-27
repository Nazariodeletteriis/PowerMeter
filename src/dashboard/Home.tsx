import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CaretRightIcon, CheckIcon, SwordIcon } from "@phosphor-icons/react";
import type { Settings } from "./App";
import type { T } from "./i18n";
import { ItemIcon } from "./items";
import { REGIONS } from "./Onboarding";
import { nextDailyReset, nextWeeklyReset } from "./pages/organizer/resets";
import { SAMPLE_CHARACTER, SAMPLE_NEWS, SAMPLE_TIMERS, SAMPLE_TODAY, SAMPLE_UPGRADES } from "./sampleData";
import { art, Card, fmt, RARITY } from "./ui";
import { usePoll } from "./usePoll";

/** The fields of FightSummary (src-tauri/src/entity/fight_record.rs) shown here. */
type FightSummary = { id: string; bossName: string; startTimeMs: number; durationMs: number };

// Newest first (the backend sorts by start time).
const getFights = () => invoke<FightSummary[]>("get_fight_history");
const FIGHT_COLS = "minmax(0,1fr) 64px 80px 48px 96px 90px 24px";

type Props = {
  t: T;
  lang: string;
  settings: Settings;
  name: string;
  openWidget: () => void;
  openHistory: () => void;
  openFight: (id: string) => void;
  reviewOnboarding: (step: number) => void;
};

export function Home(props: Props) {
  const { t, reviewOnboarding: review } = props;
  // Fights are auto-saved by the meter; 10s matches its own history refresh.
  const fights = usePoll(getFights, 10000);

  return (
    <>
      <div className="pageActions">
        <button type="button" className="btn sm" style={{ color: "var(--pm-t2)" }} onClick={() => review(1)}>
          {t("home.reviewOnboarding")}
        </button>
      </div>
      {fights.data?.length === 0 ? (
        // First run (prototype homeEmpty): nothing recorded yet.
        <div className="homeEmpty">
          <SwordIcon aria-hidden="true" />
          <h2>{t("home.emptyTitle")}</h2>
          <p>{t("home.emptyText")}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn fill" onClick={props.openWidget}>
              {t("topbar.openWidget")}
            </button>
            <button type="button" className="btn" onClick={() => review(2)}>
              {t("home.checkRequirements")}
            </button>
          </div>
        </div>
      ) : (
        <div className="homeGrid">
          <CharacterCard {...props} />
          <BuildCard t={t} />
          <TimersCard t={t} />
          <Card
            title={t("home.fights")}
            style={{ gridColumn: "span 8" }}
            aside={
              <button type="button" className="linkBtn" onClick={props.openHistory}>
                {t("home.seeHistory")}
              </button>
            }
          >
            <Fights {...props} fights={fights} />
          </Card>
          <TodayCard t={t} />
          <Card title={t("home.news")} style={{ gridColumn: "span 12" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 16, marginTop: 10 }}>
              {SAMPLE_NEWS.map((n) => (
                <div key={n.title} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span className="mono" style={{ fontSize: 11, color: "var(--pm-t3)" }}>
                    {n.date}
                  </span>
                  <span style={{ lineHeight: 1.4 }}>{n.title}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function CharacterCard({ t, lang, settings, name }: Props) {
  const c = SAMPLE_CHARACTER;
  const cls = settings["pm.class"];
  const region = REGIONS.find((r) => r.value === settings["pm.region"])?.label ?? c.server;
  return (
    <section
      className="card"
      style={{ gridColumn: "span 5", display: "flex", gap: 16, position: "relative", overflow: "hidden" }}
    >
      <div
        style={{
          position: "absolute",
          inset: "0 0 auto 0",
          height: 2,
          background: "linear-gradient(90deg,transparent,var(--pm-red) 30%,var(--pm-red) 70%,transparent)",
        }}
      />
      <div
        style={{
          width: 84,
          height: 104,
          flex: "none",
          borderRadius: 6,
          background: "var(--pm-s3)",
          border: "1px dashed var(--pm-grey)",
          display: "grid",
          placeItems: "center",
          color: "var(--pm-t3)",
          fontSize: 10,
          textAlign: "center",
        }}
      >
        {t("home.portrait")}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ fontSize: 18, fontWeight: 500 }}>{name}</h2>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              padding: "2px 6px 2px 3px",
              borderRadius: 4,
              background: "#F4B3521f",
              color: "#F4C77A",
            }}
          >
            <img src={art(c.faction)} alt="" style={{ width: 14, height: 14 }} />
            {c.faction}
          </span>
        </div>
        <div style={{ color: "var(--pm-t2)", fontSize: 12 }}>
          {[cls || c.cls, `Lv ${c.level}`, region].join(" · ")}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: "var(--pm-t3)", letterSpacing: ".08em" }}>CP</span>
          <span className="mono" style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-.02em" }}>
            {fmt(c.cp, lang)}
          </span>
          <span className="mono" style={{ fontSize: 12, color: "var(--pm-ok)" }}>
            ▲ {fmt(c.cpDelta, lang)}
          </span>
          <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t("home.cpVs7Days")}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--pm-t2)" }}>
          {t("home.activeBuild")} <span style={{ color: "var(--pm-t1)" }}>{c.build}</span>
        </div>
      </div>
    </section>
  );
}

function BuildCard({ t }: { t: T }) {
  const { buildOwned: owned, buildTotal: total } = SAMPLE_CHARACTER;
  return (
    <Card
      title={t("home.buildProgress")}
      style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 10 }}
      aside={
        <span className="mono" style={{ fontSize: 12 }}>
          {owned}/{total}
        </span>
      }
    >
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={owned}
        aria-label={t("home.buildProgress")}
        style={{ height: 6, borderRadius: 3, background: "var(--pm-s3)", overflow: "hidden" }}
      >
        <div style={{ width: `${(owned / total) * 100}%`, height: "100%", background: "var(--pm-red)" }} />
      </div>
      <div style={{ fontSize: 12, color: "var(--pm-t2)" }}>{t("home.buildOwned", { owned, total })}</div>
      {SAMPLE_UPGRADES.map((u) => (
        <div key={u.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              border: `1.5px solid ${RARITY[u.rarity]}`,
              background: "var(--pm-s3)",
              flex: "none",
            }}
          >
            <ItemIcon name={u.name} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: RARITY[u.rarity], whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {u.name}
            </div>
            <div style={{ fontSize: 11, color: "var(--pm-t3)" }}>{u.source}</div>
          </div>
        </div>
      ))}
    </Card>
  );
}

function TimersCard({ t }: { t: T }) {
  const [now, setNow] = useState(Date.now);
  // Sample timers count down from when the page opened, like the prototype's tick.
  const [start] = useState(now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const timers: [name: string, end: number][] = [
    [t("organizer.dailyReset"), nextDailyReset(new Date(now)).getTime()],
    [t("organizer.weeklyReset"), nextWeeklyReset(new Date(now)).getTime()],
    ...SAMPLE_TIMERS.map((x): [string, number] => [x.name, start + x.seconds * 1000]),
  ];
  return (
    <Card title={t("home.timers")} style={{ gridColumn: "span 3", display: "flex", flexDirection: "column", gap: 8 }}>
      {timers.map(([name, end]) => {
        const left = Math.max(0, Math.round((end - now) / 1000));
        const days = Math.floor(left / 86400);
        return (
          <div
            key={name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              padding: "6px 0",
              borderBottom: "1px solid var(--pm-line)",
            }}
          >
            <span style={{ color: "var(--pm-t2)" }}>{name}</span>
            <span className="mono">
              {days ? t("home.days", { n: days }) + " " : ""}
              {clock(left % 86400, true)}
            </span>
          </div>
        );
      })}
    </Card>
  );
}

function TodayCard({ t }: { t: T }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const left = SAMPLE_TODAY.filter((a) => !done[a.id]).length;
  return (
    <Card
      title={t("home.today")}
      style={{ gridColumn: "span 4", display: "flex", flexDirection: "column", gap: 4 }}
      aside={<span style={{ fontSize: 12, color: "var(--pm-t2)" }}>{t("home.todayLeft", { n: left })}</span>}
    >
      <div style={{ height: 2 }} />
      {SAMPLE_TODAY.map((a) => (
        <button
          key={a.id}
          type="button"
          role="checkbox"
          aria-checked={!!done[a.id]}
          className="gridRow hover"
          onClick={() => setDone({ ...done, [a.id]: !done[a.id] })}
          style={{ display: "flex", gap: 10, minHeight: 34, borderRadius: 6, padding: "0 6px", borderBottom: 0 }}
        >
          <span
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              border: "1.5px solid var(--pm-grey)",
              display: "grid",
              placeItems: "center",
              flex: "none",
            }}
          >
            {done[a.id] && <CheckIcon style={{ fontSize: 11, color: "var(--pm-redt)" }} aria-hidden="true" />}
          </span>
          <span
            style={{
              flex: 1,
              color: done[a.id] ? "var(--pm-t3)" : "var(--pm-t1)",
              textDecoration: done[a.id] ? "line-through" : "none",
            }}
          >
            {a.name}
          </span>
          <span style={{ fontSize: 10, color: "var(--pm-t3)" }}>{a.cadence}</span>
        </button>
      ))}
    </Card>
  );
}

function Fights({
  t,
  lang,
  fights,
  openFight,
}: Props & { fights: { data?: FightSummary[]; error?: string } }) {
  if (fights.error) {
    return (
      <p className="error" role="alert" style={{ marginTop: 8 }}>
        {t("common.error", { message: fights.error })}
      </p>
    );
  }
  const time = new Intl.DateTimeFormat(lang, { timeStyle: "short" });
  const day = new Intl.DateTimeFormat(lang, { dateStyle: "short" });
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 864e5).toDateString();
  const when = (ms: number) => {
    const d = new Date(ms).toDateString();
    return d === today
      ? t("home.todayAt", { time: time.format(ms) })
      : d === yesterday
        ? t("home.yesterdayAt", { time: time.format(ms) })
        : day.format(ms);
  };
  return (
    <div style={{ marginTop: 8 }}>
      <div className="gridHead" style={{ gridTemplateColumns: FIGHT_COLS }}>
        <span>{t("home.colBoss")}</span>
        <span>{t("home.colResult")}</span>
        <span style={{ textAlign: "right" }}>DPS</span>
        <span style={{ textAlign: "right" }}>{t("home.colPos")}</span>
        <span>{t("home.colDate")}</span>
        <span>{t("home.colUpload")}</span>
        <span />
      </div>
      {!fights.data
        ? [0, 1, 2].map((k) => <div key={k} className="skeleton" style={{ height: 36, marginTop: 4 }} />)
        : fights.data.slice(0, 5).map((f) => (
            // Result, DPS and position need the fight record; upload is R2, so
            // every fight is local for now.
            <button
              key={f.id}
              type="button"
              className="gridRow"
              style={{ gridTemplateColumns: FIGHT_COLS }}
              onClick={() => openFight(f.id)}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.bossName || "—"}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--pm-t3)" }}>
                  {clock(f.durationMs / 1000)}
                </div>
              </div>
              <span style={{ color: "var(--pm-t3)", fontWeight: 500 }}>—</span>
              <span className="num">—</span>
              <span className="num" style={{ color: "var(--pm-t2)" }}>
                —
              </span>
              <span style={{ color: "var(--pm-t2)", fontSize: 12 }}>{when(f.startTimeMs)}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <span className="dot" style={{ background: "var(--pm-t3)" }} />
                {t("home.uploadLocal")}
              </span>
              <CaretRightIcon style={{ color: "var(--pm-t3)" }} aria-hidden="true" />
            </button>
          ))}
    </div>
  );
}

/** m:ss for durations; h:mm:ss above an hour or when `hours` (countdowns). */
function clock(seconds: number, hours = false) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h || hours ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}
