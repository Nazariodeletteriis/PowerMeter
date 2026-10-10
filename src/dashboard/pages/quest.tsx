import { ScrollIcon } from "@phosphor-icons/react";
import type { GameRecord, QuestCurrencyReward, QuestItemReward } from "../../data/db/types";
import type { T } from "../i18n";
import type { PageProps } from "./types";
import { EntryHead, EntryLink, gd, Nd, None, RecordCard, Section, TypePage, useGd, useIcons, type Open } from "./world/db";
import "./world/world.css";

type Npc = { id: string; name: string; title?: string };
type QuestRef = { id: string; name: string; level?: number };
type QuestData = {
  quest: { name?: string; category?: string; level?: number; race?: string; zone?: string };
  rewards?: { items?: { code: string; grade?: string; icon?: string }[] };
  summary?: string;
  description?: string;
  steps?: { title?: string; goals?: { text?: string }[] }[];
  chain?: { previous?: QuestRef[]; next?: QuestRef[] };
  startNpc?: Npc;
  endNpc?: Npc;
};

export default function Quest({ t, lang, go, setHeader }: PageProps) {
  return (
    <TypePage
      t={t}
      go={go}
      setHeader={setHeader}
      category="quest"
      title={t("world.quest.title")}
      glyph={<ScrollIcon />}
      card={(id, open) => <RecordCard t={t} category="quest" id={id}>{(r) => <QuestCard t={t} lang={lang} rec={r} open={open} />}</RecordCard>}
    />
  );
}

function QuestCard({ t, lang, rec, open }: { t: T; lang: string; rec: GameRecord; open: Open }) {
  const d = rec.data_json as unknown as QuestData;
  const q = d.quest;
  const items = useGd(() => gd.rows<QuestItemReward>("quest_item_rewards", "quest_id", rec.id), rec.id);
  const money = useGd(() => gd.rows<QuestCurrencyReward>("quest_currency_rewards", "quest_id", rec.id), rec.id);
  // Grade and icon of reward items come from the record's own list.
  const itemOf = new Map((d.rewards?.items ?? []).map((i) => [i.code, i]));
  const icons = useIcons([...itemOf.values()].map((i) => i.icon));
  const sub = [q.category, q.level != null && t("world.db.lv", { n: q.level }), q.race && q.race !== "All" && t(`world.race.${q.race}`), q.zone].filter(Boolean).join(" · ");
  const fixed = items.data?.filter((r) => r.reward_kind !== "choice") ?? [];
  const choice = items.data?.filter((r) => r.reward_kind === "choice") ?? [];
  const reward = (r: QuestItemReward, i: number) => {
    const it = itemOf.get(r.item_code);
    return (
      <EntryLink
        key={i}
        name={r.name ?? r.item_code}
        grade={it?.grade}
        icon={it?.icon ? icons[it.icon] : undefined}
        onOpen={() => open("item", r.item_code)}
        aside={<>×<Nd t={t} lang={lang} value={r.quantity} /></>}
      />
    );
  };
  const chain = [...(d.chain?.previous ?? []).map((c) => [c, "world.quest.previous"] as const), ...(d.chain?.next ?? []).map((c) => [c, "world.quest.next"] as const)];

  return (
    <div className="wTwo">
      <div className="wStack">
        <section className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <EntryHead name={rec.name ?? q.name ?? rec.id} sub={sub} glyph={<ScrollIcon />} />
          {d.summary && <div style={{ fontWeight: 500 }}>{d.summary}</div>}
          {d.description && <div style={{ color: "var(--pm-t2)", whiteSpace: "pre-line", lineHeight: 1.55, maxWidth: "70ch" }}>{d.description}</div>}
          {(d.startNpc || d.endNpc) && (
            <div className="wFacts">
              {d.startNpc && (
                <>
                  <span>{t("world.quest.start")}</span>
                  <span>{d.startNpc.name}</span>
                </>
              )}
              {d.endNpc && (
                <>
                  <span>{t("world.quest.end")}</span>
                  <span>{d.endNpc.name}</span>
                </>
              )}
            </div>
          )}
        </section>
        {(d.steps?.length ?? 0) > 0 && (
          <Section title={t("world.quest.steps")}>
            <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              {d.steps!.map((s, i) => (
                <li key={i}>
                  <div>{s.title}</div>
                  {s.goals?.map((g, j) => g.text && (
                    <div key={j} style={{ color: "var(--pm-t2)", fontSize: 12 }}>
                      {g.text}
                    </div>
                  ))}
                </li>
              ))}
            </ol>
          </Section>
        )}
      </div>
      <div className="wStack">
        <Section title={t("world.quest.rewards")}>
          {items.error && <div className="error">{items.error}</div>}
          {items.data && fixed.length + choice.length === 0 && (money.data?.length ?? 0) === 0 && <None>{t("world.quest.noRewards")}</None>}
          {fixed.map(reward)}
          {choice.length > 0 && (
            <>
              <h4 className="wLabel" style={{ marginTop: 10 }}>
                {t("world.quest.choice")}
              </h4>
              {choice.map(reward)}
            </>
          )}
          {(money.data ?? []).map((m, i) => (
            <div key={i} className="wLink" style={{ justifyContent: "space-between" }}>
              <span>{t(`world.currency.${m.currency_kind}`)}</span>
              <span className="mono" style={{ fontSize: 12 }}>
                <Nd t={t} lang={lang} value={m.quantity} />
              </span>
            </div>
          ))}
        </Section>
        {chain.length > 0 && (
          <Section title={t("world.quest.chain")}>
            {chain.map(([c, label]) => (
              <EntryLink key={c.id} glyph={<ScrollIcon />} name={c.name} onOpen={() => open("quest", c.id)} aside={t(label)} />
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}
