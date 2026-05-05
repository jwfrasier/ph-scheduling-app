"use client";

import { useState } from "react";
import {
  DAYS,
  DAYS_LONG,
  Day,
  DayOverrides,
  REQUIRED_DAY,
  REQUIRED_NIGHT,
  Schedule,
  ShiftKind,
  ShiftTimes,
  ShiftWindow,
  Staff,
  dayCount,
  effectiveTimes,
  fmtDayDate,
  fmtOrdinalDate,
  isSameDay,
  shiftCount,
  MAX_SHIFTS,
} from "../lib/data";

type Zone = "D" | "N" | "off";

export default function CalendarPanel({
  staff,
  schedule,
  shiftTimes,
  dayOverrides,
  dates,
  setSchedule,
  setShiftTimes,
  setDayOverrides,
}: {
  staff: Staff[];
  schedule: Schedule;
  shiftTimes: ShiftTimes;
  dayOverrides: DayOverrides;
  dates: Record<Day, Date>;
  setSchedule: (next: Schedule) => void;
  setShiftTimes: (next: ShiftTimes) => void;
  setDayOverrides: (next: DayOverrides) => void;
}) {
  const today = new Date();
  const todayDay = DAYS.find((d) => isSameDay(dates[d], today));
  const [day, setDay] = useState<Day>(todayDay ?? "Mon");
  const [dragOver, setDragOver] = useState<Zone | null>(null);
  const eff = effectiveTimes(shiftTimes, dayOverrides, day);
  const dayHasOverride = !!dayOverrides[day];

  function move(staffId: string, target: Zone) {
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

  function clearOverride() {
    const next = { ...dayOverrides };
    delete next[day];
    setDayOverrides(next);
  }

  const onDay = dayCount(schedule, staff, day, "D");
  const onNight = dayCount(schedule, staff, day, "N");
  const assignedIds = new Set([...onDay, ...onNight].map((s) => s.id));
  const offDuty = staff.filter((s) => !assignedIds.has(s.id));

  return (
    <section className="pt-10 rise">
      <div className="flex items-baseline gap-4 mb-6">
        <span className="font-mono text-[11px] tracking-[0.25em] uppercase text-terracotta">
          §II
        </span>
        <h2 className="font-display text-3xl md:text-4xl">Calendar</h2>
        <span className="flex-1 h-px bg-ink/20 ml-4" />
        <span className="font-mono text-[10px] tracking-widest uppercase text-ink-soft hidden md:inline">
          drag staff between zones
        </span>
      </div>

      {/* Day strip */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {DAYS.map((d) => {
          const dN = dayCount(schedule, staff, d, "D").length;
          const nN = dayCount(schedule, staff, d, "N").length;
          const ok = dN === REQUIRED_DAY && nN === REQUIRED_NIGHT;
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
                <span className={dN === REQUIRED_DAY ? "text-ochre" : "text-terracotta"}>
                  {dN}D
                </span>
                <span className="text-ink/30 mx-1">·</span>
                <span className={nN === REQUIRED_NIGHT ? "text-night" : "text-terracotta"}>
                  {nN}N
                </span>
              </div>
              {!ok && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-terracotta" />
              )}
              {overridden && (
                <span
                  className="absolute bottom-1 right-1 font-mono text-[8px] tracking-widest uppercase text-sage"
                  title="Custom shift times for this day"
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

      {/* Zones: Day / Night / Off — drag-and-drop */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ShiftZone
          kind="D"
          label="Day shift"
          required={REQUIRED_DAY}
          assigned={onDay}
          schedule={schedule}
          window={eff.D}
          accent="ochre"
          dragOver={dragOver === "D"}
          setDragOver={setDragOver}
          onDrop={(id) => move(id, "D")}
          onTime={(t) => setOverride("D", t)}
          isOverride={!!dayOverrides[day]?.D}
        />
        <ShiftZone
          kind="N"
          label="Night shift"
          required={REQUIRED_NIGHT}
          assigned={onNight}
          schedule={schedule}
          window={eff.N}
          accent="night"
          dragOver={dragOver === "N"}
          setDragOver={setDragOver}
          onDrop={(id) => move(id, "N")}
          onTime={(t) => setOverride("N", t)}
          isOverride={!!dayOverrides[day]?.N}
        />
        <OffZone
          assigned={offDuty}
          schedule={schedule}
          dragOver={dragOver === "off"}
          setDragOver={setDragOver}
          onDrop={(id) => move(id, "off")}
        />
      </div>

      <p className="mt-6 text-[13px] leading-relaxed text-ink-soft max-w-prose">
        Drag any caregiver between the Day, Night, and Off-duty columns to
        reassign their shift for {DAYS_LONG[day]}. Editing the start, end, or
        hours fields above creates a per-day override (marked&nbsp;
        <span className="text-sage">✶</span> on the day strip). Use{" "}
        <span className="font-mono">reset to default</span> to clear it.
      </p>
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
  window: w,
  accent,
  dragOver,
  setDragOver,
  onDrop,
  onTime,
  isOverride,
}: {
  kind: ShiftKind;
  label: string;
  required: number;
  assigned: Staff[];
  schedule: Schedule;
  window: ShiftWindow;
  accent: "ochre" | "night";
  dragOver: boolean;
  setDragOver: (z: Zone | null) => void;
  onDrop: (id: string) => void;
  onTime: (t: Partial<ShiftWindow>) => void;
  isOverride: boolean;
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

      <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[11px]">
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
      </div>
      {isOverride && (
        <div className="font-mono text-[9px] tracking-widest uppercase text-sage mt-1">
          ✶ override active
        </div>
      )}

      <ul className="mt-4 min-h-[120px]">
        {assigned.length === 0 && (
          <li className="font-mono text-[12px] uppercase tracking-widest text-ink-soft py-6 italic text-center border border-dashed border-ink/20">
            drop a caregiver here
          </li>
        )}
        {assigned.map((s) => (
          <DraggableStaff key={s.id} staff={s} schedule={schedule} />
        ))}
      </ul>
    </article>
  );
}

function OffZone({
  assigned,
  schedule,
  dragOver,
  setDragOver,
  onDrop,
}: {
  assigned: Staff[];
  schedule: Schedule;
  dragOver: boolean;
  setDragOver: (z: Zone | null) => void;
  onDrop: (id: string) => void;
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
          <DraggableStaff key={s.id} staff={s} schedule={schedule} />
        ))}
      </ul>
    </article>
  );
}

function DraggableStaff({
  staff,
  schedule,
}: {
  staff: Staff;
  schedule: Schedule;
}) {
  const c = shiftCount(schedule, staff.id);
  const overCap = c > MAX_SHIFTS;
  return (
    <li
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", staff.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="staff-chip flex items-center justify-between py-2 px-2 border-b border-ink/10 last:border-b-0 cursor-grab active:cursor-grabbing"
    >
      <div className="min-w-0">
        <div className="font-display text-base leading-tight truncate">
          {staff.name}
        </div>
        <div className="font-mono text-[9px] tracking-wider uppercase text-ink-soft truncate">
          {staff.role}
        </div>
      </div>
      <div className="font-mono text-[10px] tabnum text-ink-soft pl-2 whitespace-nowrap">
        <span className={overCap ? "text-terracotta" : ""}>{c}</span>
        <span className="text-ink/30">/{MAX_SHIFTS}</span>
      </div>
    </li>
  );
}
