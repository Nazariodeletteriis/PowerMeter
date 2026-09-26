import { useState, type KeyboardEvent } from "react";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import type { T } from "./i18n";
import { ALL_PAGES } from "./nav";

/**
 * Ctrl K palette (prototype md.palette). Searches the dashboard pages; items,
 * skills and NPCs join the list when the R3 database exists.
 * No open/close animation on purpose: it is keyboard-driven.
 */
export function Palette({ t, onClose, onPick }: { t: T; onClose: () => void; onPick: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const q = query.trim().toLowerCase();
  const found = ALL_PAGES.filter((p) => t(p.label).toLowerCase().includes(q));
  const sel = Math.min(index, Math.max(0, found.length - 1));
  const cur = found[sel];

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setIndex(Math.max(0, Math.min(found.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1))));
    } else if (e.key === "Enter" && cur) {
      onPick(cur.id);
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
            aria-activedescendant={cur ? `pal-${cur.id}` : undefined}
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
              <>
                <div className="paletteGroup">{t("search.pages")}</div>
                {found.map((p, k) => (
                  <div
                    key={p.id}
                    id={`pal-${p.id}`}
                    className="paletteItem"
                    role="option"
                    aria-selected={k === sel}
                    onClick={() => onPick(p.id)}
                  >
                    <p.icon aria-hidden="true" />
                    {t(p.label)}
                  </div>
                ))}
              </>
            )}
          </div>
          {cur && (
            <div className="palettePreview">
              <div className="paletteGroup" style={{ padding: 0 }}>
                {t("search.preview")} · {t("search.pages")}
              </div>
              <div className="icon">
                <cur.icon aria-hidden="true" />
              </div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{t(cur.label)}</div>
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
