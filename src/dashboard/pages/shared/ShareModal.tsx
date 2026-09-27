import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CheckIcon, CopyIcon, DiscordLogoIcon, XIcon } from "@phosphor-icons/react";
import type { T } from "../../i18n";
import { Modal } from "../system/Modal";
import "./shared.css";

/** What is being shared: picks the title (shell.share.<kind>). */
export type ShareKind = "log" | "party" | "build" | "skillPlan" | "daevanion" | "item";
const VISIBILITY = ["public", "unlisted", "private"] as const;

/**
 * Prototype md.share. With `text` (first line = title) that text is what gets
 * copied and previewed. Without it, `url` is copied (a fight's online link,
 * pm.uploadedFights) and `preview` (title, then lines) fills the Discord card;
 * no `url` means nothing online to share yet: copy is disabled.
 */
export function ShareModal({
  t,
  kind,
  text,
  url,
  preview,
  onClose,
  onError,
}: {
  t: T;
  /** Kept for callers; the modal has no numbers to format since the sample preview went. */
  lang: string;
  kind: ShareKind;
  text?: string;
  url?: string;
  preview?: string[];
  onClose: () => void;
  onError: (e: unknown) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [vis, setVis] = useState<(typeof VISIBILITY)[number]>("unlisted");
  const link = text ?? url;
  // An uploaded log (PUBLIC_URL/e/<id>): the choice is saved on the server. Uploads start unlisted.
  const logId = !text && url ? /\/e\/([A-Za-z0-9]{10})$/.exec(url)?.[1] : undefined;
  const pick = (v: (typeof VISIBILITY)[number]) =>
    logId ? invoke("pm_set_log_visibility", { id: logId, visibility: v }).then(() => setVis(v), onError) : setVis(v);
  const copy = () => link && navigator.clipboard.writeText(link).then(() => setCopied(true), onError);
  const [head, ...lines] = text ? text.split("\n") : (preview ?? []);
  // Uploading needs a fight and an account: Storico → Upload. Other kinds have no online page yet.
  const none = t(kind === "log" || kind === "party" ? "combat.shareNoLink" : "combat.shareSoon");

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
        <div className="shareUrl mono" style={link ? undefined : { color: "var(--pm-t3)", fontFamily: "inherit", fontSize: 12 }}>
          {text ? head : (url ?? none)}
        </div>
        {copied ? (
          <button type="button" className="btn lg shareCopied" aria-live="polite">
            <CheckIcon aria-hidden="true" />
            {t("shell.share.copied")}
          </button>
        ) : (
          <button type="button" className="btn lg fill" autoFocus disabled={!link} onClick={copy}>
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
          <button key={v} type="button" role="radio" aria-checked={v === vis} className="shareVis" onClick={() => pick(v)}>
            <span className="shareRadio">
              <span />
            </span>
            <span style={{ flex: 1 }}>{t(`shell.share.${v}`)}</span>
            <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t(`shell.share.${v}Hint`)}</span>
          </button>
        ))}
      </div>
      {head && (
      <div>
        <div style={{ fontSize: 11, color: "var(--pm-t3)", marginBottom: 6 }}>{t("shell.share.discordPreview")}</div>
        <div className="shareDiscord">
          <div style={{ flex: 1, minWidth: 0, fontFamily: "Inter,sans-serif" }}>
            <div style={{ fontSize: 11, color: "#B5BAC1" }}>PowerMeter</div>
            <div style={{ fontSize: 14, color: "#00A8FC", fontWeight: 600, margin: "2px 0" }}>
              {head}
            </div>
            <div style={{ fontSize: 12, color: "#DBDEE1" }}>
              {lines.slice(0, 3).join(" · ")}
            </div>
            <div className="shareOg">{t("shell.share.ogImage")}</div>
          </div>
        </div>
      </div>
      )}
      {/* Discord has no share URL: the button copies what gets pasted there. */}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" className="btn" disabled={!link} onClick={copy}>
          <DiscordLogoIcon aria-hidden="true" />
          Discord
        </button>
      </div>
    </Modal>
  );
}
