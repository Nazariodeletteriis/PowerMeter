import { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  CaretDownIcon,
  ChatCircleIcon,
  CopyIcon,
  FloppyDiskIcon,
  LightningIcon,
  PencilSimpleIcon,
  PlusCircleIcon,
  PlusIcon,
  ShareNetworkIcon,
  TextAlignLeftIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { REGIONS } from "../Onboarding";
import { classSkills, planClass, SkillIcon } from "../skills";
import { art, ClassAvatar, CLASSES, FactionTag } from "../ui";
import { activeId, readCharacters } from "../characters";
import { BUILD_TAGS, closeBuild, DANGER, DeleteBuildModal, MY_BUILDS_KEY, OWN_BUILD, readMyBuilds, useMem, useToast, type BuildSrc } from "./characters/shared";
import States from "./shared/States";
import { ShareModal } from "./shared/ShareModal";
import { Modal } from "./system/Modal";
import type { PageProps } from "./types";

// Equipment, stats and Gear Score wait for official game data (States, left column).
const TABS = [
  ["skills", LightningIcon],
  ["desc", TextAlignLeftIcon],
  ["comm", ChatCircleIcon],
] as const;

// Prototype pg.builder (pBuilder + pX + pBRO).
export default function Builder({ t, lang, name, go, onError, setHeader, settings, save: saveSetting }: PageProps) {
  // New and default builds use the active character's class (onboarding).
  const myCls = planClass(settings["pm.class"]);
  const chars = readCharacters(settings);
  const [src, setSrc] = useMem<BuildSrc>("bSrc", { t: OWN_BUILD, au: name, cls: myCls, own: true });
  const faction = chars.find((c) => c.id === (src.char ?? activeId(settings, chars)))?.faction;
  // Your own build follows the active character: switching character re-targets it
  // (not one opened from a character's card: looking at it must not change anything).
  useEffect(() => {
    if (src.own && !src.isNew && !src.char && src.cls !== myCls) setSrc({ ...src, cls: myCls });
  }, [myCls]); // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useMem("ctab", "skills");
  const [newName, setNewName] = useMem("newName", "");
  const [newTags, setNewTags] = useMem<string[]>("newTags", []);
  // Builds created or cloned here, listed under "Your builds" (builds.tsx); one per title.
  const myBuilds = readMyBuilds(settings[MY_BUILDS_KEY]);
  const addMine = (b: BuildSrc) => saveSetting(MY_BUILDS_KEY, JSON.stringify([b, ...myBuilds.filter((x) => x.t !== b.t)])).catch(onError);
  const [bOpen, setBOpen] = useState(false);
  const [share, setShare] = useState(false);
  const [noClone, setNoClone] = useState(false);
  const [del, setDel] = useState(false);
  // Rename field of a build of yours, tied to the title it was typed for (any other build shows its own title).
  const [draft, setDraft] = useState({ of: "", v: "" });
  const nameField = draft.of === src.t ? draft.v : src.t;
  const [toast, showToast] = useToast();

  const isNew = !!src.isNew;
  // Created or cloned here: renamable and deletable (the default own build is neither).
  const isMine = src.own && !isNew && myBuilds.some((x) => x.t === src.t);
  // The name Save would give it; titles are keys, so no two builds share one.
  const typed = (isNew ? newName || t("characters.builder.newBuild") : nameField).trim();
  const nameTaken = typed !== src.t && (typed === OWN_BUILD || myBuilds.some((x) => x.t === typed));
  const badName = (isNew || isMine) && (!typed || nameTaken);
  const [, clsCol] = CLASSES[src.cls];
  // Your builds of the active character's class, the default one first (the "my builds" menu).
  const ownList: BuildSrc[] = [{ t: OWN_BUILD, au: name, cls: myCls, own: true }, ...myBuilds.filter((x) => x.cls === myCls)];
  const ownIdx = src.own && !isNew ? ownList.findIndex((x) => x.t === src.t) : -1;
  const titleOf = (b: string) => (b === OWN_BUILD ? t("characters.builder.defaultBuild") : b);
  const title = isNew ? newName || t("characters.builder.newBuild") : titleOf(src.t);
  const crumb = t("shell.crumb.builder");
  useEffect(() => setHeader({ title, crumb }), [setHeader, title, crumb]);

  // Share: the build as text (links wait for the uploads, R2).
  const shareText = [`${title} — ${src.cls} · ${name}`, "PowerMeter"].join("\n");

  const copySuffix = t("characters.builder.copySuffix");
  const clone = () => {
    // Only a build of the active character's class can become one of yours.
    if (src.cls !== myCls) return setNoClone(true);
    showToast({ title: t("characters.builder.clonedTitle"), text: t("characters.builder.clonedText") });
    const base = titleOf(src.t);
    const copy = (base.endsWith(copySuffix) ? base.slice(0, -copySuffix.length) : base) + copySuffix;
    const mine = { t: copy, au: name, cls: src.cls, own: true, tags: src.tags };
    addMine(mine);
    setSrc(mine);
  };
  const save = () => {
    if (badName) return;
    showToast(
      isNew
        ? { title: t("characters.builder.createdTitle"), text: t("characters.builder.createdText") }
        : { title: t("characters.builder.savedTitle"), text: t("characters.builder.savedText") },
    );
    if (isNew) {
      const mine = { t: typed, au: name, cls: src.cls, own: true, tags: newTags };
      addMine(mine);
      setSrc(mine);
    } else if (isMine && typed !== src.t) {
      // Rename: same place in "Your builds".
      const renamed = { ...src, t: typed };
      saveSetting(MY_BUILDS_KEY, JSON.stringify(myBuilds.map((x) => (x.t === src.t ? renamed : x)))).catch(onError);
      setSrc(renamed);
    }
  };
  /** Delete this build of yours (after the modal) and go back to the list. */
  const remove = () => {
    closeBuild(src.t);
    saveSetting(MY_BUILDS_KEY, JSON.stringify(myBuilds.filter((x) => x.t !== src.t))).catch(onError);
    go("builds");
  };

  return (
    <>
      <div className="chToolbar">
        <button type="button" className="btn sm" onClick={() => go("builds")}>
          <ArrowLeftIcon aria-hidden="true" />
          {t("characters.builder.back")}
        </button>
        <span className="chRegion">{(REGIONS.find((r) => r.value === settings["pm.region"]) ?? REGIONS[0]).label}</span>
        <span className="chMiniClass" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--pm-t2)" }}>
          <ClassAvatar cls={src.cls} size={22} />
          {src.cls}
        </span>
        {/* No comment system yet, so there are none to count. */}
        <span style={{ fontSize: 12, color: "var(--pm-t3)" }} aria-label={t("characters.builder.comments", { n: 0 })}>
          <ChatCircleIcon aria-hidden="true" style={{ verticalAlign: "-2px" }} /> 0
        </span>
        <div style={{ flex: 1 }} />
        <button type="button" className="btn sm" onClick={clone}>
          <CopyIcon aria-hidden="true" />
          {t("characters.duplicate")}
        </button>
        <button type="button" className="btn sm" onClick={() => setShare(true)}>
          <ShareNetworkIcon aria-hidden="true" />
          {t("characters.share.button")}
        </button>
        <button type="button" className="btn sm fill" style={{ padding: "0 12px" }} disabled={badName} onClick={save}>
          <FloppyDiskIcon aria-hidden="true" />
          {isNew ? t("characters.builds.create") : t("characters.save")}
        </button>
      </div>

      {isNew && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "10px 14px", margin: "-4px 0 12px", borderRadius: 8, background: "var(--pm-tint)", border: "1px solid var(--pm-red)" }}>
          <PlusCircleIcon aria-hidden="true" style={{ fontSize: 18, color: "var(--pm-redt)", flex: "none" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{t("characters.builder.newBuild")}</div>
            <div style={{ fontSize: 12, color: "var(--pm-t2)" }}>{t("characters.builder.newText")}</div>
          </div>
          <input
            className="input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("characters.builder.namePlaceholder")}
            aria-label={t("characters.builder.namePlaceholder")}
            style={{ height: 32, width: 220 }}
          />
          {nameTaken && <NameTaken t={t} />}
          <div role="group" aria-label={t("characters.builds.tag")} style={{ flexBasis: "100%", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5, paddingLeft: 30 }}>
            <span className="kicker" style={{ marginRight: 4 }}>{t("characters.builds.tag")}</span>
            {BUILD_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className="chChip"
                aria-pressed={newTags.includes(tag)}
                onClick={() => setNewTags(newTags.includes(tag) ? newTags.filter((x) => x !== tag) : [...newTags, tag])}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
      {isMine && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "10px 14px", margin: "-4px 0 12px", borderRadius: 8, background: "var(--pm-s1)", border: "1px solid var(--pm-line)", boxShadow: "inset 3px 0 0 var(--pm-red)" }}>
          <PencilSimpleIcon aria-hidden="true" style={{ fontSize: 18, color: "var(--pm-redt)", flex: "none" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{t("characters.builder.editTitle")}</div>
            <div style={{ fontSize: 12, color: "var(--pm-t2)" }}>{t("characters.builder.editText")}</div>
          </div>
          <input
            className="input"
            value={nameField}
            onChange={(e) => setDraft({ of: src.t, v: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder={t("characters.builder.namePlaceholder")}
            aria-label={t("characters.builder.namePlaceholder")}
            aria-invalid={badName}
            style={{ height: 32, width: 260 }}
          />
          {/* Here, not in the toolbar: one more button there wraps it onto two rows. */}
          <button type="button" className="btn" style={DANGER} onClick={() => setDel(true)}>
            <TrashIcon aria-hidden="true" />
            {t("characters.delete")}
          </button>
          {nameTaken && <NameTaken t={t} />}
        </div>
      )}
      {toast}

      {/* Header band: class, title, "my builds" menu. */}
      {/* Only the decoration is clipped (the prototype clipped the whole band, cutting off the "my builds" menu). */}
      <div style={{ position: "relative", borderRadius: 10, marginBottom: 12, background: "linear-gradient(100deg,var(--pm-s2) 0%,var(--pm-s1) 55%,var(--pm-bg) 100%)", border: "1px solid var(--pm-line)" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: "inherit", overflow: "hidden", pointerEvents: "none" }}>
          <div style={{ position: "absolute", inset: "0 0 auto 0", height: 2, background: "linear-gradient(90deg,transparent,#DB0000 20%,#DB0000 60%,transparent)" }} />
          <div style={{ position: "absolute", right: -60, top: -80, width: 360, height: 360, background: "radial-gradient(circle,rgba(219,0,0,.16),transparent 65%)" }} />
        </div>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 18, padding: "16px 20px", flexWrap: "wrap" }}>
          <div style={{ width: 56, height: 56, transform: "rotate(45deg)", borderRadius: 10, border: `1.5px solid ${clsCol}`, background: `${clsCol}1a`, display: "grid", placeItems: "center", flex: "none" }}>
            <div title={src.cls} style={{ transform: "rotate(-45deg)", width: 34, height: 34, background: art(src.cls) ? `url(${art(src.cls)}) center/contain no-repeat` : undefined }} />
          </div>
          <div style={{ position: "relative", minWidth: 0 }}>
            <button type="button" className="chBtnReset" aria-expanded={bOpen} onClick={() => setBOpen(!bOpen)} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-.015em" }}>{title}</span>
              <CaretDownIcon aria-hidden="true" style={{ color: "var(--pm-t3)" }} />
            </button>
            <div style={{ fontSize: 12, color: "var(--pm-t2)" }}>
              {name} · {src.cls}
              {faction && (
                <>
                  {" · "}
                  <FactionTag faction={faction} label={t(`collections.${faction}`)} />
                </>
              )}
              {ownIdx >= 0 && ` · ${t("characters.builder.buildOf", { i: ownIdx + 1, n: ownList.length })}`}
            </div>
            {bOpen && (
              <div className="chPop" style={{ left: 0, top: 52, zIndex: 6, width: 280, padding: 6, gap: 4 }}>
                {ownList.map((mb) => (
                  <button
                    key={mb.t}
                    type="button"
                    className="chBtnReset chMyBuild"
                    aria-current={mb.t === src.t && !isNew ? "true" : undefined}
                    style={{ borderColor: mb.t === src.t && !isNew ? "var(--pm-red)" : undefined }}
                    onClick={() => {
                      setBOpen(false);
                      setSrc(mb);
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 500 }}>{titleOf(mb.t)}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="chBtnReset"
                  style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 34, padding: "0 10px", color: "var(--pm-redt)", fontSize: 12 }}
                  onClick={() => {
                    // Same reset as "Crea build" (openBuild), applied in place.
                    setBOpen(false);
                    setSrc({ t: "", au: name, cls: myCls, own: true, isNew: true });
                    setNewName("");
                    setNewTags([]);
                  }}
                >
                  <PlusIcon aria-hidden="true" />
                  {t("characters.builder.newBuild")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(380px,1fr)", gap: 12, alignItems: "start" }}>
        <States t={t} />
        <div style={{ background: "var(--pm-s1)", border: "1px solid var(--pm-line)", borderRadius: 8, minWidth: 0, display: "flex", position: "sticky", top: 0 }}>
          <div role="tablist" aria-orientation="vertical" style={{ width: 48, flex: "none", borderRight: "1px solid var(--pm-line)", display: "flex", flexDirection: "column", gap: 4, padding: "8px 6px" }}>
            {TABS.map(([id, Icon]) => {
              const label = t(`characters.builder.tab.${id}`, { n: 0 });
              return (
                <button key={id} type="button" role="tab" aria-selected={tab === id} className="chRailBtn" title={label} aria-label={label} onClick={() => setTab(id)}>
                  <Icon aria-hidden="true" />
                </button>
              );
            })}
          </div>
          <div role="tabpanel" style={{ flex: 1, minWidth: 0 }}>
            {tab === "skills" && (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 12, color: "var(--pm-t2)" }}>{t("characters.builder.linkedSkills")}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {classSkills(src.cls)
                    .filter((sk) => sk.type === "Active")
                    .map((sk) => (
                      <span key={sk.id} title={sk.name} style={{ width: 40, height: 40, borderRadius: 6, background: "var(--pm-s2)", boxShadow: "0 0 0 1px var(--pm-line)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 600 }}>
                        <SkillIcon skill={sk} name={sk.name} />
                      </span>
                    ))}
                </div>
                <div>
                  <button type="button" className="btn sm" onClick={() => go("skillplan")}>
                    {t("characters.builder.openSkillPlanner")}
                  </button>
                </div>
              </div>
            )}
            {tab === "desc" && (
              <div style={{ padding: 16 }}>
                <textarea
                  placeholder={t("characters.builder.descPlaceholder")}
                  aria-label={t("characters.builder.tab.desc")}
                  style={{ width: "100%", minHeight: 200, boxSizing: "border-box", padding: 10, borderRadius: 6, border: "1px solid var(--pm-line)", background: "var(--pm-s2)", color: "var(--pm-t1)", font: "inherit", resize: "vertical" }}
                />
              </div>
            )}
            {tab === "comm" && (
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* Comments need the server (shared builds): visible empty state until then. */}
                <div style={{ padding: "24px 0", color: "var(--pm-t2)", fontSize: 13 }}>
                  <div style={{ fontSize: 14, color: "var(--pm-t1)", marginBottom: 4 }}>{t("characters.builder.commentsEmptyTitle")}</div>
                  {t("characters.builder.commentsEmptyText")}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {noClone && (
        <Modal
          width={420}
          onClose={() => setNoClone(false)}
          title={(id) => (
            <div style={{ display: "flex", alignItems: "center" }}>
              <h2 id={id} style={{ fontSize: 17, fontWeight: 500, flex: 1 }}>
                {t("characters.builder.noCloneTitle")}
              </h2>
              <button type="button" className="shareClose" autoFocus onClick={() => setNoClone(false)} title={t("window.close")} aria-label={t("window.close")}>
                <XIcon aria-hidden="true" />
              </button>
            </div>
          )}
        >
          <div style={{ color: "var(--pm-t2)" }}>{t("characters.builder.noCloneText", { cls: src.cls, mine: myCls })}</div>
        </Modal>
      )}
      {del && <DeleteBuildModal t={t} build={src.t} onDelete={remove} onClose={() => setDel(false)} />}
      {share && <ShareModal t={t} lang={lang} kind="build" text={shareText} onClose={() => setShare(false)} onError={onError} />}
    </>
  );
}

/** Under the build name field: the title is already used by another build. */
function NameTaken({ t }: { t: PageProps["t"] }) {
  return (
    <div role="alert" style={{ flexBasis: "100%", paddingLeft: 30, fontSize: 12, color: "var(--pm-redt)" }}>
      {t("characters.builder.nameTaken")}
    </div>
  );
}
