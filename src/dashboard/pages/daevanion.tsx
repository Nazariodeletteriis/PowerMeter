import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowCounterClockwiseIcon, ChecksIcon, FloppyDiskIcon, ShareNetworkIcon, SwordIcon } from "@phosphor-icons/react";
import type { PlannerBoardData } from "../../data/db/types";
import { GAME_SKILLS, planClass, SkillIcon } from "../skills";
import { RELEASED_CLASSES } from "../ui";
import { boardMax, connected, planTotals, plannerNodes, PLAN_KEY, PLAN_PROFILE, reachableNow, readPlans, savedNodes, statValue, toggle, type PNode } from "./characters/calc";
import { SectionHead, useMem, useToast } from "./characters/shared";
import { ShareModal } from "./shared/ShareModal";
import type { PageProps } from "./types";
import { DataState, gd, useGd, useIcons } from "./world/db";

// Prototype pg.daevanion (pDaev) on the archive's Global boards: one plan per class, saved in pm.daevanion.
const N = 15; // grid side of the Global boards
const COL = { start: "#4F93EA", skill: "#B377E8", rare: "#F0A63A" };
const kindOf = (n: PNode) => (n.kind === "Start" ? "start" : n.kind === "SkillLevel" ? "skill" : n.rarity === "Common" ? "stat" : "rare");

/** One board, read only: the nodes taken lit and linked as on the planner (the Builder's Daevanion tab). */
export function BoardView({ nodes, board, taken, width }: { nodes: PNode[]; board: number; taken: Set<string>; width: number }) {
  const cells = nodes.filter((n) => n.board === board);
  const icons = useIcons(cells.map((n) => n.skill?.icon));
  const lit = (n: PNode) => taken.has(n.id) || n.kind === "Start";
  const lines: [PNode, PNode][] = [];
  for (const n of cells)
    if (lit(n)) for (const m of cells) if (lit(m) && m.id > n.id && Math.abs(m.row - n.row) + Math.abs(m.col - n.col) === 1) lines.push([n, m]);
  return (
    <div className="dvBoard" style={{ width, gap: Math.max(1, width / 200) }}>
      <svg viewBox={`0 0 ${N} ${N}`} aria-hidden="true">
        {lines.map(([a, b]) => (
          <line key={a.id + b.id} x1={a.col + 0.5} y1={a.row + 0.5} x2={b.col + 0.5} y2={b.row + 0.5} stroke="#DB0000" strokeWidth={0.09} strokeLinecap="round" />
        ))}
      </svg>
      {cells.map((n) => {
        if (n.kind === "None") return <span key={n.id} style={{ gridRow: n.row + 1, gridColumn: n.col + 1 }} />;
        const k = kindOf(n);
        const img = n.skill?.icon ? icons[n.skill.icon] : undefined;
        return (
          <span
            key={n.id}
            className="dvCell"
            title={`${n.title ?? ""} · ${n.cost} pt`}
            data-kind={k}
            data-on={lit(n) ? "" : undefined}
            style={{ gridRow: n.row + 1, gridColumn: n.col + 1, "--c": k === "stat" ? "var(--pm-red)" : COL[k], cursor: "default" } as CSSProperties}
          >
            {k === "start" ? "◆" : img ? <img src={img} alt="" /> : k === "skill" ? <SkillIcon skill={GAME_SKILLS.find((s) => s.id === n.skill?.id)} name="SK" /> : ""}
          </span>
        );
      })}
    </div>
  );
}
/** "DaevanionCrystal" → "Daevanion Crystal" (game term, not translated). */
const spaced = (s: string) => s.replace(/([a-z])([A-Z0-9])/g, "$1 $2");
const CARD: CSSProperties = { background: "var(--pm-s1)", border: "1px solid var(--pm-line)", borderRadius: 8, padding: 14 };

