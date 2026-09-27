import { CardsIcon, KeyIcon, StarIcon } from "@phosphor-icons/react";
import { Card, fmt } from "../ui";
import { GAMES, ROUND_LEN_MIN, SHOP, type Game, type ShopItem } from "./shugo/data";
import { HOUR, MIN, clock, countdown, dayLabel, useNow } from "./shugo/events";
import "./shugo/events.css";
import type { PageProps } from "./types";

const HALF = 30 * MIN;
const LEN = ROUND_LEN_MIN * MIN;
const FAV_KEY = "shugo.favorites";
const GOALS_KEY = "shugo.goals";
const TOKENS_KEY = "shugo.tokens";
const CATS: ShopItem["cat"][] = ["consumable", "wings", "pet", "decor", "skin"];

// Rounds start at :15 and :45 server time. Server zones are whole-hour
// offsets, so those are :15/:45 in UTC too: no time zone math needed.
const roundMin = (ms: number) => new Date(ms).getUTCMinutes() as Game["round"];
const pool = (ms: number) => GAMES.filter((g) => g.round === roundMin(ms));
/** Ids saved in settings as a JSON array; empty if missing or hand-edited. */
function ids(raw: string | undefined) {
  try {
    const v: unknown = JSON.parse(raw ?? "[]");
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set<string>();
  }
}

