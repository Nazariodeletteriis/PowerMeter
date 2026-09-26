import { TrayIcon, WarningOctagonIcon, WifiSlashIcon } from "@phosphor-icons/react";
import { EmptyState } from "../../ui";
import type { PageProps } from "../types";

const CARD = { display: "flex", flexDirection: "column", gap: 8 } as const;

/**
 * Prototype pg.states: what every Organizer page without its own design shows
 * (spesa, flow) — the four standard data states. The buttons are specimens.
 */
export default function States({ t }: PageProps) {
  return (
    <>
      <p style={{ fontSize: 13, color: "var(--pm-t2)", margin: "-6px 0 14px", maxWidth: 720 }}>{t("organizer.statesIntro")}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, maxWidth: 1100 }}>
        <section className="card" style={{ ...CARD, gap: 10 }} aria-busy="true">
          <h2 className="kicker">{t("organizer.statesLoading")}</h2>
          <div className="skeleton" style={{ height: 14, width: "60%", borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 36 }} />
          <div className="skeleton" style={{ height: 36 }} />
          <div className="skeleton" style={{ height: 36, width: "80%" }} />
        </section>
        <section className="card" style={CARD}>
          <h2 className="kicker">{t("organizer.statesEmpty")}</h2>
          <EmptyState icon={<TrayIcon aria-hidden="true" />} title={t("organizer.emptyTitle")} text={t("organizer.emptyText")}>
            <button type="button" className="btn fill">
              {t("organizer.create")}
            </button>
          </EmptyState>
        </section>
        <section className="card" style={CARD}>
          <h2 className="kicker">{t("organizer.statesError")}</h2>
          <EmptyState
            icon={<WarningOctagonIcon style={{ color: "var(--pm-err)" }} aria-hidden="true" />}
            title={t("organizer.errorTitle")}
            text={t("organizer.errorText")}
          >
            <button type="button" className="btn">
              {t("organizer.retry")}
            </button>
          </EmptyState>
        </section>
        <section className="card" style={CARD}>
          <h2 className="kicker">{t("organizer.statesOffline")}</h2>
          <EmptyState
            icon={<WifiSlashIcon style={{ color: "var(--pm-warn)" }} aria-hidden="true" />}
            title={t("organizer.offlineTitle")}
            text={t("organizer.offlineText")}
          />
        </section>
      </div>
    </>
  );
}
