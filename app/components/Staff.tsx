"use client";

import {
  DEFAULT_RATE,
  LeavesMap,
  ManualPayMap,
  Schedule,
  Staff,
  pesos,
  shiftCount,
  staffPay,
  uid,
} from "../lib/data";

export default function StaffPanel({
  staff,
  schedule,
  manualPay,
  leaves,
  setStaff,
  setSchedule,
  setManualPay,
  setLeaves,
}: {
  staff: Staff[];
  schedule: Schedule;
  manualPay: ManualPayMap;
  leaves: LeavesMap;
  setStaff: (next: Staff[]) => void;
  setSchedule: (next: Schedule) => void;
  setManualPay: (next: ManualPayMap) => void;
  setLeaves: (next: LeavesMap) => void;
}) {
  function update<K extends keyof Staff>(id: string, key: K, value: Staff[K]) {
    setStaff(staff.map((s) => (s.id === id ? { ...s, [key]: value } : s)));
  }
  function setPay(id: string, val: number) {
    setManualPay({ ...manualPay, [id]: val });
  }
  function remove(id: string) {
    if (!confirm("Remove this caregiver and clear their shifts?")) return;
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
  }
  function add() {
    const id = uid();
    setStaff([
      ...staff,
      {
        id,
        name: "New caregiver",
        role: "Role · schedule",
        rate: DEFAULT_RATE,
        manual: false,
      },
    ]);
  }

  return (
    <section className="pt-10 rise">
      <div className="flex items-baseline gap-4 mb-6">
        <span className="font-mono text-[11px] tracking-[0.25em] uppercase text-terracotta">
          §III
        </span>
        <h2 className="font-display text-3xl md:text-4xl">Staff</h2>
        <span className="flex-1 h-px bg-ink/20 ml-4" />
        <button onClick={add} className="action-btn" aria-label="Add caregiver">
          + add caregiver
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {staff.map((s) => {
          const c = shiftCount(schedule, s.id);
          const pay = staffPay(s, schedule, manualPay, leaves);
          return (
            <article
              key={s.id}
              className="bg-paper-deep/35 border border-ink/20 p-5 relative"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <input
                    className="staff-name-input"
                    value={s.name}
                    onChange={(e) => update(s.id, "name", e.target.value)}
                  />
                  <input
                    className="staff-role-input"
                    value={s.role}
                    onChange={(e) => update(s.id, "role", e.target.value)}
                  />
                </div>
                <button
                  onClick={() => remove(s.id)}
                  className="opacity-40 hover:opacity-100 hover:text-terracotta font-mono text-[10px] tracking-widest uppercase"
                  title="Remove caregiver"
                >
                  remove
                </button>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 font-mono text-[11px]">
                <div>
                  <div className="text-[9px] tracking-widest uppercase text-ink-soft">
                    Rate / shift
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-ink/40">₱</span>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={s.rate}
                      disabled={s.manual}
                      onChange={(e) =>
                        update(s.id, "rate", Number(e.target.value))
                      }
                      className="amount-input"
                    />
                  </div>
                </div>
                <div>
                  <div className="text-[9px] tracking-widest uppercase text-ink-soft">
                    Shifts / wk
                  </div>
                  <div className="font-display text-xl tabnum mt-0.5">{c}</div>
                </div>
                <div>
                  <div className="text-[9px] tracking-widest uppercase text-ink-soft">
                    This week
                  </div>
                  <div className="font-display text-xl tabnum mt-0.5 text-terracotta-deep">
                    {pesos(pay)}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-dashed border-ink/20 flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={s.manual}
                    onChange={(e) => update(s.id, "manual", e.target.checked)}
                    className="check"
                  />
                  <span className="font-mono text-[10px] tracking-[0.2em] uppercase">
                    Manual pay
                  </span>
                </label>
                {s.manual ? (
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
                      amount
                    </span>
                    <span className="font-mono text-ink/40">₱</span>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={manualPay[s.id] ?? 0}
                      onChange={(e) => setPay(s.id, Number(e.target.value))}
                      className="amount-input max-w-[110px]"
                    />
                  </div>
                ) : (
                  <span className="font-mono text-[10px] tracking-widest uppercase text-ink-soft italic">
                    auto · {c} × {pesos(s.rate)}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
