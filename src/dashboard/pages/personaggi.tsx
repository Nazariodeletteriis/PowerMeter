import { useRef, useState, type CSSProperties } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CopyIcon, DownloadSimpleIcon, PlusIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { NEW_CHARACTER_KEY } from "../AutoCharacter";
import { usePoll } from "../usePoll";
import { COUNTERS, ODYLE, REMEMBER_KEY } from "../../widget/counterDefs";
import { openBuild, OWN_BUILD } from "./characters/shared";
import { activate, activeId, FACTIONS, findCharacter, newId, readCharacters, saveCharacters, type Character, type Faction } from "../characters";
import { REGIONS } from "../Onboarding";
import { ClassAvatar, CLASSES, FactionTag, RELEASED_CLASSES as CLASS_OPTIONS } from "../ui";
import type { PageProps } from "./types";

const NAME_MAX_LENGTH = 32;
const regionLabel = (v: string) => REGIONS.find((r) => r.value === v)?.label ?? v;

// The character the game says you are playing (get_capture_status, as Shell.tsx reads it).
type Capture = { locked?: boolean; localPlayerId?: number | null; characterName?: string | null };
const getCapture = () => invoke<Capture>("get_capture_status");
// Odyle first (the one with the bar), then the meter's order.
const CARD_COUNTERS = [...COUNTERS].sort(([a], [b]) => Number(b === ODYLE) - Number(a === ODYLE));

