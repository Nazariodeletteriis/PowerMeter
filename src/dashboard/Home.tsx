import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ArrowSquareOutIcon, CaretRightIcon, ListChecksIcon, NewspaperIcon, ShieldIcon, SwordIcon, UserPlusIcon } from "@phosphor-icons/react";
import type { Settings } from "./App";
import { activeId, findCharacter, readCharacters } from "./characters";
import { type FightOutcome, fightOutcome, groupDps } from "./fightRow";
import type { T } from "./i18n";
import { cleanNews, type NewsItem } from "./news";
import { REGIONS } from "./Onboarding";
import { nextDailyReset, nextWeeklyReset } from "./pages/organizer/resets";
import { Card, ClassAvatar, EmptyState, FactionTag, fmt } from "./ui";
import { usePoll } from "./usePoll";

/** The fields of FightSummary (src-tauri/src/entity/fight_record.rs) shown here. */
type FightSummary = {
  id: string;
  bossName: string;
  startTimeMs: number;
  durationMs: number;
  totalDamage: number;
  mode: string;
  killed?: boolean;
};

// Newest first (the backend sorts by start time).
const getFights = () => invoke<FightSummary[]>("get_fight_history");
// The server refreshes its copy of the official site every 30 minutes.
const getNews = () => invoke<unknown>("pm_news").then(cleanNews);
// The server caches NCSOFT for 30 min, so a short poll costs NCSOFT nothing and a failed read recovers fast.
const NEWS_POLL_MS = 5 * 60 * 1000;
const NEWS_COLS = "80px minmax(0,1fr) 16px";
// The prototype's 48px position column is gone (the record does not mark the local player): its width went to the
// result, whose words ("Not killed", "Nicht besiegt") are longer than the prototype's "Kill".
const FIGHT_COLS = "minmax(0,1fr) 112px 80px 96px 90px 24px";

const OUTCOME: Record<FightOutcome, { text?: string; title?: string; color: string }> = {
  kill: { text: "admin.u.killed", color: "var(--pm-ok)" },
  notKilled: { text: "admin.u.notKilled", title: "home.outcomeNotKilled", color: "var(--pm-t2)" },
  unknown: { title: "home.outcomeUnknown", color: "var(--pm-t3)" },
  na: { title: "home.outcomeNa", color: "var(--pm-t3)" },
};

type Props = {
  t: T;
  lang: string;
  settings: Settings;
  openWidget: () => void;
  openHistory: () => void;
  openCharacters: () => void;
  openFight: (id: string) => void;
  reviewOnboarding: (step: number) => void;
  /** The character the game says you are playing (null until it ties one to an entity). */
  playing?: string;
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
          {/* No source yet for today's activities (organizer storage, R5). */}
          <Card title={t("home.today")} style={{ gridColumn: "span 4" }}>
            <EmptyState icon={<ListChecksIcon aria-hidden="true" />} title={t("shell.states.noData")} text={t("shell.states.soonText")} />
          </Card>
          <NewsCard t={t} lang={props.lang} />
        </div>
      )}
    </>
  );
}

function CharacterCard({ t, lang, settings, openCharacters, playing }: Props) {
  const characters = readCharacters(settings);
  // The game's character wins: one from another account, not in the roster, used to leave the last active one here.
  const c = playing ? findCharacter(characters, playing) : characters.find((x) => x.id === activeId(settings, characters));
  if (!c && playing) {
    return (
      <Card title={t("nav.myCharacters")} style={{ gridColumn: "span 5" }}>
        <EmptyState icon={<UserPlusIcon aria-hidden="true" />} title={playing} text={t("autochar.text", { name: playing })}>
          <button type="button" className="btn fill" onClick={openCharacters}>
            {t("autochar.create")}
          </button>
        </EmptyState>
      </Card>
    );
  }
  if (!c) {
    return (
      <Card title={t("nav.myCharacters")} style={{ gridColumn: "span 5" }}>
        <EmptyState icon={<UserPlusIcon aria-hidden="true" />} title={t("home.noCharacterTitle")} text={t("home.noCharacterText")}>
          <button type="button" className="btn fill" onClick={openCharacters}>
            {t("nav.myCharacters")}
          </button>
        </EmptyState>
      </Card>
    );
  }
  const region = REGIONS.find((r) => r.value === c.region)?.label;
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
      <ClassAvatar cls={c.cls} size={84} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500 }}>{c.name}</h2>
        <div style={{ color: "var(--pm-t2)", fontSize: 12 }}>
          {[c.cls, c.level && `Lv ${c.level}`, region].filter(Boolean).join(" · ")}
          {c.faction && (
            <>
              {" · "}
              <FactionTag faction={c.faction} label={t(`collections.${c.faction}`)} />
            </>
          )}
        </div>
        {!!c.cp && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 11, color: "var(--pm-t3)", letterSpacing: ".08em" }}>CP</span>
            <span className="mono" style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-.02em" }}>
              {fmt(c.cp, lang)}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

