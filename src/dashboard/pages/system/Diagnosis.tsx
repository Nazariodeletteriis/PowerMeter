import { useEffect, useId, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CheckCircleIcon, FirstAidKitIcon, XCircleIcon, XIcon } from "@phosphor-icons/react";
import type { T } from "../../i18n";
import type { CaptureStatus } from "../../Shell";
import { usePoll } from "../../usePoll";
import { Modal } from "./Modal";

const NPCAP_URL = "https://npcap.com/#download";
const checkNpcap = () => invoke<boolean>("npcap_installed");
const checkAdmin = () => invoke<boolean>("is_admin");
const getCapture = () => invoke<CaptureStatus>("get_capture_status");
const getGameTitle = () => invoke<string | null>("get_aion2_window_title");

type Row = { label: string; ok: boolean; text: string; fix?: () => Promise<unknown> };

/**
 * Prototype md.diag: live capture checks, re-run every 2s so a fix turns green
 * in place. Open it from the status pill (the prototype opens it on "Errore").
 */
export function Diagnosis({ t, onClose, onError }: { t: T; onClose: () => void; onError: (e: unknown) => void }) {
  const npcap = usePoll(checkNpcap, 2000);
  const admin = usePoll(checkAdmin, 2000);
  const capture = usePoll(getCapture, 2000);
  const game = usePoll(getGameTitle, 2000);
  const [devices, setDevices] = useState<string[]>([]);
  const [device, setDevice] = useState("");
  const selectId = useId();

  useEffect(() => {
    invoke<string[]>("get_available_devices").then(setDevices, onError);
  }, [onError]);

  const redetect = () => invoke("reset_auto_detection");
  const cap = capture.data;
  const current = cap?.device ?? "";
  const rows: Row[] = [
    {
      label: t("req.npcap"),
      ok: npcap.data === true,
      text: npcap.error ?? t(npcap.data ? "organizer.diag.npcapOk" : "organizer.diag.npcapMissing"),
      // Same as onboarding: official installer, else the download page.
      fix: () => invoke<boolean>("install_npcap").then((ok) => ok || invoke("open_url", { url: NPCAP_URL })),
    },
    {
      label: t("organizer.diag.admin"),
      ok: admin.data === true,
      text: admin.error ?? t(admin.data ? "organizer.diag.adminOk" : "req.adminHint"),
    },
    {
      label: t("organizer.diag.adapter"),
      ok: !!cap?.locked,
      text:
        capture.error ??
        (cap?.locked
          ? t("organizer.diag.adapterOk", { device: current })
          : current
            ? t("organizer.diag.adapterNoTraffic", { device: current })
            : t("organizer.diag.adapterNone")),
      fix: redetect,
    },
    {
      label: t("organizer.diag.game"),
      ok: !!game.data,
      text: game.error ?? game.data ?? t("status.noGameHint"),
    },
    {
      label: t("organizer.diag.port"),
      ok: cap?.port != null,
      text: capture.error ?? (cap?.port != null ? t("organizer.diag.portOk", { port: cap.port }) : t("organizer.diag.portMissing")),
      fix: redetect,
    },
  ];

  const selected = device || (devices.includes(current) ? current : devices[0]) || "";
  const retry = () => {
    invoke("set_manual_device", { device: selected }).then(redetect).catch(onError);
    onClose();
  };

  return (
    <Modal
      width={620}
      onClose={onClose}
      title={(id) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FirstAidKitIcon style={{ fontSize: 20, color: "#FF4D4D" }} aria-hidden="true" />
          <h2 id={id} style={{ fontSize: 17, fontWeight: 500, flex: 1 }}>
            {t("organizer.diag.title")}
          </h2>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            title={t("window.close")}
            aria-label={t("window.close")}
            style={{ width: 30, height: 30, border: 0, background: "transparent", color: "var(--pm-t2)", cursor: "pointer" }}
          >
            <XIcon aria-hidden="true" />
          </button>
        </div>
      )}
    >
      {[npcap, admin, capture, game].every((p) => p.data !== undefined || p.error) &&
        rows.map((r) => {
          const Icon = r.ok ? CheckCircleIcon : XCircleIcon;
          return (
            <div
              key={r.label}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                minHeight: 48,
                borderTop: "1px solid var(--pm-line)",
                padding: "6px 0",
              }}
            >
              <Icon weight="fill" style={{ fontSize: 20, flex: "none", color: r.ok ? "#3FBF7F" : "#FF4D4D" }} aria-hidden="true" />
              <div style={{ flex: 1 }}>
                <div>
                  {r.label}
                  <span className="srOnly">: {t(r.ok ? "req.ok" : "req.missing")}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{r.text}</div>
              </div>
              {!r.ok && r.fix && (
                <button type="button" className="btn sm" onClick={() => r.fix!().catch(onError)}>
                  {t("organizer.diag.fix")}
                </button>
              )}
            </div>
          );
        })}
      <div style={{ display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid var(--pm-line)", paddingTop: 12 }}>
        <label htmlFor={selectId} style={{ fontSize: 12, color: "var(--pm-t2)" }}>
          {t("organizer.diag.manualAdapter")}
        </label>
        <select
          id={selectId}
          value={selected}
          onChange={(e) => setDevice(e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            height: 32,
            borderRadius: 6,
            border: "1px solid var(--pm-line)",
            background: "var(--pm-s2)",
            color: "var(--pm-t1)",
          }}
        >
          {devices.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <button type="button" className="btn fill" style={{ padding: "0 14px" }} onClick={retry}>
          {t("organizer.diag.retry")}
        </button>
      </div>
    </Modal>
  );
}
