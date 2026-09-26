import { TrayIcon, WarningOctagonIcon, WifiSlashIcon } from "@phosphor-icons/react";
import type { PageProps } from "../types";
import "./world.css";

/** Prototype pg.states: what pages without their own block show (the four standard data states). */
export default function States({ t }: PageProps) {
  return (
    <>
      <div style={{ fontSize: 13, color: "var(--pm-t2)", margin: "-6px 0 14px", maxWidth: 720 }}>{t("world.states.intro")}</div>
      <div className="wStates">
        <section className="card loading" aria-busy="true">
          <h2 className="kicker">{t("world.states.loading")}</h2>
          <div className="skeleton" style={{ height: 14, width: "60%", borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 36 }} />
          <div className="skeleton" style={{ height: 36 }} />
          <div className="skeleton" style={{ height: 36, width: "80%" }} />
        </section>
        <section className="card">
          <h2 className="kicker">{t("world.states.empty")}</h2>
          <TrayIcon aria-hidden="true" />
          <div style={{ fontSize: 15 }}>{t("world.states.emptyTitle")}</div>
          <div style={{ color: "var(--pm-t2)", fontSize: 12 }}>{t("world.states.emptyText")}</div>
          <div>
            <button type="button" className="btn fill">
              {t("world.states.create")}
            </button>
          </div>
        </section>
        <section className="card">
          <h2 className="kicker">{t("world.states.error")}</h2>
          <WarningOctagonIcon aria-hidden="true" style={{ color: "var(--pm-err)" }} />
          <div style={{ fontSize: 15 }}>{t("world.states.errorTitle")}</div>
          <div style={{ color: "var(--pm-t2)", fontSize: 12 }}>{t("world.states.errorText")}</div>
          <div>
            <button type="button" className="btn">
              {t("world.states.retry")}
            </button>
          </div>
        </section>
        <section className="card">
          <h2 className="kicker">{t("world.states.offline")}</h2>
          <WifiSlashIcon aria-hidden="true" style={{ color: "var(--pm-warn)" }} />
          <div style={{ fontSize: 15 }}>{t("world.states.offlineTitle")}</div>
          <div style={{ color: "var(--pm-t2)", fontSize: 12 }}>{t("world.states.offlineText")}</div>
        </section>
      </div>
    </>
  );
}
