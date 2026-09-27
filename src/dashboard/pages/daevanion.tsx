import { useEffect, useState } from "react";
import { ArrowCounterClockwiseIcon, CheckIcon, ChecksIcon, FloppyDiskIcon, PlusIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import DV from "../../data/daevanion.json";
import { DV_BUILDS } from "../sample/characters";
import { GAME_SKILLS, planClass, SkillIcon, type GameSkill } from "../skills";
import { useMem, useToast } from "./characters/shared";
import { ShareModal } from "./shared/ShareModal";
import type { PageProps } from "./types";

// Real boards per class, scraped by scripts/scrape-daevanion.mjs (see its header for the format).
type DvNode = [x: number, y: number, cost: number, effect?: string | number[]];
type DvType = "start" | "stat" | "skill" | "unique";
const STATS = DV.stats as [name: string, percent: number][];
const BOARDS = DV.boards as unknown as Record<string, { name: string; n: number; nodes: DvNode[] }[]>;

const nodeType = ([, , cost, fx]: DvNode): DvType => (fx === undefined ? "start" : typeof fx === "string" ? "skill" : cost === 4 ? "unique" : "stat");
const statValue = (i: number, v: number) => `+${STATS[i][1] ? `${v / 100}%` : v}`;
/** "Attack Bonus +3" (two-stat nodes join with a comma). */
const statText = (fx: number[]) => Array.from({ length: fx.length / 2 }, (_, i) => `${STATS[fx[i * 2]][0]} ${statValue(fx[i * 2], fx[i * 2 + 1])}`).join(", ");
const skillById = (id: string) => GAME_SKILLS.find((s) => s.id === id);

type Board = Record<string, true>;
const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const COLOR: Record<DvType, string> = { skill: "#B377E8", unique: "#F0A63A", start: "#4F93EA", stat: "var(--pm-grey)" };
const CARD = { background: "var(--pm-s1)", border: "1px solid var(--pm-line)", borderRadius: 8 } as const;
const center = (v: number) => v * 44 + 17; // cell 34 + gap 10, middle of the cell
const keyOf = (n: DvNode) => `${n[0]},${n[1]}`;

/** Active nodes still linked to the start node (flood fill from it). */
function connected(on: Board, start: string): Board {
  const seen: Board = { [start]: true };
  const stack = [start];
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

/** Points spent / total per board of a class, from the planner's saved state (Character Builder tab). */
export function dvSummary(cls: string, all: Record<string, Board>) {
  return BOARDS[cls].map((b) => {
    const set = all[`${cls}:${b.name}`];
    const pts = (on?: Board) => b.nodes.reduce((p, n) => p + (!on || on[keyOf(n)] ? n[2] : 0), 0);
    return [b.name, set ? pts(set) : 0, pts()] as const;
  });
}

// Prototype pg.daevanion (pDaev + pX).
export default function Daevanion({ t, lang, name, settings, onError, setHeader }: PageProps) {
  const title = `${t("nav.daevanion")} · ${name}`;
  useEffect(() => setHeader({ title }), [setHeader, title]);
  // The class's own boards; the state is per class too, so a character switch swaps the tree.
  const cls = planClass(settings["pm.class"]);
  const boards = BOARDS[cls];
  const [all, setAll] = useMem<Record<string, Board>>("dvCls", {});
  const [bd, setBd] = useMem("dvB", boards[0].name);
  const [icons, setIcons] = useMem("dvIcons", true);
  const [pick, setPick] = useMem<string | null>("dvPick", null);
  const [share, setShare] = useState(false);
  const [toast, showToast] = useToast();

  const board = boards.find((b) => b.name === bd) ?? boards[0];
  const N = board.n;
  const byKey = Object.fromEntries(board.nodes.map((n) => [keyOf(n), n]));
  const startKey = keyOf(board.nodes.find((n) => nodeType(n) === "start")!);
  const boardKey = (name: string) => `${cls}:${name}`;
  const on = all[boardKey(board.name)] ?? { [startKey]: true };
  const setBoard = (next: Board) => setAll({ ...all, [boardKey(board.name)]: next });
  // Points spent on a board; without a set, its total.
  const points = (b: (typeof boards)[number], set?: Board) => b.nodes.reduce((p, n) => p + (!set || set[keyOf(n)] ? n[2] : 0), 0);
  const max = points(board);
  const pts = points(board, on);
  const nodeName = (n: DvNode) => {
    const fx = n[3];
    if (fx === undefined) return t("characters.dv.startNode");
    return typeof fx === "string" ? `${skillById(fx)?.name ?? fx} Lv +1` : statText(fx);
  };

  // Stats gained: summed per stat; skill levels per skill.
  const gains: Record<number, number> = {};
  const skillLv: Record<string, number> = {};
  const cells = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const k = `${x},${y}`;
      const node = byKey[k];
      if (!node) {
        cells.push(<span key={k} />);
        continue;
      }
      const type = nodeType(node);
      const fx = node[3];
      const act = !!on[k];
      const can = !act && STEPS.some(([dx, dy]) => on[`${x + dx},${y + dy}`]);
      const label = nodeName(node);
      if (act && typeof fx === "string") skillLv[fx] = (skillLv[fx] ?? 0) + 1;
      if (act && Array.isArray(fx))
        for (let i = 0; i < fx.length; i += 2) gains[fx[i]] = (gains[fx[i]] ?? 0) + fx[i + 1];
      const col = COLOR[type];
      const click = () => {
        if (type !== "start" && act) {
          // Removing a node drops every node it was holding to the start.
          const rest = { ...on };
          delete rest[k];
          const ok = connected(rest, startKey);
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
            overflow: "hidden",
            border: act ? `1.5px solid ${type === "stat" ? "var(--pm-red)" : col}` : can ? "1px dashed var(--pm-grey)" : "1px solid var(--pm-line)",
            boxShadow: pick === k ? "0 0 0 2px var(--pm-t1)" : "none",
            opacity: act || can || type === "start" ? 1 : 0.55,
            color: act ? "var(--pm-t1)" : col,
          }}
        >
          {type === "skill" ? (
            icons && (
              // Desaturated until the node is taken, so the chosen path stands out.
              <SkillIcon skill={skillById(fx as string)} name={label} style={{ filter: act ? "none" : "grayscale(0.5)" }} />
            )
          ) : type === "start" ? (
            "◆"
          ) : (
            <PlusIcon aria-hidden="true" weight="bold" style={{ fontSize: 11, color: act ? "var(--pm-t1)" : type === "unique" ? col : "var(--pm-t3)" }} />
          )}
        </button>,
      );
    }

  const lines: [number, number, number, number][] = [];
  for (const k of Object.keys(on)) {
    const [x, y] = k.split(",").map(Number);
    if (on[`${x + 1},${y}`]) lines.push([x, y, x + 1, y]);
    if (on[`${x},${y + 1}`]) lines.push([x, y, x, y + 1]);
  }

  const gainRows: [name: string, value: string, skill?: GameSkill][] = [
    ...Object.entries(gains).map(([i, v]): [string, string] => [STATS[+i][0], statValue(+i, v)]),
    ...Object.entries(skillLv).map(([id, c]): [string, string, GameSkill?] => [skillById(id)?.name ?? id, `Lv +${c}`, skillById(id)]),
  ];
  const picked = pick ? byKey[pick] : undefined;
  const pickType = picked && nodeType(picked);
  const selectAll = () => setBoard(Object.fromEntries(board.nodes.map((n) => [keyOf(n), true])));
  // Legend: the node types on this board with their cost range.
  const legend = (["stat", "skill", "unique"] as const).flatMap((type) => {
    const c = board.nodes.filter((n) => nodeType(n) === type).map((n) => n[2]);
    const lo = Math.min(...c), hi = Math.max(...c);
    return c.length ? [[type, lo === hi ? `${lo}` : `${lo}–${hi}`] as const] : [];
  });

  return (
    <>
      <div className="chToolbar">
        <select className="chSelect" aria-label={t("characters.skill.build")}>
          {DV_BUILDS.filter((b) => b[1] === cls).map(([b]) => (
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
            setBoard({ [startKey]: true });
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
          {boards.map((b) => {
            const n = b.name;
            const sel = b === board;
            const p = sel ? pts : points(b, all[boardKey(n)] ?? {});
            const m = points(b);
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

        <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "radial-gradient(circle at 50% 50%,rgba(219,0,0,.10),transparent 60%),var(--pm-bg)", border: "1px solid var(--pm-line)", height: Math.max(700, N * 44 + 206), display: "grid", placeItems: "center" }}>
          <div style={{ position: "relative", width: N * 44 - 10, height: N * 44 - 10 }}>
            <svg viewBox={`0 0 ${N * 44 - 10} ${N * 44 - 10}`} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
              {lines.map(([x1, y1, x2, y2]) => (
                <line key={`${x1},${y1},${x2},${y2}`} x1={center(x1)} y1={center(y1)} x2={center(x2)} y2={center(y2)} stroke="#DB0000" strokeWidth={3} strokeLinecap="round" />
              ))}
            </svg>
            <div role="group" aria-label={bd} style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: `repeat(${N},34px)`, gridAutoRows: "34px", gap: 10 }}>
              {cells}
            </div>
          </div>
          <div style={{ position: "absolute", left: 14, bottom: 12, fontSize: 11, color: "var(--pm-t3)", maxWidth: 260, lineHeight: 1.5 }}>{t("characters.dv.hint", { size: `${N}×${N}` })}</div>
          <div style={{ position: "absolute", right: 14, bottom: 12, display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--pm-t3)" }}>
            {legend.map(([type, cost]) => (
              <span key={type}>
                <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 2, border: `1.5px solid ${type === "stat" ? "var(--pm-red)" : COLOR[type]}` }} /> {t(`characters.dv.type.${type}`)} · {cost} pt
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
                <div style={{ fontWeight: 500 }}>{nodeName(picked)}</div>
                <div style={{ fontSize: 12, color: "var(--pm-t2)", marginTop: 2 }}>
                  {t(`characters.dv.type.${pickType}`)} · {t("characters.dv.cost", { n: picked[2] })}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("characters.dv.noPick")}</div>
            )}
          </section>
          <section style={{ ...CARD, padding: 14 }}>
            <h2 className="kicker" style={{ marginBottom: 8 }}>{t("characters.dv.gains")}</h2>
            {gainRows.length === 0 && <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("characters.dv.noGains")}</div>}
            {gainRows.map(([n, v, sk]) => (
              <div key={n} style={{ display: "flex", gap: 8, fontSize: 12, minHeight: 24, alignItems: "center", borderBottom: "1px solid var(--pm-line)" }}>
                {sk && (
                  <span style={{ width: 18, height: 18, flex: "none", borderRadius: 4, overflow: "hidden", display: "grid", placeItems: "center", fontSize: 7, background: "var(--pm-s3)" }}>
                    <SkillIcon skill={sk} name={n} />
                  </span>
                )}
                <span style={{ flex: 1, color: "var(--pm-t2)" }}>{n}</span>
                <span className="mono">{v}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
      {toast}
      {share && <ShareModal t={t} lang={lang} kind="daevanion" onClose={() => setShare(false)} onError={onError} />}
    </>
  );
}
