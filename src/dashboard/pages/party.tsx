import { useState, type CSSProperties } from "react";
import {
  BowlFoodIcon,
  CaretRightIcon,
  CastleTurretIcon,
  FlagBannerIcon,
  FlaskIcon,
  HandHeartIcon,
  MusicNotesIcon,
  ScrollIcon,
  ShareNetworkIcon,
  ShieldPlusIcon,
  SparkleIcon,
  WindIcon,
  type Icon,
} from "@phosphor-icons/react";
import { RARITY } from "../ui";
import { BOSS, PT_BANDS, PT_BUFFS, PT_HUES, PT_MEMBERS, PT_OPENER, PT_SKILLS, ptGear, ptScrolls } from "../sample/combat";
import { Av, classColor, initials, ShareModal } from "./combat/parts";
import type { PageProps } from "./types";

// Sample party of the prototype (pParty) until the roster and rotations are read from fights.
const BUFF_ICONS: Record<string, Icon> = {
  music: MusicNotesIcon,
  wind: WindIcon,
  banner: FlagBannerIcon,
  shield: ShieldPlusIcon,
  food: BowlFoodIcon,
  flask: FlaskIcon,
  castle: CastleTurretIcon,
  sparkle: SparkleIcon,
  hand: HandHeartIcon,
};
const TICKS = ["0:00", "0:10", "0:20", "0:30", "0:40", "0:50", "1:00"];
const row: CSSProperties = { display: "flex", gap: 8, fontSize: 12, alignItems: "center", borderBottom: "1px solid var(--pm-line)" };
const ellipsis: CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

