import { useState } from "react";
import { CaretRightIcon, TrophyIcon } from "@phosphor-icons/react";
import { EmptyState, RELEASED_CLASSES } from "../ui";
import "./combat/combat.css";
import type { PageProps } from "./types";

// Leaderboards come from online logs (R2): until then the filters stand and the board is empty.
// ponytail: dungeon/boss filters return with the R2 board (the prototype's names were not real).
const REGIONS = ["EU", "NA"];
const PERIODS = ["week", "month", "season"] as const;

export default function Classifiche({ t }: PageProps) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("week");
  const [region, setRegion] = useState(REGIONS[0]);
  const [cls, setCls] = useState("");
  const caret = <CaretRightIcon aria-hidden="true" style={{ color: "var(--pm-t3)" }} />;

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <select className="cbSelect" aria-label={t("combat.region")} value={region} onChange={(e) => setRegion(e.target.value)}>
          {REGIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        {caret}
        <select className="cbSelect" aria-label={t("combat.col.class")} value={cls} onChange={(e) => setCls(e.target.value)}>
          <option value="">{t("combat.allClasses")}</option>
          {RELEASED_CLASSES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <div className="cbSeg" role="group" style={{ marginLeft: 8 }}>
          {PERIODS.map((p) => (
            <button key={p} type="button" aria-pressed={p === period} onClick={() => setPeriod(p)}>
              {t(`combat.${p}`)}
            </button>
          ))}
        </div>
      </div>

      <section className="card">
        <EmptyState icon={<TrophyIcon aria-hidden="true" />} title={t("combat.rankEmptyTitle")} text={t("shell.states.afterLaunch")} />
      </section>
    </>
  );
}
