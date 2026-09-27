import { useState, type KeyboardEvent, type ReactNode } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import type { T } from "./i18n";
import { ALL_PAGES } from "./nav";
import { DB_TYPES, DbIcon, matches, openEntry, useDb } from "./pages/world/db";

// Database hits shown under the pages (the database page has them all).
const DB_HITS = 8;

/**
 * Ctrl K palette (prototype md.palette). Searches the dashboard pages and,
 * from 3 characters, the game database.
 * No open/close animation on purpose: it is keyboard-driven.
 */
export function Palette({ t, onClose, onPick }: { t: T; onClose: () => void; onPick: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const q = query.trim().toLowerCase();
  const db = useDb(q.length >= 3 ? DB_TYPES : []);
  type Option = { key: string; group: string; label: string; icon: ReactNode; pick: () => void };
  const found: Option[] = [
    ...ALL_PAGES.filter((p) => t(p.label).toLowerCase().includes(q)).map((p) => ({
      key: p.id,
      group: t("search.pages"),
      label: t(p.label),
      icon: <p.icon aria-hidden="true" />,
      pick: () => onPick(p.id),
    })),
    ...(q.length >= 3 && db ? matches(db, q).slice(0, DB_HITS) : []).map((r) => ({
      key: r.type + r.id,
      group: t("nav.database"),
      label: r.name,
      icon: (
        <span style={{ width: 20, height: 20, flex: "none", borderRadius: 4, overflow: "hidden", display: "grid", placeItems: "center" }}>
          <DbIcon row={r} />
        </span>
      ),
      pick: () => openEntry(onPick, r.type, r.id),
    })),
  ];
  const sel = Math.min(index, Math.max(0, found.length - 1));
  const cur = found[sel];

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setIndex(Math.max(0, Math.min(found.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1))));
    } else if (e.key === "Enter" && cur) {
      cur.pick();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal palette"
        role="dialog"
        aria-modal="true"
        aria-label={t("search.placeholder")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="paletteSearch">
          <MagnifyingGlassIcon aria-hidden="true" />
          <input
            autoFocus
            value={query}
            placeholder={t("search.placeholderLong")}
            aria-label={t("search.placeholder")}
            role="combobox"
            aria-expanded="true"
            aria-controls="paletteList"
            aria-activedescendant={cur ? `pal-${cur.key}` : undefined}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={onKey}
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="paletteBody">
          <div className="paletteList" id="paletteList" role="listbox">
            {found.length === 0 ? (
              <div style={{ padding: "24px 10px", color: "var(--pm-t2)" }}>{t("search.empty")}</div>
            ) : (
              found.map((o, k) => (
                <div key={o.key} role="presentation">
                  {o.group !== found[k - 1]?.group && <div className="paletteGroup">{o.group}</div>}
                  <div id={`pal-${o.key}`} className="paletteItem" role="option" aria-selected={k === sel} onClick={o.pick}>
                    {o.icon}
                    {o.label}
                  </div>
                </div>
              ))
            )}
          </div>
          {cur && (
            <div className="palettePreview">
              <div className="paletteGroup" style={{ padding: 0 }}>
                {t("search.preview")} · {cur.group}
              </div>
              <div className="icon">{cur.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{cur.label}</div>
              <div style={{ fontSize: 12, color: "var(--pm-t2)" }}>{t("search.enter")}</div>
            </div>
          )}
        </div>
        <div className="paletteFoot">
          <span>↑↓ {t("search.navigate")}</span>
          <span>↵ {t("search.open")}</span>
          <span>Esc {t("search.close")}</span>
        </div>
      </div>
    </div>
  );
}