export default function Daevanion({ t, lang, name, go, settings, save, onError, setHeader }: PageProps) {
  const title = `${t("nav.daevanion")} · ${name}`;
  useEffect(() => setHeader({ title }), [setHeader, title]);
  const [cls, setCls] = useMem("dvCls", planClass(settings["pm.class"]));
  const key = cls.toLowerCase(); // archive class names: the app's, lowercase
  const planner = useGd(() => gd.planner(key), key);
  const builder = useGd(() => gd.builder(key), key);
  const plans = readPlans(settings[PLAN_KEY]);
  // Unsaved edits per class; null = the saved plan.
  const [draft, setDraft] = useMem<string[] | null>(`dv:${cls}`, null);
  const [board, setBoard] = useMem(`dvB:${cls}`, 1);
  const [icons, setIcons] = useMem("dvIcons", true);
  const [pick, setPick] = useState<string>();
  const [share, setShare] = useState(false);
  const [toast, showToast] = useToast();

  const nodes = useMemo(() => (planner.data ? plannerNodes(planner.data) : []), [planner.data]);
  // Reload validation: unknown ids and branches without a path to Start are dropped.
  const picked = useMemo(() => connected(nodes, draft ?? savedNodes(plans, cls)), [nodes, draft, settings[PLAN_KEY], cls]); // eslint-disable-line react-hooks/exhaustive-deps
  const totals = useMemo(() => planTotals(nodes, picked), [nodes, picked]);
  const open = useMemo(() => reachableNow(nodes, picked), [nodes, picked]);
  const max = useMemo(() => boardMax(nodes), [nodes]);
  const boards = (planner.data?.boards ?? []).map((b) => b.data_json as unknown as PlannerBoardData);
  const cur = boards.find((b) => b.board === board) ?? boards[0];
  const cells = nodes.filter((n) => n.board === cur?.board);
  const skillIcons = useIcons(icons ? cells.map((n) => n.skill?.icon) : []);
  const on = new Set(picked);
  const dict = new Map((builder.data?.stats ?? []).map((s) => [s.stat_key, s]));
  const picks = pick ? nodes.find((n) => n.id === pick) : undefined;

  if (!planner.data) return <DataState t={t} error={planner.error} retry={planner.retry} />;

  const spent = totals.spent[cur?.board] ?? 0;
  const boardTotal = max[cur?.board] ?? 0;
  // Account limit per point type, only when the archive has it (never invented).
  const budget = cur && builder.data?.budgets?.[cur.pointType];
  const typeSpent = boards.filter((b) => b.pointType === cur?.pointType).reduce((s, b) => s + (totals.spent[b.board] ?? 0), 0);
  const fmt = (v: number) => v.toLocaleString(lang, { maximumFractionDigits: 2 });
  const statLine = (k: string, raw: number) => {
    const d = dict.get(k);
    return [d?.name ?? k, `+${fmt(statValue(raw, !!d?.percent))}${d?.percent ? "%" : ""}`] as const;
  };
  const edit = (next: string[] | null) => next && setDraft(next);
  const lines: [PNode, PNode][] = [];
  for (const n of cells)
    if (on.has(n.id) || n.kind === "Start")
      for (const m of cells)
        if ((on.has(m.id) || m.kind === "Start") && m.id > n.id && Math.abs(m.row - n.row) + Math.abs(m.col - n.col) === 1) lines.push([n, m]);

  const store = () => {
    save(PLAN_KEY, JSON.stringify({ ...plans, [cls]: { profile: PLAN_PROFILE, nodes: picked } }))
      .then(() => {
        setDraft(null);
        showToast({ title: t("planner.savedTitle"), text: t("planner.savedText") });
      })
      .catch(onError);
  };
  const shareText = [`${t("nav.daevanion")} · ${cls}`, ...boards.map((b) => `${b.title}: ${totals.spent[b.board] ?? 0}/${max[b.board] ?? 0}`), "PowerMeter"].join("\n");

  return (
    <>
      <div className="chToolbar">
        <select className="chSelect" value={cls} aria-label={t("planner.class")} onChange={(e) => setCls(e.target.value)}>
          {RELEASED_CLASSES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="chRegion">Global</span>
        <div style={{ flex: 1 }} />
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "var(--pm-t2)", marginRight: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={icons} onChange={(e) => setIcons(e.target.checked)} />
          {t("planner.icons")}
        </label>
        <button type="button" className="btn sm" onClick={() => edit(connected(nodes, [...picked, ...cells.map((n) => n.id)]))}>
          <ChecksIcon aria-hidden="true" />
          {t("planner.all")}
        </button>
        <button type="button" className="btn sm" onClick={() => edit(picked.filter((id) => !cells.some((n) => n.id === id)))}>
          <ArrowCounterClockwiseIcon aria-hidden="true" />
          {t("planner.reset")}
        </button>
        <button type="button" className="btn sm" onClick={() => setShare(true)}>
          <ShareNetworkIcon aria-hidden="true" />
          {t("characters.share.button")}
        </button>
        <button type="button" className="btn sm fill" style={{ padding: "0 12px" }} onClick={store}>
          <FloppyDiskIcon aria-hidden="true" />
          {t("characters.save")}
        </button>
      </div>
      {toast}

      <div className="dvGrid">
        <div className="dvTabs" role="tablist" aria-label={t("nav.daevanion")}>
          {boards.map((b) => {
            const p = totals.spent[b.board] ?? 0;
            const m = max[b.board] ?? 0;
            const sel = b.board === cur?.board;
            return (
              <button key={b.board} type="button" role="tab" aria-selected={sel} className="chBtnReset dvTab" onClick={() => setBoard(b.board)}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span aria-hidden="true" className="dvDiamond" />
                  <span style={{ flex: 1, fontWeight: 500, textAlign: "left" }}>{b.title}</span>
                  <span className="mono" style={{ fontSize: 11, color: "var(--pm-t3)" }}>
                    {p}/{m}
                  </span>
                </span>
                <span className="dvBar">
                  <span style={{ width: `${m ? (p / m) * 100 : 0}%` }} />
                </span>
                {b.unlockLevel != null && <span style={{ fontSize: 10, color: "var(--pm-t3)", textAlign: "left" }}>{t("planner.unlock", { n: b.unlockLevel })}</span>}
              </button>
            );
          })}
        </div>

        <section className="dvStage" aria-label={cur?.title}>
          <div className="dvBoard">
            <svg viewBox={`0 0 ${N} ${N}`} aria-hidden="true">
              {lines.map(([a, b]) => (
                <line key={a.id + b.id} x1={a.col + 0.5} y1={a.row + 0.5} x2={b.col + 0.5} y2={b.row + 0.5} stroke="#DB0000" strokeWidth={0.09} strokeLinecap="round" />
              ))}
            </svg>
            {cells.map((n) => {
              if (n.kind === "None") return <span key={n.id} style={{ gridRow: n.row + 1, gridColumn: n.col + 1 }} />;
              const k = kindOf(n);
              const act = on.has(n.id);
              const can = open.has(n.id);
              const col = k === "stat" ? "var(--pm-red)" : COL[k];
              const img = icons && n.skill?.icon ? skillIcons[n.skill.icon] : undefined;
              return (
                <button
                  key={n.id}
                  type="button"
                  className="dvCell"
                  title={`${n.title ?? ""} · ${n.cost} pt`}
                  aria-label={`${n.title ?? ""}, ${n.cost} pt`}
                  aria-pressed={k === "start" ? undefined : act}
                  aria-disabled={k === "start" || (!act && !can) ? true : undefined}
                  data-kind={k}
                  data-on={act || k === "start" ? "" : undefined}
                  data-can={can ? "" : undefined}
                  data-pick={pick === n.id ? "" : undefined}
                  style={{ gridRow: n.row + 1, gridColumn: n.col + 1, "--c": col } as CSSProperties}
                  onMouseEnter={() => setPick(n.id)}
                  onFocus={() => setPick(n.id)}
                  onClick={() => {
                    setPick(n.id);
                    edit(toggle(nodes, picked, n.id));
                  }}
                >
                  {/* The archive has images for passive skill icons only: active ones come from the game CDN, by skill id. */}
                  {k === "start" ? "◆" : img ? <img src={img} alt="" /> : k === "skill" && icons ? <SkillIcon skill={GAME_SKILLS.find((s) => s.id === n.skill?.id)} name="SK" /> : ""}
                </button>
              );
            })}
          </div>
          <div className="dvHint">{t("planner.hint")}</div>
          <div className="dvLegend" aria-hidden="true">
            {(["stat", "rare", "skill", "start"] as const).map((k) => (
              <span key={k}>
                <span style={{ borderColor: k === "stat" ? "var(--pm-red)" : COL[k] }} /> {t(`planner.legend.${k}`)}
              </span>
            ))}
          </div>
        </section>

        <div className="dvSide">
          <section style={{ ...CARD, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div className="dvDonut" style={{ "--p": `${boardTotal ? (spent / boardTotal) * 360 : 0}deg` } as CSSProperties}>
              <div>
                <span className="mono" style={{ fontSize: 24 }} aria-live="polite">
                  {spent}
                </span>
                <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t("planner.of", { n: boardTotal })}</span>
              </div>
            </div>
            <div className="kicker" style={{ marginTop: 4 }}>
              {t("planner.spent")}
            </div>
            {budget != null && (
              <div style={{ fontSize: 12, color: typeSpent > budget ? "var(--pm-redt)" : "var(--pm-t2)", textAlign: "center" }}>
                <span className="mono">{t("planner.budget", { type: spaced(cur.pointType), n: typeSpent, m: budget })}</span>
                {typeSpent > budget && <div role="alert">{t("planner.overBudget")}</div>}
              </div>
            )}
          </section>

          <section style={CARD}>
            <SectionHead title={t("planner.picked")} style={{ marginBottom: 8 }} />
            {!picks ? (
              <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("planner.pickHint")}</div>
            ) : (
              <>
                <div style={{ fontWeight: 500 }}>{picks.title}</div>
                <div style={{ fontSize: 12, color: "var(--pm-t2)", marginTop: 2 }}>
                  {t("planner.cost", { kind: t(`planner.legend.${kindOf(picks)}`), n: picks.cost })}
                </div>
                {picks.stats.map(([k, v]) => {
                  const [label, val] = statLine(k, v);
                  return (
                    <div key={k} className="dvRow">
                      <span>{label}</span>
                      <span className="mono">{val}</span>
                    </div>
                  );
                })}
              </>
            )}
          </section>

          <section style={CARD}>
            <SectionHead title={t("planner.gains")} style={{ marginBottom: 8 }} />
            {Object.keys(totals.stats).length + Object.keys(totals.skills).length === 0 && <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("planner.noGains")}</div>}
            {Object.entries(totals.stats)
              .map(([k, v]) => statLine(k, v))
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([label, val]) => (
                <div key={label} className="dvRow">
                  <span>{label}</span>
                  <span className="mono">{val}</span>
                </div>
              ))}
            {Object.keys(totals.skills).length > 0 && (
              <div className="kicker" style={{ margin: "10px 0 4px" }}>
                {t("planner.skillBonus")}
              </div>
            )}
            {Object.entries(totals.skills).map(([id, s]) => (
              <div key={id} className="dvRow">
                <span>{s.title.replace(/^Skill Level Up - /, "")}</span>
                <span className="mono">+{s.levels}</span>
              </div>
            ))}
            <button type="button" className="btn sm" style={{ marginTop: 10 }} onClick={() => go("builder")}>
              <SwordIcon aria-hidden="true" />
              {t("planner.openBuilder")}
            </button>
          </section>
        </div>
      </div>
      {share && <ShareModal t={t} lang={lang} kind="daevanion" text={shareText} onClose={() => setShare(false)} onError={onError} />}
    </>
  );
}
