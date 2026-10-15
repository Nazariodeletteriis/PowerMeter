import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  ArrowCounterClockwiseIcon,
  CalendarBlankIcon,
  ConfettiIcon,
  GlobeHemisphereEastIcon,
  HourglassIcon,
  SkullIcon,
  SpeakerHighIcon,
} from "@phosphor-icons/react";
import { chime, LEAD_KEY, leadMinutes, LEADS, SOUND_KEY as SOUND, VOLUME_KEY } from "../chime";
import { Card, EmptyState } from "../ui";
import { cadenceText, upcomingWindows, useGameEvents, type EventWindow } from "./organizer/schedule";
import { clock, countdown, dayLabel, HOUR, useNow } from "./shugo/events";
import "./characters/characters.css";
import "./organizer/organizer.css";
import "./shugo/events.css";
import "./system/system.css";
import type { PageProps } from "./types";

// Windows in the list: everything in the next 24 hours, and at least the next one of each event
// (the weekly reset and twice-a-week bosses would drop out otherwise).
const HORIZON = 24 * HOUR;
const PER_EVENT = 26; // the hourly Shugo Festival: 24 windows plus the one running

/** Categories of the `events` table, in tab order. Unknown ones still show under "All". */
const CATS: { id: string; icon: ReactNode; tab: string; label: string; next: string }[] = [
  { id: "rift", icon: <HourglassIcon aria-hidden="true" />, tab: "events.timer.tabRift", label: "events.cat.rift", next: "events.rift.next" },
  { id: "event", icon: <ConfettiIcon aria-hidden="true" />, tab: "events.timer.tabEvent", label: "events.cat.event", next: "events.timer.nextEvent" },
  { id: "boss", icon: <SkullIcon aria-hidden="true" />, tab: "events.timer.tabBoss", label: "events.cat.boss", next: "events.timer.nextBoss" },
  { id: "reset", icon: <ArrowCounterClockwiseIcon aria-hidden="true" />, tab: "events.timer.tabReset", label: "events.cat.reset", next: "events.timer.nextReset" },
];
const TABS = ["all", ...CATS.map((c) => c.id)];
const ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Prototype pg.timer: next of each kind, alert settings, and every window of the archive's event rules. */
export default function Timer({ t, lang, settings, save, run, onError }: PageProps) {
  const now = useNow();
  const events = useGameEvents(onError);
  const [tab, setTab] = useState("all");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const sound = settings[SOUND] === "1";
  const lead = leadMinutes(settings[LEAD_KEY]);

  const rows = (events ?? [])
    .flatMap((e) => {
      const all = upcomingWindows(e, now, PER_EVENT);
      const near = all.filter((w) => w.start < now + HORIZON);
      return (near.length ? near : all.slice(0, 1)).map((w) => ({ e, w }));
    })
    .sort((a, b) => a.w.start - b.w.start || a.e.name.localeCompare(b.e.name));
  // "All" keeps an hourly event (the Shugo Festival) to its next window: its 24 rows a day
  // buried the rifts and bosses. Its own tab still lists every one.
  const shown =
    tab === "all"
      ? rows.filter((r) => r.e.cadence_json.kind !== "minuteOfHour" || rows.find((x) => x.e === r.e) === r)
      : rows.filter((r) => r.e.category === tab);

  // The next window of each kind; events starting together (bosses at 21:30) share the card.
  const next = CATS.flatMap((cat) => {
    const first = rows.find((r) => r.e.category === cat.id);
    if (!first) return [];
    const names = rows.filter((r) => r.e.category === cat.id && r.w.start === first.w.start).map((r) => r.e.name);
    return [{ cat, ...first, names }];
  });

  const span = (w: EventWindow) => (w.end > w.start ? `${clock(w.start, lang)} - ${clock(w.end, lang)}` : clock(w.start, lang));
  const left = (w: EventWindow) => (w.active ? w.end : w.start) - now;
  const soon = (w: EventWindow) => !w.active && w.start - now <= lead * 60e3;
  const catOf = (id: string) => CATS.find((c) => c.id === id);

  // Tabs pattern (WAI-ARIA APG): one tab stop, arrows move and select.
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.indexOf(tab);
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const id = TABS[(to + TABS.length) % TABS.length];
    setTab(id);
    tabRefs.current[id]?.focus();
  };

  if (events === undefined) return null;
  if (rows.length === 0)
    return (
      <Card title={t("events.timer.title")} style={{ maxWidth: 760 }}>
        <EmptyState icon={<CalendarBlankIcon aria-hidden="true" />} title={t("events.timer.emptyTitle")} text={t("events.timer.emptyText")} />
      </Card>
    );

  let lastDay = "";
  return (
    <>
      <div className="evNextGrid">
        {next.map(({ cat, e, w, names }) => (
          <section key={cat.id} className="card evNext" data-cat={cat.id}>
            <h2 className="kicker evNextHead">
              {cat.icon}
              {w.active && cat.id === "rift" ? t("events.rift.running") : t(cat.next)}
            </h2>
            {w.active ? (
              <div className="evState" data-live="true">
                <span className="dot" aria-hidden="true" />
                {t("events.endsIn")}
              </div>
            ) : (
              <div className="evState">{t("events.startsIn")}</div>
            )}
            <div className="evNextCount" role="timer" data-soon={soon(w)}>
              {countdown(left(w), t)}
            </div>
            <div className="evNextName">
              {names[0]}
              {names.length > 1 && <span className="evMore"> +{names.length - 1}</span>}
            </div>
            <div className="evNextMeta">
              {[`${dayLabel(w.start, now, lang)} ${span(w)}`, e.location].filter(Boolean).join(" · ")}
            </div>
          </section>
        ))}
      </div>

      <div className="evGrid" style={{ marginTop: 12 }}>
        <section className="card evTl">
          <div className="orgTabs evTabs" role="tablist" aria-label={t("events.timer.filter")} onKeyDown={onTabKey}>
            {TABS.map((id) => (
              <button
                key={id}
                id={`evTab-${id}`}
                ref={(b) => {
                  tabRefs.current[id] = b;
                }}
                type="button"
                role="tab"
                className="orgTab"
                aria-selected={id === tab}
                aria-controls="evPanel"
                tabIndex={id === tab ? 0 : -1}
                onClick={() => setTab(id)}
              >
                {id === "all" ? t("events.timer.tabAll") : t(catOf(id)!.tab)}
              </button>
            ))}
          </div>
          <div id="evPanel" role="tabpanel" aria-labelledby={`evTab-${tab}`}>
            {shown.length === 0 ? (
              <p className="evNote" style={{ padding: "12px 0" }}>{t("events.timer.emptyTab")}</p>
            ) : (
              <ul className="evTlList">
                {shown.map(({ e, w }) => {
                  const day = dayLabel(w.start, now, lang);
                  const head = day !== lastDay && day;
                  lastDay = day;
                  const cat = catOf(e.category);
                  return (
                    <li key={`${e.event_id}-${w.start}`}>
                      {head && <h3 className="evTlDay">{head}</h3>}
                      <div className="evTlRow" data-live={w.active}>
                        <span className="evTlTime">
                          {clock(w.start, lang)}
                          {w.end > w.start && <small>{clock(w.end, lang)}</small>}
                        </span>
                        <span className="evTlMain">
                          <span className="evTlName">
                            {e.name}
                            <span className="badge evCat" data-cat={e.category}>
                              {cat?.icon}
                              {cat ? t(cat.label) : e.category}
                            </span>
                          </span>
                          <small>{[cadenceText(e, now, t, lang), e.location].filter(Boolean).join(" · ")}</small>
                        </span>
                        <span className="evTlLeft" role="timer" data-soon={soon(w)}>
                          {w.active ? (
                            <span className="evState" data-live="true">
                              <span className="dot" aria-hidden="true" />
                              {t("events.endsIn")} {countdown(left(w), t)}
                            </span>
                          ) : (
                            countdown(left(w), t)
                          )}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <div className="evStack">
          <Card title={t("events.timer.alerts")}>
            <div className="evAlerts">
              <label className="evAlertRow">
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
              <div role="group" aria-labelledby="evLeadLabel">
                <div id="evLeadLabel" className="evAlertLabel">{t("events.timer.lead")}</div>
                <div className="evLeads">
                  {LEADS.map((n) => (
                    <button key={n} type="button" className="chChip mono" aria-pressed={n === lead} onClick={() => run(() => save(LEAD_KEY, String(n)))}>
                      {t("events.timer.leadMin", { n })}
                    </button>
                  ))}
                </div>
                <p className="evNote" style={{ marginTop: 6 }}>{t("events.timer.leadHint", { n: lead })}</p>
              </div>
              <button type="button" className="btn sm" style={{ alignSelf: "flex-start" }} onClick={() => chime(settings[VOLUME_KEY])}>
                <SpeakerHighIcon aria-hidden="true" />
                {t("events.timer.test")}
              </button>
            </div>
          </Card>
          <p className="evNote evZone">
            <GlobeHemisphereEastIcon aria-hidden="true" />
            {t("events.timer.zone", { zone: ZONE })}
          </p>
        </div>
      </div>
    </>
  );
}