/** The counters the meter last read for this character (src/widget/charBar.ts), id → [base, charged]. */
function readCounters(name: string): Record<string, [number, number]> {
  try {
    const saved = JSON.parse(localStorage.getItem(REMEMBER_KEY + name) ?? "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
}
const isPair = (v: unknown): v is [number, number] => Array.isArray(v) && Number.isFinite(v[0]) && Number.isFinite(v[1]);

// A character from an imported file, or null if it is not one.
function parse(x: unknown): Character | null {
  const c = x as Partial<Character>;
  if (!c || typeof c.name !== "string" || !c.name.trim() || typeof c.cls !== "string" || !CLASS_OPTIONS.includes(c.cls)) return null;
  return {
    id: newId(),
    name: c.name.trim().slice(0, NAME_MAX_LENGTH),
    cls: c.cls,
    region: typeof c.region === "string" && REGIONS.some((r) => r.value === c.region) ? c.region : REGIONS[0].value,
    faction: FACTIONS.includes(c.faction as Faction) ? c.faction : undefined,
    level: typeof c.level === "number" ? c.level : undefined,
    cp: typeof c.cp === "number" ? c.cp : undefined,
    gs: typeof c.gs === "number" ? c.gs : undefined,
  };
}

export default function Personaggi({ t, lang, settings, save, run, go }: PageProps) {
  const list = readCharacters(settings);
  const active = activeId(settings, list);
  const capture = usePoll(getCapture, 2000).data;
  const playingName = capture?.locked && capture.localPlayerId != null ? capture.characterName?.trim() : undefined;
  // By id: two characters can share a name (regions), and only one is in game: the active one if it has that name.
  const activeChar = list.find((c) => c.id === active);
  const playingId = !playingName ? undefined : findCharacter(activeChar ? [activeChar] : [], playingName)?.id ?? findCharacter(list, playingName)?.id;
  // The meter remembers counters by name (charBar.ts): with a shared name they belong to one card only, the one in
  // game, else the active one; the others say they have none rather than show another character's.
  const countersOf = (c: Character) => {
    const twins = list.filter((x) => x.name.trim().toLowerCase() === c.name.trim().toLowerCase());
    const owner = twins.find((x) => x.id === playingId) ?? twins.find((x) => x.id === active);
    return twins.length > 1 && owner?.id !== c.id ? {} : readCounters(c.name);
  };
  const num = (n: number) => n.toLocaleString(lang);
  const factionName = (f: string) => t(`collections.${f}`);
  // Coming from the "create the character you are playing" prompt (AutoCharacter): open the form with its name.
  const [fromGame] = useState(() => {
    const name = sessionStorage.getItem(NEW_CHARACTER_KEY) ?? "";
    sessionStorage.removeItem(NEW_CHARACTER_KEY);
    return name.slice(0, NAME_MAX_LENGTH);
  });
  const [adding, setAdding] = useState(!!fromGame);
  const [draft, setDraft] = useState({ name: fromGame, cls: settings["pm.class"] || CLASS_OPTIONS[0], region: settings["pm.region"] || REGIONS[0].value, faction: "" as Faction | "", level: "" });
  const file = useRef<HTMLInputElement>(null);

  const store = (next: Character[]) => run(() => saveCharacters(save, next));

  const add = () => {
    const name = draft.name.trim();
    if (!name) return;
    const level = Number(draft.level);
    if (!name || !draft.faction) return;
    const c: Character = { id: newId(), name, cls: draft.cls, region: draft.region, faction: draft.faction, level: level > 0 ? level : undefined };
    run(async () => {
      await saveCharacters(save, [...list, c]);
      // The first character becomes active on its own.
      if (!list.length) await activate(save, c);
    });
    setDraft({ ...draft, name: "", faction: "", level: "" });
    setAdding(false);
  };

  const setFaction = (c: Character, faction: Faction) => store(list.map((x) => (x.id === c.id ? { ...x, faction } : x)));

  const remove = (c: Character) => {
    if (!window.confirm(t("roster.deleteConfirm", { name: c.name }))) return;
    const next = list.filter((x) => x.id !== c.id);
    run(async () => {
      await saveCharacters(save, next);
      if (c.id === active && next[0]) await activate(save, next[0]);
    });
  };

  // WebView2 ignores <a download>: the backend writes it to Downloads and shows it.
  const exportList = () =>
    run(() => invoke("save_to_downloads", { name: "powermeter-characters.json", contents: JSON.stringify(list.map(({ id: _, ...c }) => c), null, 2) }));

  const importList = async (f: File) => {
    let data: unknown;
    try {
      data = JSON.parse(await f.text());
    } catch {
      data = null;
    }
    const found = (Array.isArray(data) ? data : [data]).map(parse).filter((c): c is Character => !!c);
    if (!found.length) {
      window.alert(t("roster.importError"));
      return;
    }
    store([...list, ...found]);
  };

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button type="button" className="btn fill" aria-expanded={adding} onClick={() => setAdding(!adding)}>
          <PlusIcon aria-hidden="true" />
          {t("characters.add")}
        </button>
        <button type="button" className="btn" onClick={() => file.current?.click()}>
          <DownloadSimpleIcon aria-hidden="true" />
          {t("characters.import")}
        </button>
        <button type="button" className="btn" disabled={!list.length} onClick={exportList}>
          <UploadSimpleIcon aria-hidden="true" />
          {t("characters.export")}
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) importList(f);
          }}
        />
      </div>

      {adding && (
        <form
          className="chCharCard"
          style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14, background: "var(--pm-s1)", border: "1px solid var(--pm-line)", borderRadius: 8, padding: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label className="field" style={{ flex: "2 1 180px" }}>
            {t("char.name")}
            <input className="input" required autoFocus maxLength={NAME_MAX_LENGTH} autoComplete="off" spellCheck={false} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label className="field" style={{ flex: "1 1 140px" }}>
            {t("char.class")}
            <select className="input" value={draft.cls} onChange={(e) => setDraft({ ...draft, cls: e.target.value })}>
              {CLASS_OPTIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field" style={{ flex: "1 1 120px" }}>
            {t("char.region")}
            <select className="input" value={draft.region} onChange={(e) => setDraft({ ...draft, region: e.target.value })}>
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field" style={{ flex: "1 1 120px" }}>
            {t("roster.faction")}
            <select className="input" required value={draft.faction} onChange={(e) => setDraft({ ...draft, faction: e.target.value as Faction })}>
              <option value="" disabled>
                {t("roster.pickFaction")}
              </option>
              {FACTIONS.map((f) => (
                <option key={f} value={f}>
                  {factionName(f)}
                </option>
              ))}
            </select>
          </label>
          <label className="field" style={{ flex: "0 1 90px" }}>
            {t("roster.level")}
            <input className="input" type="number" min={1} max={99} value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value })} />
          </label>
          <button type="submit" className="btn fill">
            {t("characters.save")}
          </button>
          <button type="button" className="btn" onClick={() => setAdding(false)}>
            {t("roster.cancel")}
          </button>
        </form>
      )}

      {!list.length && !adding && <p style={{ color: "var(--pm-t3)", fontSize: 13 }}>{t("roster.empty")}</p>}

      <div className="chRoster">
        {list.map((c) => {
          const isActive = c.id === active;
          const isPlaying = c.id === playingId;
          const counts = countersOf(c);
          return (
            <section
              key={c.id}
              className={`chCharCard chRosterCard${isActive ? " isActive" : ""}`}
              style={{ "--c": CLASSES[c.cls]?.[1] ?? "var(--pm-grey)" } as CSSProperties}
              aria-label={c.name}
              // Bug 4: a click anywhere on the card opens the character's build; its own controls keep their action.
              // Keyboard users reach the same through the name button.
              onClick={(e) => !(e.target as HTMLElement).closest("button,select,input,a,label") && openBuild({ t: OWN_BUILD, au: c.name, cls: c.cls, own: true, char: c.id }, go)}
            >
              <div className="chRosterHead">
                <ClassAvatar cls={c.cls} size={40} />
                <div className="chRosterId">
                  <h2>
                    <button
                      type="button"
                      className="linkBtn chCardName"
                      title={t("nav.builder")}
                      onClick={() => openBuild({ t: OWN_BUILD, au: c.name, cls: c.cls, own: true, char: c.id }, go)}
                    >
                      {c.name}
                    </button>
                  </h2>
                  <div className="chRosterMeta">
                    <span className="chRosterCls">{c.cls}</span>
                    {c.level ? ` · ${t("characters.level", { n: c.level })}` : ""}
                    {` · ${regionLabel(c.region)}`}
                  </div>
                  {c.faction ? (
                    <div className="chRosterFaction">
                      <FactionTag faction={c.faction} label={factionName(c.faction)} size={12} />
                    </div>
                  ) : (
                    <select
                      className="input chRosterPick"
                      aria-label={t("roster.faction")}
                      value=""
                      onChange={(e) => setFaction(c, e.target.value as Faction)}
                    >
                      <option value="" disabled>
                        {t("roster.pickFaction")}
                      </option>
                      {FACTIONS.map((f) => (
                        <option key={f} value={f}>
                          {factionName(f)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="chRosterTags">
                  {isPlaying && <span className="chPlayingTag">{t("characters.playing")}</span>}
                  {isActive && <span className="chActiveTag">{t("characters.active")}</span>}
                </div>
              </div>

              {!!(c.cp || c.gs) && (
                <div className="chRosterStats">
                  {!!c.cp && (
                    <span className="chStat isCp" title={t("characters.cp")}>
                      <abbr aria-label={t("characters.cp")}>CP</abbr> {num(c.cp)}
                    </span>
                  )}
                  {!!c.gs && (
                    <span className="chStat" title={t("characters.gs")}>
                      <abbr aria-label={t("characters.gs")}>GS</abbr> {num(c.gs)}
                    </span>
                  )}
                </div>
              )}

              {Object.keys(counts).length ? (
                <ul className="chCounters" aria-label={t("overlays.counters")}>
                  {CARD_COUNTERS.map(([id, max, key, fallback, icon]) => {
                    const v = counts[id];
                    const known = isPair(v);
                    const label = t(`overlays.${key}`) || fallback;
                    const value = known ? num(v[0]) : "–";
                    return (
                      <li key={id} className={id === ODYLE ? "chCounter isOdyle" : "chCounter"}>
                        <img src={icon} alt="" />
                        <span className="chCounterName">{label}</span>
                        <span className="chCounterValue">
                          {value}
                          {known && v[1] > 0 && <span className="chCounterPlus"> (+{num(v[1])})</span>}
                          {max !== null && <span className="chCounterMax">/{num(max)}</span>}
                        </span>
                        {id === ODYLE && max !== null && (
                          <span className="chCounterBar" aria-hidden="true">
                            <span style={{ width: `${known ? Math.min(100, (v[0] / max) * 100) : 0}%` }} />
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="chCountersNone">{t("characters.countersNone")}</p>
              )}

              <div className="chRosterActions">
                {!isActive && (
                  <button type="button" className="btn sm" onClick={() => run(() => activate(save, c))}>
                    {t("characters.setActive")}
                  </button>
                )}
                <div style={{ flex: 1 }} />
                <button
                  type="button"
                  className="chCardIcon"
                  title={t("characters.duplicate")}
                  aria-label={t("characters.duplicate")}
                  onClick={() => store([...list, { ...c, id: newId(), name: `${c.name} (2)`.slice(0, NAME_MAX_LENGTH) }])}
                >
                  <CopyIcon aria-hidden="true" />
                </button>
                <button type="button" className="chCardIcon" title={t("characters.delete")} aria-label={t("characters.delete")} onClick={() => remove(c)}>
                  <TrashIcon aria-hidden="true" />
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
