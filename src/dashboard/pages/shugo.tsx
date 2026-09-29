import { GameControllerIcon } from "@phosphor-icons/react";
import { Card } from "../ui";
import { HOUR, clock, countdown, dayLabel, useNow } from "./shugo/events";
import "./shugo/events.css";
import type { PageProps } from "./types";

// Shugo Festival, from NCSOFT's official Korean update notes
// (aion2.plaync.com/ko-kr/board/update): since 2026-04-22 every minigame opens
// every hour on the hour ("시간대 구분 없이 매시 정각에 모든 슈고 페스타가 활성화").
// Minigame English names: the ones the official KR notes list (높이높이, 신비로운
// 트랙, 골드린의 보물, 히든 루기, 슈고 상인 보호, 이 타일 아닌가요?, 망령 회피, 점프점프).
// Round length, keys and shop prices: no official source, so not shown.
// Server zones are whole-hour offsets: "on the hour" is the same everywhere.
const GAMES = ["Up! Up! Up!", "Mysterious Track", "Goldrin's Treasure", "Hidden Lugi", "Defend Shugo Merchants", "Not This Tile?", "Wraith Evasion", "Jump Jump"];

/** Shugo Festival: the next rounds (every hour on the hour) and the minigames. */
export default function Shugo({ t, lang }: PageProps) {
  const now = useNow();
  const next = Math.floor(now / HOUR) * HOUR + HOUR;
  const rounds = Array.from({ length: 8 }, (_, i) => next + i * HOUR);

  return (
    <div className="evStack">
      <div className="evGrid">
        <section className="card evHero" aria-labelledby="shugoState">
          <div className="evState" id="shugoState">
            <span className="dot" aria-hidden="true" />
            {t("events.shugo.nextRound")}
          </div>
          <div>
            <div className="kicker">{t("events.startsIn")}</div>
            <div className="evCount" role="timer">
              {countdown(next - now, t)}
            </div>
          </div>
          <div className="evMeta">
            <span>
              <strong>{clock(next, lang)}</strong> {dayLabel(next, now, lang)}
            </span>
          </div>
        </section>

        <Card title={t("events.shugo.upcoming")}>
          <div className="evList">
            {rounds.slice(1).map((r, i) => (
              <div key={r} className="evRow" data-first={i === 0}>
                <span className="mono">{clock(r, lang)}</span>
                <span>{dayLabel(r, now, lang)}</span>
                <span className="evLeft">{countdown(r - now, t)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title={t("events.shugo.games")}>
        <ul className="evFacts" style={{ marginTop: 8 }}>
          {GAMES.map((g) => (
            <li key={g}>
              <GameControllerIcon aria-hidden="true" />
              {g}
            </li>
          ))}
        </ul>
      </Card>

      <p className="evNote">{t("events.shugo.source")}</p>
    </div>
  );
}
