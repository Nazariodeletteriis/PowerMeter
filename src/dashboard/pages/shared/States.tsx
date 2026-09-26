import { TrayIcon, WarningOctagonIcon, WifiSlashIcon } from "@phosphor-icons/react";
import type { T } from "../../i18n";
import "./shared.css";

/**
 * Prototype pg.states: what every page without its own design shows, the four
 * standard data states. Pages re-export it as their default; the shell also
 * uses it to know the page has no design (group breadcrumb). Buttons are specimens.
 */
export default function States({ t }: { t: T }) {
  return (
    <div className="states">
      <section className="card loading" aria-busy="true">
        <h2 className="kicker">{t("shell.states.loading")}</h2>
        <div className="skeleton" style={{ height: 14, width: "60%", borderRadius: 4 }} />
        <div className="skeleton" style={{ height: 36 }} />
        <div className="skeleton" style={{ height: 36 }} />
        <div className="skeleton" style={{ height: 36, width: "80%" }} />
      </section>
      <section className="card">
        <h2 className="kicker">{t("shell.states.empty")}</h2>
        <TrayIcon aria-hidden="true" />
        <div style={{ fontSize: 15 }}>{t("shell.states.emptyTitle")}</div>
        <div style={{ color: "var(--pm-t2)", fontSize: 12 }}>{t("shell.states.emptyText")}</div>
        <div>
          <button type="button" className="btn fill">
            {t("shell.states.create")}
          </button>
        </div>
      </section>
      <section className="card">
        <h2 className="kicker">{t("shell.states.error")}</h2>
        <WarningOctagonIcon aria-hidden="true" style={{ color: "var(--pm-err)" }} />
        <div style={{ fontSize: 15 }}>{t("shell.states.errorTitle")}</div>
        <div style={{ color: "var(--pm-t2)", fontSize: 12 }}>{t("shell.states.errorText")}</div>
        <div>
          <button type="button" className="btn">
            {t("shell.states.retry")}
          </button>
        </div>
      </section>
      <section className="card">
        <h2 className="kicker">{t("shell.states.offline")}</h2>
        <WifiSlashIcon aria-hidden="true" style={{ color: "var(--pm-warn)" }} />
        <div style={{ fontSize: 15 }}>{t("shell.states.offlineTitle")}</div>
        <div style={{ color: "var(--pm-t2)", fontSize: 12 }}>{t("shell.states.offlineText")}</div>
      </section>
    </div>
  );
}
