"use client";

import { useEffect, useRef, useState } from "react";
import {
  DAYS,
  DAYS_LONG,
  Day,
  LEAVE_LABELS,
  LeavesMap,
  ManualPayMap,
  MAX_SHIFTS,
  NotesMap,
  Schedule,
  ShiftKind,
  Staff,
  Violation,
  fmtDayDate,
  isSameDay,
  pesos,
  shiftCount,
  staffPay,
  totals,
} from "../lib/data";
import Violations from "./Violations";
import CellEditor from "./CellEditor";

const NEXT: Record<"none" | ShiftKind, "none" | ShiftKind> = {
  none: "D",
  D: "N",
  N: "none",
};

export default function SchedulePanel({
  staff,
  schedule,
  manualPay,
  notes,
  leaves,
  dates,
  violations,
  setSchedule,
  setManualPay,
  setNotes,
  setLeaves,
}: {
  staff: Staff[];
  schedule: Schedule;
  manualPay: ManualPayMap;
  notes: NotesMap;
  leaves: LeavesMap;
  dates: Record<Day, Date>;
  violations: Violation[];
  setSchedule: (next: Schedule) => void;
  setManualPay: (next: ManualPayMap) => void;
  setNotes: (next: NotesMap) => void;
  setLeaves: (next: LeavesMap) => void;
}) {
  const today = new Date();
  const t = totals(staff, schedule, manualPay, leaves);
  const [editing, setEditing] = useState<{ id: string; day: Day } | null>(null);
  const suppressClickRef = useRef(false);
  const [highlight, setHighlight] = useState<string | null>(null);

  useEffect(() => {
    function handleFocusCell(e: Event) {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (!detail?.id) return;
      const el = document.getElementById(detail.id);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlight(detail.id);
      setTimeout(() => setHighlight(null), 1800);
    }
    window.addEventListener("focus-cell", handleFocusCell as EventListener);
    return () => window.removeEventListener("focus-cell", handleFocusCell as EventListener);
  }, []);

  function toggleCell(staffId: string, day: Day) {
    const current = schedule[staffId]?.[day] ?? null;
    const cur = (current ?? "none") as "none" | ShiftKind;
    const nxt = NEXT[cur];
    const nextRow = { ...(schedule[staffId] ?? {}) };
    if (nxt === "none") delete nextRow[day];
    else nextRow[day] = nxt;
    setSchedule({ ...schedule, [staffId]: nextRow });
  }

  function setCellShift(staffId: string, day: Day, k: ShiftKind | null) {
    const nextRow = { ...(schedule[staffId] ?? {}) };
    if (k === null) delete nextRow[day];
    else nextRow[day] = k;
    setSchedule({ ...schedule, [staffId]: nextRow });
  }

  function setCellNote(staffId: string, day: Day, val: string) {
    const row = { ...(notes[staffId] ?? {}) };
    if (val.trim() === "") delete row[day];
    else row[day] = val;
    const next = { ...notes, [staffId]: row };
    if (Object.keys(row).length === 0) delete next[staffId];
    setNotes(next);
  }

  function setCellLeave(staffId: string, day: Day, val: NonNullable<ReturnType<typeof getLeave>> | null) {
    const row = { ...(leaves[staffId] ?? {}) };
    if (val === null) delete row[day];
    else row[day] = val;
    const next = { ...leaves, [staffId]: row };
    if (Object.keys(row).length === 0) delete next[staffId];
    setLeaves(next);
  }

  function getLeave(id: string, d: Day) {
    return leaves[id]?.[d] ?? null;
  }

  function updateManual(id: string, val: number) {
    setManualPay({ ...manualPay, [id]: val });
  }

  return (
    <section className="pt-10 rise">
      <Violations
        issues={violations}
        onJumpTo={(v) => {
          if ("staffId" in v && "day" in v) {
            const id = `cell-${v.staffId}-${v.day}`;
            window.dispatchEvent(
              new CustomEvent("focus-cell", { detail: { id } })
            );
          } else if (v.kind === "coverage") {
            // No matching row in schedule view; just scroll to the day header.
            const el = document.querySelector(`th:nth-of-type(${dayIndex(v.day) + 2})`);
            if (el)
              (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
          } else if (v.kind === "over-cap") {
            // Scroll to the staff's first non-empty cell.
            const id = `cell-${v.staffId}-Sun`;
            window.dispatchEvent(
              new CustomEvent("focus-cell", { detail: { id } })
            );
          }
        }}
      />

      <div className="flex items-baseline gap-4 mb-3 mt-6">
        <h2 className="font-display text-3xl md:text-4xl">Schedule</h2>
        <span className="flex-1 h-px bg-ink/20 ml-4" />
      </div>

      <div className="overflow-x-auto -mx-2 px-2 schedule-scroll">
        <table className="w-full border-collapse min-w-[920px] schedule-table">
          <thead>
            <tr>
              <th className="sticky-col sticky-head text-left py-3 pr-4 pl-3 font-mono text-[14px] tracking-[0.2em] uppercase text-ink-soft w-[26%]">
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
                      className={`font-mono text-[14px] tabnum tracking-wider mt-1 ${
                        isToday ? "text-terracotta" : "text-ink-soft"
                      }`}
                    >
                      {fmtDayDate(dt)}
                    </div>
                  </th>
                );
              })}
              <th className="sticky-head text-right py-3 pl-4 font-mono text-[14px] tracking-[0.2em] uppercase text-ink-soft">
                Shifts
              </th>
              <th className="sticky-head text-right py-3 pl-4 pr-3 font-mono text-[14px] tracking-[0.2em] uppercase text-ink-soft w-[14%]">
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
                        <span className="ml-2 align-middle inline-block font-mono text-[13px] tracking-[0.2em] uppercase text-terracotta border border-terracotta/60 px-1.5 py-0.5 -translate-y-0.5">
                          manual
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[14px] tracking-wider uppercase text-ink-soft mt-0.5">
                      {s.role}
                    </div>
                  </td>
                  {DAYS.map((d) => {
                    const k = schedule[s.id]?.[d] ?? null;
                    const lv = leaves[s.id]?.[d];
                    const note = notes[s.id]?.[d];
                    const cellId = `cell-${s.id}-${d}`;
                    const isHighlight = highlight === cellId;
                    return (
                      <td
                        key={d}
                        id={cellId}
                        className={`text-center align-middle px-1 py-3 ${
                          isHighlight ? "cell-highlight" : ""
                        }`}
                      >
                        <button
                          type="button"
                          className="cell-btn relative"
                          aria-label={`${s.name} ${DAYS_LONG[d]} shift`}
                          title={`Click cycles · long-press to edit${
                            note ? ` · ${note}` : ""
                          }${lv ? ` · ${LEAVE_LABELS[lv.type]}` : ""}`}
                          onClick={(e) => {
                            if (suppressClickRef.current) {
                              suppressClickRef.current = false;
                              return;
                            }
                            if (e.shiftKey || e.altKey || e.metaKey) {
                              setEditing({ id: s.id, day: d });
                            } else {
                              toggleCell(s.id, d);
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setEditing({ id: s.id, day: d });
                          }}
                          onPointerDown={(e) => {
                            const target = e.currentTarget;
                            const timer = setTimeout(() => {
                              suppressClickRef.current = true;
                              setEditing({ id: s.id, day: d });
                            }, 450);
                            const cancel = () => {
                              clearTimeout(timer);
                              target.removeEventListener("pointerup", cancel);
                              target.removeEventListener("pointerleave", cancel);
                              target.removeEventListener("pointercancel", cancel);
                            };
                            target.addEventListener("pointerup", cancel, { once: true });
                            target.addEventListener("pointerleave", cancel, { once: true });
                            target.addEventListener("pointercancel", cancel, { once: true });
                          }}
                        >
                          {lv ? (
                            <span className="cell-leave" title={LEAVE_LABELS[lv.type]}>
                              {leaveGlyph(lv.type)}
                            </span>
                          ) : k === "D" ? (
                            <span className="cell-day">D</span>
                          ) : k === "N" ? (
                            <span className="cell-night">N</span>
                          ) : (
                            <span className="cell-empty">·</span>
                          )}
                          {note && <span className="cell-note-dot" />}
                        </button>
                      </td>
                    );
                  })}
                  <td className="text-right pl-4 font-mono tabnum text-base align-middle">
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
                          value={manualPay[s.id] ?? 0}
                          onChange={(e) =>
                            updateManual(s.id, Number(e.target.value))
                          }
                        />
                      </div>
                    ) : (
                      <span className="font-mono tabnum text-base">
                        {pesos(staffPay(s, schedule, manualPay, leaves))}
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
              <td className="pt-4 text-right font-mono text-[14px] tracking-[0.2em] uppercase text-ink-soft">
                total
              </td>
              <td className="pt-4 pl-4 pr-3 text-right font-display text-2xl">
                {pesos(t.grand)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-4 font-mono text-[14px] tracking-widest uppercase text-ink-soft">
        click cycles · long-press to edit
      </p>

      {editing &&
        (() => {
          const s = staff.find((x) => x.id === editing.id);
          if (!s) return null;
          return (
            <CellEditor
              staff={s}
              day={editing.day}
              shift={schedule[s.id]?.[editing.day] ?? null}
              note={notes[s.id]?.[editing.day] ?? ""}
              leave={leaves[s.id]?.[editing.day] ?? null}
              onShift={(k) => setCellShift(s.id, editing.day, k)}
              onNote={(v) => setCellNote(s.id, editing.day, v)}
              onLeave={(l) => setCellLeave(s.id, editing.day, l)}
              onClose={() => setEditing(null)}
            />
          );
        })()}
    </section>
  );
}

function dayIndex(d: Day): number {
  return DAYS.indexOf(d);
}

function leaveGlyph(t: string): string {
  switch (t) {
    case "vacation": return "✈";
    case "sick":     return "+";
    case "training": return "⌂";
    case "holiday":  return "★";
    default:         return "—";
  }
}
