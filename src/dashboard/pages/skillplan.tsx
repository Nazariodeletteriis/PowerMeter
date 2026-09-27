import { useEffect, useState } from "react";
import {
  CaretDownIcon,
  CaretUpIcon,
  CopyIcon,
  DiamondIcon,
  DownloadSimpleIcon,
  ExportIcon,
  FloppyDiskIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShareNetworkIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { SKILL_BUILDS } from "../sample/characters";
import { classSkills, planClass, SkillIcon, type GameSkill } from "../skills";
import { CLASSES } from "../ui";
import { SectionHead, useMem } from "./characters/shared";
import { ShareModal } from "./shared/ShareModal";
import type { PageProps } from "./types";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "−", "="];
const ROWS = [
  ["a", "ACTIVE"],
  ["s", "STIGMA"],
  ["p", "PASSIVE"],
] as const;
const MAX_STIGMA = 6;
/** Skill level cap, from the tooltip source (meta.max_level). */
const MAX_LEVEL = 20;
/** Library tab / rotation row of a skill: Chain skills sit with the actives. */
const letter = (sk: GameSkill) => (sk.type === "Stigma" ? "s" : sk.type === "Passive" ? "p" : "a");

/** Starting planner for a class: two Stigmas on, the first actives on the bar and in the rotation. */
function startOf(list: GameSkill[]) {
  const a = list.filter((x) => letter(x) === "a").map((x) => x.id);
  const s = list.filter((x) => x.type === "Stigma").map((x) => x.id);
  return {
    stig: { [s[0]]: true, [s[1]]: true } as Record<string, boolean>,
    bar: { "0,0": a[0], "0,1": a[1], "0,2": a[2], "0,3": a[3], "1,0": s[0], "1,1": s[1] } as Record<string, string>,
    rotation: { a: a.slice(0, 2), s: s.slice(0, 1), p: [] } as Record<string, string[]>,
  };
}
const CARD = { background: "var(--pm-s1)", border: "1px solid var(--pm-line)", borderRadius: 8 } as const;

