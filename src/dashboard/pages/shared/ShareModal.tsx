import { useState } from "react";
import { CheckIcon, CopyIcon, DiscordLogoIcon, XIcon } from "@phosphor-icons/react";
import type { T } from "../../i18n";
import { BOSS, DURATION, SHARE_URL } from "../../sample/combat";
import { fmt } from "../../ui";
import { clock, sampleParty } from "../combat/parts";
import { Modal } from "../system/Modal";
import "./shared.css";

/** What is being shared: picks the title (shell.share.<kind>). */
export type ShareKind = "log" | "party" | "build" | "skillPlan" | "daevanion" | "item";
const VISIBILITY = ["public", "unlisted", "private"] as const;

/**
 * Prototype md.share. Without `text`, link and Discord preview are the
 * prototype's sample log until uploads exist (R2). With `text` (first line =
 * title) that text is what gets copied and previewed.
 */
export function ShareModal({
  t,
  lang,
  kind,
  text,
  onClose,
  onError,
}: {
  t: T;
  lang: string;
  kind: ShareKind;
  text?: string;
  onClose: () => void;
  onError: (e: unknown) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [vis, setVis] = useState<(typeof VISIBILITY)[number]>("unlisted");
  const copy = () => navigator.clipboard.writeText(text ?? `https://${SHARE_URL}`).then(() => setCopied(true), onError);
  const [head, ...lines] = (text ?? "").split("\n");
  const top = sampleParty().slice(0, 3);

  return (
    <Modal
      width={520}
      gap={14}
      onClose={onClose}
      title={(id) => (
        <div style={{ display: "flex", alignItems: "center" }}>
          <h2 id={id} style={{ fontSize: 17, fontWeight: 500, flex: 1 }}>
            {t(`shell.share.${kind}`)}
          </h2>
          <button type="button" className="shareClose" onClick={onClose} title={t("window.close")} aria-label={t("window.close")}>
            <XIcon aria-hidden="true" />
          </button>
        </div>
      )}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <div className="shareUrl mono">{text ? head : SHARE_URL}</div>
        {copied ? (
          <button type="button" className="btn lg shareCopied" aria-live="polite">
            <CheckIcon aria-hidden="true" />
            {t("shell.share.copied")}
          </button>
        ) : (
          <button type="button" className="btn lg fill" autoFocus onClick={copy}>
            <CopyIcon aria-hidden="true" />
            {t("shell.share.copy")}
          </button>
        )}
      </div>
      <div role="radiogroup" aria-labelledby="shareVis" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div id="shareVis" style={{ fontSize: 11, color: "var(--pm-t3)" }}>
          {t("shell.share.visibility")}
        </div>
        {VISIBILITY.map((v) => (
          <button key={v} type="button" role="radio" aria-checked={v === vis} className="shareVis" onClick={() => setVis(v)}>
            <span className="shareRadio">
              <span />
            </span>
            <span style={{ flex: 1 }}>{t(`shell.share.${v}`)}</span>
            <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t(`shell.share.${v}Hint`)}</span>
          </button>
        ))}
      </div>
      <div>
        <div style={{ fontSize: 11, color: "var(--pm-t3)", marginBottom: 6 }}>{t("shell.share.discordPreview")}</div>
        <div className="shareDiscord">
          <div style={{ flex: 1, minWidth: 0, fontFamily: "Inter,sans-serif" }}>
            <div style={{ fontSize: 11, color: "#B5BAC1" }}>PowerMeter</div>
            <div style={{ fontSize: 14, color: "#00A8FC", fontWeight: 600, margin: "2px 0" }}>
              {text ? head : `${BOSS} · ${t("shell.share.killIn", { d: clock(DURATION) })}`}
            </div>
            <div style={{ fontSize: 12, color: "#DBDEE1" }}>
              {text ? lines.slice(0, 3).join(" · ") : top.map((p, k) => `${k + 1}. ${p.n} (${p.cls}) ${fmt(p.dps, lang)}`).join(" · ")}
            </div>
            <div className="shareOg">{t("shell.share.ogImage")}</div>
          </div>
        </div>
      </div>
      {/* Discord has no share URL: the button copies what gets pasted there. */}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn" onClick={copy}>
          <DiscordLogoIcon aria-hidden="true" />
          Discord
        </button>
      </div>
    </Modal>
  );
}
