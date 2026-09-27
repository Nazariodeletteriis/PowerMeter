import { ArrowRightIcon, ClockIcon, CrownSimpleIcon, DoorOpenIcon, ShieldCheckIcon, SwordIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { activeId, FACTIONS, readCharacters, type Faction } from "../characters";
import { REGIONS } from "../Onboarding";
import { Card } from "../ui";
import { HOUR, MIN, clock, countdown, dayLabel, serverHour, serverZone, useNow } from "./shugo/events";
import "./shugo/events.css";
import type { PageProps } from "./types";

// Spacetime Rift, from questlog.gg /spacetime-rift and NC's KR/TW notice
// (aion2kina.com): a window every 3 hours from 02:00 server time, the portal
// open for its first 5 minutes, the event running the whole hour.
const FIRST_HOUR = 2;
const PORTAL = 5 * MIN;
const LEN = HOUR;
const DAY = 24 * HOUR;
const FACTION_KEY = "rift.faction";
// Portals open in your own faction's zone and lead into the enemy one.
const ROUTE: Record<Faction, [from: string, to: string]> = { elyos: ["Verteron", "Altgard"], asmodian: ["Altgard", "Verteron"] };

const isRift = (ms: number, zone: string) => serverHour(ms, zone) % 3 === FIRST_HOUR % 3;

/** Rift windows still running or ahead, from the current hour on. */
function upcoming(now: number, zone: string, n: number) {
  const out: number[] = [];
  for (let h = Math.floor(now / HOUR) * HOUR; out.length < n; h += HOUR) if (isRift(h, zone)) out.push(h);
  return out;
}

/** Spacetime Rift: portal state, today's windows on a 24h rail, the next ones and your route. */
export default function Rift({ t, lang, settings, save }: PageProps) {
  const now = useNow();
  const regionValue = settings["pm.region"];
  const region = (REGIONS.find((r) => r.value === regionValue) ?? REGIONS[0]).label;
  const zone = serverZone(regionValue);

  const chars = readCharacters(settings);
  const saved = settings[FACTION_KEY] as Faction;
  const faction: Faction = FACTIONS.includes(saved) ? saved : (chars.find((c) => c.id === activeId(settings, chars))?.faction ?? "elyos");

  const wins = upcoming(now, zone, 9);
  const w = wins[0];
  const state = now < w ? "next" : now < w + PORTAL ? "portal" : "running";
  const target = state === "next" ? w : state === "portal" ? w + PORTAL : w + LEN;

  // Today's rail: local midnight to midnight, UTC hours so server hours stay whole.
  const midnight = new Date(now).setHours(0, 0, 0, 0);
  const today: number[] = [];
  for (let h = Math.floor(midnight / HOUR) * HOUR; h < midnight + DAY; h += HOUR) if (h >= midnight && isRift(h, zone)) today.push(h);
  const pct = (ms: number) => `${((ms - midnight) / DAY) * 100}%`;

  const facts = [
    [ClockIcon, "events.rift.f.schedule"],
    [DoorOpenIcon, "events.rift.f.portal"],
    [ShieldCheckIcon, "events.rift.f.level"],
    [UsersThreeIcon, "events.rift.f.capacity"],
    [SwordIcon, "events.rift.f.warMode"],
    [CrownSimpleIcon, "events.rift.f.activities"],
  ] as const;

  return (
    <div className="evStack">
      <div className="evGrid">
        <div className="evStack">
          <section className="card evHero" aria-labelledby="riftState">
            <div className="evState" id="riftState" data-live={state === "portal"}>
              <span className="dot" aria-hidden="true" />
              {t(`events.rift.${state}`)}
            </div>
            <div>
              <div className="kicker">
                {t(state === "portal" ? "events.rift.portalCloses" : state === "running" ? "events.endsIn" : "events.startsIn")}
              </div>
              <div className="evCount" role="timer">
                {countdown(target - now, t)}
              </div>
            </div>
            <div className="evMeta">
              <span>
                <strong>
                  {clock(w, lang)} - {clock(w + LEN, lang)}
                </strong>{" "}
                {dayLabel(w, now, lang)}
              </span>
              <span>{t("events.serverTime", { time: clock(w, lang, zone), region })}</span>
            </div>
            {state === "running" && <p className="evNote">{t("events.rift.runningHint")}</p>}
            <div>
              <div className="kicker" style={{ marginBottom: 6 }}>
                {t("events.rift.day")}
              </div>
              <div className="evRail">
                {today.map((h) => (
                  <div
                    key={h}
                    className="evSeg"
                    data-past={now >= h + LEN}
                    data-live={now >= h && now < h + LEN}
                    data-next={h === w && now < h}
                    style={{ left: pct(h), width: `${(LEN / DAY) * 100}%` }}
                    title={clock(h, lang)}
                  >
                    <i style={{ width: `${(PORTAL / LEN) * 100}%` }} />
                  </div>
                ))}
                <div className="evNow" style={{ left: pct(now) }} aria-hidden="true" />
              </div>
              <div className="evTicks" aria-hidden="true">
                {[0, 6, 12, 18, 24].map((x) => (
                  <span key={x} style={{ left: `${(x / 24) * 100}%` }}>
                    {x === 24 ? "24:00" : clock(midnight + x * HOUR, lang)}
                  </span>
                ))}
              </div>
            </div>
          </section>
          <Card title={t("events.rift.facts")}>
            <ul className="evFacts" style={{ marginTop: 8 }}>
              {facts.map(([Icon, key]) => (
                <li key={key}>
                  <Icon aria-hidden="true" />
                  {t(key)}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="evStack">
          <Card title={t("events.rift.upcoming")}>
            <div className="evList">
              {wins.slice(1).map((h, i) => (
                <div key={h} className="evRow" data-first={i === 0}>
                  <span className="mono">{clock(h, lang)}</span>
                  <span>
                    {dayLabel(h, now, lang)}
                    <small>{t("events.serverTime", { time: clock(h, lang, zone), region })}</small>
                  </span>
                  <span className="evLeft">{countdown(h - now, t)}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card
            title={t("events.rift.route")}
            aside={
              <div className="evToggle" role="group" aria-label={t("events.rift.route")}>
                {FACTIONS.map((f) => (
                  <button key={f} type="button" aria-pressed={f === faction} onClick={() => save(FACTION_KEY, f)}>
                    {t(`collections.${f}`)}
                  </button>
                ))}
              </div>
            }
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14 }}>
              <div>
                <div className="kicker">{t("events.rift.portalsIn")}</div>
                <div style={{ fontSize: 18, fontWeight: 500 }}>{ROUTE[faction][0]}</div>
              </div>
              <ArrowRightIcon aria-hidden="true" style={{ color: "var(--pm-redt)", fontSize: 18 }} />
              <div>
                <div className="kicker">{t("events.rift.leadsTo")}</div>
                <div style={{ fontSize: 18, fontWeight: 500 }}>{ROUTE[faction][1]}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <p className="evNote">{t("events.rift.source", { region })}</p>
    </div>
  );
}
