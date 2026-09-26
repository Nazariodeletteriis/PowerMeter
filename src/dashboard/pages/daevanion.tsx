import { useState } from "react";
import { ArrowCounterClockwiseIcon, CheckIcon, ChecksIcon, FloppyDiskIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import { DV_BOARDS, DV_BUILDS, DV_CENTER, DV_COST, DV_N, dvLabel, dvPoints, dvType, type DvType } from "../sample/characters";
import { ShareModal, useMem, useToast } from "./characters/shared";
import type { PageProps } from "./types";

type Board = Record<string, true>;
const START: Board = { [DV_CENTER]: true };
const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const COLOR: Record<DvType, string> = { skill: "#B377E8", rune: "#F0A63A", start: "#4F93EA", stat: "var(--pm-grey)" };
const CARD = { background: "var(--pm-s1)", border: "1px solid var(--pm-line)", borderRadius: 8 } as const;
const center = (v: number) => v * 44 + 17; // cell 34 + gap 10, middle of the cell

/** Active nodes still linked to the start node (flood fill from the center). */
function connected(on: Board): Board {
  const seen: Board = { [DV_CENTER]: true };
  const stack = [DV_CENTER];
  while (stack.length) {
    const [x, y] = stack.pop()!.split(",").map(Number);
    for (const [dx, dy] of STEPS) {
      const k = `${x + dx},${y + dy}`;
      if (on[k] && !seen[k]) {
        seen[k] = true;
        stack.push(k);
      }
    }
  }
  return seen;
}

// Prototype pg.daevanion (pDaev + pX).
export default function Daevanion({ t, onError }: PageProps) {
  const [all, setAll] = useMem<Record<string, Board>>("dv", {});
  const [bd, setBd] = useMem("dvB", DV_BOARDS[0][0]);
  const [icons, setIcons] = useMem("dvIcons", true);
  const [pick, setPick] = useMem<string | null>("dvPick", null);
  const [share, setShare] = useState(false);
  const [toast, showToast] = useToast();

  const on = all[bd] ?? START;
  const setBoard = (next: Board) => setAll({ ...all, [bd]: next });
  const max = DV_BOARDS.find((b) => b[0] === bd)![1];
  const pts = dvPoints(on);
  const nodeName = (type: DvType, x: number, y: number) => dvLabel(type, x, y) ?? t("characters.dv.startNode");

  const gains: Record<string, number> = {};
  const cells = [];
  for (let y = 0; y < DV_N; y++)
    for (let x = 0; x < DV_N; x++) {
      const k = `${x},${y}`;
      const type = dvType(x, y);
      if (!type) {
        cells.push(<span key={k} />);
        continue;
      }
      const act = !!on[k];
      const can = !act && STEPS.some(([dx, dy]) => on[`${x + dx},${y + dy}`]);
      const label = nodeName(type, x, y);
      if (act && type !== "start") gains[label] = (gains[label] ?? 0) + 1;
      const col = COLOR[type];
      const click = () => {
        if (type !== "start" && act) {
          // Removing a node drops every node it was holding to the start.
          const rest = { ...on };
          delete rest[k];
          const ok = connected(rest);
          setBoard(Object.fromEntries(Object.keys(rest).filter((q) => ok[q]).map((q) => [q, true])));
        } else if (type !== "start" && can) setBoard({ ...on, [k]: true });
        setPick(k);
      };
      cells.push(
        <button
          key={k}
          type="button"
          className="chNode"
          title={label}
          aria-label={`${label} · ${t(`characters.dv.type.${type}`)}`}
          aria-pressed={act}
          onClick={click}
          style={{
            background: act ? (type === "stat" ? "var(--pm-tint)" : `${col}33`) : "var(--pm-s2)",
            border: act ? `1.5px solid ${type === "stat" ? "var(--pm-red)" : col}` : can ? "1px dashed var(--pm-grey)" : "1px solid var(--pm-line)",
            boxShadow: pick === k ? "0 0 0 2px var(--pm-t1)" : "none",
            opacity: act || can || type === "start" ? 1 : 0.55,
            color: act ? "var(--pm-t1)" : col,
          }}
        >
          {(icons || type !== "skill") && { skill: "SK", rune: "R", start: "◆", stat: "" }[type]}
        </button>,
      );
    }

  const lines: [number, number, number, number][] = [];
  for (const k of Object.keys(on)) {
    const [x, y] = k.split(",").map(Number);
    if (on[`${x + 1},${y}`]) lines.push([x, y, x + 1, y]);
    if (on[`${x},${y + 1}`]) lines.push([x, y, x, y + 1]);
  }

  const [px, py] = pick ? pick.split(",").map(Number) : [];
  const pickType = pick ? dvType(px, py) : null;
  const selectAll = () => {
    const next: Board = {};
    for (let y = 0; y < DV_N; y++) for (let x = 0; x < DV_N; x++) if (dvType(x, y)) next[`${x},${y}`] = true;
    setBoard(next);
  };

  return (
    <>
      <div className="chToolbar">
        <select className="chSelect" aria-label={t("characters.skill.build")}>
          {DV_BUILDS.map((b) => (
            <option key={b}>{b}</option>
          ))}
          <option>{t("characters.newBuildOption")}</option>
        </select>
        <div style={{ flex: 1 }} />
        <label className="chCheck">
          <input type="checkbox" className="srOnly" checked={icons} onChange={() => setIcons(!icons)} />
          <span>{icons && <CheckIcon aria-hidden="true" />}</span>
          {t("characters.dv.skillIcons")}
        </label>
        <button type="button" className="btn sm" onClick={selectAll}>
          <ChecksIcon aria-hidden="true" />
          {t("characters.dv.all")}
        </button>
        <button
          type="button"
          className="btn sm"
          onClick={() => {
            setBoard(START);
            setPick(null);
          }}
        >
          <ArrowCounterClockwiseIcon aria-hidden="true" />
          Reset
        </button>
        <button type="button" className="btn sm" onClick={() => setShare(true)}>
          <ShareNetworkIcon aria-hidden="true" />
          {t("characters.share.button")}
        </button>
        <button type="button" className="btn sm fill" style={{ padding: "0 12px" }} onClick={() => showToast({ title: t("characters.dv.savedTitle"), text: t("characters.dv.savedText") })}>
          <FloppyDiskIcon aria-hidden="true" />
          {t("characters.save")}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "210px minmax(0,1fr) 260px", gap: 12, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {DV_BOARDS.map(([n, m]) => {
            const p = n === bd ? pts : dvPoints(all[n] ?? {});
            const sel = n === bd;
            return (
              <button
                key={n}
                type="button"
                className="chBtnReset chBoardTab"
                aria-pressed={sel}
                onClick={() => {
                  setBd(n);
                  setPick(null);
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                  <span style={{ width: 10, height: 10, transform: "rotate(45deg)", border: `1.5px solid ${sel ? "var(--pm-red)" : "var(--pm-line)"}` }} />
                  <span style={{ flex: 1, fontWeight: 500 }}>{n}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--pm-t3)" }}>
                    {p}/{m}
                  </span>
                </span>
                <span style={{ display: "block", width: "100%", height: 3, borderRadius: 2, background: "var(--pm-s3)" }}>
                  <span style={{ display: "block", height: "100%", width: `${Math.min(100, (p / m) * 100)}%`, background: "var(--pm-red)", borderRadius: 2 }} />
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "radial-gradient(circle at 50% 50%,rgba(219,0,0,.10),transparent 60%),var(--pm-bg)", border: "1px solid var(--pm-line)", height: 700, display: "grid", placeItems: "center" }}>
          <div style={{ position: "relative", width: 484, height: 484 }}>
            <svg viewBox="0 0 484 484" aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              {lines.map(([x1, y1, x2, y2]) => (
                <line key={`${x1},${y1},${x2},${y2}`} x1={center(x1)} y1={center(y1)} x2={center(x2)} y2={center(y2)} stroke="#DB0000" strokeWidth={3} strokeLinecap="round" />
              ))}
            </svg>
            <div role="group" aria-label={bd} style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "repeat(11,34px)", gridAutoRows: "34px", gap: 10 }}>
              {cells}
            </div>
          </div>
          <div style={{ position: "absolute", left: 14, bottom: 12, fontSize: 11, color: "var(--pm-t3)", maxWidth: 260, lineHeight: 1.5 }}>{t("characters.dv.hint")}</div>
          <div style={{ position: "absolute", right: 14, bottom: 12, display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--pm-t3)" }}>
            {(["stat", "skill", "rune"] as const).map((type) => (
              <span key={type}>
                <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, border: `1.5px solid ${type === "stat" ? "var(--pm-red)" : COLOR[type]}` }} /> {t(`characters.dv.type.${type}`)} · {DV_COST[type]} pt
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ ...CARD, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{ position: "relative", width: 120, height: 120, borderRadius: "50%", background: `conic-gradient(#DB0000 ${Math.min(1, pts / max) * 360}deg,var(--pm-s3) 0)`, display: "grid", placeItems: "center" }}>
              <div style={{ width: 100, height: 100, borderRadius: "50%", background: "var(--pm-s1)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span className="mono" style={{ fontSize: 24 }}>
                  {pts}
                </span>
                <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t("characters.dv.ofMax", { n: max })}</span>
              </div>
            </div>
            <div className="kicker" style={{ marginTop: 4 }}>{t("characters.dv.spent")}</div>
          </div>
          <section style={{ ...CARD, padding: 14 }} aria-live="polite">
            <h2 className="kicker" style={{ marginBottom: 8 }}>{t("characters.dv.selected")}</h2>
            {pickType ? (
              <>
                <div style={{ fontWeight: 500 }}>{nodeName(pickType, px, py)}</div>
                <div style={{ fontSize: 12, color: "var(--pm-t2)", marginTop: 2 }}>
                  {t(`characters.dv.type.${pickType}`)} · {t("characters.dv.cost", { n: DV_COST[pickType] })}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("characters.dv.noPick")}</div>
            )}
          </section>
          <section style={{ ...CARD, padding: 14 }}>
            <h2 className="kicker" style={{ marginBottom: 8 }}>{t("characters.dv.gains")}</h2>
            {Object.keys(gains).length === 0 && <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("characters.dv.noGains")}</div>}
            {Object.entries(gains).map(([n, c]) => (
              <div key={n} style={{ display: "flex", gap: 8, fontSize: 12, minHeight: 24, alignItems: "center", borderBottom: "1px solid var(--pm-line)" }}>
                <span style={{ flex: 1, color: "var(--pm-t2)" }}>{n}</span>
                <span className="mono">×{c}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
      {toast}
      {share && <ShareModal t={t} onClose={() => setShare(false)} onError={onError} />}
    </>
  );
}
