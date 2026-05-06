"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_RATE, type Staff } from "../lib/data";

export default function StaffAddModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (s: Omit<Staff, "id">, manualPay: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [rate, setRate] = useState(DEFAULT_RATE);
  const [manual, setManual] = useState(false);
  const [manualPay, setManualPay] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onCancel]);

  function submit() {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    onConfirm(
      {
        name: name.trim(),
        role: role.trim() || "Caregiver",
        rate,
        manual,
      },
      manualPay
    );
  }

  return (
    <div
      className="cell-editor-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div ref={ref} className="cell-editor">
        <header className="cell-editor-head">
          <div>
            <div className="font-display text-2xl leading-none">
              Add caregiver
            </div>
            <div className="font-mono text-[12px] tracking-widest uppercase text-ink-soft mt-1">
              They&rsquo;ll appear at the top of the staff list
            </div>
          </div>
          <button
            onClick={onCancel}
            className="cell-editor-close"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <section className="cell-editor-section">
          <div className="cell-editor-label">Name</div>
          <input
            autoFocus
            className="cell-editor-input"
            placeholder="e.g., Maria"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          {error && (
            <div className="font-mono text-[12px] text-terracotta mt-1">
              {error}
            </div>
          )}
        </section>

        <section className="cell-editor-section">
          <div className="cell-editor-label">Role / note</div>
          <input
            className="cell-editor-input"
            placeholder="e.g., Day · Mon–Fri"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </section>

        <section className="cell-editor-section">
          <div className="cell-editor-label">Pay</div>
          <div className="staff-modal-row">
            <label className="staff-modal-toggle">
              <input
                type="checkbox"
                checked={manual}
                onChange={(e) => setManual(e.target.checked)}
                className="check"
              />
              <span className="font-mono text-[13px] tracking-[0.2em] uppercase">
                Salaried · fixed weekly amount
              </span>
            </label>
          </div>
          {manual ? (
            <div className="staff-modal-row mt-2">
              <span className="font-mono text-[13px] uppercase tracking-widest text-ink-soft">
                Salary / wk
              </span>
              <span className="font-mono text-ink/40 ml-2">₱</span>
              <input
                type="number"
                min={0}
                step={50}
                value={manualPay}
                onChange={(e) => setManualPay(Number(e.target.value))}
                className="amount-input ml-1 max-w-[140px]"
              />
            </div>
          ) : (
            <div className="staff-modal-row mt-2">
              <span className="font-mono text-[13px] uppercase tracking-widest text-ink-soft">
                Rate / shift
              </span>
              <span className="font-mono text-ink/40 ml-2">₱</span>
              <input
                type="number"
                min={0}
                step={50}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="amount-input ml-1 max-w-[140px]"
              />
            </div>
          )}
        </section>

        <footer className="cell-editor-foot">
          <button onClick={onCancel} className="action-btn-ghost">
            cancel
          </button>
          <button onClick={submit} className="action-btn">
            add caregiver
          </button>
        </footer>
      </div>
    </div>
  );
}
