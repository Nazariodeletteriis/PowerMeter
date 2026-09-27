import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CheckIcon, CloudArrowUpIcon, ExportIcon, SwordIcon, TrashIcon, WarningOctagonIcon } from "@phosphor-icons/react";
import { usePoll } from "../usePoll";
import { clock } from "./combat/parts";
import type { PageProps } from "./types";

/** FightSummary (src-tauri/src/entity/fight_record.rs), the fields used here. */
type Fight = { id: string; bossName: string; startTimeMs: number; durationMs: number; jobs: string[]; isTrain: boolean };

// Newest first (the backend sorts by start time); 10s like the meter's own refresh.
const getFights = () => invoke<Fight[]>("get_fight_history");
const COLS = "28px 100px minmax(0,1.6fr) 64px 60px 80px 50px 44px 100px";
const DAY = 864e5;

export default function Storico(props: PageProps) {
  // Remounting the list is the retry: usePoll starts over.
  const [attempt, setAttempt] = useState(0);
  return <History key={attempt} {...props} retry={() => setAttempt(attempt + 1)} />;
}

function History({ t, lang, run, retry }: PageProps & { retry: () => void }) {
  const fights = usePoll(getFights, 10000);
  const [period, setPeriod] = useState("7");
  const [boss, setBoss] = useState("");
  const [bossOnly, setBossOnly] = useState(false);
  const [chk, setChk] = useState<Record<string, boolean>>({});
  const [deleted, setDeleted] = useState<Record<string, boolean>>({});

  const all = (fights.data ?? []).filter((f) => !deleted[f.id]);
  const since = period === "all" ? 0 : Date.now() - Number(period) * DAY;
  const list = all.filter((f) => f.startTimeMs >= since && (!boss || f.bossName === boss) && (!bossOnly || !f.isTrain));
  const bosses = [...new Set(all.map((f) => f.bossName).filter(Boolean))].sort();
  const picked = list.filter((f) => chk[f.id]);
  const day = new Intl.DateTimeFormat(lang, { day: "2-digit", month: "2-digit" });
  const time = new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit" });

  const open = (f: Fight) => run(() => invoke("request_details_view", { payload: { kind: "fight", fightId: f.id } }));
  const remove = () => {
    if (!picked.length || !confirm(t("combat.confirmDelete", { n: picked.length }))) return;
    run(async () => {
      for (const f of picked) {
        await invoke("delete_fight", { id: f.id });
        setDeleted((d) => ({ ...d, [f.id]: true }));
      }
      setChk({});
    });
  };

  // The picked fights, else the filtered list; saved to Downloads by the backend.
  const exportFights = () =>
    run(async () => {
      const records = await Promise.all((picked.length ? picked : list).map((f) => invoke("load_fight", { id: f.id })));
      const stamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, "-");
      await invoke("save_to_downloads", { name: `powermeter-fights-${stamp}.json`, contents: JSON.stringify(records, null, 2) });
    });

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <select className="cbSelect" aria-label={t("combat.period")} value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option value="7">{t("combat.last7")}</option>
          <option value="30">{t("combat.last30")}</option>
          <option value="all">{t("combat.allTime")}</option>
        </select>
        {/* ponytail: fight records carry no dungeon or kill/wipe yet; these two filter nothing until they do. */}
        <select className="cbSelect" aria-label="Dungeon">
          <option>{t("combat.allDungeons")}</option>
        </select>
        <select className="cbSelect" aria-label="Boss" value={boss} onChange={(e) => setBoss(e.target.value)}>
          <option value="">{t("combat.allBosses")}</option>
          {bosses.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <select className="cbSelect" aria-label={t("combat.col.result")}>
          <option>{t("combat.killWipe")}</option>
          <option>{t("combat.killOnly")}</option>
          <option>{t("combat.wipeOnly")}</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--pm-t2)", marginLeft: 4 }}>
          <input type="checkbox" checked={bossOnly} onChange={(e) => setBossOnly(e.target.checked)} style={{ accentColor: "#DB0000" }} />
          {t("combat.bossOnly")}
        </label>
        <div style={{ flex: 1 }} />
        {picked.length > 0 && <span style={{ fontSize: 12, color: "var(--pm-t2)" }}>{t("combat.nSelected", { n: picked.length })}</span>}
        {/* ponytail: upload lands with online logs (R2). */}
        <button type="button" className="btn fill">
          <CloudArrowUpIcon aria-hidden="true" />
          {t("combat.upload")}
        </button>
        <button type="button" className="btn" disabled={!list.length} onClick={exportFights}>
          <ExportIcon aria-hidden="true" />
          {t("combat.export")}
        </button>
        <button type="button" className="btn" onClick={remove}>
          <TrashIcon aria-hidden="true" />
          {t("combat.delete")}
        </button>
      </div>

      {fights.error ? (
        <section className="card cbState" style={{ maxWidth: 544 }} role="alert">
          <WarningOctagonIcon aria-hidden="true" style={{ color: "var(--pm-err)" }} />
          <div style={{ fontSize: 15 }}>{t("combat.states.errorTitle")}</div>
          <div className="cbStateText">{fights.error}</div>
          <div>
            <button type="button" className="btn" onClick={retry}>
              {t("combat.retry")}
            </button>
          </div>
        </section>
      ) : fights.data && !all.length ? (
        <section className="card cbState" style={{ maxWidth: 544 }}>
          <SwordIcon aria-hidden="true" style={{ color: "var(--pm-t3)" }} />
          <div style={{ fontSize: 15 }}>{t("home.emptyTitle")}</div>
          <div className="cbStateText">{t("home.emptyText")}</div>
        </section>
      ) : (
        <div className="card" style={{ padding: "4px 8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 10, padding: 8, fontSize: 11, color: "var(--pm-t3)", borderBottom: "1px solid var(--pm-line)" }}>
            <span />
            <span>{t("combat.col.dateTime")}</span>
            <span>Dungeon → Boss</span>
            <span>{t("combat.col.result")}</span>
            <span style={{ textAlign: "right" }}>{t("combat.duration")}</span>
            <span style={{ textAlign: "right" }}>{t("combat.col.yourDps")}</span>
            <span style={{ textAlign: "right" }}>{t("combat.col.pos")}</span>
            <span style={{ textAlign: "right" }} title={t("combat.col.playersTip")}>
              {t("combat.col.players")}
            </span>
            <span>Upload</span>
          </div>
          {!fights.data
            ? [0, 1, 2, 3].map((k) => <div key={k} className="skeleton" style={{ height: 36, margin: "4px 0" }} />)
            : !list.length
              ? <div style={{ padding: "12px 8px", fontSize: 12, color: "var(--pm-t3)" }}>{t("combat.noMatch")}</div>
              : list.map((f) => (
                // Result, your DPS and position need the full fight record; upload is R2, so every fight is local.
                <div
                  key={f.id}
                  className="cbHover"
                  onClick={() => open(f)}
                  style={{ display: "grid", gridTemplateColumns: COLS, gap: 10, alignItems: "center", minHeight: 40, padding: "0 8px", borderBottom: "1px solid var(--pm-line)", cursor: "pointer" }}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={!!chk[f.id]}
                    aria-label={f.bossName || f.id}
                    className="cbCheck"
                    onClick={(e) => {
                      e.stopPropagation();
                      setChk({ ...chk, [f.id]: !chk[f.id] });
                    }}
                  >
                    {chk[f.id] && <CheckIcon aria-hidden="true" />}
                  </button>
                  <span className="mono" style={{ fontSize: 12, color: "var(--pm-t2)" }}>
                    {day.format(f.startTimeMs)} {time.format(f.startTimeMs)}
                  </span>
                  <button
                    type="button"
                    className="cbPlain"
                    style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      open(f);
                    }}
                  >
                    {f.bossName || "—"}
                  </button>
                  <span style={{ color: "var(--pm-t3)", fontWeight: 500 }}>—</span>
                  <span className="num">{clock(f.durationMs / 1000)}</span>
                  <span className="num">—</span>
                  <span className="num" style={{ color: "var(--pm-t2)" }}>
                    —
                  </span>
                  <span className="num" style={{ color: "var(--pm-t2)" }}>
                    {f.jobs.length || "—"}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                    <span className="dot" style={{ background: "var(--pm-t3)" }} />
                    {t("combat.up.local")}
                  </span>
                </div>
              ))}
        </div>
      )}
    </>
  );
}
