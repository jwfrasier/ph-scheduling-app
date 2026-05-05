"use client";

import {
  DAYS,
  DAYS_LONG,
  Day,
  MAX_SHIFTS,
  Schedule,
  ShiftKind,
  Staff,
  fmtDayDate,
  isSameDay,
  pesos,
  shiftCount,
  staffPay,
  totals,
} from "../lib/data";

const NEXT: Record<"none" | ShiftKind, "none" | ShiftKind> = {
  none: "D",
  D: "N",
  N: "none",
};

export default function SchedulePanel({
  staff,
  schedule,
  dates,
  setSchedule,
  setStaff,
}: {
  staff: Staff[];
  schedule: Schedule;
  dates: Record<Day, Date>;
  setSchedule: (next: Schedule) => void;
  setStaff: (next: Staff[]) => void;
}) {
  const today = new Date();
  const t = totals(staff, schedule);

  function toggleCell(staffId: string, day: Day) {
    const current = schedule[staffId]?.[day] ?? null;
    const cur = (current ?? "none") as "none" | ShiftKind;
    const nxt = NEXT[cur];
    const nextRow = { ...(schedule[staffId] ?? {}) };
    if (nxt === "none") delete nextRow[day];
    else nextRow[day] = nxt;
    setSchedule({ ...schedule, [staffId]: nextRow });
  }

  function updateManual(id: string, val: number) {
    setStaff(staff.map((s) => (s.id === id ? { ...s, manualPay: val } : s)));
  }

  return (
    <section className="pt-10 rise">
      <div className="flex items-baseline gap-4 mb-3">
        <span className="font-mono text-[11px] tracking-[0.25em] uppercase text-terracotta">
          §I
        </span>
        <h2 className="font-display text-3xl md:text-4xl">The Roster</h2>
        <span className="flex-1 h-px bg-ink/20 ml-4" />
        <span className="font-mono text-[10px] tracking-widest uppercase text-ink-soft hidden md:inline">
          tap a cell · off → day → night
        </span>
      </div>

      <div className="overflow-x-auto -mx-2 px-2 schedule-scroll">
        <table className="w-full border-collapse min-w-[920px] schedule-table">
          <thead>
            <tr>
              <th className="sticky-col sticky-head text-left py-3 pr-4 pl-3 font-mono text-[10px] tracking-[0.2em] uppercase text-ink-soft w-[26%]">
                Caregiver
              </th>
              {DAYS.map((d) => {
                const dt = dates[d];
                const isToday = isSameDay(dt, today);
                return (
                  <th
                    key={d}
                    className={`sticky-head font-display text-base font-normal py-3 px-1 text-center w-[7%] ${
                      isToday ? "text-terracotta" : "text-ink"
                    }`}
                  >
                    <div className="leading-none">{d}</div>
                    <div
                      className={`font-mono text-[10px] tabnum tracking-wider mt-1 ${
                        isToday ? "text-terracotta" : "text-ink-soft"
                      }`}
                    >
                      {fmtDayDate(dt)}
                    </div>
                  </th>
                );
              })}
              <th className="sticky-head text-right py-3 pl-4 font-mono text-[10px] tracking-[0.2em] uppercase text-ink-soft">
                Shifts
              </th>
              <th className="sticky-head text-right py-3 pl-4 pr-3 font-mono text-[10px] tracking-[0.2em] uppercase text-ink-soft w-[14%]">
                Pay
              </th>
            </tr>
            <tr aria-hidden>
              <th colSpan={10} className="sticky-head-rule p-0">
                <div className="h-[2px] bg-ink" />
              </th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s, i) => {
              const count = shiftCount(schedule, s.id);
              const overCap = count > MAX_SHIFTS;
              const stripe = i % 2 === 1;
              return (
                <tr
                  key={s.id}
                  className={`border-b border-ink/15 ${stripe ? "row-stripe" : ""}`}
                >
                  <td className="sticky-col py-3 pr-4 pl-3 align-middle">
                    <div className="font-display text-xl leading-tight">
                      {s.name}
                      {s.manual && (
                        <span className="ml-2 align-middle inline-block font-mono text-[9px] tracking-[0.2em] uppercase text-terracotta border border-terracotta/60 px-1.5 py-0.5 -translate-y-0.5">
                          manual
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] tracking-wider uppercase text-ink-soft mt-0.5">
                      {s.role}
                    </div>
                  </td>
                  {DAYS.map((d) => {
                    const k = schedule[s.id]?.[d] ?? null;
                    return (
                      <td
                        key={d}
                        className="text-center align-middle px-1 py-3"
                        onClick={() => toggleCell(s.id, d)}
                      >
                        <button
                          type="button"
                          className="cell-btn"
                          aria-label={`${s.name} ${DAYS_LONG[d]} shift`}
                          title={`${s.name} · ${DAYS_LONG[d]}`}
                        >
                          {k === "D" && <span className="cell-day">D</span>}
                          {k === "N" && <span className="cell-night">N</span>}
                          {k === null && <span className="cell-empty">·</span>}
                        </button>
                      </td>
                    );
                  })}
                  <td className="text-right pl-4 font-mono tabnum text-sm align-middle">
                    <span className={overCap ? "text-terracotta" : "text-ink"}>
                      {count}
                    </span>
                    <span className="text-ink/30">/{MAX_SHIFTS}</span>
                  </td>
                  <td className="text-right pl-4 pr-3 align-middle">
                    {s.manual ? (
                      <div className="flex items-center justify-end gap-1">
                        <span className="font-mono text-ink/40">₱</span>
                        <input
                          className="amount-input max-w-[110px]"
                          type="number"
                          min={0}
                          step={50}
                          value={s.manualPay ?? 0}
                          onChange={(e) =>
                            updateManual(s.id, Number(e.target.value))
                          }
                        />
                      </div>
                    ) : (
                      <span className="font-mono tabnum text-sm">
                        {pesos(staffPay(s, schedule))}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={8} className="pt-4 pl-3">
                <div className="deco-rule" />
              </td>
              <td className="pt-4 text-right font-mono text-[10px] tracking-[0.2em] uppercase text-ink-soft">
                total
              </td>
              <td className="pt-4 pl-4 pr-3 text-right font-display text-2xl">
                {pesos(t.grand)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
