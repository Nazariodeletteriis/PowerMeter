import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ArrowCounterClockwiseIcon, ArrowSquareOutIcon, FirstAidIcon, FlagIcon, FloppyDiskIcon, ShieldWarningIcon, SwordIcon, TargetIcon, XIcon } from "@phosphor-icons/react";
import { EmptyState, fmt } from "../ui";
import { Av, Chart, classColor, clock, pc, path, rank } from "./combat/parts";
import { Modal } from "./system/Modal";
import type { PageProps } from "./types";

/** dps-update payload (src-tauri/src/entity/dps_data.rs), the fields shown here. */
type Dps = {
  map: Record<string, { job: string; dps: number; amount: number; nickname: string; combatPower: number; hitsTaken: number; damageTaken: number }>;
  targetName: string;
  targetMode: string;
  targetId: number;
  battleTime: number;
  localPlayerId: number | null;
  /** Kind and name of the last target anyone hit, whatever mode is shown. */
  recordingKind: string;
  recordingName: string;
  /** Healing received per player since the last reset. */
  heals: { id: number; nickname: string; job: string; fromSelf: number; fromOthers: number }[];
};
/** get_skill_details entries (details_context.rs DetailSkillEntry); `time` is the hit count. */
type SkillEntry = { name: string; dmg: number; time: number; crit: number; back: number; parry: number; perfect: number; double: number };

// The engine sends Korean class names (job_class.rs class_name).
const JOB: Record<string, string> = {
  검성: "Gladiator",
  수호성: "Templar",
  궁성: "Ranger",
  살성: "Assassin",
  마도성: "Sorcerer",
  치유성: "Cleric",
  정령성: "Spiritmaster",
  호법성: "Chanter",
};
// Tab labels → set_target_mode ids (dps_calculator.rs).
// Exclusive: every hit counts in exactly one of them.
const MODES = [
  ["BOSS", "bossTargets"],
  ["PVE", "pveTargets"],
  ["PVP", "pvpTargets"],
] as const;
const KIND_LABEL: Record<string, string> = { boss: "BOSS", pve: "PVE", pvp: "PVP" };
// Classes marked TANK on the aggro card.
const TANKS = new Set(["Templar", "Gladiator"]);
/** Chart window: 60 dps-update samples (500 ms each). */
const HISTORY = 60;
/** Setting shared with the widget: "1" shows only the local player's row. */
const ONLY_ME = "pm.onlyMe";

