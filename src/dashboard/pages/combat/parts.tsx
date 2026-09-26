import { useEffect, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import {
  CheckIcon,
  CopyIcon,
  DiscordLogoIcon,
  RedditLogoIcon,
  WarningOctagonIcon,
  WifiSlashIcon,
  XIcon,
  XLogoIcon,
  TrayIcon,
} from "@phosphor-icons/react";
import type { T } from "../../i18n";
import { art, CLASSES, fmt } from "../../ui";
import {
  BADGES,
  BOSS,
  CLASS_SKILLS,
  DURATION,
  PARTY,
  SHARE_URL,
  SKILL_HITS,
  SKILL_KIDS,
  SKILL_SHARE,
} from "../../sample/combat";
import "./combat.css";

// ---------- formatting (prototype ab / pc) ----------
const dec = (n: number, lang: string) => n.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** 1,2 M · 85 K · 640 */
export const ab = (n: number, lang: string) =>
  n >= 1e6 ? `${dec(n / 1e6, lang)} M` : n >= 1e3 ? `${Math.round(n / 1e3)} K` : String(Math.round(n));
/** 38,4% */
export const pc = (n: number, lang: string) => `${dec(n, lang)}%`;
/** m:ss */
export const clock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Class square of the prototype (cl()): icon on the class tint, initials when there is no icon. */
export function Av({ cls, size, radius = 6, font = 10, bare }: { cls: string; size: number; radius?: number; font?: number; bare?: boolean }) {
  const [init, col] = CLASSES[cls] ?? ["", "var(--pm-grey)"];
  const icon = art(cls);
  const style = { "--c": col, width: size, height: size, borderRadius: radius, fontSize: font } as CSSProperties;
  if (bare) style.border = 0;
  if (!icon) style.background = `${col}22`;
  return (
    <span className="classAvatar" style={style} aria-hidden="true">
      {icon ? <img src={icon} alt="" /> : init}
    </span>
  );
}
export const classColor = (cls: string) => CLASSES[cls]?.[1] ?? "var(--pm-grey)";

// ---------- sample party (prototype pCommon) ----------
export type Row = {
  key: string | number;
  n: string;
  cls: string;
  cp: number;
  dps: number;
  dmg: number;
  deaths: number;
  me: boolean;
  /** Prototype index, drives the sample series and skill numbers. */
  i: number;
  pos: number;
  pct: number;
  barW: number;
  hits: number;
};

/** Party sorted by DPS; `tick` adds the prototype's live wobble (meter only). */
export function sampleParty(tick?: number): Row[] {
  const rows = PARTY.map(([n, cls, cp, dps, deaths, me], i) => {
    const d = tick == null ? dps : dps * (1 + 0.035 * Math.sin(tick * 0.8 + i * 1.3));
    return { key: i, n, cls, cp, dps: d, dmg: d * DURATION, deaths, me: !!me, i };
  });
  return rank(rows);
}

/** Adds position, share of damage and bar width, sorted by DPS. */
export function rank(rows: Omit<Row, "pos" | "pct" | "barW" | "hits">[]): Row[] {
  const tot = rows.reduce((a, r) => a + r.dmg, 0) || 1;
  const max = Math.max(...rows.map((r) => r.dps)) || 1;
  return rows
    .sort((a, b) => b.dps - a.dps)
    .map((r, k) => ({ ...r, pos: k + 1, pct: (r.dmg / tot) * 100, barW: (r.dps / max) * 100, hits: Math.round(r.dmg / 13400) }));
}

/** Prototype pMeter series: 60 samples per player, with the phase-2 dip and Vharok's death. */
export function sampleSeries(rows: Row[]) {
  return rows.map((p) => {
    const pts: number[] = [];
    for (let k = 0; k < 60; k++) {
      let v = p.dps * (0.8 + 0.18 * Math.sin(k * 0.35 + p.i * 1.7) + 0.1 * Math.sin(k * 1.3 + p.i));
      if (k >= 30 && k <= 33) v *= 0.25;
      if (p.n === "Vharok" && k >= 41 && k <= 45) v = 0;
      pts.push(v);
    }
    return { key: p.key, col: classColor(p.cls), d: path(pts, 26000) };
  });
}

/** SVG path on the 1000×200 chart box. */
export function path(values: number[], ymax: number) {
  const n = Math.max(1, values.length - 1);
  return values.map((v, k) => `${k ? "L" : "M"}${((k / n) * 1000).toFixed(1)},${(200 - (v / ymax) * 190).toFixed(1)}`).join("");
}

/** DPS lines over the grid (prototype meter + report chart). `children` sit under the lines, `over` above. */
export function Chart({
  lines,
  sel,
  label,
  children,
  over,
  ...rest
}: {
  lines: { key: string | number; col: string; d: string }[];
  sel: string | number;
  label: string;
  children?: ReactNode;
  over?: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="img" aria-label={label} {...rest} style={{ position: "relative", height: 200, ...rest.style }}>
      <div className="cbGrid" />
      {children}
      <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="cbSvg">
        {lines.map((s) => (
          <path
            key={s.key}
            d={s.d}
            fill="none"
            stroke={s.col}
            strokeWidth={s.key === sel ? 2.4 : 1.3}
            opacity={s.key === sel ? 1 : 0.8}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {over}
    </div>
  );
}

// ---------- sample skills of one player (prototype pReport) ----------
export type Skill = {
  n: string;
  j: number;
  dmg: number;
  pct: number;
  hits: number;
  crit: number;
  min: number;
  max: number;
  avg: number;
  back: number;
  parry: number;
  perfect: number;
  double: number;
  multi: number;
  init: string;
  kids?: string[];
};
export const initials = (n: string) =>
  n
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

export function sampleSkills(p: Row, key: keyof Skill = "dmg", dir = -1): Skill[] {
  const names = CLASS_SKILLS[p.cls] ?? CLASS_SKILLS.Sorcerer;
  return names
    .map((n, j) => {
      const dmg = p.dmg * SKILL_SHARE[j];
      const hits = SKILL_HITS[j] + p.i * 3;
      const avg = dmg / hits;
      return {
        n,
        j,
        dmg,
        pct: SKILL_SHARE[j] * 100,
        hits,
        crit: 28 + ((j * 7 + p.i * 5) % 22),
        min: avg * 0.62,
        max: avg * 2.1,
        avg,
        back: 8 + ((j * 3) % 14),
        parry: (j * 2) % 6,
        perfect: 4 + ((j * 5) % 9),
        double: (j * 4) % 12,
        multi: j === 1 || j === 4 ? 18 + j : 0,
        init: initials(n),
        kids: SKILL_KIDS[j],
      };
    })
    .sort((a, b) => (a[key]! > b[key]! ? 1 : -1) * dir);
}

/** CRIT / BACK / PARRY / PERFECT / DOUBLE of a sample player. */
export const sampleBadges = (p: Row): [string, number][] => BADGES.map(([l, v], k) => [l, v + p.i * 0.7 - k * 0.2]);

// ---------- share modal (prototype md.share) ----------
const VIS = ["public", "unlisted", "private"] as const;

export function ShareModal({ t, lang, onClose }: { t: T; lang: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [vis, setVis] = useState<(typeof VIS)[number]>("unlisted");
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const copy = () =>
    navigator.clipboard.writeText(`https://${SHARE_URL}`).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  const top = sampleParty().slice(0, 3);

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cbShareTitle"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, overflow: "visible" }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div id="cbShareTitle" style={{ fontSize: 17, fontWeight: 500, flex: 1 }}>
            {t("combat.shareLog")}
          </div>
          <button type="button" className="cbIconBtn" title={t("combat.close")} aria-label={t("combat.close")} onClick={onClose}>
            <XIcon aria-hidden="true" />
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="mono cbUrl">{SHARE_URL}</div>
          {copied ? (
            <button type="button" className="btn lg" style={{ borderColor: "var(--pm-ok)", color: "var(--pm-okt)", fontWeight: 500 }}>
              <CheckIcon aria-hidden="true" />
              {t("combat.copied")}
            </button>
          ) : (
            <button type="button" className="btn fill lg" autoFocus onClick={copy}>
              <CopyIcon aria-hidden="true" />
              {t("combat.copy")}
            </button>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }} role="radiogroup" aria-labelledby="cbVis">
          <div id="cbVis" style={{ fontSize: 11, color: "var(--pm-t3)" }}>
            {t("combat.visibility")}
          </div>
          {VIS.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={v === vis}
              className="cbPlain cbVisOpt"
              style={{ borderColor: v === vis ? "var(--pm-red)" : "var(--pm-line)" }}
              onClick={() => setVis(v)}
            >
              <span className="cbRadio">
                <span style={{ background: v === vis ? "var(--pm-red)" : "transparent" }} />
              </span>
              <span style={{ flex: 1 }}>{t(`combat.vis.${v}`)}</span>
              <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t(`combat.vis.${v}Hint`)}</span>
            </button>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 11, color: "var(--pm-t3)", marginBottom: 6 }}>{t("combat.discordPreview")}</div>
          <div style={{ display: "flex", gap: 10, padding: "10px 12px", borderRadius: 6, background: "#1E1F22", borderLeft: "3px solid #DB0000" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: "#B5BAC1" }}>PowerMeter</div>
              <div style={{ fontSize: 14, color: "#00A8FC", fontWeight: 600, margin: "2px 0" }}>
                {BOSS} · Kill in {clock(DURATION)}
              </div>
              <div style={{ fontSize: 12, color: "#DBDEE1" }}>
                {top.map((p, k) => `${k + 1}. ${p.n} (${p.cls}) ${fmt(p.dps, lang)}`).join(" · ")}
              </div>
              <div
                style={{
                  marginTop: 8,
                  height: 90,
                  borderRadius: 4,
                  background: "linear-gradient(135deg,#1A1717,#0A0909)",
                  border: "1px solid #2E2929",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 10,
                  color: "#8A8181",
                }}
              >
                {t("combat.ogImage")}
              </div>
            </div>
          </div>
        </div>
        {/* ponytail: the share targets wait for the real upload (R2); the link above is a sample. */}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn">
            <DiscordLogoIcon aria-hidden="true" />
            Discord
          </button>
          <button type="button" className="btn">
            <RedditLogoIcon aria-hidden="true" />
            Reddit
          </button>
          <button type="button" className="btn">
            <XLogoIcon aria-hidden="true" />X
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- the four standard states (prototype pg.states) ----------
export function States({ t }: { t: T }) {
  return (
    <>
      <div style={{ fontSize: 13, color: "var(--pm-t2)", margin: "-6px 0 14px", maxWidth: 720 }}>{t("combat.states.intro")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 12, maxWidth: 1100 }}>
        <section className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }} aria-busy="true">
          <h2 className="kicker">{t("combat.states.loading")}</h2>
          <div className="skeleton" style={{ height: 14, width: "60%", borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 36 }} />
          <div className="skeleton" style={{ height: 36 }} />
          <div className="skeleton" style={{ height: 36, width: "80%" }} />
        </section>
        <section className="card cbState">
          <h2 className="kicker">{t("combat.states.empty")}</h2>
          <TrayIcon aria-hidden="true" style={{ color: "var(--pm-t3)" }} />
          <div style={{ fontSize: 15 }}>{t("combat.states.emptyTitle")}</div>
          <div className="cbStateText">{t("combat.states.emptyText")}</div>
          <div>
            <button type="button" className="btn fill">
              {t("combat.states.create")}
            </button>
          </div>
        </section>
        <section className="card cbState">
          <h2 className="kicker">{t("combat.states.error")}</h2>
          <WarningOctagonIcon aria-hidden="true" style={{ color: "var(--pm-err)" }} />
          <div style={{ fontSize: 15 }}>{t("combat.states.errorTitle")}</div>
          <div className="cbStateText">{t("combat.states.errorText")}</div>
          <div>
            <button type="button" className="btn">
              {t("combat.retry")}
            </button>
          </div>
        </section>
        <section className="card cbState">
          <h2 className="kicker">{t("combat.states.offline")}</h2>
          <WifiSlashIcon aria-hidden="true" style={{ color: "var(--pm-warn)" }} />
          <div style={{ fontSize: 15 }}>{t("combat.states.offlineTitle")}</div>
          <div className="cbStateText">{t("combat.states.offlineText")}</div>
        </section>
      </div>
    </>
  );
}
