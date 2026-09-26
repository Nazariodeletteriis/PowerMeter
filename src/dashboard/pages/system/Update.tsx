import { invoke } from "@tauri-apps/api/core";
import type { T } from "../../i18n";
import { Modal } from "./Modal";

/** latest.json (version, msiUrl) plus what the modal shows when known. */
export type UpdateInfo = {
  version: string;
  msiUrl: string;
  /** ISO date, e.g. "2026-09-25". */
  date?: string;
  sizeMb?: number;
  notes?: string[];
};

const BTN = { height: 34, padding: "0 14px" };

/** Prototype md.update, opened from the update banner's "Note di rilascio". */
export function UpdateModal({
  t,
  lang,
  update,
  onClose,
  onError,
}: {
  t: T;
  lang: string;
  update: UpdateInfo;
  onClose: () => void;
  onError: (e: unknown) => void;
}) {
  const meta = [
    update.date &&
      t("organizer.update.released", {
        date: new Date(update.date).toLocaleDateString(lang, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
      }),
    update.sizeMb && `${update.sizeMb} MB`,
  ].filter(Boolean);

  // ponytail: show_update_window is the only install path the backend has and
  // it asks again with a native Yes/No; a direct install command removes that.
  const install = () => {
    invoke<string>("get_app_version")
      .then((current) => invoke("show_update_window", { current: `v${current}`, latest: `v${update.version}`, msiUrl: update.msiUrl }))
      .catch(onError);
    onClose();
  };

  return (
    <Modal
      width={520}
      onClose={onClose}
      title={(id) => (
        <h2 id={id} style={{ fontSize: 17, fontWeight: 500 }}>
          PowerMeter {update.version}
        </h2>
      )}
    >
      {meta.length > 0 && <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{meta.join(" · ")}</div>}
      {update.notes && (
        <ul style={{ fontSize: 13, lineHeight: 1.7, color: "var(--pm-t2)" }}>
          {update.notes.map((n) => (
            <li key={n}>• {n}</li>
          ))}
        </ul>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="btn" style={BTN} autoFocus onClick={onClose}>
          {t("organizer.update.later")}
        </button>
        <button type="button" className="btn fill" style={BTN} onClick={install}>
          {t("organizer.update.now")}
        </button>
      </div>
    </Modal>
  );
}
