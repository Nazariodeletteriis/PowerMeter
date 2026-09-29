import { useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CopyIcon, DownloadSimpleIcon, PlusIcon, TrashIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { OWN_BUILD } from "./characters/gear";
import { openBuild } from "./characters/shared";
import { activate, activeId, FACTIONS, newId, readCharacters, saveCharacters, type Character, type Faction } from "../characters";
import { REGIONS } from "../Onboarding";
import { ClassAvatar, FactionTag, fmt, RELEASED_CLASSES as CLASS_OPTIONS } from "../ui";
import type { PageProps } from "./types";

const NAME_MAX_LENGTH = 32;
const regionLabel = (v: string) => REGIONS.find((r) => r.value === v)?.label ?? v;

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
  };
}

export default function Personaggi({ t, lang, settings, save, run, go }: PageProps) {
  const list = readCharacters(settings);
  const active = activeId(settings, list);
  const factionName = (f: string) => t(`collections.${f}`);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", cls: settings["pm.class"] || CLASS_OPTIONS[0], region: settings["pm.region"] || REGIONS[0].value, faction: "" as Faction | "", level: "" });
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
        {list.map((c) => {
          const isActive = c.id === active;
          return (
            <section
              key={c.id}
              className="chCharCard"
              aria-label={c.name}
              style={{
                background: "var(--pm-s1)",
                border: `1px solid ${isActive ? "var(--pm-red)" : "var(--pm-line)"}`,
                borderRadius: 8,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ClassAvatar cls={c.cls} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontWeight: 500, fontSize: 15 }}>
                    <button
                      type="button"
                      className="linkBtn chCardName"
                      title={t("nav.builder")}
                      onClick={() => openBuild({ t: OWN_BUILD, au: c.name, cls: c.cls, own: true, char: c.id }, go)}
                    >
                      {c.name}
                    </button>
                  </h2>
                  <div style={{ fontSize: 11, color: "var(--pm-t3)" }}>
                    {[c.cls, c.level && `Lv ${c.level}`, regionLabel(c.region)].filter(Boolean).join(" · ")}
                  </div>
                  {c.faction ? (
                    <div style={{ fontSize: 11, marginTop: 3 }}>
                      <FactionTag faction={c.faction} label={factionName(c.faction)} size={12} />
                    </div>
                  ) : (
                    <select
                      className="input"
                      aria-label={t("roster.faction")}
                      value=""
                      style={{ marginTop: 4, height: 26, fontSize: 11, padding: "0 6px", borderColor: "var(--pm-red)" }}
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
                {isActive && <span className="chActiveTag">{t("characters.active")}</span>}
              </div>
              <div className="mono" style={{ fontSize: 24 }}>
                {c.cp ? fmt(c.cp, lang) : "—"} <span style={{ fontSize: 11, color: "var(--pm-t3)", fontFamily: "Inter,sans-serif" }}>CP</span>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
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
