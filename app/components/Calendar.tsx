"use client";

import { useEffect, useState } from "react";
import {
  DAYS,
  DAYS_LONG,
  Day,
  DayOverrides,
  LEAVE_LABELS,
  Leave,
  LeaveType,
  LeavesMap,
  NotesMap,
  Schedule,
  ShiftKind,
  ShiftTimes,
  ShiftWindow,
  Staff,
  Violation,
  dayCount,
  effectiveRequired,
  effectiveTimes,
  fmtDayDate,
  fmtOrdinalDate,
  isSameDay,
  shiftCount,
  MAX_SHIFTS,
} from "../lib/data";
import Violations from "./Violations";
import CellEditor from "./CellEditor";

type Zone = "D" | "N" | "off" | "leave";

export default function CalendarPanel({
  staff,
  schedule,
  shiftTimes,
  dayOverrides,
  notes,
  leaves,
  dates,
  violations,
  setSchedule,
  setShiftTimes,
  setDayOverrides,
  setNotes,
  setLeaves,
}: {
  staff: Staff[];
  schedule: Schedule;
  shiftTimes: ShiftTimes;
  dayOverrides: DayOverrides;
  notes: NotesMap;
  leaves: LeavesMap;
  dates: Record<Day, Date>;
  violations: Violation[];
  setSchedule: (next: Schedule) => void;
  setShiftTimes: (next: ShiftTimes) => void;
  setDayOverrides: (next: DayOverrides) => void;
  setNotes: (next: NotesMap) => void;
  setLeaves: (next: LeavesMap) => void;
}) {
  const today = new Date();
  const todayDay = DAYS.find((d) => isSameDay(dates[d], today));
  const [day, setDay] = useState<Day>(todayDay ?? "Mon");
  const [dragOver, setDragOver] = useState<Zone | null>(null);
  const [touch, setTouch] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const eff = effectiveTimes(shiftTimes, dayOverrides, day);
  const req = effectiveRequired(dayOverrides, day);
  const dayHasOverride = !!dayOverrides[day];

  function move(staffId: string, target: Zone) {
    if (target === "leave") {
      // default to vacation if no leave was set
      const existing = leaves[staffId]?.[day];
      const lv: Leave = existing ?? { type: "vacation" };
      setCellLeave(staffId, day, lv);
      // also clear shift
      const row = { ...(schedule[staffId] ?? {}) };
      delete row[day];
      setSchedule({ ...schedule, [staffId]: row });
      return;
    }
    // assigning a shift clears any leave for that day
    if (leaves[staffId]?.[day]) setCellLeave(staffId, day, null);
    const row = { ...(schedule[staffId] ?? {}) };
    if (target === "off") delete row[day];
    else row[day] = target;
    setSchedule({ ...schedule, [staffId]: row });
  }

  function setOverride(kind: ShiftKind, patch: Partial<ShiftWindow>) {
    const cur = dayOverrides[day]?.[kind] ?? eff[kind];
    const next: DayOverrides = {
      ...dayOverrides,
      [day]: { ...(dayOverrides[day] ?? {}), [kind]: { ...cur, ...patch } },
    };
    setDayOverrides(next);
  }

  function setRequired(kind: ShiftKind, n: number) {
    const cur = dayOverrides[day]?.required ?? {};
    const next: DayOverrides = {
      ...dayOverrides,
      [day]: { ...(dayOverrides[day] ?? {}), required: { ...cur, [kind]: n } },
    };
    setDayOverrides(next);
  }

  function clearOverride() {
    const next = { ...dayOverrides };
    delete next[day];
    setDayOverrides(next);
  }

  function setCellNote(id: string, d: Day, val: string) {
    const row = { ...(notes[id] ?? {}) };
    if (val.trim() === "") delete row[d];
    else row[d] = val;
    const next = { ...notes, [id]: row };
    if (Object.keys(row).length === 0) delete next[id];
    setNotes(next);
  }

  function setCellLeave(id: string, d: Day, val: Leave | null) {
    const row = { ...(leaves[id] ?? {}) };
    if (val === null) delete row[d];
    else row[d] = val;
    const next = { ...leaves, [id]: row };
    if (Object.keys(row).length === 0) delete next[id];
    setLeaves(next);
  }

  function setCellShift(id: string, d: Day, k: ShiftKind | null) {
    const row = { ...(schedule[id] ?? {}) };
    if (k === null) delete row[d];
    else row[d] = k;
    setSchedule({ ...schedule, [id]: row });
  }

  const onDay = dayCount(schedule, staff, day, "D", leaves);
  const onNight = dayCount(schedule, staff, day, "N", leaves);
  const onLeaveStaff = staff.filter((s) => leaves[s.id]?.[day]);
  const assignedIds = new Set([
    ...onDay.map((s) => s.id),
    ...onNight.map((s) => s.id),
    ...onLeaveStaff.map((s) => s.id),
  ]);
  const offDuty = staff.filter((s) => !assignedIds.has(s.id));

  return (
    <section className="pt-10 rise">
      <Violations
        issues={violations}
        onJumpTo={(v) => {
          if ("day" in v && v.day) setDay(v.day);
        }}
      />

      <div className="flex items-baseline gap-4 mb-6 mt-6">
        <h2 className="font-display text-3xl md:text-4xl">Calendar</h2>
        <span className="flex-1 h-px bg-ink/20 ml-4" />
      </div>

      {/* Day strip */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {DAYS.map((d) => {
          const r = effectiveRequired(dayOverrides, d);
          const dN = dayCount(schedule, staff, d, "D", leaves).length;
          const nN = dayCount(schedule, staff, d, "N", leaves).length;
          const ok = dN === r.D && nN === r.N;
          const active = d === day;
          const overridden = !!dayOverrides[d];
          const isToday = isSameDay(dates[d], today);
          return (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={`relative text-left p-3 border transition-all ${
                active
                  ? "border-ink bg-paper-deep/60 -translate-y-0.5"
                  : "border-ink/30 bg-paper-deep/20 hover:border-ink/60"
              }`}
            >
              <div className="flex items-baseline gap-2">
                <span
                  className={`font-display text-2xl leading-none ${
                    active ? "text-ink" : "text-ink-soft"
                  }`}
                >
                  {d}
                </span>
                <span
                  className={`font-mono text-[10px] tabnum tracking-widest ${
                    active ? "text-ink" : "text-ink-soft/80"
                  }`}
                >
                  {dates[d].getDate()}
                </span>
              </div>
              <div className="font-mono text-[9px] tracking-widest uppercase text-ink-soft mt-1.5">
                {fmtDayDate(dates[d])}
                {isToday && (
                  <span className="ml-1.5 text-terracotta">· today</span>
                )}
              </div>
              <div className="font-mono text-[11px] mt-2 tabnum">
                <span className={dN === r.D ? "text-ochre" : "text-terracotta"}>
                  {dN}/{r.D}D
                </span>
                <span className="text-ink/30 mx-1">·</span>
                <span className={nN === r.N ? "text-night" : "text-terracotta"}>
                  {nN}/{r.N}N
                </span>
              </div>
              {!ok && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-terracotta" />
              )}
              {overridden && (
                <span
                  className="absolute bottom-1 right-1 font-mono text-[8px] tracking-widest uppercase text-sage"
                  title="Custom for this day"
                >
                  ✶
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Per-day override banner */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3 border-l-2 border-terracotta/60 pl-4 py-2">
        <div>
          <div className="font-display text-3xl leading-none">
            {DAYS_LONG[day]}
            <span className="text-ink-soft text-2xl italic ml-2">
              · {fmtOrdinalDate(dates[day])}
            </span>
          </div>
          <div className="font-mono text-[10px] tracking-widest uppercase text-ink-soft mt-2">
            day &nbsp;{eff.D.start}–{eff.D.end} · {eff.D.hours}h &nbsp;·&nbsp;
            night &nbsp;{eff.N.start}–{eff.N.end} · {eff.N.hours}h
            {dayHasOverride && (
              <span className="text-sage ml-2">· custom for this day</span>
            )}
          </div>
        </div>
        {dayHasOverride && (
          <button onClick={clearOverride} className="action-btn-ghost">
            reset to default
          </button>
        )}
      </div>

      {/* Zones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ShiftZone
          kind="D"
          label="Day shift"
          required={req.D}
          assigned={onDay}
          schedule={schedule}
          notes={notes}
          day={day}
          window={eff.D}
          accent="ochre"
          dragOver={dragOver === "D"}
          touch={touch}
          setDragOver={setDragOver}
          onDrop={(id) => move(id, "D")}
          onTime={(t) => setOverride("D", t)}
          onRequired={(n) => setRequired("D", n)}
          isOverride={!!dayOverrides[day]?.D}
          requiredOverride={dayOverrides[day]?.required?.D !== undefined}
          onEdit={setEditing}
        />
        <ShiftZone
          kind="N"
          label="Night shift"
          required={req.N}
          assigned={onNight}
          schedule={schedule}
          notes={notes}
          day={day}
          window={eff.N}
          accent="night"
          dragOver={dragOver === "N"}
          touch={touch}
          setDragOver={setDragOver}
          onDrop={(id) => move(id, "N")}
          onTime={(t) => setOverride("N", t)}
          onRequired={(n) => setRequired("N", n)}
          isOverride={!!dayOverrides[day]?.N}
          requiredOverride={dayOverrides[day]?.required?.N !== undefined}
          onEdit={setEditing}
        />
        <LeaveZone
          assigned={onLeaveStaff}
          leaves={leaves}
          day={day}
          dragOver={dragOver === "leave"}
          touch={touch}
          setDragOver={setDragOver}
          onDrop={(id) => move(id, "leave")}
          onLeaveType={(id, t) =>
            setCellLeave(id, day, { type: t, note: leaves[id]?.[day]?.note })
          }
          onEdit={setEditing}
        />
        <OffZone
          assigned={offDuty}
          schedule={schedule}
          notes={notes}
          day={day}
          dragOver={dragOver === "off"}
          touch={touch}
          setDragOver={setDragOver}
          onDrop={(id) => move(id, "off")}
          onEdit={setEditing}
        />
      </div>

      <p className="mt-6 font-mono text-[10px] tracking-widest uppercase text-ink-soft">
        {touch ? "tap chip · long-press to edit" : "drag chip · long-press to edit"}
      </p>

      {editing &&
        (() => {
          const s = staff.find((x) => x.id === editing);
          if (!s) return null;
          return (
            <CellEditor
              staff={s}
              day={day}
              shift={schedule[s.id]?.[day] ?? null}
              note={notes[s.id]?.[day] ?? ""}
              leave={leaves[s.id]?.[day] ?? null}
              onShift={(k) => setCellShift(s.id, day, k)}
              onNote={(v) => setCellNote(s.id, day, v)}
              onLeave={(l) => setCellLeave(s.id, day, l)}
              onClose={() => setEditing(null)}
            />
          );
        })()}
    </section>
  );
}

/* ───────── shift zones ───────── */

function ShiftZone({
  kind,
  label,
  required,
  assigned,
  schedule,
  notes,
  day,
  window: w,
  accent,
  dragOver,
  touch,
  setDragOver,
  onDrop,
  onTime,
  onRequired,
  isOverride,
  requiredOverride,
  onEdit,
}: {
  kind: ShiftKind;
  label: string;
  required: number;
  assigned: Staff[];
  schedule: Schedule;
  notes: NotesMap;
  day: Day;
  window: ShiftWindow;
  accent: "ochre" | "night";
  dragOver: boolean;
  touch: boolean;
  setDragOver: (z: Zone | null) => void;
  onDrop: (id: string) => void;
  onTime: (t: Partial<ShiftWindow>) => void;
  onRequired: (n: number) => void;
  isOverride: boolean;
  requiredOverride: boolean;
  onEdit: (id: string) => void;
}) {
  const ok = assigned.length === required;
  const ringClass = accent === "ochre" ? "border-ochre/60" : "border-night/70";

  return (
    <article
      className={`drop-zone bg-paper-deep/40 border ${
        ok ? ringClass : "border-terracotta"
      } p-5 ${dragOver ? "drop-zone-active" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(kind);
      }}
      onDragLeave={() => setDragOver(null)}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDrop(id);
        setDragOver(null);
      }}
    >
      <header className="flex items-start justify-between border-b border-ink/15 pb-3">
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-ink-soft">
            {kind === "D" ? "Daytime" : "Overnight"}
          </div>
          <h3 className="font-display text-2xl mt-0.5">{label}</h3>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl tabnum leading-none">
            <span className={ok ? "" : "text-terracotta"}>
              {assigned.length}
            </span>
            <span className="text-ink/30 text-base">/{required}</span>
          </div>
          <div className="font-mono text-[9px] tracking-widest uppercase text-ink-soft mt-1">
            on duty
          </div>
        </div>
      </header>

      <div className="mt-3 grid grid-cols-4 gap-2 font-mono text-[11px]">
        <label className="block">
          <span className="block text-[9px] uppercase tracking-widest text-ink-soft mb-1">
            Start
          </span>
          <input
            type="time"
            value={w.start}
            onChange={(e) => onTime({ start: e.target.value })}
            className="time-input"
          />
        </label>
        <label className="block">
          <span className="block text-[9px] uppercase tracking-widest text-ink-soft mb-1">
            End
          </span>
          <input
            type="time"
            value={w.end}
            onChange={(e) => onTime({ end: e.target.value })}
            className="time-input"
          />
        </label>
        <label className="block">
          <span className="block text-[9px] uppercase tracking-widest text-ink-soft mb-1">
            Hours
          </span>
          <input
            type="number"
            min={1}
            max={24}
            step={0.5}
            value={w.hours}
            onChange={(e) => onTime({ hours: Number(e.target.value) })}
            className="time-input"
          />
        </label>
        <label className="block">
          <span className="block text-[9px] uppercase tracking-widest text-ink-soft mb-1">
            Required
          </span>
          <input
            type="number"
            min={0}
            max={20}
            step={1}
            value={required}
            onChange={(e) => onRequired(Number(e.target.value))}
            className={`time-input ${requiredOverride ? "text-sage" : ""}`}
          />
        </label>
      </div>
      {(isOverride || requiredOverride) && (
        <div className="font-mono text-[9px] tracking-widest uppercase text-sage mt-1">
          ✶ override active
        </div>
      )}

      <ul className="mt-4 min-h-[120px]">
        {assigned.length === 0 && (
          <li className="font-mono text-[12px] uppercase tracking-widest text-ink-soft py-6 italic text-center border border-dashed border-ink/20">
            {touch ? "tap a chip below to move" : "drop a caregiver here"}
          </li>
        )}
        {assigned.map((s) => (
          <DraggableStaff
            key={s.id}
            staff={s}
            schedule={schedule}
            note={notes[s.id]?.[day] ?? ""}
            touch={touch}
            onEdit={() => onEdit(s.id)}
          />
        ))}
      </ul>
    </article>
  );
}

function LeaveZone({
  assigned,
  leaves,
  day,
  dragOver,
  touch,
  setDragOver,
  onDrop,
  onLeaveType,
  onEdit,
}: {
  assigned: Staff[];
  leaves: LeavesMap;
  day: Day;
  dragOver: boolean;
  touch: boolean;
  setDragOver: (z: Zone | null) => void;
  onDrop: (id: string) => void;
  onLeaveType: (id: string, t: LeaveType) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <article
      className={`drop-zone bg-paper-deep/30 border border-dashed border-sage p-5 ${
        dragOver ? "drop-zone-active" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver("leave");
      }}
      onDragLeave={() => setDragOver(null)}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDrop(id);
        setDragOver(null);
      }}
    >
      <header className="flex items-start justify-between border-b border-ink/15 pb-3">
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-ink-soft">
            Out
          </div>
          <h3 className="font-display text-2xl mt-0.5">On leave</h3>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl tabnum leading-none text-sage">
            {assigned.length}
          </div>
          <div className="font-mono text-[9px] tracking-widest uppercase text-ink-soft mt-1">
            absent
          </div>
        </div>
      </header>

      <ul className="mt-4 min-h-[120px]">
        {assigned.length === 0 && (
          <li className="font-mono text-[11px] uppercase tracking-widest text-ink-soft py-6 italic text-center border border-dashed border-ink/15">
            no leave entered
          </li>
        )}
        {assigned.map((s) => {
          const lv = leaves[s.id]?.[day]!;
          return (
            <li
              key={s.id}
              draggable={!touch}
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", s.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              className="staff-chip flex items-center justify-between py-2 px-2 border-b border-ink/10 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="font-display text-base leading-tight truncate">
                  {s.name}
                </div>
                <div className="font-mono text-[9px] tracking-wider uppercase text-sage truncate">
                  {LEAVE_LABELS[lv.type]}
                  {lv.note && ` · ${lv.note}`}
                </div>
              </div>
              <div className="flex gap-1">
                <select
                  value={lv.type}
                  onChange={(e) =>
                    onLeaveType(s.id, e.target.value as LeaveType)
                  }
                  className="select-input text-[10px] max-w-[88px]"
                >
                  {Object.entries(LEAVE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onEdit(s.id)}
                  className="opacity-50 hover:opacity-100 font-mono text-[10px] tracking-widest uppercase"
                  title="Edit details"
                >
                  edit
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function OffZone({
  assigned,
  schedule,
  notes,
  day,
  dragOver,
  touch,
  setDragOver,
  onDrop,
  onEdit,
}: {
  assigned: Staff[];
  schedule: Schedule;
  notes: NotesMap;
  day: Day;
  dragOver: boolean;
  touch: boolean;
  setDragOver: (z: Zone | null) => void;
  onDrop: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  return (
    <article
      className={`drop-zone bg-paper-deep/20 border border-dashed border-ink/40 p-5 ${
        dragOver ? "drop-zone-active" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver("off");
      }}
      onDragLeave={() => setDragOver(null)}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData("text/plain");
        if (id) onDrop(id);
        setDragOver(null);
      }}
    >
      <header className="flex items-start justify-between border-b border-ink/15 pb-3">
        <div>
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-ink-soft">
            Off duty
          </div>
          <h3 className="font-display text-2xl mt-0.5">Available</h3>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl tabnum leading-none text-ink-soft">
            {assigned.length}
          </div>
          <div className="font-mono text-[9px] tracking-widest uppercase text-ink-soft mt-1">
            unscheduled
          </div>
        </div>
      </header>

      <ul className="mt-4 min-h-[120px]">
        {assigned.length === 0 && (
          <li className="font-mono text-[12px] uppercase tracking-widest text-ink-soft py-6 italic text-center">
            everyone scheduled
          </li>
        )}
        {assigned.map((s) => (
          <DraggableStaff
            key={s.id}
            staff={s}
            schedule={schedule}
            note={notes[s.id]?.[day] ?? ""}
            touch={touch}
            onEdit={() => onEdit(s.id)}
          />
        ))}
      </ul>
    </article>
  );
}

function DraggableStaff({
  staff,
  schedule,
  note,
  touch,
  onEdit,
}: {
  staff: Staff;
  schedule: Schedule;
  note: string;
  touch: boolean;
  onEdit: () => void;
}) {
  const c = shiftCount(schedule, staff.id);
  const overCap = c > MAX_SHIFTS;
  return (
    <li
      draggable={!touch}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", staff.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="staff-chip flex items-center justify-between py-2 px-2 border-b border-ink/10 last:border-b-0 cursor-grab active:cursor-grabbing"
    >
      <div className="min-w-0">
        <div className="font-display text-base leading-tight truncate">
          {staff.name}
          {note && (
            <span className="ml-1 align-middle text-terracotta text-xs">●</span>
          )}
        </div>
        <div className="font-mono text-[9px] tracking-wider uppercase text-ink-soft truncate">
          {staff.role}
        </div>
        {note && (
          <div className="font-mono text-[10px] text-ink-soft italic truncate mt-0.5">
            {note}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 pl-2 whitespace-nowrap">
        <span className="font-mono text-[10px] tabnum text-ink-soft">
          <span className={overCap ? "text-terracotta" : ""}>{c}</span>
          <span className="text-ink/30">/{MAX_SHIFTS}</span>
        </span>
        <button
          onClick={onEdit}
          className="opacity-50 hover:opacity-100 font-mono text-[10px] tracking-widest uppercase"
          title="Edit shift, leave, note"
        >
          edit
        </button>
      </div>
    </li>
  );
}