export default function Party({ t, lang }: PageProps) {
  const [sel, setSel] = useState("Kaelthas");
  const [share, setShare] = useState(false);
  const me = PT_MEMBERS.find((m) => m[0] === sel)!;
  const cls = me[1];
  const sk = PT_SKILLS[cls];
  const tr = (s: string) => (s.startsWith("combat.") ? t(s) : s);
  const buffs = PT_BUFFS.map(([n, src, e, ic, c, up]) => ({ n, src, e, ic, c, up, miss: up === "0%" }));
  const missing = buffs.filter((b) => b.miss).length;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "-8px 0 14px", flexWrap: "wrap" }}>
        {PT_MEMBERS.map(([n, c, role, cp]) => (
          <button
            key={n}
            type="button"
            aria-pressed={n === sel}
            onClick={() => setSel(n)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 40,
              padding: "0 12px 0 6px",
              borderRadius: 8,
              border: `1px solid ${n === sel ? "var(--pm-red)" : "var(--pm-line)"}`,
              background: n === sel ? "var(--pm-s2)" : "var(--pm-s1)",
              color: "var(--pm-t1)",
              cursor: "pointer",
            }}
          >
            <Av cls={c} size={28} font={9} />
            <span style={{ textAlign: "left", lineHeight: 1.15 }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 500 }}>{n}</span>
              <span style={{ display: "block", fontSize: 10, color: "var(--pm-t3)" }}>
                {role} · CP {cp}
              </span>
            </span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("combat.lastFight", { boss: BOSS })}</span>
        <button type="button" className="btn sm" onClick={() => setShare(true)}>
          <ShareNetworkIcon aria-hidden="true" />
          {t("combat.shareParty")}
        </button>
      </div>

      <section className="card" style={{ padding: "14px 16px", marginBottom: 12 }}>
        <Head title={t("combat.rotation", { name: sel })} hint={t("combat.openerHint", { apm: 38 + sel.length * 2 })} />
        <div style={{ display: "flex", alignItems: "center", overflowX: "auto", padding: "8px 6px 6px" }}>
          {PT_OPENER.map((j, k) => {
            const n = sk[j];
            const c = PT_HUES[j];
            return (
              <div key={k} style={{ display: "flex", alignItems: "center", flex: "none" }}>
                <div title={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 74 }}>
                  <span
                    style={{
                      position: "relative",
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: `linear-gradient(135deg,${c}66,${c}22 60%,var(--pm-s2))`,
                      boxShadow: `0 0 0 1px ${c}`,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  >
                    {initials(n)}
                    <span
                      style={{
                        position: "absolute",
                        left: -3,
                        top: -3,
                        minWidth: 16,
                        height: 16,
                        padding: "0 3px",
                        borderRadius: 8,
                        background: "var(--pm-red)",
                        color: "#FFFFFF",
                        fontSize: 9,
                        fontWeight: 600,
                        display: "grid",
                        placeItems: "center",
                        boxShadow: "0 0 0 2px var(--pm-s1)",
                      }}
                    >
                      {k + 1}
                    </span>
                  </span>
                  <span style={{ fontSize: 10, textAlign: "center", lineHeight: 1.2, color: "var(--pm-t2)", width: 70, ...ellipsis }}>{n}</span>
                  <span className="mono" style={{ fontSize: 9, color: "var(--pm-t3)" }}>
                    0:{String(Math.round(k * 1.6)).padStart(2, "0")}
                  </span>
                </div>
                {k < PT_OPENER.length - 1 && <CaretRightIcon aria-hidden="true" style={{ color: "var(--pm-t3)", marginTop: -30 }} />}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card" style={{ padding: "14px 16px", marginBottom: 12 }}>
        <Head title={t("combat.partyRotations")} hint={t("combat.rotationsHint")} />
        <div style={{ display: "grid", gridTemplateColumns: "150px minmax(0,1fr)", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t("combat.groupBuffs")}</span>
          <div style={{ position: "relative", height: 34, borderRadius: 4, background: "var(--pm-s2)" }}>
            {PT_BANDS.map(([n, a, b, c, top]) => (
              <div
                key={n}
                title={n}
                style={{
                  position: "absolute",
                  left: `${(a / 60) * 100}%`,
                  width: `${((b - a) / 60) * 100}%`,
                  top,
                  height: 14,
                  borderRadius: 3,
                  background: c,
                  opacity: 0.55,
                  overflow: "hidden",
                  fontSize: 9,
                  lineHeight: "14px",
                  paddingLeft: 4,
                  whiteSpace: "nowrap",
                  color: "#0A0909",
                }}
              >
                {n}
              </div>
            ))}
          </div>
          {PT_MEMBERS.map(([n, c], i) => {
            const s = PT_SKILLS[c];
            const marks: { x: number; burst: boolean; n: string; at: number }[] = [];
            for (let x = i * 0.4; x < 60; x += 1.4 + ((i * 3 + Math.floor(x)) % 4) * 0.35)
              marks.push({ x, burst: x > 20 && x < 32, n: s[Math.floor(x * 7 + i) % s.length], at: Math.floor(x) });
            return (
              <div key={n} style={{ display: "contents" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  <Av cls={c} size={20} radius={4} font={7} />
                  <span style={{ fontSize: 12, fontWeight: n === sel ? 600 : 400, ...ellipsis }}>{n}</span>
                </div>
                <div style={{ position: "relative", height: 26, borderRadius: 4, background: n === sel ? "var(--pm-s3)" : "var(--pm-s2)" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: "33.3%",
                      width: "20%",
                      top: 0,
                      bottom: 0,
                      background: "var(--pm-tint)",
                      borderLeft: "1px dashed var(--pm-red)",
                      borderRight: "1px dashed var(--pm-red)",
                    }}
                  />
                  {marks.map((m) => (
                    <span
                      key={m.x}
                      title={`${m.n} · 0:${String(m.at).padStart(2, "0")}`}
                      style={{
                        position: "absolute",
                        left: `${((m.x / 60) * 100).toFixed(2)}%`,
                        top: 5,
                        width: m.burst ? 5 : 3,
                        height: 16,
                        borderRadius: 2,
                        background: classColor(c),
                        opacity: m.burst ? 1 : 0.7,
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          <span />
          <div className="cbTicks">
            {TICKS.map((x) => (
              <span key={x}>{x === "0:20" ? `0:20 · ${t("combat.burstWindow")}` : x}</span>
            ))}
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, alignItems: "start" }}>
        <section className="card" style={{ padding: "12px 14px" }}>
          <h2 className="kicker" style={{ marginBottom: 8 }}>
            {t("combat.gear", { name: sel })}
          </h2>
          {ptGear(cls).map(([s, n, r, e]) => (
            <div key={s} style={{ ...row, display: "grid", gridTemplateColumns: "70px minmax(0,1fr) 30px", gap: 6, minHeight: 26 }}>
              <span style={{ color: "var(--pm-t3)", fontSize: 11 }}>{s}</span>
              <span style={{ color: RARITY[r], ...ellipsis }}>{n}</span>
              <span className="num" style={{ fontSize: 11 }}>
                +{e}
              </span>
            </div>
          ))}
          <Foot l="Gear Score" v={me[4]} />
        </section>
        <section className="card" style={{ padding: "12px 14px" }}>
          <h2 className="kicker" style={{ marginBottom: 8 }}>
            {t("combat.skillsStigma")}
          </h2>
          {sk.map((n, j) => (
            <div key={n} style={{ ...row, minHeight: 26 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: PT_HUES[j], flex: "none" }} />
              <span style={{ flex: 1, ...ellipsis }}>{n}</span>
              <span style={{ fontSize: 10, color: "var(--pm-t3)" }}>{j >= 5 ? "Stigma" : t("combat.active")}</span>
              <span className="num" style={{ fontSize: 11, width: 34 }}>
                {10 - (j % 4)}/10
              </span>
            </div>
          ))}
          <Foot l="Daevanion" v={me[5]} />
        </section>
        <section className="card" style={{ padding: "12px 14px" }}>
          <h2 className="kicker" style={{ marginBottom: 8 }}>
            {t("combat.scrolls")}
          </h2>
          {ptScrolls(cls).map(([n, e, q, on]) => (
            <div key={n} style={{ ...row, minHeight: 30 }}>
              <ScrollIcon aria-hidden="true" style={{ color: on ? "#F0A63A" : "var(--pm-t3)", flex: "none" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={ellipsis}>{n}</div>
                <div style={{ fontSize: 10, color: "var(--pm-t3)" }}>{tr(e)}</div>
              </div>
              <span className="mono" style={{ fontSize: 11, color: "var(--pm-t2)" }}>
                ×{q}
              </span>
              <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 3, background: on ? "#3FBF7F22" : "var(--pm-s3)", color: on ? "#5FD99A" : "var(--pm-t2)" }}>
                {on ? t("combat.active") : t("combat.ready")}
              </span>
            </div>
          ))}
        </section>
        <section className="card" style={{ padding: "12px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <h2 className="kicker">Buff</h2>
            <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t("combat.buffCount", { on: buffs.length - missing, miss: missing })}</span>
          </div>
          {buffs.map((b) => {
            const I = BUFF_ICONS[b.ic];
            return (
              <div key={b.n} style={{ ...row, minHeight: 30, opacity: b.miss ? 0.6 : 1 }}>
                <I aria-hidden="true" style={{ color: b.miss ? "var(--pm-t3)" : b.c, flex: "none" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={ellipsis}>{b.n}</div>
                  <div style={{ fontSize: 10, color: "var(--pm-t3)" }}>
                    {tr(b.src)} · {tr(b.e)}
                  </div>
                </div>
                <span className="mono" title={t("combat.uptimeFight")} style={{ fontSize: 11 }}>
                  {b.miss ? t("combat.missing") : b.up}
                </span>
              </div>
            );
          })}
        </section>
      </div>

      {share && <ShareModal t={t} lang={lang} onClose={() => setShare(false)} />}
    </>
  );
}

function Head({ title, hint }: { title: string; hint: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
      <span style={{ width: 14, height: 2, background: "var(--pm-red)" }} />
      <h2 style={{ fontWeight: 500 }}>{title}</h2>
      <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{hint}</span>
    </div>
  );
}

function Foot({ l, v }: { l: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12 }}>
      <span style={{ color: "var(--pm-t2)" }}>{l}</span>
      <span className="mono">{v}</span>
    </div>
  );
}
