import { invoke } from "@tauri-apps/api/core";
import {
  CheckSquareIcon,
  CloudCheckIcon,
  DiscordLogoIcon,
  HeartIcon,
  InfinityIcon,
  LinkIcon,
  ScrollIcon,
} from "@phosphor-icons/react";
import type { T } from "./i18n";
import { PATREON_URL } from "./Shell";

const A2TOOLS_URL = "https://github.com/taengu/A2Tools-DPS-Meter";

/** Prototype pg.supporter. Linking Patreon to an account is R6: until then the button opens the page. */
export function Supporter({ t, name, onError }: { t: T; name: string; onError: (e: unknown) => void }) {
  const open = (url: string) => invoke("open_url", { url }).catch(onError);
  const perks = [
    [CloudCheckIcon, t("supporter.perkSync")],
    [InfinityIcon, t("supporter.perkHistory")],
    [LinkIcon, t("supporter.perkLinks"), t("supporter.perkLinksPath")],
    [DiscordLogoIcon, t("supporter.perkDiscord")],
    [ScrollIcon, t("supporter.perkCredits")],
    [CheckSquareIcon, t("supporter.perkVote")],
  ] as [typeof LinkIcon, string, string?][];
  const [before, after] = t("about.a2tools").split("{link}");
  return (
    <div style={{ maxWidth: 880 }}>
      <div
        style={{
          position: "relative",
          borderRadius: 10,
          padding: 28,
          background: "var(--pm-band)",
          border: "1px solid var(--pm-line)",
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0 0 auto 0",
            height: 2,
            background: "linear-gradient(90deg,transparent,#DB0000 25%,#DB0000 75%,transparent)",
          }}
        />
        <HeartIcon weight="fill" style={{ fontSize: 26, color: "#FF4D4D" }} aria-hidden="true" />
        <h2 style={{ fontSize: 24, fontWeight: 500, margin: "10px 0 8px", letterSpacing: "-.015em", color: "#FAF7F7" }}>
          {t("supporter.title")}
        </h2>
        <p style={{ lineHeight: 1.6, maxWidth: 600, color: "#E8E1E1" }}>{t("supporter.text")}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 12 }}>
        <section className="card">
          <h3 className="kicker" style={{ marginBottom: 10 }}>
            {t("supporter.perks")}
          </h3>
          <ul style={{ display: "grid", gap: 10, fontSize: 13 }}>
            {perks.map(([Icon, text, path]) => (
              <li key={text} style={{ display: "flex", gap: 10 }}>
                <Icon style={{ color: "var(--pm-redt)", flex: "none", marginTop: 3 }} aria-hidden="true" />
                <span>
                  {text}
                  {path && (
                    <span className="mono" style={{ color: "var(--pm-t2)" }}>
                      {" "}
                      {path}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 className="kicker">{t("supporter.status")}</h3>
            <div>{t("supporter.notLinked")}</div>
            <button type="button" className="btn fill" style={{ height: 34 }} onClick={() => open(PATREON_URL)}>
              {t("supporter.link")}
            </button>
          </section>
          <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h3 className="kicker">{t("supporter.badge")}</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {name}
              <span className="badge" style={{ borderColor: "#DB000088", color: "#FF6B6B" }}>
                <HeartIcon weight="fill" aria-hidden="true" />
                Supporter
              </span>
            </div>
          </section>
        </div>
      </div>
      <p style={{ marginTop: 16, fontSize: 12, color: "var(--pm-t3)" }}>
        {before}
        <button type="button" className="linkBtn" onClick={() => open(A2TOOLS_URL)}>
          A2Tools DPS Meter
        </button>
        {after}
      </p>
    </div>
  );
}
