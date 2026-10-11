import { useState } from "react";
import { CalendarBlankIcon, CastleTurretIcon, CoinsIcon, CrownSimpleIcon, LockSimpleIcon, ShieldChevronIcon, SkullIcon, UsersIcon } from "@phosphor-icons/react";
import type { Dungeon as DungeonRow, DungeonBoss, IconUrls } from "../../data/db/types";
import type { T } from "../i18n";
import type { PageProps } from "./types";
import { DataState, EntryHead, EntryLink, GameIcon, gd, Nd, None, Section, TypePage, useGd, useIcons, type Open } from "./world/db";
import krao from "../../assets/dungeons/krao.webp";
import urugugu from "../../assets/dungeons/urugugu.webp";
import fire from "../../assets/dungeons/fire.webp";
import draupnir from "../../assets/dungeons/draupnir.webp";
import vakron from "../../assets/dungeons/vakron.webp";
import ferocious from "../../assets/dungeons/ferocious.webp";
import "./organizer/organizer.css";
import "./world/world.css";

// Dungeon page: the Expedition dungeons as cards (Exploration / Conquest tabs).
// The card of any dungeon (opened from a card, the search or an item's sources
// through openEntry) still lists every version the archive holds.

const Mode = ["exploration", "conquest"] as const;
type Mode = (typeof Mode)[number];
const MODE_KEY = "pm.dungeon.mode";

// Art: in-game screenshots from the owner (src/assets/dungeons). Ids are the archive's
// Expedition entries: Exploration, Conquest and the locked Conquest level (item level 2400-2600).
// players, kinah and cube are not in the archive: they come from the in-game Expedition window
// (Exploration tab, screenshots of 2026-10-12) and are shown on the Exploration cards only.
const EXPEDITIONS = [
  { name: "Krao Cave", art: krao, ids: ["600002", "600001", "600004"], players: "1-5", kinah: 15000, cube: 20 },
  { name: "Urugugu Canyon", art: urugugu, ids: ["600011", "600012", "600013"], players: "2-5", kinah: 18000, cube: 20 },
  { name: "Fire Temple", art: fire, ids: ["600021", "600022", "600023"], players: "1-5", kinah: 21000, cube: 30 },
  { name: "Draupnir", art: draupnir, ids: ["600031", "600032", "600033"], players: "1-5", kinah: 24000, cube: 40 },
  { name: "Vakron Sky Island", art: vakron, ids: ["600071", "600072", "600073"], players: "2-5", kinah: 30000, cube: 40 },
  { name: "Ferocious Horn Den", art: ferocious, ids: ["600091", "600092", "600093"], players: "1-5", kinah: 36000, cube: 40 },
];
type Expedition = (typeof EXPEDITIONS)[number];
// "Play Count x17, Odyle Energy Cube Kina Gain 20%": the same on every Exploration dungeon.
const RUNS = 17;
const CUBE_KINAH = 20;

/** The part of a dungeon record's data_json the cards read. */
type Rec = {
  dungeon: { minLevel?: number; itemLevel?: number; entries?: number; resetDay?: string };
  tierName?: string;
  bosses?: { name: string; level?: number }[];
  rewards?: { name: string; grade?: string; icon?: string }[];
};
const loadExpeditions = () =>
  Promise.all(EXPEDITIONS.flatMap((e) => e.ids).map((id) => gd.get("dungeon", id))).then((rs) =>
    Object.fromEntries(rs.flatMap((r) => (r ? [[r.id, r.data_json as Rec]] : []))),
  );

export default function DungeonPage({ t, lang, go, setHeader }: PageProps) {
  return (
    <TypePage
      t={t}
      go={go}
      setHeader={setHeader}
      category="dungeon"
      title={t("world.dungeon.title")}
      list={(open) => <Expeditions t={t} lang={lang} open={open} />}
      card={(id, open) => <DungeonDetail t={t} lang={lang} id={id} open={open} />}
    />
  );
}

