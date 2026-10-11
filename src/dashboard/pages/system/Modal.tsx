import { useEffect, useId, useRef, type ReactNode } from "react";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Prototype modal shell (md.diag / md.update / md.share): dimmed overlay, 20px card,
 * closes on backdrop click and Esc, keeps Tab inside and hands focus back on close.
 * No open/close animation, like the prototype, unless `enter` asks for one
 * (a modal the app opens by itself, not one the user just clicked).
 */
export function Modal({
  width,
  gap = 12,
  enter,
  title,
  onClose,
  children,
}: {
  width: number;
  gap?: number;
  enter?: boolean;
  title: (id: string) => ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !box.current) return;
      const items = [...box.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0] ?? box.current;
      const last = items[items.length - 1] ?? box.current;
      const inside = box.current.contains(document.activeElement);
      if (e.shiftKey ? !inside || document.activeElement === first : !inside || document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  // Focus starts inside (autoFocus wins if a child has it) and returns to the opener.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    if (!box.current?.contains(document.activeElement)) box.current?.focus();
    return () => opener?.focus?.();
  }, []);
  return (
    <div className={enter ? "overlay enter" : "overlay"} onClick={onClose}>
      <div
        ref={box}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        style={{ width, padding: 20, display: "flex", flexDirection: "column", gap, overflow: "visible", fontSize: 13, outline: "none" }}
        onClick={(e) => e.stopPropagation()}
      >
        {title(id)}
        {children}
      </div>
    </div>
  );
}
