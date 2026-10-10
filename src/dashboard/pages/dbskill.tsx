import { useState } from "react";
import { LightningIcon } from "@phosphor-icons/react";
import type { GameRecord, SkillCoefficient, SkillEffect } from "../../data/db/types";
import type { T } from "../i18n";
import { ClassAvatar, RELEASED_CLASSES } from "../ui";
import type { PageProps } from "./types";
import { DataState, DbList, EntryHead, EntryLink, FilterBox, gd, Nd, None, RecordCard, Section, TypePage, useGd, useIcons, type Open } from "./world/db";
import "./world/world.css";

type SkillData = {
  acquire?: string;
  kind?: string;
  weapon?: string;
  damageType?: string;
  element?: string;
  icon?: string;
  effect?: string;
  class_name?: string;
  specializations?: { id: string; icon?: string; level?: number; text?: string }[];
  specPick?: number;
};

// "gladiator" → "Gladiator" (the 8 released classes; the archive has no Brawler).
const className = (c?: string | null) => RELEASED_CLASSES.find((x) => x.toLowerCase() === c);
// Effect texts carry a stray ">" and double spaces from the game's markup.
const clean = (s?: string | null) => (s ?? "").replace(/\)>/g, ")").replace(/ {2,}/g, " ");

export default function DbSkill({ t, lang, go, setHeader }: PageProps) {
  return (
    <TypePage
      t={t}
      go={go}
      setHeader={setHeader}
      category="skill"
      title={t("world.skill.title")}
      list={(open) => <SkillList t={t} open={open} />}
      card={(id, open) => <RecordCard t={t} category="skill" id={id}>{(r) => <SkillCard t={t} lang={lang} rec={r} open={open} />}</RecordCard>}
    />
  );
}

function SkillList({ t, open }: { t: T; open: Open }) {
  const rows = useGd(() => gd.list("skill"), "skill");
  const [q, setQ] = useState("");
  const [cls, setCls] = useState<string | null>(null);
  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const found = rows.data
    ?.filter((r) => (!cls || className(r.kind) === cls) && words.every((w) => (r.name ?? "").toLowerCase().includes(w)))
    .map((r) => ({ ...r, kind: className(r.kind) ?? r.kind }));
  return (
    <>
      <FilterBox t={t} q={q} setQ={setQ} count={found?.length} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }} role="group" aria-label={t("world.skill.class")}>
        <button type="button" className="wChip" aria-pressed={!cls} onClick={() => setCls(null)}>
          {t("world.db.all")}
        </button>
        {RELEASED_CLASSES.map((c) => (
          <button key={c} type="button" className="wChip" aria-pressed={cls === c} onClick={() => setCls(c)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ClassAvatar cls={c} size={18} />
            {c}
          </button>
        ))}
      </div>
      {!found ? (
        <DataState t={t} error={rows.error} retry={rows.retry} />
      ) : found.length === 0 ? (
        <None>{t("world.db.noResults", { q: q.trim() })}</None>
      ) : (
        <DbList key={`${q}|${cls}`} t={t} rows={found} glyph={<LightningIcon />} onPick={(r) => open("skill", r.id)} />
      )}
    </>
  );
}

function SkillCard({ t, lang, rec }: { t: T; lang: string; rec: GameRecord; open: Open }) {
  const d = rec.data_json as unknown as SkillData;
  const coef = useGd(() => gd.rows<SkillCoefficient>("skill_coefficients", "skill_id", rec.id), rec.id).data?.[0];
  const effects = useGd(() => gd.rows<SkillEffect>("skill_effects", "skill_id", rec.id), rec.id);
  const levels = effects.data ?? [];
  const [level, setLevel] = useState<number | null>(null);
  const shown = levels.find((e) => e.level === level) ?? levels[0];
  const specs = d.specializations ?? [];
  const icons = useIcons([d.icon, ...specs.map((s) => s.icon)]);
  const cls = className(d.class_name);
  const sub = [cls, d.kind, d.weapon, d.acquire].filter(Boolean).join(" · ");
  const ratio = (a?: number | null, b?: number | null) =>
    a == null ? null : a === b || b == null ? `${a.toLocaleString(lang)}%` : `${a.toLocaleString(lang)}-${b.toLocaleString(lang)}%`;

  return (
    <div className="wTwo">
      <div className="wStack">
        <section className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <EntryHead name={rec.name ?? rec.id} sub={sub} icon={d.icon ? icons[d.icon] : undefined} glyph={cls ? <ClassAvatar cls={cls} size={40} /> : <LightningIcon />} />
          {d.effect && <div style={{ whiteSpace: "pre-line", lineHeight: 1.55, maxWidth: "70ch" }}>{clean(d.effect)}</div>}
          <div className="wFacts">
            <span>{t("world.skill.ratio")}</span>
            <span className="mono">{ratio(coef?.attack_ratio_min_percent, coef?.attack_ratio_max_percent) ?? <span className="wNd">{t("world.db.nd")}</span>}</span>
            <span>{t("world.skill.flat")}</span>
            <span className="mono">
              <Nd t={t} lang={lang} value={coef?.flat_min} />
              {coef?.flat_max != null && coef.flat_max !== coef.flat_min && <>-{coef.flat_max.toLocaleString(lang)}</>}
            </span>
            <span>{t("world.skill.hits")}</span>
            <span className="mono">
              <Nd t={t} lang={lang} value={coef?.hits} />
            </span>
            <span>{t("world.skill.cooldown")}</span>
            <span className="mono">
              <Nd t={t} lang={lang} value={coef?.cooldown_ms == null ? null : coef.cooldown_ms / 1000} unit=" s" />
            </span>
            <span>{t("world.skill.mp")}</span>
            <span className="mono">
              <Nd t={t} lang={lang} value={coef?.mp_cost} />
            </span>
            <span>{t("world.skill.range")}</span>
            <span className="mono">
              <Nd t={t} lang={lang} value={coef?.range_cm == null ? null : coef.range_cm / 100} unit=" m" />
            </span>
            {d.damageType && (
              <>
                <span>{t("world.skill.damageType")}</span>
                <span>{d.damageType}</span>
              </>
            )}
          </div>
        </section>
        {levels.length > 0 && (
          <Section title={t("world.skill.byLevel")}>
            <label className="field" style={{ marginBottom: 10, maxWidth: 160 }}>
              {t("world.skill.level")}
              <select className="input sm" value={shown?.level} onChange={(e) => setLevel(Number(e.target.value))}>
                {levels.map((e) => (
                  <option key={e.level} value={e.level}>
                    {e.level}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ whiteSpace: "pre-line", lineHeight: 1.55, fontSize: 13 }} aria-live="polite">
              {clean(shown?.effect) || <span className="wNd">{t("world.db.nd")}</span>}
            </div>
          </Section>
        )}
        {effects.error && <div className="error">{effects.error}</div>}
      </div>
      <Section title={d.specPick ? t("world.skill.specsPick", { n: d.specPick }) : t("world.skill.specs")}>
        {specs.length === 0 ? (
          <None>{t("world.db.none")}</None>
        ) : (
          specs.map((s) => <EntryLink key={s.id} name={s.text ?? s.id} icon={s.icon ? icons[s.icon] : undefined} glyph={<LightningIcon />} aside={s.level != null && t("world.db.lv", { n: s.level })} />)
        )}
      </Section>
    </div>
  );
}
