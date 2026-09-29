import { useState, type CSSProperties, type ReactNode } from "react";
import { UserIcon } from "@phosphor-icons/react";

// Class and faction art from the design bundle (src/assets/pm/<name>.png).
const ART = import.meta.glob<string>("../assets/pm/*.png", { eager: true, import: "default" });
export const art = (name: string) => ART[`../assets/pm/${name.toLowerCase()}.png`];

// Class colors and fallback initials (prototype CLS). Brawler has no icon yet.
export const CLASSES: Record<string, [initials: string, color: string]> = {
  Gladiator: ["GL", "#52A5DB"],
  Templar: ["TE", "#4CA8E0"],
  Assassin: ["AS", "#42C169"],
  Ranger: ["RA", "#4BC670"],
  Sorcerer: ["SO", "#AB61DD"],
  Spiritmaster: ["SP", "#C24DAE"],
  Cleric: ["CL", "#C8C171"],
  Chanter: ["CH", "#CAC172"],
  Brawler: ["BR", "#C58B55"],
};
/** Classes the dashboard offers: Brawler is not out in EU/NA yet (it keeps its color for the meter). */
export const RELEASED_CLASSES = Object.keys(CLASSES).filter((c) => c !== "Brawler");

/** The PowerMeter mark: three bars, the last one red. */
export function Logo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="13" width="5" height="9" rx="1.2" fill="var(--pm-grey)" />
      <rect x="9.5" y="8" width="5" height="14" rx="1.2" fill="var(--pm-t1)" />
      <path d="M17 5.5 22 2v18.8a1.2 1.2 0 0 1-1.2 1.2h-2.6A1.2 1.2 0 0 1 17 20.8z" fill="var(--pm-red)" />
    </svg>
  );
}

/** Class icon on a square tinted with the class color; unknown class → empty grey square. */
export function ClassAvatar({ cls, size = 28 }: { cls?: string; size?: number }) {
  const [initials, color] = (cls && CLASSES[cls]) || ["", "var(--pm-grey)"];
  const icon = cls && art(cls);
  return (
    <span
      className="classAvatar"
      style={{ "--c": color, width: size, height: size } as CSSProperties}
      aria-hidden="true"
    >
      {icon ? <img src={icon} alt="" /> : initials}
    </span>
  );
}

/**
 * Round profile picture (pm.profile.photo): the photo, else the name's
 * initial, else a user glyph. A broken URL (e.g. an old Discord avatar)
 * falls back to the initial.
 */
export function ProfileAvatar({ src, name, size, label }: { src?: string; name: string; size: number; label?: string }) {
  const [broken, setBroken] = useState<string>();
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      {...(label ? { role: "img", "aria-label": label, title: label } : { "aria-hidden": true })}
    >
      {src && broken !== src ? <img src={src} alt="" onError={() => setBroken(src)} /> : initial || <UserIcon />}
    </span>
  );
}

/** Card with the small uppercase heading and an optional right-side slot. */
export function Card({
  title,
  aside,
  style,
  children,
}: {
  title: string;
  aside?: ReactNode;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <section className="card" style={style}>
      <div className="cardHead">
        <h2 className="kicker">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Standard empty/error state (prototype "states" page). */
export function EmptyState({
  icon,
  title,
  text,
  children,
}: {
  icon: ReactNode;
  title: string;
  text?: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      {icon}
      <div className="emptyTitle">{title}</div>
      {text && <div className="emptyText">{text}</div>}
      {children && <div style={{ display: "flex", gap: 8 }}>{children}</div>}
    </div>
  );
}

/** Integer with thousands separators even for 4 digits, like the prototype (it: 1.240). */
export const fmt = (n: number, lang: string) =>
  Math.round(n).toLocaleString(lang, { useGrouping: "always" } as unknown as Intl.NumberFormatOptions);

/** Elyos / Asmodian icon and name; `label` is the translated name (collections.<faction>). */
export function FactionTag({ faction, label, size = 14 }: { faction: string; label: string; size?: number }) {
  return (
    <span style={{ color: faction === "asmodian" ? "#F4C77A" : "#8FD3FF", display: "inline-flex", alignItems: "center", gap: 3, verticalAlign: -3 }}>
      <img src={art(faction)} alt="" style={{ width: size, height: size }} />
      {label}
    </span>
  );
}
