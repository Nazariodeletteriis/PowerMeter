import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ArrowLeftIcon, ArrowSquareOutIcon, FireIcon, MagnifyingGlassIcon, TrophyIcon, WarningCircleIcon } from "@phosphor-icons/react";
import type { T } from "../i18n";
import { ClassAvatar, EmptyState, FactionTag, RARITY, fmt } from "../ui";
import { itemById, rarityOf, statIsPct, statName, useGearData } from "./characters/gear";
import type { PageProps } from "./types";
import { DbIcon, useDb, type DbRow } from "./world/db";
import "./world/world.css";
import "./gearviewer/gear.css";
import "./armory/armory.css";

// questlog.gg/aion-2/armory: character lookup on the official armory data that
// questlog mirrors (its public tRPC API: armory.getServers / search /
// getCharacter / getTrendingProfiles / getLeaderboardSummary). Called live
// through the backend's fetch_url (no CORS in Rust), one request per user
// action, like browsing the site. Regions are whatever getServers lists (today
// Korea and Taiwan): a new region (EU/NA after the global launch) shows up by
// itself. Item, title and wing names come from our database: ids the global
// database lacks (Korea-only gear) show as their id.

const API = "https://questlog.gg/aion-2/api/trpc/";
const QL_PAGE = "https://questlog.gg/aion-2/en/armory/";
const IMG = "https://profileimg.plaync.com";

// questlog class ids → dashboard classes. fighter (Brawler) is left out: not released here.
const CLASS_OF: Record<string, string> = {
  gladiator: "Gladiator",
  templar: "Templar",
  assassin: "Assassin",
  ranger: "Ranger",
  sorcerer: "Sorcerer",
  elementalist: "Spiritmaster",
  cleric: "Cleric",
  chanter: "Chanter",
};
const FACTION: Record<string, string> = { light: "elyos", dark: "asmodian" };
// questlog content ids (rankings) → i18n suffix.
const CONTENT: Record<number, string> = { 1: "abyss", 3: "nightmare", 4: "transcendence", 5: "soloArena", 6: "teamArena", 20: "subjugation", 21: "awakening" };
const SLOT_ORDER = ["weapon", "guarder", "helmet", "shoulder", "torso", "gloves", "pants", "boots", "cape", "belt", "necklace", "leftEarring", "rightEarring", "leftRing", "rightRing", "leftBracelet", "rightBracelet", "amulet", "pendant", "leftBrooch", "rightBrooch", "leftSeal", "rightSeal", "leftRune", "rightRune"];
const slotRank = (s: string) => (SLOT_ORDER.includes(s) ? SLOT_ORDER.indexOf(s) : 99);
/** "leftEarring" → "Left Earring" (game terms stay in English, like the database). */
const slotLabel = (s: string) => s.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

type Server = { region: string; serverId: number; name: string; raceId: number };
type Profile = { region: string; characterId: string; name: string; level?: number; itemLevel?: number; raceId?: string; classId: string; profileImageUrl?: string; serverName?: string; characterName?: string; point?: number; rank?: number; contentType?: number };
type Piece = { id: string; lvl?: number; substats?: Record<string, { id: string; value: number }> };
type Character = {
  character: Profile & { lastSnapshotAt?: string };
  snapshot?: {
    equipment?: Record<string, Piece>;
    wing?: { id: number; enchant?: number };
    pet?: { id: number; level?: number };
    titles?: Record<string, { id: number }>;
    arcana?: Record<string, { id: string; lvl?: number }>;
    skills?: { isEquipped?: boolean }[];
  } | null;
};