/** Shugo Festival: live round, the rounds ahead, minigames, keys and a Festival Shop planner. */
export default function Shugo({ t, lang, settings, save }: PageProps) {
  const now = useNow();
  const favs = ids(settings[FAV_KEY]);
  const goals = ids(settings[GOALS_KEY]);
  const tokens = Math.max(0, Math.floor(Number(settings[TOKENS_KEY])) || 0);

  const last = Math.floor((now - 15 * MIN) / HALF) * HALF + 15 * MIN;
  const live = now < last + LEN;
  const rounds = Array.from({ length: 8 }, (_, i) => last + (live ? i : i + 1) * HALF);
  const hero = rounds[0];
  const hour = Math.floor(now / HOUR) * HOUR;

  const toggle = (key: string, set: Set<string>, id: string) => {
    const next = new Set(set);
    if (!next.delete(id)) next.add(id);
    save(key, JSON.stringify([...next]));
  };
  const needed = SHOP.filter((i) => goals.has(i.id)).reduce((s, i) => s + i.cost, 0);
  const round = (ms: number) => t("events.shugo.round", { m: roundMin(ms) });

  return (
    <div className="evStack">
      <div className="evGrid">
        <section className="card evHero" aria-labelledby="shugoState">
          <div className="evState" id="shugoState" data-live={live}>
            <span className="dot" aria-hidden="true" />
            {live ? t("events.shugo.roundLive") : t("events.shugo.nextRound")}
          </div>
          <div>
            <div className="kicker">{live ? t("events.endsIn") : t("events.startsIn")}</div>
            <div className="evCount" role="timer">
              {countdown((live ? hero + LEN : hero) - now, t)}
            </div>
          </div>
          <div className="evMeta">
            <span>
              <strong>
                {clock(hero, lang)} - {clock(hero + LEN, lang)}
              </strong>{" "}
              {dayLabel(hero, now, lang)}
            </span>
            <span>{round(hero)}</span>
          </div>
          <div>
            <div className="kicker" style={{ marginBottom: 6 }}>
              {t("events.shugo.pool")}
            </div>
            <div className="evChips">
              {pool(hero).map((g) => (
                <span key={g.id} className="evChip" data-fav={favs.has(g.id)}>
                  {favs.has(g.id) && <StarIcon weight="fill" aria-hidden="true" />}
                  {g.name}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="kicker" style={{ marginBottom: 6 }}>
              {t("events.shugo.thisHour")}
            </div>
            <div className="evRail">
              {[15, 45].map((m) => {
                const start = hour + m * MIN;
                return (
                  <div
                    key={m}
                    className="evSeg"
                    data-past={now >= start + LEN}
                    data-live={now >= start && now < start + LEN}
                    data-next={start === hero && !live}
                    style={{ left: `${(m / 60) * 100}%`, width: `${(ROUND_LEN_MIN / 60) * 100}%` }}
                  />
                );
              })}
              <div className="evNow" style={{ left: `${((now - hour) / HOUR) * 100}%` }} aria-hidden="true" />
            </div>
            <div className="evTicks" aria-hidden="true">
              {[0, 15, 30, 45, 60].map((m) => (
                <span key={m} style={{ left: `${(m / 60) * 100}%` }}>
                  {clock(hour + m * MIN, lang)}
                </span>
              ))}
            </div>
          </div>
        </section>

        <Card title={t("events.shugo.upcoming")}>
          <div className="evList">
            {rounds.slice(1).map((r, i) => {
              const fav = pool(r).some((g) => favs.has(g.id));
              return (
                <div key={r} className="evRow" data-first={i === 0}>
                  <span className="mono">{clock(r, lang)}</span>
                  <span>
                    {round(r)}{" "}
                    {fav && (
                      <StarIcon
                        weight="fill"
                        role="img"
                        aria-label={t("events.shugo.favorite")}
                        style={{ color: "var(--pm-redt)", verticalAlign: -2 }}
                      />
                    )}
                    <small>{dayLabel(r, now, lang)}</small>
                  </span>
                  <span className="evLeft">{countdown(r - now, t)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card title={t("events.shugo.games")} aside={<span className="evNote">{t("events.shugo.favHint")}</span>}>
        <div className="evPools" style={{ marginTop: 8 }}>
          {[15, 45].map((m) => (
            <div key={m}>
              <h3 style={{ display: "flex", justifyContent: "space-between", fontWeight: 500, marginBottom: 4 }}>
                {t("events.shugo.round", { m })}
                <span
                  className="mono"
                  style={{ fontSize: 12, fontWeight: 400, color: live && roundMin(hero) === m ? "var(--pm-okt)" : "var(--pm-t3)" }}
                >
                  {live && roundMin(hero) === m
                    ? t("events.live")
                    : t("events.shugo.nextIn", { time: countdown(rounds.find((r) => r > now && roundMin(r) === m)! - now, t) })}
                </span>
              </h3>
              {GAMES.filter((g) => g.round === m).map((g) => (
                <div key={g.id} className="evGame">
                  <button
                    type="button"
                    className="evStar"
                    aria-pressed={favs.has(g.id)}
                    aria-label={`${t("events.shugo.favorite")}: ${g.name}`}
                    onClick={() => toggle(FAV_KEY, favs, g.id)}
                  >
                    <StarIcon weight={favs.has(g.id) ? "fill" : "regular"} aria-hidden="true" />
                  </button>
                  <div>
                    <div>{g.name}</div>
                    <p>{t(`events.shugo.g.${g.id}`)}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <div className="evGrid">
        <Card title={t("events.shugo.shop")}>
          <p className="evNote" style={{ margin: "4px 0 12px" }}>
            {t("events.shugo.shopHint")}
          </p>
          <div className="evTotals">
            <label className="field">
              {t("events.shugo.tokens")}
              <input
                className="input sm mono"
                type="number"
                min={0}
                inputMode="numeric"
                style={{ width: 120 }}
                value={tokens || ""}
                placeholder="0"
                onChange={(e) => save(TOKENS_KEY, String(Math.max(0, Math.floor(Number(e.target.value)) || 0)))}
              />
            </label>
            <div>
              <div className="kicker">{t("events.shugo.needed")}</div>
              <div className="num">{fmt(needed, lang)}</div>
            </div>
            <div>
              <div className="kicker">{t("events.shugo.missing")}</div>
              <div className="num" style={{ color: needed && tokens >= needed ? "var(--pm-okt)" : undefined }}>
                {needed && tokens >= needed ? t("events.shugo.done") : fmt(Math.max(0, needed - tokens), lang)}
              </div>
            </div>
            <div
              className="evBar"
              role="progressbar"
              aria-label={t("events.shugo.needed")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={needed ? Math.round(Math.min(1, tokens / needed) * 100) : 0}
            >
              <div style={{ width: `${needed ? Math.min(1, tokens / needed) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="evShop">
            {CATS.map((cat) => [
              <div key={cat} className="kicker evCat">
                {t(`events.shugo.cat.${cat}`)}
              </div>,
              ...SHOP.filter((i) => i.cat === cat).map((i) => (
                <label key={i.id} className="evItem">
                  <input type="checkbox" checked={goals.has(i.id)} onChange={() => toggle(GOALS_KEY, goals, i.id)} />
                  <span>
                    {i.name} {i.limited && <span className="badge">{t("events.shugo.limited")}</span>}
                  </span>
                  <span className="mono">{fmt(i.cost, lang)}</span>
                </label>
              )),
            ])}
          </div>
        </Card>

        <Card title={t("events.shugo.keys")}>
          <ul className="evFacts" style={{ marginTop: 8 }}>
            <li>
              <CardsIcon aria-hidden="true" />
              {t("events.shugo.keysText")}
            </li>
            <li>
              <KeyIcon aria-hidden="true" />
              {t("events.shugo.keysSub")}
            </li>
            <li>
              <KeyIcon aria-hidden="true" />
              {t("events.shugo.keysFree")}
            </li>
          </ul>
        </Card>
      </div>

      <p className="evNote">{t("events.shugo.source")}</p>
    </div>
  );
}
