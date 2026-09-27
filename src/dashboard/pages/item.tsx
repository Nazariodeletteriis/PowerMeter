import { useEffect, useState, type CSSProperties } from "react";
import { HammerIcon, ShareNetworkIcon, ShoppingCartIcon, SkullIcon, SwordIcon } from "@phosphor-icons/react";
import { ItemIcon } from "../items";
import { DB_ITEMS, ITEM_DETAILS } from "../sample/world";
import { fmt, RARITY } from "../ui";
import { SELECTED_ITEM } from "./database";
import { ShareModal } from "./shared/ShareModal";
import type { PageProps } from "./types";
import "./world/world.css";

const MONO: CSSProperties = { fontFamily: "var(--pm-mono)" };

// Opened from the database (sessionStorage) or the sidebar (last one, else the
// prototype's). Only the prototype's item has a detail; the others show their
// row data and the prototype's empty recipe text.
export default function Item({ t, lang, onError, setHeader }: PageProps) {
  const [share, setShare] = useState(false);
  const title = t("shell.itemTitle");
  const crumb = `${t("nav.database")} → ${t("nav.items")}`;
  useEffect(() => setHeader({ title, crumb }), [setHeader, title, crumb]);
  const item = DB_ITEMS.find((i) => i.name === sessionStorage.getItem(SELECTED_ITEM)) ?? DB_ITEMS[0];
  const d = ITEM_DETAILS[item.name];
  const col = item.rarity ? RARITY[item.rarity] : undefined;
  const subtitle = [item.rarity, d?.type ?? t(item.type, { n: item.n ?? "" }), `Lv ${item.lv}`, d?.classes].filter(Boolean).join(" · ");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.3fr) minmax(0,1fr)", gap: 12, maxWidth: 1200 }}>
      <section className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div className="wItemIcon" style={{ "--c": col ?? "var(--pm-grey)" } as CSSProperties}>
            <ItemIcon name={item.name}>{t("world.item.icon")}</ItemIcon>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 22, fontWeight: 500, color: col ?? "var(--pm-t1)" }}>{item.name}</h2>
            <div style={{ color: "var(--pm-t2)", fontSize: 12, marginTop: 2 }}>{subtitle}</div>
          </div>
        </div>
        {d && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <h3 className="wLabel">{t("world.item.stats")}</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "5px 10px", fontSize: 13 }}>
                  {d.stats.map((s) => (
                    <div key={s.name} style={{ display: "contents" }}>
                      <span style={{ color: "var(--pm-t2)" }}>{s.name}</span>
                      <span style={MONO}>
                        {s.max ? `${fmt(s.value, lang)}–${fmt(s.max, lang)}` : `+${fmt(s.value, lang)}${s.pct ? "%" : ""}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="wLabel">{t("world.item.substats")}</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {d.substats.map((s) => (
                    <span key={s} className="wTag">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <h3 className="wLabel">{t("world.item.set", { name: d.set.name })}</h3>
              <div style={{ fontSize: 12, lineHeight: 1.7, color: "var(--pm-t2)" }}>
                {d.set.bonuses.map(([n, bonus]) => `${t("world.item.pieces", { n })}: ${bonus}`).join(" · ")}
              </div>
            </div>
          </>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn fill">
            <SwordIcon aria-hidden="true" />
            {t("world.item.addBuild")}
          </button>
          <button type="button" className="btn">
            <ShoppingCartIcon aria-hidden="true" />
            {t("world.item.addShopping")}
          </button>
          <button type="button" className="btn" onClick={() => setShare(true)}>
            <ShareNetworkIcon aria-hidden="true" />
            {t("world.item.share")}
          </button>
        </div>
      </section>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {d && (
          <section className="card">
            <h3 className="wLabel" style={{ marginBottom: 8 }}>
              {t("world.item.sources")}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <SkullIcon aria-hidden="true" style={{ color: "var(--pm-redt)" }} />
                <span style={{ flex: 1 }}>
                  {t("world.item.drop")} · {d.drop.boss} <span style={{ color: "var(--pm-t3)" }}>({d.drop.dungeon})</span>
                </span>
                <span style={{ ...MONO, color: "var(--pm-t2)" }}>{d.drop.rate.toLocaleString(lang)}%</span>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <HammerIcon aria-hidden="true" style={{ color: "var(--pm-t2)" }} />
                <span style={{ flex: 1 }}>
                  {t("world.item.crafting")} · {d.craft}
                </span>
                <button type="button" className="linkBtn">
                  {t("world.item.recipe")}
                </button>
              </div>
            </div>
          </section>
        )}
        <section className="card">
          <h3 className="wLabel" style={{ marginBottom: 8 }}>
            {t("world.item.usedIn")}
          </h3>
          <div style={{ fontSize: 13, color: "var(--pm-t2)" }}>{t("world.item.usedInNone")}</div>
        </section>
      </div>
      {share && <ShareModal t={t} lang={lang} kind="item" onClose={() => setShare(false)} onError={onError} />}
    </div>
  );
}
