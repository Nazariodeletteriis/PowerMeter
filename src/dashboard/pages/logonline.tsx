import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ArrowSquareOutIcon, CloudArrowUpIcon, CopyIcon, DiscordLogoIcon, TrashIcon, WarningOctagonIcon } from "@phosphor-icons/react";
import { EmptyState, fmt } from "../ui";
import { clock } from "./combat/parts";
import "./combat/combat.css";
import type { PageProps } from "./types";

/** One row of GET /api/logs/mine (PowerMeter-server). */
type Log = {
  id: string;
  url: string;
  bossName: string | null;
  durationMs: number | null;
  startedAt: string | null;
  createdAt: string;
  visibility: Vis;
  views: number;
  rank: number | null;
};
type Vis = "public" | "unlisted" | "private";
const VISIBILITY: Vis[] = ["public", "unlisted", "private"];
const COLS = "110px minmax(0,1.6fr) 64px 150px 64px 56px 110px";
const signedOut = (e: unknown) => e === "not signed in" || e === "unauthorized";

export default function LogOnline({ t, lang, run, go, onError }: PageProps) {
  // undefined = loading, null = signed out.
  const [account, setAccount] = useState<{ name?: string } | null>();
  const [logs, setLogs] = useState<Log[]>();
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const load = useCallback(() => {
    setError("");
    invoke<{ name?: string } | null>("pm_account").then((a) => {
      setAccount(a);
      if (!a) return;
      invoke<{ logs: Log[] }>("pm_my_logs").then(
        (r) => setLogs(r.logs),
        (e) => (signedOut(e) ? setAccount(null) : setError(String(e))),
      );
    }, onError);
  }, [onError]);
  useEffect(load, [load]);

  const signIn = () => run(() => invoke("pm_login").then(load));
  const setVis = (log: Log, visibility: Vis) =>
    run(() => invoke("pm_set_log_visibility", { id: log.id, visibility }).then(() => setLogs((l) => l?.map((x) => (x.id === log.id ? { ...x, visibility, rank: visibility === "public" ? x.rank : null } : x)))));
  const remove = (log: Log) =>
    confirm(t("combat.online.confirmDelete", { boss: log.bossName || log.id })) &&
    run(() => invoke("pm_delete_log", { id: log.id }).then(() => setLogs((l) => l?.filter((x) => x.id !== log.id))));
  const copy = (log: Log) => run(() => navigator.clipboard.writeText(log.url).then(() => setCopied(log.id)));
  const day = new Intl.DateTimeFormat(lang, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <section className="card" style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <h2 style={{ fontSize: 15, fontWeight: 500 }}>{t("combat.online.introTitle")}</h2>
        <p style={{ color: "var(--pm-t2)", fontSize: 13, maxWidth: 760 }}>{t("combat.online.introText")}</p>
        <p style={{ color: "var(--pm-t3)", fontSize: 12 }}>{t("combat.online.archiveNote")}</p>
      </section>

      {account === null ? (
        <section className="card">
          <EmptyState icon={<DiscordLogoIcon aria-hidden="true" />} title={t("combat.online.signedOutTitle")} text={t("combat.online.signedOutText")}>
            <button type="button" className="btn fill" onClick={signIn}>
              {t("combat.upSignInBtn")}
            </button>
          </EmptyState>
        </section>
      ) : error ? (
        <section className="card cbState" style={{ maxWidth: 544 }} role="alert">
          <WarningOctagonIcon aria-hidden="true" style={{ color: "var(--pm-err)" }} />
          <div style={{ fontSize: 15 }}>{t("combat.states.errorTitle")}</div>
          <div className="cbStateText">{error}</div>
          <div>
            <button type="button" className="btn" onClick={load}>
              {t("combat.retry")}
            </button>
          </div>
        </section>
      ) : logs && !logs.length ? (
        <section className="card">
          <EmptyState icon={<CloudArrowUpIcon aria-hidden="true" />} title={t("combat.online.emptyTitle")} text={t("combat.online.emptyText")}>
            <button type="button" className="btn fill" onClick={() => go("storico")}>
              {t("nav.fightHistory")}
            </button>
          </EmptyState>
        </section>
      ) : (
        <div className="card" style={{ padding: "4px 8px" }}>
          <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 10, padding: 8, fontSize: 11, color: "var(--pm-t3)", borderBottom: "1px solid var(--pm-line)" }}>
            <span>{t("combat.col.dateTime")}</span>
            <span>Boss</span>
            <span style={{ textAlign: "right" }}>{t("combat.duration")}</span>
            <span>{t("shell.share.visibility")}</span>
            <span style={{ textAlign: "right" }}>{t("combat.online.views")}</span>
            <span style={{ textAlign: "right" }} title={t("combat.online.rankTip")}>
              {t("combat.col.pos")}
            </span>
            <span />
          </div>
          {!logs
            ? [0, 1, 2].map((k) => <div key={k} className="skeleton" style={{ height: 36, margin: "4px 0" }} />)
            : logs.map((l) => (
                <div key={l.id} style={{ display: "grid", gridTemplateColumns: COLS, gap: 10, alignItems: "center", minHeight: 40, padding: "0 8px", borderBottom: "1px solid var(--pm-line)" }}>
                  <span className="mono" style={{ fontSize: 12, color: "var(--pm-t2)" }}>
                    {day.format(new Date(l.startedAt ?? l.createdAt))}
                  </span>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={l.bossName ?? ""}>
                    {l.bossName || "—"}
                  </span>
                  <span className="num">{l.durationMs === null ? "—" : clock(l.durationMs / 1000)}</span>
                  <select className="cbSelect" aria-label={t("shell.share.visibility")} value={l.visibility} onChange={(e) => setVis(l, e.target.value as Vis)}>
                    {VISIBILITY.map((v) => (
                      <option key={v} value={v}>
                        {t(`shell.share.${v}`)}
                      </option>
                    ))}
                  </select>
                  <span className="num" style={{ color: "var(--pm-t2)" }}>
                    {fmt(l.views, lang)}
                  </span>
                  <span className="num" style={{ color: "var(--pm-t2)" }}>
                    {l.rank ? `#${l.rank}` : "—"}
                  </span>
                  <span style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                    <button type="button" className="btn sm" title={t(copied === l.id ? "combat.linkCopied" : "shell.share.copy")} aria-label={t("shell.share.copy")} onClick={() => copy(l)}>
                      <CopyIcon aria-hidden="true" />
                    </button>
                    <button type="button" className="btn sm" title={t("combat.openLog")} aria-label={t("combat.openLog")} disabled={l.visibility === "private"} onClick={() => run(() => invoke("open_url", { url: l.url }))}>
                      <ArrowSquareOutIcon aria-hidden="true" />
                    </button>
                    <button type="button" className="btn sm" title={t("combat.delete")} aria-label={t("combat.delete")} onClick={() => remove(l)}>
                      <TrashIcon aria-hidden="true" />
                    </button>
                  </span>
                </div>
              ))}
        </div>
      )}
    </>
  );
}
