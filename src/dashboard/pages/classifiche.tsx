import { useState, type CSSProperties } from "react";
import { ArrowSquareOutIcon, CaretRightIcon, HeartIcon } from "@phosphor-icons/react";
import { fmt } from "../ui";
import { BOARD, MY_RANK, PODIUM, RANK_BOSSES, RANK_CLASSES, RANK_DUNGEONS, REGIONS } from "../sample/combat";
import { Av } from "./combat/parts";
import type { PageProps } from "./types";

// Sample leaderboard until online logs (R2) feed it.
const COLS = "48px minmax(0,1.4fr) 110px 90px 90px 70px 70px 40px";
const MEDALS = ["#F0C24A", "#C9C4C4", "#C58B55"];
const HEIGHTS = [132, 116, 104];
const PERIODS = ["week", "month", "season"] as const;

export default function Classifiche({ t, lang }: PageProps) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("week");
  const caret = <CaretRightIcon aria-hidden="true" style={{ color: "var(--pm-t3)" }} />;
  const heart = (size: number) => <HeartIcon weight="fill" aria-label="Supporter" style={{ color: "var(--pm-redt)", fontSize: size }} />;
  const openLog = (
    // ponytail: log links wait for online logs (R2).
    <button type="button" className="cbPlain" title={t("combat.openLog")} aria-label={t("combat.openLog")} style={{ display: "flex", color: "var(--pm-t3)" }}>
      <ArrowSquareOutIcon aria-hidden="true" />
    </button>
  );
  const mono: CSSProperties = { fontFamily: "var(--pm-mono)", textAlign: "right", color: "var(--pm-t2)" };

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <select className="cbSelect" aria-label={t("combat.region")}>
          {REGIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        {caret}
        <select className="cbSelect" aria-label="Dungeon">
          {RANK_DUNGEONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        {caret}
        <select className="cbSelect" aria-label="Boss">
          {RANK_BOSSES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        {caret}
        <select className="cbSelect" aria-label={t("combat.col.class")}>
          <option>{t("combat.allClasses")}</option>
          {RANK_CLASSES.map((r) => (
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, alignItems: "end", marginBottom: 12, maxWidth: 900 }}>
        {PODIUM.map(([n, cls, dps, cp, d], i) => (
          <div
            key={n}
            className="card"
            style={{ padding: 14, borderTop: `2px solid ${MEDALS[i]}`, minHeight: HEIGHTS[i], display: "flex", flexDirection: "column", gap: 8, justifyContent: "flex-end" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="mono" style={{ fontSize: 22, color: MEDALS[i] }}>
                {i + 1}
              </span>
              <Av cls={cls} size={28} />
              <div>
                <div style={{ fontWeight: 500 }}>
                  {n} {i === 0 && heart(11)}
                </div>
                <div style={{ fontSize: 11, color: "var(--pm-t3)" }}>{cls}</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="mono" style={{ fontSize: 20 }}>
                {fmt(dps, lang)}
              </span>
              <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>
                CP {fmt(cp, lang)} · {d}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: "4px 8px", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 10, padding: 8, fontSize: 11, color: "var(--pm-t3)", borderBottom: "1px solid var(--pm-line)" }}>
          <span>{t("combat.col.pos")}</span>
          <span>{t("combat.col.player")}</span>
          <span>{t("combat.col.class")}</span>
          <span style={{ textAlign: "right" }}>DPS</span>
          <span style={{ textAlign: "right" }}>CP</span>
          <span style={{ textAlign: "right" }}>{t("combat.duration")}</span>
          <span>{t("combat.col.date")}</span>
          <span />
        </div>
        <div style={{ maxHeight: 360, overflow: "auto" }}>
          {BOARD.map((r) => (
            <div key={r.pos} className="cbHover" style={{ display: "grid", gridTemplateColumns: COLS, gap: 10, alignItems: "center", minHeight: 36, padding: "0 8px", borderBottom: "1px solid var(--pm-line)" }}>
              <span className="mono" style={{ color: "var(--pm-t3)" }}>
                {r.pos}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Av cls={r.cls} size={22} radius={5} font={8} bare />
                {r.n}
                {r.sup && heart(10)}
              </span>
              <span style={{ color: "var(--pm-t2)", fontSize: 12 }}>{r.cls}</span>
              <span className="num">{fmt(r.dps, lang)}</span>
              <span style={mono}>{fmt(r.cp, lang)}</span>
              <span style={mono}>{r.d}</span>
              <span className="mono" style={{ fontSize: 12, color: "var(--pm-t3)" }}>
                {r.date}
              </span>
              {openLog}
            </div>
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: COLS,
            gap: 10,
            alignItems: "center",
            minHeight: 40,
            padding: "0 8px",
            background: "var(--pm-tint)",
            borderTop: "1px solid var(--pm-red)",
            borderRadius: "0 0 6px 6px",
          }}
        >
          <span className="mono" style={{ color: "var(--pm-redt)" }}>
            {MY_RANK.pos}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Av cls={MY_RANK.cls} size={22} radius={5} font={8} bare />
            {MY_RANK.n} <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t("combat.you")}</span>
          </span>
          <span style={{ color: "var(--pm-t2)", fontSize: 12 }}>{MY_RANK.cls}</span>
          <span className="num">{fmt(MY_RANK.dps, lang)}</span>
          <span style={mono}>{fmt(MY_RANK.cp, lang)}</span>
          <span style={mono}>{MY_RANK.d}</span>
          <span className="mono" style={{ fontSize: 12, color: "var(--pm-t3)" }}>
            {MY_RANK.date}
          </span>
          {openLog}
        </div>
      </div>
    </>
  );
}
