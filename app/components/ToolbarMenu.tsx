"use client";

import { useEffect, useRef, useState } from "react";

export type MenuAction = {
  label: string;
  glyph: string;
  onClick: () => void;
  hint?: string;
};

export default function ToolbarMenu({
  label,
  actions,
}: {
  label: string;
  actions: MenuAction[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false);
    }
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="toolbar-menu-wrap">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`action-btn ${open ? "is-active" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label} ▾
      </button>
      {open && (
        <div className="toolbar-menu" role="menu">
          {actions.map((a, i) => (
            <button
              key={i}
              type="button"
              role="menuitem"
              className="toolbar-menu-item"
              onClick={() => {
                a.onClick();
                setOpen(false);
              }}
              title={a.hint}
            >
              <span className="toolbar-menu-glyph">{a.glyph}</span>
              <span className="toolbar-menu-label">{a.label}</span>
              {a.hint && (
                <span className="toolbar-menu-hint">{a.hint}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
