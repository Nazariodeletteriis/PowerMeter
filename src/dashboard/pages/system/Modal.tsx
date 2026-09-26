import { useEffect, useId, type ReactNode } from "react";

/**
 * Prototype modal shell (md.diag / md.update): dimmed overlay, 20px card,
 * closes on backdrop click and Esc. No open/close animation, like the prototype.
 */
export function Modal({
  width,
  title,
  onClose,
  children,
}: {
  width: number;
  title: (id: string) => ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const id = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        style={{ width, padding: 20, display: "flex", flexDirection: "column", gap: 12, overflow: "visible", fontSize: 13 }}
        onClick={(e) => e.stopPropagation()}
      >
        {title(id)}
        {children}
      </div>
    </div>
  );
}