// Prototype pg.skillplan (pSkill + pX).
export default function SkillPlan({ t, lang, name, settings, onError, setHeader }: PageProps) {
  const title = `${t("nav.skillPlanner")} · ${name}`;
  useEffect(() => setHeader({ title }), [setHeader, title]);
  const cls = planClass(settings["pm.class"]);
  const SKILLS = classSkills(cls);
  const col = CLASSES[cls]?.[1] ?? "var(--pm-grey)";
  const start = startOf(SKILLS);
  // Planner state is per class, so switching class does not mix skill ids.
  const [selId, setSel] = useMem(`skSel:${cls}`, SKILLS[0].id);
  const [stig, setStig] = useMem(`stig:${cls}`, start.stig);
  const [lvl, setLvl] = useMem<Record<string, number>>(`skLv:${cls}`, {});
  const [bar, setBar] = useMem(`skBar:${cls}`, start.bar);
  const [rot, setRot] = useMem(`skPr:${cls}`, start.rotation);
  const [macros, setMacros] = useMem<string[]>("macros", []);
  const [filter, setFilter] = useMem("skF", "all");
  const [q, setQ] = useMem("skQ", "");
  const [notes, setNotes] = useMem("descOpen", false);
  const [share, setShare] = useState(false);

  const byId = (id: string) => SKILLS.find((x) => x.id === id);
  const cur = byId(selId) ?? SKILLS[0];
  const curLv = lvl[cur.id] ?? 1;
  const kind = (sk: GameSkill) => t(`characters.skill.kind.${sk.type === "Chain" ? "c" : letter(sk)}`);
  const stigN = Object.values(stig).filter(Boolean).length;
  const equipped = SKILLS.filter((x) => x.type === "Stigma" && stig[x.id]);
  // Only what the source has; "instant" is its word for no cooldown / cast time.
  const val = (v?: string) => (!v ? "—" : v === "instant" ? t("characters.skill.instant") : v);

  // Clicking a Stigma also equips/unequips it, up to 6.
  const pick = (sk: GameSkill) => {
    setSel(sk.id);
    if (sk.type === "Stigma" && (stig[sk.id] || stigN < MAX_STIGMA)) setStig({ ...stig, [sk.id]: !stig[sk.id] });
  };
  const builds = SKILL_BUILDS.filter((b) => b[1] === cls);
  const lib = SKILLS.filter((x) => (filter === "all" || letter(x) === filter) && x.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="chToolbar">
        <select className="chSelect" aria-label={t("characters.skill.build")}>
          {builds.map(([b]) => (
            <option key={b}>{b}</option>
          ))}
          <option>{t("characters.newBuildOption")}</option>
        </select>
        <input key={cls} className="chSelect" defaultValue={builds[0]?.[0] ?? ""} aria-label={t("characters.builder.namePlaceholder")} style={{ width: 220 }} />
        <span className="chRegion">Global</span>
        <div style={{ flex: 1 }} />
        {(
          [
            ["characters.import", DownloadSimpleIcon],
            ["characters.export", ExportIcon],
            ["characters.duplicate", CopyIcon],
            ["characters.delete", TrashIcon],
          ] as const
        ).map(([key, Icon]) => (
          <button key={key} type="button" className="chIconBtn" title={t(key)} aria-label={t(key)}>
            <Icon aria-hidden="true" />
          </button>
        ))}
        <button type="button" className="btn sm" onClick={() => setShare(true)}>
          <ShareNetworkIcon aria-hidden="true" />
          {t("characters.share.button")}
        </button>
        <button type="button" className="btn sm fill" style={{ padding: "0 12px" }}>
          <FloppyDiskIcon aria-hidden="true" />
          {t("characters.save")}
        </button>
      </div>

      <div className="spGrid">
        <section aria-label={t("characters.skill.library")} style={{ ...CARD, display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 210px)", minHeight: 480 }}>
          <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, borderBottom: "1px solid var(--pm-line)" }}>
            <div className="chSeg">
              {["all", "a", "s", "p"].map((id) => (
                <button key={id} type="button" aria-pressed={filter === id} style={{ flex: 1, height: 28, padding: 0 }} onClick={() => setFilter(id)}>
                  {t(`characters.skill.filter.${id}`)}
                </button>
              ))}
            </div>
            <label className="chSearch">
              <MagnifyingGlassIcon aria-hidden="true" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("characters.skill.search")} aria-label={t("characters.skill.search")} />
            </label>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 6 }}>
            {lib.map((sk) => {
              const L = lvl[sk.id] ?? 1;
              const on = sk.type === "Stigma" && !!stig[sk.id];
              return (
                <button
                  key={sk.id}
                  type="button"
                  className="chBtnReset chSkillRow"
                  aria-pressed={sk.id === cur.id}
                  style={{ opacity: sk.type === "Stigma" && !on ? 0.45 : 1 }}
                  onClick={() => pick(sk)}
                >
                  <span style={{ width: 34, height: 34, flex: "none", borderRadius: "50%", background: "var(--pm-s2)", boxShadow: "0 0 0 1px var(--pm-line)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600 }}>
                    <SkillIcon skill={sk} name={sk.name} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ flex: 1, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sk.name}</span>
                      <span style={{ fontSize: 9, color: "var(--pm-t3)" }}>{kind(sk)}</span>
                    </span>
                    <span style={{ display: "flex", gap: 2 }} aria-label={t("characters.skill.level", { n: L })}>
                      {Array.from({ length: MAX_LEVEL }, (_, i) => (
                        <span key={i} style={{ flex: 1, height: 3, borderRadius: 1, background: i < L ? "var(--pm-red)" : "var(--pm-s3)" }} />
                      ))}
                    </span>
                  </span>
                  {on && <DiamondIcon weight="fill" aria-label={t("characters.skill.stigmaOn")} style={{ color: "var(--pm-redt)", fontSize: 12, flex: "none" }} />}
                </button>
              );
            })}
          </div>
        </section>

        <div className="spMid">
          <section style={{ ...CARD, padding: 16 }}>
            <SectionHead title="Stigma" style={{ marginBottom: 14 }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--pm-t1)" }}>
                {stigN}/{MAX_STIGMA}
              </span>
              <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>· {t("characters.skill.stigmaHint")}</span>
            </SectionHead>
            <div className="spStigma">
              {Array.from({ length: MAX_STIGMA }, (_, i) => {
                const sk = equipped[i];
                return (
                  <div key={i} title={sk ? sk.name : t("characters.skill.freeSocket")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 48, height: 48, transform: "rotate(45deg)", borderRadius: 8, background: "var(--pm-s2)", border: `1px solid ${sk ? col : "var(--pm-grey)"}`, display: "grid", placeItems: "center", overflow: "hidden" }}>
                      {/* The icon is turned back upright and scaled so it fills the diamond. */}
                      <span style={{ transform: "rotate(-45deg) scale(1.42)", width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 8, fontWeight: 600 }}>
                        {sk && <SkillIcon skill={sk} name={sk.name} />}
                      </span>
                    </div>
                    <span className="mono" style={{ fontSize: 10, color: "var(--pm-t3)" }}>
                      {i + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section style={{ ...CARD, padding: 16 }}>
            <SectionHead title={t("characters.skill.quickbars")} style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>· {t("characters.skill.quickbarsHint")}</span>
            </SectionHead>
            <div className="spBars">
              {[0, 1, 2, 3].map((r) => (
                <div key={r} className="spBarRow">
                  {KEYS.map((k, c) => {
                    const pos = `${r},${c}`;
                    const v = bar[pos];
                    const sk = v ? byId(v) : undefined;
                    const tip = sk ? sk.name : t("characters.skill.assignHint");
                    return (
                      <button
                        key={pos}
                        type="button"
                        className="chBarCell"
                        title={tip}
                        aria-label={`${r + 1}·${k} ${tip}`}
                        style={sk ? { border: `1px solid ${col}`, padding: 0, overflow: "hidden" } : undefined}
                        onClick={() => {
                          const next = { ...bar };
                          if (v === cur.id) delete next[pos];
                          else next[pos] = cur.id;
                          setBar(next);
                        }}
                      >
                        {sk && <SkillIcon skill={sk} name={sk.name} />}
                      </button>
                    );
                  })}
                </div>
              ))}
              <div className="spBarRow" aria-hidden="true">
                {KEYS.map((k) => (
                  <span key={k} className="mono" style={{ fontSize: 10, color: "var(--pm-t3)", textAlign: "center" }}>
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section style={{ ...CARD, padding: 16 }}>
            <SectionHead title={t("characters.skill.rotation")} style={{ marginBottom: 12 }} />
            {ROWS.map(([type, label]) => (
              <div key={type} style={{ display: "flex", alignItems: "center", minHeight: 52, position: "relative" }}>
                <span style={{ width: 74, fontSize: 10, letterSpacing: ".08em", color: "var(--pm-t3)" }}>{label}</span>
                <div className="spRotTrack">
                  <div className="spRotLine" />
                  {rot[type].flatMap((id) => byId(id) ?? []).map((sk, k) => {
                    const id = sk.id;
                    return (
                      <div key={id} style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, padding: "4px 10px 4px 4px", marginRight: 14, borderRadius: 20, background: "var(--pm-s2)", border: "1px solid var(--pm-line)", flex: "none" }}>
                        <span style={{ width: 28, height: 28, flex: "none", borderRadius: "50%", background: "var(--pm-s3)", display: "grid", placeItems: "center", fontSize: 9, fontWeight: 600 }}>
                          <SkillIcon skill={sk} name={sk.name} />
                        </span>
                        <span style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                          <span className="mono" style={{ color: "var(--pm-redt)" }}>
                            {k + 1}
                          </span>{" "}
                          {sk.name}
                        </span>
                        <button type="button" className="chX" aria-label={t("characters.skill.removeNamed", { n: sk.name })} onClick={() => setRot({ ...rot, [type]: rot[type].filter((x) => x !== id) })}>
                          <XIcon aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    title={t("characters.skill.addSelected")}
                    aria-label={t("characters.skill.addSelected")}
                    onClick={() => letter(cur) === type && !rot[type].includes(cur.id) && setRot({ ...rot, [type]: [...rot[type], cur.id] })}
                    style={{ position: "relative", width: 30, height: 30, padding: 0, borderRadius: "50%", border: "1px dashed var(--pm-grey)", background: "var(--pm-s1)", color: "var(--pm-t2)", cursor: "pointer", flex: "none" }}
                  >
                    <PlusIcon aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </section>
        </div>

        <div className="spSide">
          <section aria-label={cur.name} style={{ ...CARD, padding: 16, display: "flex", flexDirection: "column", gap: 12, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -40, top: -40, width: 160, height: 160, background: `radial-gradient(circle,${col}33,transparent 70%)` }} />
            <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--pm-s2)", boxShadow: `0 0 0 2px ${col},0 0 24px ${col}55`, display: "grid", placeItems: "center", fontSize: 18, fontWeight: 600 }}>
                <SkillIcon skill={cur} name={cur.name} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>{cur.name}</div>
                <div style={{ fontSize: 11, color: "var(--pm-t3)" }}>
                  {kind(cur)} · {cls}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button type="button" className="chRound" aria-label={t("characters.skill.levelDown")} onClick={() => setLvl({ ...lvl, [cur.id]: Math.max(1, curLv - 1) })}>
                  −
                </button>
                <span className="mono" style={{ fontSize: 20, minWidth: 62 }} aria-live="polite">
                  {curLv}
                  <span style={{ fontSize: 12, color: "var(--pm-t3)" }}>/{MAX_LEVEL}</span>
                </span>
                <button type="button" className="chRound" aria-label={t("characters.skill.levelUp")} onClick={() => setLvl({ ...lvl, [cur.id]: Math.min(MAX_LEVEL, curLv + 1) })}>
                  +
                </button>
              </div>
            </div>
            <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 1, background: "var(--pm-line)", borderRadius: 6, overflow: "hidden", fontSize: 10, color: "var(--pm-t3)", textAlign: "center" }}>
              {(
                [
                  ["cooldown", val(cur.cd)],
                  ["cast", val(cur.cast)],
                  ["cost", cur.cost ? `${cur.cost} MP` : "—"],
                  ["range", val(cur.range)],
                ] as const
              ).map(([key, v]) => (
                <div key={key} style={{ background: "var(--pm-s2)", padding: 6 }}>
                  {t(`characters.skill.${key}`)}
                  <div className="mono" style={{ fontSize: 12, color: "var(--pm-t1)" }}>
                    {v}
                  </div>
                </div>
              ))}
            </div>
            {cur.desc && <div style={{ position: "relative", fontSize: 12, lineHeight: 1.6, color: "var(--pm-t2)" }}>{cur.desc}</div>}
          </section>

          <section style={{ ...CARD, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
            <h2 className="kicker" style={{ marginBottom: 2 }}>
              Macro
            </h2>
            {macros.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 32, padding: "0 8px", borderRadius: 6, background: "var(--pm-s2)", fontSize: 11 }}>
                <span style={{ flex: 1 }}>{m}</span>
                <button type="button" className="chX" style={{ padding: "1px 6px" }} aria-label={t("characters.builder.remove")} onClick={() => setMacros(macros.filter((_, j) => j !== i))}>
                  <XIcon aria-hidden="true" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setMacros([...macros, t("characters.skill.macroText", { n: macros.length + 1, skill: cur.name })])}
              style={{ height: 34, borderRadius: 6, border: "1px dashed var(--pm-line)", background: "transparent", color: "var(--pm-t2)", cursor: "pointer", fontSize: 12 }}
            >
              <PlusIcon aria-hidden="true" style={{ verticalAlign: "-1px" }} /> {t("characters.skill.addMacro")}
            </button>
          </section>

          <section style={{ ...CARD, overflow: "hidden" }}>
            <button type="button" className="chBtnReset" aria-expanded={notes} onClick={() => setNotes(!notes)} style={{ display: "flex", alignItems: "center", width: "100%", padding: "10px 14px" }}>
              <span style={{ flex: 1, fontWeight: 500 }}>{t("characters.skill.notes")}</span>
              {notes ? <CaretUpIcon aria-hidden="true" /> : <CaretDownIcon aria-hidden="true" />}
            </button>
            {notes && (
              <div style={{ padding: "0 14px 14px" }}>
                <textarea
                  placeholder={t("characters.skill.notesPlaceholder")}
                  aria-label={t("characters.skill.notes")}
                  style={{ width: "100%", minHeight: 100, boxSizing: "border-box", padding: 10, borderRadius: 6, border: "1px solid var(--pm-line)", background: "var(--pm-s2)", color: "var(--pm-t1)", font: "inherit" }}
                />
              </div>
            )}
          </section>
        </div>
      </div>
      {share && <ShareModal t={t} lang={lang} kind="skillPlan" onClose={() => setShare(false)} onError={onError} />}
    </>
  );
}
