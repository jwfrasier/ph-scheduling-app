"use client";

import { useEffect, useRef } from "react";
import {
  DAYS_LONG,
  Day,
  LEAVE_LABELS,
  Leave,
  LeaveType,
  ShiftKind,
  Staff,
} from "../lib/data";

const LEAVE_TYPES: LeaveType[] = ["vacation", "sick", "training", "holiday"];

export default function CellEditor({
  staff,
  day,
  shift,
  note,
  leave,
  onShift,
  onNote,
  onLeave,
  onClose,
}: {
  staff: Staff;
  day: Day;
  shift: ShiftKind | null;
  note: string;
  leave: Leave | null;
  onShift: (next: ShiftKind | null) => void;
  onNote: (next: string) => void;
  onLeave: (next: Leave | null) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", key);
    };
  }, [onClose]);

  return (
    <div className="cell-editor-backdrop" onMouseDown={(e) => e.stopPropagation()}>
      <div ref={ref} className="cell-editor">
        <header className="cell-editor-head">
          <div>
            <div className="font-display text-2xl leading-none">
              {staff.name}
            </div>
            <div className="font-mono text-[14px] tracking-widest uppercase text-ink-soft mt-1">
              {DAYS_LONG[day]} · {staff.role}
            </div>
          </div>
          <button onClick={onClose} className="cell-editor-close" aria-label="Close">
            ×
          </button>
        </header>

        <section className="cell-editor-section">
          <div className="cell-editor-label">Shift</div>
          <div className="cell-editor-row">
            <button
              className={`cell-editor-btn ${shift === "D" ? "is-active" : ""}`}
              onClick={() => onShift("D")}
            >
              <span className="cell-day">D</span> Day
            </button>
            <button
              className={`cell-editor-btn ${shift === "N" ? "is-active" : ""}`}
              onClick={() => onShift("N")}
            >
              <span className="cell-night">N</span> Night
            </button>
            <button
              className={`cell-editor-btn ${shift === null ? "is-active" : ""}`}
              onClick={() => onShift(null)}
            >
              <span className="cell-empty">·</span> Off
            </button>
          </div>
        </section>

        <section className="cell-editor-section">
          <div className="cell-editor-label">Leave</div>
          <div className="cell-editor-row">
            <button
              className={`cell-editor-btn ${leave === null ? "is-active" : ""}`}
              onClick={() => onLeave(null)}
            >
              none
            </button>
            {LEAVE_TYPES.map((t) => (
              <button
                key={t}
                className={`cell-editor-btn ${leave?.type === t ? "is-active" : ""}`}
                onClick={() =>
                  onLeave({ type: t, note: leave?.note ?? "" })
                }
              >
                {LEAVE_LABELS[t]}
              </button>
            ))}
          </div>
          {leave && (
            <input
              className="cell-editor-input"
              placeholder="Optional leave detail (e.g., dental appt)"
              value={leave.note ?? ""}
              onChange={(e) =>
                onLeave({ type: leave.type, note: e.target.value })
              }
            />
          )}
        </section>

        <section className="cell-editor-section">
          <div className="cell-editor-label">Note</div>
          <textarea
            className="cell-editor-textarea"
            placeholder="e.g., covering for J · half-day · training"
            rows={2}
            value={note}
            onChange={(e) => onNote(e.target.value)}
          />
        </section>

        <footer className="cell-editor-foot">
          <button onClick={onClose} className="action-btn">
            done
          </button>
        </footer>
      </div>
    </div>
  );
}
