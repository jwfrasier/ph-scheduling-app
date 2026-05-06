"use client";

import { useMemo, useState } from "react";
import {
  DAYS,
  DAYS_LONG,
  Day,
  DayShiftAllow,
  LeavesMap,
  ManualPayMap,
  RecurringLeavesMap,
  Schedule,
  ShiftConstraints,
  Staff,
  constraintFor,
  pesos,
  shiftCount,
  staffPay,
  uid,
} from "../lib/data";

const CYCLE: Record<DayShiftAllow, DayShiftAllow> = {
  off: "D",
  D: "N",
  N: "DN",
  DN: "off",
};

const ALLOW_LABEL: Record<DayShiftAllow, string> = {
  off: "Off",
  D: "Day",
  N: "Night",
  DN: "Both",
};
import StaffAddModal from "./StaffAddModal";

type PayFilter = "all" | "shift" | "salaried";

type EditDraft = {
  name: string;
  role: string;
  rate: number;
  manual: boolean;
  manualPay: number;
  shiftConstraints: ShiftConstraints;
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

  function startEdit(s: Staff) {
    // Materialize an explicit per-day constraint for the draft so edit cycles
    // are unambiguous. We seed from the staff's current effective constraints.
    const seeded: ShiftConstraints = {};
    for (const d of DAYS) seeded[d] = constraintFor(s, d);
    setEditingId(s.id);
    setDraft({
      name: s.name,
      role: s.role,
      rate: s.rate,
      manual: s.manual,
      manualPay: manualPay[s.id] ?? 0,
      shiftConstraints: seeded,
    });
  }
  function cycleConstraint(d: Day) {
    if (!draft) return;
    const cur = draft.shiftConstraints[d] ?? "DN";
    const next = CYCLE[cur];
    setDraft({
      ...draft,
      shiftConstraints: { ...draft.shiftConstraints, [d]: next },
    });
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
    // If every day is "DN", drop the constraint entirely (no constraint).
    const allDN = DAYS.every((d) => draft.shiftConstraints[d] === "DN");
    setStaff(
      staff.map((s) =>
        s.id === id
          ? {
              ...s,
              name: draft.name.trim(),
              role: draft.role.trim() || "Caregiver",
              rate: draft.rate,
              manual: draft.manual,
              allowedDays: undefined,
              shiftConstraints: allDN ? undefined : draft.shiftConstraints,
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => {
      if (payFilter === "shift" && s.manual) return false;
      if (payFilter === "salaried" && !s.manual) return false;
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


      <div className="staff-filter-bar">
        <input
          className="staff-filter-input"
          placeholder="Search by name or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="staff-filter-segment" role="tablist" aria-label="Pay filter">
          {(["all", "shift", "salaried"] as const).map((f) => (
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
                        {s.manual && (
                          <span className="ml-2 align-middle inline-block font-mono text-[11px] tracking-[0.2em] uppercase text-terracotta border border-terracotta/60 px-1.5 py-0.5 -translate-y-1">
                            salaried
                          </span>
                        )}
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
                    {(editing ? drafted!.manual : s.manual) ? "Salary · ½-mo" : "Rate / shift"}
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-ink/40">₱</span>
                    {editing ? (
                      drafted!.manual ? (
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
                          className="amount-input"
                        />
                      ) : (
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={drafted!.rate}
                          onChange={(e) =>
                            setDraft({
                              ...drafted!,
                              rate: Number(e.target.value),
                            })
                          }
                          className="amount-input"
                        />
                      )
                    ) : (
                      <span className="font-mono text-base tabnum">
                        {s.manual ? (manualPay[s.id] ?? 0) : s.rate}
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
                      Salaried
                    </span>
                  </label>
                ) : (
                  <span
                    className={`font-mono text-[14px] tracking-[0.2em] uppercase ${
                      s.manual ? "text-terracotta" : "text-ink-soft"
                    }`}
                  >
                    {s.manual ? "Salaried" : "Per shift"}
                  </span>
                )}
                {!editing &&
                  (s.manual ? (
                    <span className="font-mono text-base tabnum">
                      {pesos(manualPay[s.id] ?? 0)} / period
                    </span>
                  ) : (
                    <span className="font-mono text-[14px] tracking-widest uppercase text-ink-soft italic">
                      {c} × {pesos(s.rate)}
                    </span>
                  ))}
              </div>

              {/* Per-day shift constraints */}
              <div className="mt-4 pt-3 border-t border-dashed border-ink/20">
                <div className="flex items-baseline justify-between mb-2">
                  <div className="font-mono text-[13px] tracking-widest uppercase text-ink-soft">
                    Shift constraints
                  </div>
                  <div className="font-mono text-[11px] tracking-widest uppercase text-ink-soft/70">
                    {editing
                      ? "click to cycle · off → day → night → both"
                      : "edit to change"}
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS.map((d) => {
                    const allow: DayShiftAllow = editing
                      ? drafted!.shiftConstraints[d] ?? "DN"
                      : constraintFor(s, d);
                    const cls = `constraint-pill is-${allow.toLowerCase()}`;
                    const title = `${DAYS_LONG[d]} · ${ALLOW_LABEL[allow]}`;
                    if (editing) {
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => cycleConstraint(d)}
                          className={cls}
                          title={title}
                        >
                          <span className="constraint-pill-day">{d}</span>
                          <span className="constraint-pill-state">
                            {ALLOW_LABEL[allow]}
                          </span>
                        </button>
                      );
                    }
                    return (
                      <div
                        key={d}
                        className={`${cls} is-static`}
                        title={title}
                      >
                        <span className="constraint-pill-day">{d}</span>
                        <span className="constraint-pill-state">
                          {ALLOW_LABEL[allow]}
                        </span>
                      </div>
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
