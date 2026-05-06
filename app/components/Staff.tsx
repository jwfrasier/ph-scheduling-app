"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DAYS,
  DAYS_LONG,
  DEFAULT_STAFF,
  Day,
  LEAVE_LABELS,
  LeaveType,
  LeavesMap,
  ManualPayMap,
  RecurringLeavesMap,
  Schedule,
  ShiftKind,
  Staff,
  pesos,
  shiftCount,
  staffPay,
  uid,
} from "../lib/data";

const NEXT_SHIFT: Record<"none" | ShiftKind, "none" | ShiftKind> = {
  none: "D",
  D: "N",
  N: "none",
};
import StaffAddModal from "./StaffAddModal";

type PayFilter = "all" | "auto" | "manual";

type EditDraft = {
  name: string;
  role: string;
  rate: number;
  manual: boolean;
  manualPay: number;
  allowedDays: Day[] | null; // null = no constraint (all days OK)
};

export default function StaffPanel({
  staff,
  schedule,
  manualPay,
  leaves,
  recurringLeaves,
  setStaff,
  setSchedule,
  setManualPay,
  setLeaves,
  setRecurringLeaves,
  notify,
}: {
  staff: Staff[];
  schedule: Schedule;
  manualPay: ManualPayMap;
  leaves: LeavesMap;
  recurringLeaves: RecurringLeavesMap;
  setStaff: (next: Staff[]) => void;
  setSchedule: (next: Schedule) => void;
  setManualPay: (next: ManualPayMap) => void;
  setLeaves: (next: LeavesMap) => void;
  setRecurringLeaves: (next: RecurringLeavesMap) => void;
  notify?: (msg: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [payFilter, setPayFilter] = useState<PayFilter>("all");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft | null>(null);

  // Detect missing default IDs
  const missingDefaults = useMemo(() => {
    const present = new Set(staff.map((s) => s.id));
    return DEFAULT_STAFF.filter((d) => !present.has(d.id));
  }, [staff]);

  function startEdit(s: Staff) {
    setEditingId(s.id);
    setDraft({
      name: s.name,
      role: s.role,
      rate: s.rate,
      manual: s.manual,
      manualPay: manualPay[s.id] ?? 0,
      allowedDays: s.allowedDays ? [...s.allowedDays] : null,
    });
  }
  function toggleAllowedDay(d: Day) {
    if (!draft) return;
    // null/undefined means "no constraint": when user first toggles, treat as
    // "all 7 minus the one being turned off"
    const cur = draft.allowedDays ?? [...DAYS];
    const has = cur.includes(d);
    const next = has ? cur.filter((x) => x !== d) : [...cur, d];
    // If full week is allowed again, clear the constraint
    const nextOrNull = next.length === 7 ? null : next;
    setDraft({ ...draft, allowedDays: nextOrNull });
  }
  function setShiftValue(
    staffId: string,
    day: Day,
    next: ShiftKind | null
  ) {
    const row = { ...(schedule[staffId] ?? {}) };
    if (next === null) delete row[day];
    else row[day] = next;
    setSchedule({ ...schedule, [staffId]: row });
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }
  function saveEdit(id: string) {
    if (!draft) return;
    if (!draft.name.trim()) {
      notify?.("Name can't be empty");
      return;
    }
    setStaff(
      staff.map((s) =>
        s.id === id
          ? {
              ...s,
              name: draft.name.trim(),
              role: draft.role.trim() || "Caregiver",
              rate: draft.rate,
              manual: draft.manual,
              allowedDays: draft.allowedDays ?? undefined,
            }
          : s
      )
    );
    setManualPay({ ...manualPay, [id]: draft.manualPay });
    notify?.(`Saved ${draft.name.trim()}`);
    setEditingId(null);
    setDraft(null);
  }

  function remove(id: string) {
    const target = staff.find((s) => s.id === id);
    if (!target) return;
    if (!confirm(`Remove ${target.name} and clear their shifts?`)) return;
    setStaff(staff.filter((s) => s.id !== id));
    const next = { ...schedule };
    delete next[id];
    setSchedule(next);
    const nextPay = { ...manualPay };
    delete nextPay[id];
    setManualPay(nextPay);
    const nextLeaves = { ...leaves };
    delete nextLeaves[id];
    setLeaves(nextLeaves);
    const nextRec = { ...recurringLeaves };
    delete nextRec[id];
    setRecurringLeaves(nextRec);
    notify?.(`Removed ${target.name}`);
  }

  function setRec(
    id: string,
    day: (typeof DAYS)[number],
    type: LeaveType | null
  ) {
    const row = { ...(recurringLeaves[id] ?? {}) };
    if (type === null) delete row[day];
    else row[day] = type;
    const next = { ...recurringLeaves, [id]: row };
    if (Object.keys(row).length === 0) delete next[id];
    setRecurringLeaves(next);
  }

  function confirmAdd(s: Omit<Staff, "id">, manualPayAmount: number) {
    const id = uid();
    const newStaff: Staff = { ...s, id };
    setStaff([newStaff, ...staff]);
    if (newStaff.manual && manualPayAmount > 0) {
      setManualPay({ ...manualPay, [id]: manualPayAmount });
    }
    setAdding(false);
    setHighlightId(id);
    setTimeout(() => setHighlightId(null), 2500);
    notify?.(`Added ${newStaff.name}`);
  }

  function restoreMissingDefaults() {
    if (missingDefaults.length === 0) return;
    if (
      !confirm(
        `Restore ${missingDefaults
          .map((s) => s.name)
          .join(", ")}? Their PRD-default schedule will also be re-applied where empty.`
      )
    )
      return;
    // Prepend missing defaults so they appear at top
    setStaff([...missingDefaults, ...staff]);
    // Re-apply default schedule for restored staff if missing
    const restoredSchedule = { ...schedule };
    const restoredPay = { ...manualPay };
    for (const ds of missingDefaults) {
      if (!restoredSchedule[ds.id]) {
        // Look up the PRD default schedule from data.ts
        const defaults: Record<string, Partial<Record<typeof DAYS[number], "D" | "N">>> = {
          tessie:  { Sun: "D", Mon: "D", Tue: "D", Wed: "D", Sat: "D" },
          eula:    { Mon: "D", Tue: "D", Wed: "D", Thu: "D", Fri: "D" },
          teng:    { Sun: "D", Thu: "D", Fri: "D", Sat: "D" },
          jane:    { Sun: "D", Tue: "D", Thu: "N", Fri: "N", Sat: "D" },
          trisha:  { Mon: "N", Tue: "N", Wed: "N", Thu: "N", Fri: "N" },
          jessica: { Sun: "N", Mon: "N", Tue: "N", Wed: "N", Sat: "N" },
          alondra: { Mon: "D", Tue: "D", Wed: "D", Thu: "D", Fri: "D" },
          maryann: { Sun: "N" },
          j:       { Fri: "N", Sat: "N" },
        };
        if (defaults[ds.id]) restoredSchedule[ds.id] = defaults[ds.id]!;
      }
      if (ds.manual && !restoredPay[ds.id]) {
        restoredPay[ds.id] = 3000;
      }
    }
    setSchedule(restoredSchedule);
    setManualPay(restoredPay);
    notify?.(
      `Restored ${missingDefaults.length} default caregiver${
        missingDefaults.length === 1 ? "" : "s"
      }`
    );
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => {
      if (payFilter === "auto" && s.manual) return false;
      if (payFilter === "manual" && !s.manual) return false;
      if (q) {
        const hay = `${s.name} ${s.role}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [staff, search, payFilter]);

  return (
    <section className="pt-10 rise">
      <div className="flex items-baseline gap-4 mb-6">
        <h2 className="font-display text-3xl md:text-4xl">Staff</h2>
        <span className="flex-1 h-px bg-ink/20 ml-4" />
        <button
          onClick={() => setAdding(true)}
          className="action-btn"
          aria-label="Add caregiver"
        >
          + add caregiver
        </button>
      </div>

      {missingDefaults.length > 0 && (
        <aside className="staff-restore-banner">
          <div>
            <div className="font-display text-2xl leading-tight">
              {missingDefaults.length} default caregiver
              {missingDefaults.length === 1 ? "" : "s"} missing
            </div>
            <div className="font-mono text-[12px] tracking-widest uppercase text-ink-soft mt-1">
              {missingDefaults.map((s) => s.name).join(" · ")}
            </div>
          </div>
          <button onClick={restoreMissingDefaults} className="action-btn">
            restore defaults
          </button>
        </aside>
      )}

      <div className="staff-filter-bar">
        <input
          className="staff-filter-input"
          placeholder="Search by name or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="staff-filter-segment" role="tablist" aria-label="Pay filter">
          {(["all", "auto", "manual"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setPayFilter(f)}
              className={`staff-filter-chip ${payFilter === f ? "is-active" : ""}`}
            >
              {f}
            </button>
          ))}
        </div>
        <span className="staff-filter-count">
          {filtered.length} of {staff.length}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-full font-mono text-[12px] tracking-widest uppercase text-ink-soft py-8 text-center border border-dashed border-ink/20">
            No caregivers match the current filter
          </div>
        )}
        {filtered.map((s) => {
          const c = shiftCount(schedule, s.id);
          const pay = staffPay(s, schedule, manualPay, leaves);
          const isNew = s.id === highlightId;
          const editing = editingId === s.id;
          const drafted = editing ? draft! : null;
          return (
            <article
              key={s.id}
              className={`bg-paper-deep/35 border ${
                editing ? "border-terracotta" : "border-ink/20"
              } p-5 relative ${isNew ? "staff-card-new" : ""}`}
            >
              {isNew && <span className="staff-card-badge">just added</span>}
              {editing && <span className="staff-card-badge">editing</span>}

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {editing ? (
                    <>
                      <input
                        className="staff-name-input"
                        value={drafted!.name}
                        autoFocus
                        onChange={(e) =>
                          setDraft({ ...drafted!, name: e.target.value })
                        }
                      />
                      <input
                        className="staff-role-input"
                        value={drafted!.role}
                        onChange={(e) =>
                          setDraft({ ...drafted!, role: e.target.value })
                        }
                      />
                    </>
                  ) : (
                    <>
                      <div className="font-display text-2xl leading-tight">
                        {s.name}
                      </div>
                      <div className="font-mono text-[13px] tracking-[0.1em] uppercase text-ink-soft mt-1">
                        {s.role}
                      </div>
                    </>
                  )}
                </div>

                {editing ? (
                  <div className="flex flex-col gap-1 items-end">
                    <button
                      onClick={() => saveEdit(s.id)}
                      className="action-btn"
                      title="Save changes"
                    >
                      save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="action-btn-ghost"
                      title="Discard changes"
                    >
                      cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 items-end">
                    <button
                      onClick={() => startEdit(s)}
                      className="action-btn"
                      title="Edit caregiver"
                    >
                      edit
                    </button>
                    <button
                      onClick={() => remove(s.id)}
                      className="action-btn-ghost"
                      title="Remove caregiver"
                    >
                      remove
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 font-mono text-[13px]">
                <div>
                  <div className="text-[13px] tracking-widest uppercase text-ink-soft">
                    Rate / shift
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-ink/40">₱</span>
                    {editing ? (
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={drafted!.rate}
                        disabled={drafted!.manual}
                        onChange={(e) =>
                          setDraft({
                            ...drafted!,
                            rate: Number(e.target.value),
                          })
                        }
                        className="amount-input"
                      />
                    ) : (
                      <span className="font-mono text-base tabnum">
                        {s.rate}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[13px] tracking-widest uppercase text-ink-soft">
                    Shifts / wk
                  </div>
                  <div className="font-display text-xl tabnum mt-0.5">{c}</div>
                </div>
                <div>
                  <div className="text-[13px] tracking-widest uppercase text-ink-soft">
                    This week
                  </div>
                  <div className="font-display text-xl tabnum mt-0.5 text-terracotta-deep">
                    {pesos(pay)}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-dashed border-ink/20 flex items-center justify-between gap-3 flex-wrap">
                {editing ? (
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={drafted!.manual}
                      onChange={(e) =>
                        setDraft({ ...drafted!, manual: e.target.checked })
                      }
                      className="check"
                    />
                    <span className="font-mono text-[14px] tracking-[0.2em] uppercase">
                      Manual pay
                    </span>
                  </label>
                ) : (
                  <span
                    className={`font-mono text-[14px] tracking-[0.2em] uppercase ${
                      s.manual ? "text-terracotta" : "text-ink-soft"
                    }`}
                  >
                    {s.manual ? "Manual pay" : "Auto pay"}
                  </span>
                )}
                {editing && drafted!.manual ? (
                  <label className="flex items-baseline gap-1">
                    <span className="font-mono text-[13px] uppercase tracking-widest text-ink-soft">
                      amount
                    </span>
                    <span className="font-mono text-ink/40">₱</span>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={drafted!.manualPay}
                      onChange={(e) =>
                        setDraft({
                          ...drafted!,
                          manualPay: Number(e.target.value),
                        })
                      }
                      className="amount-input max-w-[110px]"
                    />
                  </label>
                ) : !editing && s.manual ? (
                  <span className="font-mono text-base tabnum">
                    {pesos(manualPay[s.id] ?? 0)}
                  </span>
                ) : (
                  <span className="font-mono text-[14px] tracking-widest uppercase text-ink-soft italic">
                    {c} × {pesos(s.rate)}
                  </span>
                )}
              </div>

              {/* This week's shifts — one dropdown per day */}
              <div className="mt-4 pt-3 border-t border-dashed border-ink/20">
                <div className="font-mono text-[13px] tracking-widest uppercase text-ink-soft mb-2">
                  This week&rsquo;s shifts
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map((d) => {
                    const k = (schedule[s.id]?.[d] ?? null) as ShiftKind | null;
                    const blocked =
                      s.allowedDays && !s.allowedDays.includes(d);
                    const cls =
                      k === "D"
                        ? "is-day"
                        : k === "N"
                        ? "is-night"
                        : "is-off";
                    return (
                      <label
                        key={d}
                        className="flex flex-col gap-1 text-center"
                        title={`${DAYS_LONG[d]} · pick a shift`}
                      >
                        <span className="font-mono text-[12px] tracking-widest uppercase text-ink-soft">
                          {d}
                        </span>
                        <select
                          value={k ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setShiftValue(
                              s.id,
                              d,
                              v === "D" ? "D" : v === "N" ? "N" : null
                            );
                          }}
                          className={`shift-select ${cls} ${
                            blocked ? "is-blocked" : ""
                          }`}
                        >
                          <option value="">Off</option>
                          <option value="D">Day</option>
                          <option value="N">Night</option>
                        </select>
                        {blocked && (
                          <span className="font-mono text-[10px] tracking-widest uppercase text-terracotta">
                            !
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Available days — only in edit mode */}
              {editing && (
                <div className="mt-4 pt-3 border-t border-dashed border-ink/20">
                  <div className="font-mono text-[13px] tracking-widest uppercase text-ink-soft mb-2">
                    Available days · constraint
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {DAYS.map((d) => {
                      const allowed =
                        drafted!.allowedDays === null ||
                        drafted!.allowedDays.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => toggleAllowedDay(d)}
                          className={`staff-day-toggle ${
                            allowed ? "is-on" : "is-off"
                          }`}
                          title={`${DAYS_LONG[d]} · ${
                            allowed ? "allowed" : "off-limits"
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                  </div>
                  <div className="font-mono text-[12px] tracking-widest uppercase text-ink-soft mt-2">
                    Lit days are working days · grayed = off-limits
                  </div>
                </div>
              )}

              {/* Recurring leave */}
              <div className="mt-4 pt-3 border-t border-dashed border-ink/20">
                <div className="font-mono text-[13px] tracking-widest uppercase text-ink-soft mb-2">
                  Recurring days off · auto-applied to new weeks
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map((d) => {
                    const t = recurringLeaves[s.id]?.[d];
                    return (
                      <label
                        key={d}
                        className="flex flex-col items-stretch gap-1 text-center"
                        title={`${DAYS_LONG[d]} · recurring leave reason`}
                      >
                        <span className="font-mono text-[12px] tracking-widest uppercase text-ink-soft">
                          {d}
                        </span>
                        <select
                          value={t ?? ""}
                          onChange={(e) =>
                            setRec(
                              s.id,
                              d,
                              e.target.value === ""
                                ? null
                                : (e.target.value as LeaveType)
                            )
                          }
                          className={`select-input text-[13px] ${
                            t ? "text-sage" : "text-ink-soft"
                          }`}
                        >
                          <option value="">— working —</option>
                          {(Object.keys(LEAVE_LABELS) as LeaveType[]).map(
                            (k) => (
                              <option key={k} value={k}>
                                {LEAVE_LABELS[k]}
                              </option>
                            )
                          )}
                        </select>
                      </label>
                    );
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {adding && (
        <StaffAddModal
          onCancel={() => setAdding(false)}
          onConfirm={confirmAdd}
        />
      )}
    </section>
  );
}