function Expeditions({ t, lang, open }: { t: T; lang: string; open: Open }) {
  const [mode, setMode] = useState<Mode>(() => (sessionStorage.getItem(MODE_KEY) === "conquest" ? "conquest" : "exploration"));
  const recs = useGd(loadExpeditions, "expeditions");
  const conquest = mode === "conquest";
  const cards = recs.data
    ? EXPEDITIONS.map((e) => ({ e, id: e.ids[conquest ? 1 : 0], rec: recs.data![e.ids[conquest ? 1 : 0]], locked: conquest ? recs.data![e.ids[2]] : undefined }))
        .filter((c) => c.rec)
        // Conquest in the game's order: by item level (Krao, Draupnir, Urugugu, Vakron, Fire, Horn Den).
        .sort((a, b) => (conquest ? (a.rec.dungeon.itemLevel ?? 0) - (b.rec.dungeon.itemLevel ?? 0) : 0))
    : undefined;
  const icons = useIcons(cards?.flatMap((c) => c.rec.rewards?.map((r) => r.icon) ?? []) ?? []);
  const pick = (m: Mode) => {
    sessionStorage.setItem(MODE_KEY, m);
    setMode(m);
  };
  return (
    <>
      <div className="orgTabs" role="tablist" aria-label={t("world.dungeon.expedition")}>
        {Mode.map((m) => (
          <button key={m} id={`dg-${m}`} type="button" role="tab" aria-selected={m === mode} aria-controls="dg-panel" className={`orgTab dgTab ${m}`} onClick={() => pick(m)}>
            {t(`world.dungeon.${m}`)}
          </button>
        ))}
      </div>
      <div id="dg-panel" role="tabpanel" aria-labelledby={`dg-${mode}`}>
        {!cards ? (
          <DataState t={t} error={recs.error} retry={recs.retry} />
        ) : (
          <div className="dgGrid">
            {cards.map((c) => (
              <ExpeditionCard key={c.id} t={t} lang={lang} conquest={conquest} icons={icons} open={() => open("dungeon", c.id)} {...c} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ExpeditionCard({
  t,
  lang,
  e,
  rec,
  locked,
  conquest,
  icons,
  open,
}: {
  t: T;
  lang: string;
  e: Expedition;
  rec: Rec;
  locked?: Rec;
  conquest: boolean;
  icons: IconUrls;
  open: () => void;
}) {
  const d = rec.dungeon;
  const num = (n: number) => n.toLocaleString(lang);
  const tier = rec.tierName?.match(/\d+/)?.[0];
  const bossLv = rec.bosses?.[0]?.level;
  const ilvl = (n: number) => (
    <>
      <ShieldChevronIcon aria-hidden="true" />
      <span className="srOnly">{t("world.dungeon.itemLevel")}</span>
      <span className="mono">{num(n)}</span>
    </>
  );
  return (
    <article className={`dgCard${conquest ? " conquest" : ""}`}>
      <img className="dgArt" src={e.art} alt="" />
      {tier && <span className="dgTier">{t("world.dungeon.tier", { n: tier })}</span>}
      <div className="dgBody">
        <h3 className="dgName">
          <button type="button" onClick={open}>
            {e.name}
          </button>
        </h3>
        <ul className="dgChips">
          {d.minLevel != null && <li className="mono">{t("world.db.lv", { n: d.minLevel })}</li>}
          {d.itemLevel != null && <li title={t("world.dungeon.itemLevel")}>{ilvl(d.itemLevel)}</li>}
          {!conquest && (
            <li>
              <UsersIcon aria-hidden="true" />
              {t("world.dungeon.players", { n: e.players })}
            </li>
          )}
          {conquest && d.entries != null && (
            <li>
              <CalendarBlankIcon aria-hidden="true" />
              {t("world.dungeon.perWeek", { n: d.entries })}
            </li>
          )}
          {conquest && d.resetDay && <li>{t("world.dungeon.resetOn", { day: t(`world.day.${d.resetDay}`) })}</li>}
        </ul>

        {!conquest && (
          <div>
            <h4 className="wLabel dgLabel">{t("world.dungeon.weeklyReward")}</h4>
            <p className="dgText">{t("world.dungeon.cubeKina", { n: RUNS, p: CUBE_KINAH })}</p>
            <p className="dgText dgKinah">
              {t("world.dungeon.allBosses")}
              <span>
                <CoinsIcon aria-hidden="true" />
                <span className="mono">{num(e.kinah)}</span> {t("world.currency.gold")}
              </span>
            </p>
          </div>
        )}

        {!!rec.rewards?.length && (
          <div>
            <h4 className="wLabel dgLabel">
              {t("world.dungeon.cubeReward")}
              {!conquest && <span className="mono">{e.cube}</span>}
            </h4>
            <ul className="dgLoot">
              {rec.rewards.map((r) => (
                <li key={r.name} title={r.name}>
                  <GameIcon url={r.icon ? icons[r.icon] : undefined} grade={r.grade} size={32} />
                  <span className="srOnly">{r.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!!rec.bosses?.length && (
          <p className="dgText dgMuted">
            <SkullIcon aria-hidden="true" />
            <span className="srOnly">{t("world.dungeon.bosses")}: </span>
            {rec.bosses.map((b) => b.name).join(", ")}
            {bossLv != null && <span className="mono"> {t("world.db.lv", { n: bossLv })}</span>}
          </p>
        )}

        {locked?.dungeon.itemLevel != null && (
          <p className="dgText dgLocked">
            <LockSimpleIcon aria-hidden="true" />
            {t("world.dungeon.locked")}
            <span className="dgLockedVal">{ilvl(locked.dungeon.itemLevel)}</span>
            {locked.bosses?.[0]?.level != null && <span className="mono">{t("world.db.lv", { n: locked.bosses[0].level })}</span>}
          </p>
        )}
      </div>
    </article>
  );
}

/** A dungeon's own card: every version of its name the archive lists. */
function DungeonDetail({ t, lang, id, open }: { t: T; lang: string; id: string; open: Open }) {
  const data = useGd(gd.dungeons, "dungeons");
  return data.data ? <DungeonCard t={t} lang={lang} data={data.data} id={id} open={open} /> : <DataState t={t} error={data.error} retry={data.retry} />;
}

type Data = { dungeons: DungeonRow[]; bosses: DungeonBoss[] };
const groupKey = (d: DungeonRow) => d.name ?? d.dungeon_id;

function DungeonCard({ t, lang, data, id, open }: { t: T; lang: string; data: Data; id: string; open: Open }) {
  const picked = data.dungeons.find((d) => d.dungeon_id === id);
  const rec = useGd(() => gd.get("dungeon", id), id);
  if (!picked)
    return (
      <section className="card">
        <None>{t("world.db.missing")}</None>
      </section>
    );
  const entries = data.dungeons.filter((d) => groupKey(d) === groupKey(picked));
  const description = (rec.data?.data_json as { description?: string } | undefined)?.description;
  const variant = (d: DungeonRow) => [d.tier_name ?? d.tier, d.type_label].filter(Boolean).join(" · ") || d.dungeon_id;

  return (
    <div className="wStack">
      <section className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <EntryHead name={picked.name ?? picked.dungeon_id} sub={[picked.type_label, picked.location_name].filter(Boolean).join(" · ")} glyph={<CastleTurretIcon />} />
        {description && <div style={{ color: "var(--pm-t2)", whiteSpace: "pre-line", lineHeight: 1.55, maxWidth: "75ch" }}>{description}</div>}
      </section>
      <Section title={t("world.dungeon.entries", { n: entries.length })}>
        <div className="wTableWrap">
          <table className="wTable">
            <thead>
              <tr>
                <th scope="col">{t("world.dungeon.variant")}</th>
                <th scope="col">{t("world.dungeon.minLevel")}</th>
                <th scope="col">{t("world.dungeon.itemLevel")}</th>
                <th scope="col">{t("world.dungeon.weekly")}</th>
                <th scope="col">{t("world.dungeon.reset")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((d) => (
                <tr key={d.dungeon_id} aria-current={d.dungeon_id === id || undefined}>
                  <td style={{ fontFamily: "inherit", color: d.dungeon_id === id ? "var(--pm-t1)" : "var(--pm-t2)" }}>{variant(d)}</td>
                  <td>
                    <Nd t={t} lang={lang} value={d.min_level} />
                  </td>
                  <td>
                    <Nd t={t} lang={lang} value={d.item_level} />
                  </td>
                  <td>
                    <Nd t={t} lang={lang} value={d.entries} />
                  </td>
                  <td style={{ fontFamily: "inherit" }}>{d.reset_day ? t(`world.day.${d.reset_day}`) : <span className="wNd">{t("world.db.nd")}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
      <Section title={t("world.dungeon.bosses")}>
        {entries.every((d) => !data.bosses.some((b) => b.dungeon_id === d.dungeon_id)) ? (
          <None>{t("world.dungeon.noBosses")}</None>
        ) : (
          entries.map((d) => {
            const bosses = data.bosses.filter((b) => b.dungeon_id === d.dungeon_id);
            if (!bosses.length) return null;
            return (
              <div key={d.dungeon_id} style={{ marginBottom: 10 }}>
                {entries.length > 1 && <h4 className="wLabel">{variant(d)}</h4>}
                {bosses.map((b) => (
                  <EntryLink
                    key={b.boss_index}
                    glyph={b.final ? <CrownSimpleIcon /> : <SkullIcon />}
                    name={b.name ?? "?"}
                    onOpen={b.monster_id ? () => open("monster", b.monster_id!) : undefined}
                    aside={<>{b.final ? `${t("world.dungeon.final")} · ` : ""}{b.level != null ? t("world.db.lv", { n: b.level }) : t("world.db.nd")}</>}
                  />
                ))}
              </div>
            );
          })
        )}
      </Section>
    </div>
  );
}
