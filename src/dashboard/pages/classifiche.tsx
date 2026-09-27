import { useState, type CSSProperties } from "react";
import { ArrowSquareOutIcon, CaretRightIcon, HeartIcon } from "@phosphor-icons/react";
import { fmt, RELEASED_CLASSES } from "../ui";
import { RANK_BOSSES, RANK_DUNGEONS, REGIONS, sampleRanking } from "../sample/combat";
import { Av } from "./combat/parts";
import type { PageProps } from "./types";

// Sample leaderboard until online logs (R2) feed it.
const COLS = "48px minmax(0,1.4fr) 110px 90px 90px 70px 70px 40px";
const MEDALS = ["#F0C24A", "#C9C4C4", "#C58B55"];
const HEIGHTS = [132, 116, 104];
const PERIODS = ["week", "month", "season"] as const;

export default function Classifiche({ t, lang }: PageProps) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("week");
  const [region, setRegion] = useState(REGIONS[0]);
  const [dungeon, setDungeon] = useState(RANK_DUNGEONS[0]);
  const [boss, setBoss] = useState(RANK_BOSSES[0]);
  const [cls, setCls] = useState("");
  // ponytail: the filters only reshuffle the sample board until online logs (R2) serve real ones.
  const seed = REGIONS.indexOf(region) + 2 * RANK_DUNGEONS.indexOf(dungeon) + 4 * RANK_BOSSES.indexOf(boss) + 8 * PERIODS.indexOf(period);
  const { podium, board, me } = sampleRanking(seed, cls || undefined);
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
        <select className="cbSelect" aria-label={t("combat.region")} value={region} onChange={(e) => setRegion(e.target.value)}>
          {REGIONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        {caret}
        <select className="cbSelect" aria-label="Dungeon" value={dungeon} onChange={(e) => setDungeon(e.target.value)}>
          {RANK_DUNGEONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        {caret}
        <select className="cbSelect" aria-label="Boss" value={boss} onChange={(e) => setBoss(e.target.value)}>
          {RANK_BOSSES.map((r) => (
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12, alignItems: "end", marginBottom: 12, maxWidth: 900 }}>
        {podium.map(({ n, cls, dps, cp, d, sup }, i) => (
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
                  {n} {sup && heart(11)}
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
          {board.map((r) => (
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
        {me && (
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
              {me.pos}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Av cls={me.cls} size={22} radius={5} font={8} bare />
              {me.n} <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t("combat.you")}</span>
            </span>
            <span style={{ color: "var(--pm-t2)", fontSize: 12 }}>{me.cls}</span>
            <span className="num">{fmt(me.dps, lang)}</span>
            <span style={mono}>{fmt(me.cp, lang)}</span>
            <span style={mono}>{me.d}</span>
            <span className="mono" style={{ fontSize: 12, color: "var(--pm-t3)" }}>
              {me.date}
            </span>
            {openLog}
          </div>
        )}
      </div>
    </>
  );
}
