import { useState } from "react";
import { CheckIcon, GridFourIcon, PlusIcon } from "@phosphor-icons/react";
import { REGIONS } from "../Onboarding";
import { SAMPLE_ACTIVITIES, SAMPLE_ALTS, type Priority } from "../sample/organizer";
import "./organizer/organizer.css";
import type { PageProps } from "./types";

const TABS = [
  ["daily", "organizer.tabDaily"],
  ["weekly", "organizer.tabWeekly"],
  ["seasonal", "organizer.tabSeasonal"],
  ["custom", "organizer.tabCustom"],
] as const;
const PRIORITY: Record<Priority, [label: string, color: string]> = {
  high: ["organizer.priorityHigh", "#FF6B6B"],
  medium: ["organizer.priorityMedium", "#E8B03A"],
  low: ["organizer.priorityLow", "var(--pm-t3)"],
};

/**
 * Prototype pg.attivita. Ticks live in page state until R5 stores them (and
 * clears them at reset); the matrix starts from the prototype's pattern.
 */
export default function Attivita({ t, settings }: PageProps) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("daily");
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [matrix, setMatrix] = useState(false);
  const [cells, setCells] = useState<Record<string, boolean>>({});
  const list = SAMPLE_ACTIVITIES[tab];
  const region = (REGIONS.find((r) => r.value === settings["pm.region"]) ?? REGIONS[0]).label;

  return (
    <>
      <div className="orgTabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" className="orgTab" aria-selected={id === tab} onClick={() => setTab(id)}>
            {t(label)}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--pm-t3)", marginRight: 10 }}>{t("organizer.autoReset", { region })}</span>
        <button
          type="button"
          style={{
            height: 30,
            padding: "0 10px",
            borderRadius: 6,
            border: "1px solid var(--pm-line)",
            background: "transparent",
            color: "var(--pm-t1)",
            cursor: "pointer",
            fontSize: 12,
            marginBottom: 4,
          }}
          onClick={() => setMatrix(!matrix)}
        >
          <GridFourIcon aria-hidden="true" style={{ verticalAlign: "-0.125em" }} /> {t(matrix ? "organizer.listView" : "organizer.matrixView")}
        </button>
      </div>

      {matrix ? (
        <div className="orgMatrix" role="table">
          <div role="row">
            <span role="columnheader">{t("organizer.colTask")}</span>
            {SAMPLE_ALTS.map((n) => (
              <span key={n} role="columnheader" style={{ textAlign: "center" }}>
                {n}
              </span>
            ))}
          </div>
          {list.map(([id, name]) => (
            <div key={id} role="row">
              <span role="rowheader">{name}</span>
              {SAMPLE_ALTS.map((alt, k) => {
                const key = id + k;
                const on = cells[key] ?? (id.charCodeAt(1) + k) % 3 === 0;
                return (
                  <span key={alt} role="cell" style={{ display: "grid" }}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={`${name} · ${alt}`}
                      className="orgCell"
                      onClick={() => setCells({ ...cells, [key]: !on })}
                    >
                      {on && <CheckIcon aria-hidden="true" />}
                    </button>
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="orgList">
          {list.map(([id, name, p]) => {
            const [label, color] = PRIORITY[p];
            return (
              <button
                key={id}
                type="button"
                role="checkbox"
                aria-checked={!!done[id]}
                className="orgRow"
                onClick={() => setDone({ ...done, [id]: !done[id] })}
              >
                <span className="orgBox">{done[id] && <CheckIcon aria-hidden="true" />}</span>
                <span
                  style={{
                    flex: 1,
                    color: done[id] ? "var(--pm-t3)" : "var(--pm-t1)",
                    textDecoration: done[id] ? "line-through" : "none",
                  }}
                >
                  {name}
                </span>
                <span style={{ fontSize: 11, color }}>{t(label)}</span>
              </button>
            );
          })}
          {/* ponytail: inert like the prototype; adding needs R5 storage. */}
          <div
            style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 40, padding: "0 10px", color: "var(--pm-t3)", cursor: "pointer" }}
          >
            <PlusIcon aria-hidden="true" />
            {t("organizer.addTask")}
          </div>
        </div>
      )}
    </>
  );
}