/** Build progress needs the equipment data: official data coming. */
function BuildCard({ t }: { t: T }) {
  return (
    <Card title={t("home.buildProgress")} style={{ gridColumn: "span 4" }}>
      <EmptyState icon={<ShieldIcon aria-hidden="true" />} title={t("shell.states.officialTitle")} text={t("shell.states.officialText")} />
    </Card>
  );
}

function TimersCard({ t }: { t: T }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const timers: [name: string, end: number][] = [
    [t("organizer.dailyReset"), nextDailyReset(new Date(now)).getTime()],
    [t("organizer.weeklyReset"), nextWeeklyReset(new Date(now)).getTime()],
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

function NewsCard({ t, lang }: { t: T; lang: string }) {
  const news = usePoll(getNews, NEWS_POLL_MS);
  const day = new Intl.DateTimeFormat(lang, { day: "numeric", month: "short" });
  const empty = news.error || (news.data && !news.data.notices.length && !news.data.updates.length);
  const list = (title: string, items?: NewsItem[]) => (
    <div style={{ minWidth: 0 }}>
      <div className="gridHead">
        <span>{title}</span>
      </div>
      {!items ? (
        [0, 1, 2].map((k) => <div key={k} className="skeleton" style={{ height: 36, marginTop: 4 }} />)
      ) : !items.length ? (
        <p style={{ padding: "10px 0", fontSize: 12, color: "var(--pm-t3)" }}>{t("home.newsListEmpty")}</p>
      ) : (
        items.map((n) => (
          <button key={n.url} type="button" className="gridRow" style={{ gridTemplateColumns: NEWS_COLS }} title={n.title} onClick={() => void invoke("open_url", { url: n.url })}>
            <span className="mono" style={{ fontSize: 11, color: "var(--pm-t3)", whiteSpace: "nowrap" }}>
              {day.format(new Date(n.date))}
            </span>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {n.title}
              <span className="srOnly"> ({t("home.newsOpens")})</span>
            </span>
            <ArrowSquareOutIcon style={{ color: "var(--pm-t3)" }} aria-hidden="true" />
          </button>
        ))
      )}
    </div>
  );
  return (
    <Card title={t("home.news")} style={{ gridColumn: "span 12" }}>
      {empty ? (
        <EmptyState icon={<NewspaperIcon aria-hidden="true" />} title={t("shell.states.noData")} text={t("home.newsOffline")} />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16, marginTop: 8 }}>
            {list(t("home.newsNotices"), news.data?.notices)}
            {list(t("home.newsUpdates"), news.data?.updates)}
          </div>
          <p style={{ marginTop: 10, fontSize: 11, color: "var(--pm-t3)" }}>{t("home.newsSource")}</p>
        </>
      )}
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
        <span style={{ textAlign: "right" }}>{t("home.colGroupDps")}</span>
        <span>{t("home.colDate")}</span>
        <span>{t("home.colUpload")}</span>
        <span />
      </div>
      {!fights.data
        ? [0, 1, 2].map((k) => <div key={k} className="skeleton" style={{ height: 36, marginTop: 4 }} />)
        : fights.data.slice(0, 5).map((f) => {
            // Upload is R2, so every fight is local for now.
            const out = OUTCOME[fightOutcome(f)];
            const dps = groupDps(f);
            return (
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
                <span
                  title={out.title && t(out.title)}
                  style={{ color: out.color, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {out.text ? t(out.text) : "—"}
                </span>
                <span className="num">{dps === null ? "—" : fmt(dps, lang)}</span>
                <span style={{ color: "var(--pm-t2)", fontSize: 12 }}>{when(f.startTimeMs)}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <span className="dot" style={{ background: "var(--pm-t3)" }} />
                  {t("home.uploadLocal")}
                </span>
                <CaretRightIcon style={{ color: "var(--pm-t3)" }} aria-hidden="true" />
              </button>
            );
          })}
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
