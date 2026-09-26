import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import type { SaveSetting, Settings } from "./App";
import type { T } from "./i18n";
import { REGIONS, USER_NAME_KEY } from "./Onboarding";
import { hint, type CaptureStatus, type MeterStatus } from "./Shell";
import { usePoll } from "./usePoll";

/** The fields of FightSummary (src-tauri/src/entity/fight_record.rs) shown here. */
type FightSummary = { id: string; bossName: string; startTimeMs: number; durationMs: number };

// Newest first (the backend sorts by start time).
const getFights = () => invoke<FightSummary[]>("get_fight_history");

type Props = {
  t: T;
  lang: string;
  settings: Settings;
  save: SaveSetting;
  status: MeterStatus;
  capture?: CaptureStatus;
};

export function Home({ t, lang, settings, save, status, capture }: Props) {
  // Fights are auto-saved by the meter; 10s matches its own history refresh.
  const fights = usePoll(getFights, 10000);
  const [error, setError] = useState<string>();

  const name = capture?.characterName || localStorage.getItem(USER_NAME_KEY) || t("home.notSet");
  const region = REGIONS.find((r) => r.value === settings["pm.region"])?.label ?? t("home.notSet");
  const date = new Intl.DateTimeFormat(lang, { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="home">
      <section className="card">
        <h2>{t("home.meter")}</h2>
        <p className={`pill ${status}`}>{t(`status.${status}`)}</p>
        <p className="muted">{hint(t, status)}</p>
        <dl>
          <dt>{t("home.port")}</dt>
          <dd className="num">{capture?.port ?? "—"}</dd>
          <dt>{t("home.device")}</dt>
          <dd>{(capture?.locked && (capture.device || capture.ip)) || "—"}</dd>
        </dl>
      </section>

      <section className="card">
        <h2>{t("home.character")}</h2>
        <dl>
          <dt>{t("home.name")}</dt>
          <dd>{name}</dd>
          <dt>{t("home.region")}</dt>
          <dd>{region}</dd>
        </dl>
      </section>

      <section className="card wide">
        <h2>{t("home.fights")}</h2>
        {fights.error ? (
          <p className="error" role="alert">
            {t("common.error", { message: fights.error })}
          </p>
        ) : fights.data?.length ? (
          <table>
            <thead>
              <tr>
                <th scope="col">{t("home.colBoss")}</th>
                <th scope="col">{t("home.colDate")}</th>
                <th scope="col" className="num">
                  {t("home.colDuration")}
                </th>
              </tr>
            </thead>
            <tbody>
              {fights.data.slice(0, 5).map((f) => (
                <tr key={f.id}>
                  <td>{f.bossName || "—"}</td>
                  <td className="num">{date.format(f.startTimeMs)}</td>
                  <td className="num">{formatDuration(f.durationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          fights.data && <p className="muted">{t("home.fightsEmpty")}</p>
        )}
      </section>

      <p className="wide">
        <button
          type="button"
          className="link"
          onClick={() => save("pm.onboarded", "0").catch((e) => setError(String(e)))}
        >
          {t("home.reviewOnboarding")}
        </button>
      </p>
      {error && (
        <p className="error wide" role="alert">
          {t("common.error", { message: error })}
        </p>
      )}
    </div>
  );
}

function formatDuration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
