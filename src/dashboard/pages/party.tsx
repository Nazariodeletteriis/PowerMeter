import { useState, type CSSProperties } from "react";
import { ShareNetworkIcon, SwordIcon, WarningOctagonIcon } from "@phosphor-icons/react";
import { fmt } from "../ui";
import { usePoll } from "../usePoll";
import { Av, classColor, clock, fightParty, getFights, pc, uploadedUrl, useFight } from "./combat/parts";
import { SkillIcon } from "../skills";
import { ShareModal } from "./shared/ShareModal";
import type { PageProps } from "./types";

// Roster and skills of the latest saved fight. Gear, scrolls, buffs and the opener have no source in
// fight records, so they are not shown.
const TICKS = ["0:00", "0:10", "0:20", "0:30", "0:40", "0:50", "1:00"];
const row: CSSProperties = { display: "flex", gap: 8, fontSize: 12, alignItems: "center", borderBottom: "1px solid var(--pm-line)" };
const ellipsis: CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

export default function Party({ t, lang, name, onError }: PageProps) {
  const fights = usePoll(getFights, 10000);
  const rec = useFight(fights.data?.[0]?.id, onError);
  const [sel, setSel] = useState<number>();
  const [share, setShare] = useState(false);

  if (fights.error)
    return (
      <section className="card cbState" style={{ maxWidth: 544 }} role="alert">
        <WarningOctagonIcon aria-hidden="true" style={{ color: "var(--pm-err)" }} />
        <div style={{ fontSize: 15 }}>{t("combat.states.errorTitle")}</div>
        <div className="cbStateText">{fights.error}</div>
      </section>
    );
  if (fights.data && !fights.data.length)
    return (
      <section className="card cbState" style={{ maxWidth: 544 }}>
        <SwordIcon aria-hidden="true" style={{ color: "var(--pm-t3)" }} />
        <div style={{ fontSize: 15 }}>{t("combat.noFights")}</div>
        <div className="cbStateText">{t("home.emptyText")}</div>
      </section>
    );
  if (!rec) return <div className="skeleton" style={{ height: 260 }} />;

  const party = fightParty(rec, name);
  const me = party.find((r) => r.key === sel) ?? party.find((r) => r.me) ?? party[0];
  const skills = me ? [...me.skills].sort((a, b) => b.dmg - a.dmg) : [];
  const boss = rec.bossName || "—";

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "-8px 0 14px", flexWrap: "wrap" }}>
        {party.map((m) => (
          <button
            key={m.key}
            type="button"
            aria-pressed={m.key === me?.key}
            onClick={() => setSel(m.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 40,
              padding: "0 12px 0 6px",
              borderRadius: 8,
              border: `1px solid ${m.key === me?.key ? "var(--pm-red)" : "var(--pm-line)"}`,
              background: m.key === me?.key ? "var(--pm-s2)" : "var(--pm-s1)",
              color: "var(--pm-t1)",
              cursor: "pointer",
            }}
          >
            <Av cls={m.cls} size={28} font={9} />
            <span style={{ textAlign: "left", lineHeight: 1.15 }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 500 }}>{m.n}</span>
              <span style={{ display: "block", fontSize: 10, color: "var(--pm-t3)" }}>
                {m.cls} · DPS {fmt(m.dps, lang)}
              </span>
            </span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--pm-t3)" }}>{t("combat.lastFight", { boss })}</span>
        <button type="button" className="btn sm" onClick={() => setShare(true)}>
          <ShareNetworkIcon aria-hidden="true" />
          {t("combat.shareParty")}
        </button>
      </div>

      <section className="card" style={{ padding: "14px 16px", marginBottom: 12 }}>
        <Head title={t("combat.partyRotations")} hint={t("combat.rotationsHint")} />
        <div style={{ display: "grid", gridTemplateColumns: "150px minmax(0,1fr)", gap: 10, alignItems: "center" }}>
          {party.map((m) => {
            // Hits in the first 60 s, one mark per 0.1% of the axis (the first skill landing there names it).
            const marks = new Map<string, string>();
            for (const s of m.raw)
              for (const x of s.hitTimestamps) if (x <= 60000) {
                const k = ((x / 60000) * 100).toFixed(1);
                if (!marks.has(k)) marks.set(k, `${s.name} · ${clock(x / 1000)}`);
              }
            return (
              <div key={m.key} style={{ display: "contents" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  <Av cls={m.cls} size={20} radius={4} font={7} />
                  <span style={{ fontSize: 12, fontWeight: m.key === me?.key ? 600 : 400, ...ellipsis }}>{m.n}</span>
                </div>
                <div style={{ position: "relative", height: 26, borderRadius: 4, background: m.key === me?.key ? "var(--pm-s3)" : "var(--pm-s2)" }}>
                  {[...marks].map(([x, title]) => (
                    <span key={x} title={title} style={{ position: "absolute", left: `${x}%`, top: 5, width: 3, height: 16, borderRadius: 2, background: classColor(m.cls), opacity: 0.8 }} />
                  ))}
                </div>
              </div>
            );
          })}
          <span />
          <div className="cbTicks">
            {TICKS.map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
        </div>
      </section>

      {me && (
        <section className="card" style={{ padding: "12px 14px" }}>
          <h2 className="kicker" style={{ marginBottom: 8 }}>
            {t("combat.tab.skill")} · {me.n}
          </h2>
          {!skills.length && <div style={{ padding: "8px 0", fontSize: 12, color: "var(--pm-t3)" }}>{t("combat.noData")}</div>}
          {skills.map((s) => (
            <div key={s.j} style={{ ...row, minHeight: 30 }}>
              <span style={{ width: 22, height: 22, borderRadius: 4, background: "var(--pm-s3)", display: "grid", placeItems: "center", fontSize: 9, color: "var(--pm-t2)", flex: "none" }}>
                <SkillIcon skill={s.sk} name={s.n} />
              </span>
              <span style={{ flex: 1, ...ellipsis }}>{s.n}</span>
              <span className="num" style={{ fontSize: 11, color: "var(--pm-t2)" }}>
                {t("combat.col.hits")} {s.hits}
              </span>
              <span className="num" style={{ fontSize: 11, width: 52 }}>
                {pc(s.pct, lang)}
              </span>
            </div>
          ))}
        </section>
      )}

      {share && (
        <ShareModal
          t={t}
          lang={lang}
          kind="party"
          url={uploadedUrl(rec.id)}
          preview={[`${boss} · ${clock(rec.durationMs / 1000)}`, ...party.slice(0, 3).map((q, k) => `${k + 1}. ${q.n} (${q.cls}) ${fmt(q.dps, lang)}`)]}
          onClose={() => setShare(false)}
          onError={onError}
        />
      )}
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
