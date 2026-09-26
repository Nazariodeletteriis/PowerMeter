import { CopyIcon, DownloadSimpleIcon, PlusIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { SAMPLE_CHARS } from "../sample/characters";
import { ClassAvatar, fmt } from "../ui";
import { daysAgo } from "./characters/shared";
import type { PageProps } from "./types";

// Prototype pg.personaggi. The buttons have no action in the prototype either:
// they get one with the real character list (R3).
export default function Personaggi({ t, lang }: PageProps) {
  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button type="button" className="btn fill">
          <PlusIcon aria-hidden="true" />
          {t("characters.add")}
        </button>
        <button type="button" className="btn">
          <DownloadSimpleIcon aria-hidden="true" />
          {t("characters.import")}
        </button>
        <button type="button" className="btn">
          <UploadSimpleIcon aria-hidden="true" />
          {t("characters.export")}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
        {SAMPLE_CHARS.map((c) => (
          <section
            key={c.name}
            className="chCharCard"
            aria-label={c.name}
            style={{
              background: "var(--pm-s1)",
              border: `1px solid ${c.active ? "var(--pm-red)" : "var(--pm-line)"}`,
              borderRadius: 8,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ClassAvatar cls={c.cls} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontWeight: 500, fontSize: 15 }}>{c.name}</h2>
                <div style={{ fontSize: 11, color: "var(--pm-t3)" }}>
                  {c.cls} · Lv {c.level} · {c.server}
                </div>
              </div>
              {c.active && <span className="chActiveTag">{t("characters.active")}</span>}
            </div>
            <div className="mono" style={{ fontSize: 24 }}>
              {fmt(c.cp, lang)} <span style={{ fontSize: 11, color: "var(--pm-t3)", fontFamily: "Inter,sans-serif" }}>CP</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--pm-t2)", display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 10px" }}>
              <span style={{ color: "var(--pm-t3)" }}>{t("characters.build")}</span>
              <span>{c.build ?? "—"}</span>
              <span style={{ color: "var(--pm-t3)" }}>{t("characters.lastFight")}</span>
              <span>
                {c.last ? daysAgo(lang, c.last.days) + (c.last.boss ? ` · ${c.last.boss}` : "") : t("characters.never")}
              </span>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
              {!c.active && (
                <button type="button" className="btn sm">
                  {t("characters.setActive")}
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button type="button" className="chCardIcon" title={t("characters.duplicate")} aria-label={t("characters.duplicate")}>
                <CopyIcon aria-hidden="true" />
              </button>
              <button type="button" className="chCardIcon" title={t("characters.delete")} aria-label={t("characters.delete")}>
                <TrashIcon aria-hidden="true" />
              </button>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