export default function Meter({ t, lang, run, onError, settings, save }: PageProps) {
  const [data, setData] = useState<Dps>();
  const [ping, setPing] = useState<number>();
  const [sel, setSel] = useState<string | number>();
  // Chosen tab while no engine snapshot exists (browser preview); the engine's targetMode wins once it reports.
  const [mode, setMode] = useState("bossTargets");
  const [skills, setSkills] = useState<SkillEntry[]>();
  const history = useRef(new Map<number, number[]>());
  const [trainer, setTrainer] = useState(false);
  // Follows the widget too: update_settings broadcasts setting-changed, App folds it into `settings`.
  const onlyMe = settings[ONLY_ME] === "1";

  useEffect(() => {
    const onDps = (d: Dps) => {
      // Keep the last HISTORY DPS values per actor for the live chart.
      const h = history.current;
      if (!Object.keys(d.map).length) h.clear();
      for (const [id, v] of Object.entries(d.map)) h.set(Number(id), [...(h.get(Number(id)) ?? []), v.dps].slice(-HISTORY));
      setData(d);
    };
    invoke<Dps>("get_dps_snapshot").then(onDps, onError);
    invoke<number | null>("get_ping").then((p) => setPing(p ?? undefined), onError);
    const stops = [
      listen<Dps>("dps-update", (e) => onDps(e.payload)),
      listen<number>("ping-update", (e) => setPing(e.payload)),
    ];
    return () => {
      stops.forEach((s) => s.then((stop) => stop(), () => {}));
    };
  }, [onError]);

  const rows = data
    ? rank(
        Object.entries(data.map)
          // amount 0: a healer with no damage, there only for the widget's HEAL tab
          .filter(([id, v]) => Number(id) > 0 && Number.isFinite(v.dps) && v.amount > 0)
          .map(([id, v], i) => ({
            key: Number(id),
            n: v.nickname || id,
            cls: JOB[v.job] ?? v.job,
            cp: v.combatPower,
            dps: v.dps,
            dmg: v.amount,
            deaths: 0,
            me: Number(id) === data.localPlayerId,
            i,
          })),
      )
    : [];
  const live = rows.length > 0;
  // Shares and bars stay relative to the whole party; only the list narrows.
  const shown = onlyMe ? rows.filter((r) => r.me) : rows;
  const selP = shown.find((r) => r.key === sel) ?? shown.find((r) => r.me) ?? shown[0];
  const selKey = selP?.key;
  const targetId = data?.targetId;

  // Skill breakdown of the selected player while a fight is live.
  useEffect(() => {
    setSkills(undefined);
    if (!live || typeof selKey !== "number") return;
    const load = () =>
      invoke<{ skills: (SkillEntry & { actorId: number })[] }>("get_skill_details", { targetId, actorIds: [selKey] }).then(
        (r) => setSkills(r.skills),
        (e) => {
          clearInterval(id);
          onError(e);
        },
      );
    load();
    const id = setInterval(load, 2000);
    return () => clearInterval(id);
  }, [live, selKey, targetId, onError]);

  const ymax = Math.max(1, ...rows.flatMap((r) => history.current.get(r.key as number) ?? [])) * 1.1;
  const series = shown.map((r) => ({ key: r.key, col: classColor(r.cls), d: path(history.current.get(r.key as number) ?? [], ymax) }));
  const { list: skillList, badges } = liveSkills(skills);
  const btn30: CSSProperties = { height: 30 };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "-8px 0 16px", flexWrap: "wrap" }}>
        <div className="cbSeg" role="group">
          {MODES.map(([label, id]) => (
            <button
              key={id}
              type="button"
              aria-pressed={(data?.targetMode ?? mode) === id}
              onClick={() => {
                setMode(id);
                history.current.clear();
                setData((d) => d && { ...d, targetMode: id });
                run(() => invoke("set_target_mode", { mode: id }));
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: "var(--pm-t2)", marginLeft: 8 }}>
          {t("combat.target")} <span style={{ color: "var(--pm-t1)" }}>{(live && data!.targetName) || "—"}</span> ·{" "}
          <span className="mono" style={{ color: "var(--pm-redt)" }}>
            {live ? clock(data!.battleTime / 1000) : "—"}
          </span>
          {data?.recordingKind && (
            <>
              {" · "}
              {t("combat.recording")} <span style={{ color: "var(--pm-t1)" }}>{KIND_LABEL[data.recordingKind] ?? data.recordingKind}</span>
              {data.recordingName && ` · ${data.recordingName}`}
            </>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          className="btn"
          style={{ ...btn30, ...(onlyMe ? { borderColor: "var(--pm-red)", background: "var(--pm-tint)" } : {}) }}
          aria-pressed={onlyMe}
          onClick={() => run(() => save(ONLY_ME, onlyMe ? "" : "1"))}
        >
          <FlagIcon aria-hidden="true" weight={onlyMe ? "fill" : "regular"} />
          {t("combat.onlyMe")}
        </button>
        <button type="button" className="btn" style={btn30} onClick={() => setTrainer(true)}>
          <TargetIcon aria-hidden="true" />
          {t("combat.trainer")}
        </button>
        <button
          type="button"
          className="btn"
          style={btn30}
          onClick={() =>
            run(() =>
              invoke("reset_combat").then(() => {
                history.current.clear();
                setData(undefined);
              }),
            )
          }
        >
          <ArrowCounterClockwiseIcon aria-hidden="true" />
          {t("combat.reset")}
        </button>
        {/* ponytail: the engine saves every fight by itself; no manual save command exists yet. */}
        <button type="button" className="btn" style={btn30}>
          <FloppyDiskIcon aria-hidden="true" />
          {t("combat.save")}
        </button>
        <button type="button" className="btn fill" style={{ ...btn30, fontSize: 13 }} onClick={() => run(() => invoke("show_overlay"))}>
          <ArrowSquareOutIcon aria-hidden="true" />
          {t("combat.detach")}
        </button>
      </div>

      {!selP ? (
        <section className="card">
          <EmptyState icon={<SwordIcon aria-hidden="true" />} title={t("combat.waitingTitle")} text={t("combat.waitingText")} />
        </section>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            <section className="card" style={{ padding: 8 }} aria-label={t("combat.partyDps")}>
              {shown.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  aria-pressed={p.key === selKey}
                  className="cbPlain cbHover"
                  onClick={() => setSel(p.key)}
                  style={
                    {
                      "--bg": p.key === selKey ? "var(--pm-s3)" : p.me ? "var(--pm-tint)" : "transparent",
                      position: "relative",
                      display: "grid",
                      gridTemplateColumns: "24px 30px minmax(0,1fr) 90px 64px 104px",
                      gap: 10,
                      alignItems: "center",
                      height: 44,
                      padding: "0 10px",
                      borderRadius: 6,
                      overflow: "hidden",
                    } as CSSProperties
                  }
                >
                  <span className="mono" style={{ color: "var(--pm-t3)", fontSize: 12 }}>
                    {p.pos}
                  </span>
                  <Av cls={p.cls} size={28} />
                  <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                      <span style={{ fontWeight: 500, color: p.me ? "var(--pm-t1)" : "var(--pm-t2)" }}>{p.n}</span>
                      <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{p.cls}</span>
                    </div>
                    <div className="cbTrack" style={{ height: 5, borderRadius: 3 }}>
                      <div className="cbGrow" style={{ width: `${p.barW}%`, background: classColor(p.cls), borderRadius: 3 }} />
                    </div>
                  </div>
                  <span className="num" style={{ fontSize: 15, fontWeight: 500 }}>
                    {fmt(p.dps, lang)}
                  </span>
                  <span className="num" style={{ color: "var(--pm-t2)" }}>
                    {pc(p.pct, lang)}
                  </span>
                  <span className="num" style={{ color: "var(--pm-t3)" }}>
                    {fmt(p.dmg, lang)}
                  </span>
                </button>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 10px 4px", fontSize: 12, color: "var(--pm-t3)" }}>
                <span>
                  {t("combat.partyDps")}{" "}
                  <span className="mono" style={{ color: "var(--pm-t1)" }}>
                    {fmt(rows.reduce((a, r) => a + r.dps, 0), lang)}
                  </span>
                </span>
                <span>
                  Ping{" "}
                  <span className="mono" style={{ color: "var(--pm-ok)" }}>
                    {ping == null ? "—" : `${ping} ms`}
                  </span>
                </span>
              </div>
            </section>
            <section className="card" style={{ padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <h2 className="kicker">{t("combat.liveDps")}</h2>
                <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{t("combat.clickToHighlight")}</span>
              </div>
              <Chart lines={series} sel={selKey} label={t("combat.liveDps")} />
            </section>
          </div>

          <section className="card" style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Av cls={selP.cls} size={34} font={11} />
              <div style={{ flex: 1 }}>
                <h2 style={{ fontWeight: 500, fontSize: 15 }}>{selP.n}</h2>
                <div style={{ fontSize: 11, color: "var(--pm-t3)" }}>
                  {selP.cls} · CP {selP.cp ? fmt(selP.cp, lang) : "—"}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="mono" style={{ fontSize: 20 }}>
                  {fmt(selP.dps, lang)}
                </div>
                <div style={{ fontSize: 11, color: "var(--pm-t3)" }}>DPS</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 6 }}>
              {badges.map(([l, v]) => (
                <div key={l} style={{ border: "1px solid var(--pm-line)", borderRadius: 6, padding: 6, textAlign: "center" }}>
                  <div style={{ fontSize: 9, letterSpacing: ".1em", color: "var(--pm-t3)" }}>{l}</div>
                  <div className="mono" style={{ fontSize: 12 }}>
                    {v == null ? "—" : pc(v, lang)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {skillList === undefined
                ? [0, 1, 2, 3].map((k) => <div key={k} className="skeleton" style={{ height: 28 }} />)
                : skillList.map((s) => (
                    <div key={s.n} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 72px 52px", gap: 8, alignItems: "center", minHeight: 32 }}>
                      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.n}</span>
                        <div className="cbTrack" style={{ height: 3, borderRadius: 2 }}>
                          <div style={{ height: "100%", width: `${s.barW}%`, background: classColor(selP.cls), borderRadius: 2 }} />
                        </div>
                      </div>
                      <span className="num" style={{ fontSize: 12 }}>
                        {fmt(s.dmg, lang)}
                      </span>
                      <span className="num" style={{ fontSize: 12, color: "var(--pm-t2)" }}>
                        {pc(s.pct, lang)}
                      </span>
                    </div>
                  ))}
            </div>
          </section>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12, marginTop: 12 }}>
        <HealsCard t={t} lang={lang} heals={data?.heals ?? []} />
        <AggroCard t={t} lang={lang} rows={rows.map((r) => ({ ...r, hitsTaken: data?.map[String(r.key)]?.hitsTaken ?? 0 }))} />
      </div>

      {trainer && (
        <Trainer
          t={t}
          lang={lang}
          onError={onError}
          prevMode={data?.targetMode || mode}
          me={data?.localPlayerId != null ? data.map[String(data.localPlayerId)] : undefined}
          target={data?.targetName ?? ""}
          battleTime={data?.battleTime ?? 0}
          onReset={() => {
            history.current.clear();
            setData(undefined);
          }}
          onClose={() => setTrainer(false)}
        />
      )}
    </>
  );
}

/** Seconds of the countdown before the trainer starts measuring. */
const COUNTDOWN = 3;

/**
 * Trainer: a 3-2-1 countdown, then the meter starts from zero on training dummies only and shows the local
 * player's numbers. Stop freezes them; closing puts the meter back in the mode it was in (nothing changes when
 * it closes during the countdown).
 */
function Trainer({
  t,
  lang,
  onError,
  prevMode,
  me,
  target,
  battleTime,
  onReset,
  onClose,
}: {
  t: PageProps["t"];
  lang: string;
  onError: PageProps["onError"];
  prevMode: string;
  me?: Dps["map"][string];
  target: string;
  battleTime: number;
  onReset: () => void;
  onClose: () => void;
}) {
  const [n, setN] = useState(COUNTDOWN);
  // Values are read only once the reset is done: before it the meter still holds the previous fight.
  const [ready, setReady] = useState(false);
  const [frozen, setFrozen] = useState<{ dmg: number; dps: number; ms: number }>();
  // Mount-time values for the timers and the unmount cleanup (props change every dps-update).
  const first = useRef({ prevMode, onReset, onError });
  const started = useRef(false);

  useEffect(() => {
    if (!n) return;
    const id = setTimeout(() => {
      if (n === 1) {
        started.current = true;
        const { onReset, onError } = first.current;
        invoke("set_target_mode", { mode: "dummyTargets" })
          .then(() => invoke("reset_combat"))
          .then(() => {
            onReset();
            setReady(true);
          }, onError);
      }
      setN(n - 1);
    }, 1000);
    return () => clearTimeout(id);
  }, [n]);
  useEffect(
    () => () => {
      if (started.current) invoke("set_target_mode", { mode: first.current.prevMode }).catch(first.current.onError);
    },
    [],
  );

  const cur = frozen ?? (ready && me && me.amount > 0 ? { dmg: me.amount, dps: me.dps, ms: battleTime } : undefined);
  const stat = (label: string, value: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>{label}</span>
      <span className="mono" style={{ fontSize: 16 }}>
        {value}
      </span>
    </div>
  );

  return (
    <Modal
      width={360}
      onClose={onClose}
      title={(id) => (
        <div style={{ display: "flex", alignItems: "center" }}>
          <h2 id={id} style={{ fontSize: 17, fontWeight: 500, flex: 1 }}>
            {t("combat.trainerTitle")}
          </h2>
          <button type="button" className="shareClose" onClick={onClose} title={t("window.close")} aria-label={t("window.close")}>
            <XIcon aria-hidden="true" />
          </button>
        </div>
      )}
    >
      {n > 0 ? (
        <div aria-live="polite" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "12px 0 8px" }}>
          {/* Keyed: each number mounts and plays its entrance once. */}
          <span key={n} className="mono cbCount">
            {n}
          </span>
          <span style={{ fontSize: 12, color: "var(--pm-t2)", textAlign: "center" }}>{t("combat.trainerReady")}</span>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="mono" style={{ fontSize: 40, lineHeight: 1.1 }}>
              {cur ? fmt(cur.dps, lang) : "—"}
            </span>
            <span style={{ fontSize: 12, color: "var(--pm-t3)" }}>DPS</span>
          </div>
          {cur ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {stat(t("combat.duration"), clock(cur.ms / 1000))}
              {stat(t("combat.col.totalDmg"), fmt(cur.dmg, lang))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "var(--pm-t2)" }}>{t("combat.trainerHit")}</div>
          )}
          {cur && target && <div style={{ fontSize: 12, color: "var(--pm-t3)" }}>{target}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            {frozen ? (
              <button type="button" className="btn" style={{ height: 30 }} onClick={onClose}>
                {t("window.close")}
              </button>
            ) : (
              <button type="button" className="btn fill" style={{ height: 30 }} disabled={!cur} onClick={() => setFrozen(cur)}>
                {t("combat.stop")}
              </button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}

/** Top 8 skills and hit-rate badges from get_skill_details, summed per skill name. */
function liveSkills(entries?: SkillEntry[]) {
  const by = new Map<string, SkillEntry>();
  for (const e of entries ?? []) {
    const s = by.get(e.name);
    by.set(
      e.name,
      s
        ? { ...s, dmg: s.dmg + e.dmg, time: s.time + e.time, crit: s.crit + e.crit, back: s.back + e.back, parry: s.parry + e.parry, perfect: s.perfect + e.perfect, double: s.double + e.double }
        : { ...e },
    );
  }
  const all = [...by.values()];
  const tot = all.reduce((a, s) => a + s.dmg, 0) || 1;
  const hits = all.reduce((a, s) => a + s.time, 0);
  const top = all.sort((a, b) => b.dmg - a.dmg).slice(0, 8);
  const maxPct = top.length ? (top[0].dmg / tot) * 100 : 1;
  const list = entries && top.map((s) => ({ n: s.name, dmg: s.dmg, pct: (s.dmg / tot) * 100, barW: ((s.dmg / tot) * 100 * 100) / maxPct }));
  const rate = (k: "crit" | "back" | "parry" | "perfect" | "double") => (hits ? (all.reduce((a, s) => a + s[k], 0) / hits) * 100 : undefined);
  const badges: [string, number | undefined][] = [
    ["CRIT", rate("crit")],
    ["BACK", rate("back")],
    ["PARRY", rate("parry")],
    ["PERFECT", rate("perfect")],
    ["DOUBLE", rate("double")],
  ];
  return { list, badges };
}

/** Card head shared by heals and aggro. */
function Card({ icon, title, hint, children }: { icon: ReactNode; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="card" style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        {icon}
        <h2 style={{ fontWeight: 500 }}>{title}</h2>
        {hint && <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--pm-t3)" }}>{hint}</span>}
      </div>
      {children}
    </section>
  );
}

/** A row: name, share bar, value. */
function Bar({ name, cls, pct, value, tag }: { name: string; cls: string; pct: number; value: string; tag?: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 120px", gap: 10, alignItems: "center", minHeight: 30 }}>
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ display: "flex", gap: 6, alignItems: "baseline", whiteSpace: "nowrap", overflow: "hidden" }}>
          {name}
          {tag}
        </span>
        <div className="cbTrack" style={{ height: 3, borderRadius: 2 }}>
          <div style={{ height: "100%", width: `${pct}%`, background: classColor(cls), borderRadius: 2 }} />
        </div>
      </div>
      <span className="num" style={{ fontSize: 12, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

/** Healing received per player (any healer, any class), split own heals / others'. Off when nobody was healed. */
function HealsCard({ t, lang, heals }: { t: PageProps["t"]; lang: string; heals: Dps["heals"] }) {
  const list = heals.map((h) => ({ ...h, cls: JOB[h.job] ?? h.job, tot: h.fromSelf + h.fromOthers })).filter((h) => h.tot > 0).sort((a, b) => b.tot - a.tot);
  const max = list[0]?.tot || 1;
  return (
    <Card icon={<FirstAidIcon aria-hidden="true" style={{ color: "var(--pm-okt)" }} />} title={t("combat.healsReceived")}>
      {!list.length ? (
        <div style={{ color: "var(--pm-t3)", fontSize: 12 }}>{t("combat.healsOff")}</div>
      ) : (
        list.map((h) => (
          <Bar
            key={h.id}
            name={h.nickname}
            cls={h.cls}
            pct={(h.tot / max) * 100}
            value={fmt(h.tot, lang)}
            tag={
              <span style={{ fontSize: 11, color: "var(--pm-t3)" }}>
                {t("combat.healSelf")} {fmt(h.fromSelf, lang)} · {t("combat.healOthers")} {fmt(h.fromOthers, lang)}
              </span>
            }
          />
        ))
      )}
    </Card>
  );
}

/**
 * Aggro. Packets carry no threat value, so: when the mobs of this view have hit
 * anyone, the share of those hits each player took (observed — mobs attack whoever
 * holds their aggro); before that, an estimate = damage dealt × 2 for a Templar or
 * Gladiator, × 1 for everyone else, labelled as estimated.
 */
function AggroCard({ t, lang, rows }: { t: PageProps["t"]; lang: string; rows: { key: string | number; n: string; cls: string; dmg: number; hitsTaken: number }[] }) {
  const observed = rows.some((r) => r.hitsTaken > 0);
  const list = rows
    .map((r) => ({ ...r, v: observed ? r.hitsTaken : r.dmg * (TANKS.has(r.cls) ? 2 : 1) }))
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v);
  const tot = list.reduce((a, r) => a + r.v, 0) || 1;
  const max = list[0]?.v || 1;
  return (
    <Card
      icon={<ShieldWarningIcon aria-hidden="true" style={{ color: "var(--pm-warn)" }} />}
      title={t("combat.aggro")}
      hint={list.length ? t(observed ? "combat.aggroObserved" : "combat.aggroEstimated") : undefined}
    >
      {!list.length ? (
        <div style={{ color: "var(--pm-t3)", fontSize: 12 }}>{t("combat.aggroEmpty")}</div>
      ) : (
        list.map((r) => (
          <Bar
            key={r.key}
            name={r.n}
            cls={r.cls}
            pct={(r.v / max) * 100}
            value={observed ? `${fmt(r.hitsTaken, lang)} ${t("combat.col.hits").toLowerCase()} · ${pc((r.v / tot) * 100, lang)}` : pc((r.v / tot) * 100, lang)}
            tag={
              TANKS.has(r.cls) && (
                <span style={{ fontSize: 9, letterSpacing: ".1em", padding: "0 4px", borderRadius: 3, border: "1px solid var(--pm-warn)", color: "var(--pm-warn)" }}>TANK</span>
              )
            }
          />
        ))
      )}
    </Card>
  );
}