// One GET per procedure + input, kept for the session (a failed call is dropped so Retry refetches).
const cache = new Map<string, Promise<unknown>>();
function ql<V>(proc: string, input?: object): Promise<V> {
  const url = API + proc + (input ? "?input=" + encodeURIComponent(JSON.stringify(input)) : "");
  let p = cache.get(url);
  if (!p) {
    p = invoke<string>("fetch_url", { url }).then((text) => {
      const body = JSON.parse(text);
      if (!body?.result) throw new Error(body?.error?.message ?? "questlog.gg");
      return body.result.data;
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p as Promise<V>;
}
/** A questlog call's state; `null` input = not asked yet. `retry` refetches after an error. */
function useQl<V>(proc: string, input: object | null) {
  const key = input && JSON.stringify(input);
  const [state, setState] = useState<{ key: string | null; data?: V; error?: string }>({ key: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!key) return;
    let live = true;
    ql<V>(proc, JSON.parse(key)).then(
      (data) => live && setState({ key, data }),
      (e) => live && setState({ key, error: String(e?.message ?? e) }),
    );
    return () => {
      live = false;
    };
  }, [proc, key, attempt]);
  const cur: { data?: V; error?: string } = state.key === key ? state : {};
  const retry = () => {
    setState({ key: null });
    setAttempt((n) => n + 1);
  };
  return { ...cur, loading: !!key && cur.data === undefined && !cur.error, retry };
}

const released = (p: Profile) => !!CLASS_OF[p.classId];

function Avatar({ p, size }: { p: Profile; size: number }) {
  const [broken, setBroken] = useState(false);
  if (!p.profileImageUrl || broken) return <ClassAvatar cls={CLASS_OF[p.classId]} size={size} />;
  return <img className="arAvatar" src={IMG + p.profileImageUrl} alt="" loading="lazy" onError={() => setBroken(true)} style={{ width: size, height: size }} />;
}

function Failed({ t, error, retry }: { t: T; error: string; retry: () => void }) {
  return (
    <section className="card">
      <EmptyState icon={<WarningCircleIcon aria-hidden="true" />} title={t("armory.error")} text={error}>
        <button type="button" className="btn" onClick={retry}>
          {t("armory.retry")}
        </button>
      </EmptyState>
    </section>
  );
}

export default function Armory({ t, lang, setHeader, settings, run }: PageProps) {
  const title = t("armory.title");
  const [open, setOpen] = useState<{ region: string; id: string } | null>(null);
  useEffect(() => setHeader({ title }), [setHeader, title]);

  const servers = useQl<Server[]>("armory.getServers", {});
  const regions = [...new Set((servers.data ?? []).map((s) => s.region))];
  // The dashboard region (pm.region, e.g. "global-eu") when the armory has it, else the first one listed.
  const pref = settings["pm.region"]?.split("-").pop();
  const [picked, setPicked] = useState<string>();
  const region = picked ?? (pref && regions.includes(pref) ? pref : regions[0]);

  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [serverId, setServerId] = useState("");
  const [classId, setClassId] = useState("");
  const [raceId, setRaceId] = useState("");
  const input = region && query ? { query, region, raceId: raceId || undefined, classId: classId || undefined, serverId: serverId ? Number(serverId) : undefined } : null;
  const results = useQl<Profile[]>("armory.search", input);
  const found = (results.data ?? []).filter(released);
  const trending = useQl<Profile[]>("armory.getTrendingProfiles", region && !query ? { region } : null);
  const board = useQl<Profile[]>("armory.getLeaderboardSummary", region && !query ? { region } : null);

  if (open) return <CharacterView t={t} lang={lang} region={open.region} id={open.id} onBack={() => setOpen(null)} onOpenSite={(url) => run(() => invoke("open_url", { url }))} />;
  if (servers.error) return <Failed t={t} error={servers.error} retry={servers.retry} />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setQuery(text.trim());
  };
  const pick = (p: Profile) => setOpen({ region: p.region, id: p.characterId });
  const regionServers = (servers.data ?? []).filter((s) => s.region === region && (!raceId || s.raceId === (raceId === "light" ? 1 : 2)));

  return (
    <div className="ar">
      <p className="wDbHint">{t("armory.hint")}</p>
      <div className="arRegions" role="group" aria-label={t("armory.region")}>
        {regions.map((r) => (
          <button
            key={r}
            type="button"
            className="wChip"
            aria-pressed={r === region}
            onClick={() => {
              setPicked(r);
              setServerId("");
            }}
          >
            {t(`armory.regions.${r}`) === `armory.regions.${r}` ? r.toUpperCase() : t(`armory.regions.${r}`)}
          </button>
        ))}
        {servers.loading && <span className="gvCount">{t("db.loading")}</span>}
        <span className="arNote">{t("armory.globalNote")}</span>
      </div>

      <form className="arSearch" onSubmit={submit} role="search">
        <label className="gvSearch">
          <MagnifyingGlassIcon aria-hidden="true" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("armory.placeholder")} aria-label={t("armory.placeholder")} />
        </label>
        <select className="input sm" value={raceId} onChange={(e) => (setRaceId(e.target.value), setServerId(""))} aria-label={t("armory.faction")}>
          <option value="">{t("armory.allFactions")}</option>
          <option value="light">{t("collections.elyos")}</option>
          <option value="dark">{t("collections.asmodian")}</option>
        </select>
        <select className="input sm" value={serverId} onChange={(e) => setServerId(e.target.value)} aria-label={t("armory.server")}>
          <option value="">{t("armory.allServers")}</option>
          {regionServers.map((s) => (
            <option key={s.serverId} value={s.serverId}>
              {s.name}
            </option>
          ))}
        </select>
        <select className="input sm" value={classId} onChange={(e) => setClassId(e.target.value)} aria-label={t("armory.class")}>
          <option value="">{t("armory.allClasses")}</option>
          {Object.entries(CLASS_OF).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <button type="submit" className="btn fill lg" disabled={!text.trim() || !region}>
          {t("armory.search")}
        </button>
      </form>

      {query ? (
        results.error ? (
          <Failed t={t} error={results.error} retry={results.retry} />
        ) : (
          <section className="card" aria-busy={results.loading}>
            <div className="cardHead" style={{ marginBottom: 8 }}>
              <h2 className="kicker">{t("armory.resultsFor", { q: query })}</h2>
              <button type="button" className="linkBtn" onClick={() => (setQuery(""), setText(""))}>
                {t("armory.clear")}
              </button>
            </div>
            {results.loading ? (
              <div className="arMuted">{t("db.loading")}</div>
            ) : found.length === 0 ? (
              <div className="arMuted">{t("armory.noResults")}</div>
            ) : (
              found.map((p) => <ProfileRow key={p.characterId} t={t} lang={lang} p={p} onPick={pick} />)
            )}
          </section>
        )
      ) : (
        <div className="arHome">
          <section className="card">
            <div className="cardHead" style={{ marginBottom: 8 }}>
              <h2 className="kicker arKicker">
                <FireIcon aria-hidden="true" />
                {t("armory.trending")}
              </h2>
            </div>
            {trending.error ? (
              <div className="arMuted">{trending.error}</div>
            ) : !trending.data ? (
              <div className="arMuted">{t("db.loading")}</div>
            ) : (
              trending.data.filter(released).slice(0, 10).map((p) => <ProfileRow key={p.characterId} t={t} lang={lang} p={p} onPick={pick} />)
            )}
          </section>
          <section>
            <h2 className="kicker arKicker" style={{ marginBottom: 10 }}>
              <TrophyIcon aria-hidden="true" />
              {t("armory.leaders")}
            </h2>
            {board.error ? (
              <div className="arMuted">{board.error}</div>
            ) : !board.data ? (
              <div className="arMuted">{t("db.loading")}</div>
            ) : (
              <div className="arBoards">
                {Object.entries(CONTENT).map(([id, slug]) => {
                  const top = board.data!.filter((p) => p.contentType === Number(id) && released(p)).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)).slice(0, 3);
                  return (
                    <div key={id} className="card arBoard">
                      <h3 className="arBoardTitle">{t(`armory.content.${slug}`)}</h3>
                      {top.length === 0 && <div className="arMuted">{t("db.none")}</div>}
                      {top.map((p) => (
                        <button key={p.characterId} type="button" className="wBtn arLeader" onClick={() => pick(p)}>
                          <span className="arRank mono">{p.rank}</span>
                          <Avatar p={p} size={26} />
                          <span className="arLeaderName">{p.characterName ?? p.name}</span>
                          <span className="mono arPts">{fmt(p.point ?? 0, lang)}</span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ProfileRow({ t, lang, p, onPick }: { t: T; lang: string; p: Profile; onPick: (p: Profile) => void }) {
  const faction = p.raceId && FACTION[p.raceId];
  return (
    <button type="button" className="wBtn arRow" onClick={() => onPick(p)}>
      <Avatar p={p} size={34} />
      <span style={{ minWidth: 0 }}>
        <span className="arName">{p.name}</span>
        <span className="arSub">
          {CLASS_OF[p.classId]} · {p.serverName}
        </span>
      </span>
      <span>{faction && <FactionTag faction={faction} label={t(`collections.${faction}`)} />}</span>
      <span className="mono arSub">{p.level ? t("armory.level", { n: p.level }) : ""}</span>
      <span className="mono arSub" title={t("armory.itemLevel")}>
        {p.itemLevel ? fmt(p.itemLevel, lang) : ""}
      </span>
    </button>
  );
}

function CharacterView({ t, lang, region, id, onBack, onOpenSite }: { t: T; lang: string; region: string; id: string; onBack: () => void; onOpenSite: (url: string) => void }) {
  const res = useQl<Character>("armory.getCharacter", { region, characterId: id });
  useGearData(); // stat names
  const db = useDb(["wings", "pets", "titles"]);
  const find = (type: string, x?: number | string) => (x == null ? undefined : db?.find((r) => r.type === type && r.id === String(x)));
  const back = (
    <button type="button" className="btn sm" style={{ marginBottom: 12 }} onClick={onBack}>
      <ArrowLeftIcon aria-hidden="true" />
      {t("armory.back")}
    </button>
  );
  if (res.error) return (
    <div className="ar">
      {back}
      <Failed t={t} error={res.error} retry={res.retry} />
    </div>
  );
  if (!res.data) return (
    <div className="ar">
      {back}
      <div className="arMuted">{t("db.loading")}</div>
    </div>
  );
  const c = res.data.character;
  const snap = res.data.snapshot;
  const faction = c.raceId && FACTION[c.raceId];
  const gear = Object.entries(snap?.equipment ?? {}).sort(([a], [b]) => slotRank(a) - slotRank(b));
  const titles = Object.entries(snap?.titles ?? {});
  const arcana = Object.entries(snap?.arcana ?? {});
  const named = (row: DbRow | undefined, x: number | string) => row?.name ?? t("armory.unknown", { id: String(x) });

  return (
    <div className="ar">
      {back}
      <section className="card arHead">
        <Avatar p={c} size={72} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 className="arTitle">{c.name}</h2>
          <div className="arFacts">
            <span className="arClass">
              <ClassAvatar cls={CLASS_OF[c.classId]} size={20} />
              {CLASS_OF[c.classId] ?? c.classId}
            </span>
            {c.level != null && <span>{t("armory.level", { n: c.level })}</span>}
            <span>{c.serverName}</span>
            {faction && <FactionTag faction={faction} label={t(`collections.${faction}`)} />}
          </div>
          {c.lastSnapshotAt && <div className="arSub">{t("armory.updated", { date: new Date(c.lastSnapshotAt).toLocaleString(lang) })}</div>}
        </div>
        <div className="arStat">
          <span className="kicker">{t("armory.itemLevel")}</span>
          <span className="mono arBig">{c.itemLevel ? fmt(c.itemLevel, lang) : "–"}</span>
        </div>
        <button type="button" className="btn" onClick={() => onOpenSite(QL_PAGE + region + "/" + encodeURIComponent(id))}>
          <ArrowSquareOutIcon aria-hidden="true" />
          questlog.gg
        </button>
      </section>

      {!snap ? (
        <section className="card">
          <EmptyState icon={<WarningCircleIcon aria-hidden="true" />} title={t("armory.noSnapshot")} text={t("armory.noSnapshotHint")} />
        </section>
      ) : (
        <div className="arBody">
          <section className="card">
            <h3 className="wLabel">{t("armory.equipment")}</h3>
            <div className="arGear">
              {gear.map(([slot, p]) => {
                const item = itemById(p.id);
                const col = item ? RARITY[rarityOf(item)] : "var(--pm-grey)";
                const subs = Object.values(p.substats ?? {});
                return (
                  <div key={slot} className="arPiece">
                    <span className="gvIc lg" style={{ "--c": col } as CSSProperties}>
                      <DbIcon row={item ? { ...item, type: "items" } : undefined} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className="arSub">{slotLabel(slot)}</div>
                      <div className="arPieceName" style={{ color: item ? col : "var(--pm-t2)" }}>
                        {item?.name ?? t("armory.unknown", { id: p.id })}
                        {p.lvl ? <span className="mono arEnh"> +{p.lvl}</span> : null}
                      </div>
                      {subs.length > 0 && (
                        <div className="arSubs">
                          {subs.map((s, i) => (
                            <span key={i} className="wTag">
                              {statName(s.id)} {s.value.toLocaleString(lang)}
                              {statIsPct(s.id) ? "%" : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <div className="arSide">
            <section className="card">
              <h3 className="wLabel">{t("armory.titles")}</h3>
              {titles.length === 0 && <div className="arMuted">{t("db.none")}</div>}
              {titles.map(([kind, x]) => (
                <div key={kind} className="arLine">
                  <span className="arSub">{slotLabel(kind)}</span>
                  <span>{named(find("titles", x.id), x.id)}</span>
                </div>
              ))}
            </section>
            <section className="card">
              <h3 className="wLabel">{t("armory.companions")}</h3>
              <div className="arLine">
                <span className="arSub">{t("armory.wing")}</span>
                <span>
                  {snap.wing ? named(find("wings", snap.wing.id), snap.wing.id) : "–"}
                  {snap.wing?.enchant ? <span className="mono arEnh"> +{snap.wing.enchant}</span> : null}
                </span>
              </div>
              <div className="arLine">
                <span className="arSub">{t("armory.pet")}</span>
                <span>
                  {snap.pet ? named(find("pets", snap.pet.id), snap.pet.id) : "–"}
                  {snap.pet?.level ? <span className="mono arEnh"> {t("armory.level", { n: snap.pet.level })}</span> : null}
                </span>
              </div>
              <div className="arLine">
                <span className="arSub">{t("armory.skills")}</span>
                <span className="mono">{(snap.skills ?? []).filter((s) => s.isEquipped).length}</span>
              </div>
            </section>
            {arcana.length > 0 && (
              <section className="card">
                <h3 className="wLabel">{t("armory.arcana")}</h3>
                {arcana.map(([kind, a]) => (
                  <div key={kind} className="arLine">
                    <span className="arSub">{slotLabel(kind)}</span>
                    <span>
                      {itemById(a.id)?.name ?? t("armory.unknown", { id: a.id })}
                      {a.lvl ? <span className="mono arEnh"> +{a.lvl}</span> : null}
                    </span>
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
