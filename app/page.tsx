"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AppState,
  DayOverrides,
  DEFAULT_STATE,
  Schedule,
  STORAGE_KEY,
  Staff,
  ShiftTimes,
  buildCsv,
  dayCount,
  downloadCsv,
  fmtOrdinalDate,
  loadState,
  pesos,
  saveState,
  totals,
  weekDates,
  DAYS,
  REQUIRED_DAY,
  REQUIRED_NIGHT,
} from "./lib/data";
import SchedulePanel from "./components/Schedule";
import CalendarPanel from "./components/Calendar";
import StaffPanel from "./components/Staff";
import PayrollPanel from "./components/Payroll";
import PrintView from "./components/PrintView";

type Tab = "schedule" | "calendar" | "staff" | "payroll";

const TABS: { id: Tab; label: string; numeral: string }[] = [
  { id: "schedule", label: "Schedule", numeral: "I" },
  { id: "calendar", label: "Calendar", numeral: "II" },
  { id: "staff", label: "Staff", numeral: "III" },
  { id: "payroll", label: "Payroll", numeral: "IV" },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("schedule");
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<AppState>(DEFAULT_STATE);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  const setStaff = (next: Staff[]) => setState((s) => ({ ...s, staff: next }));
  const setSchedule = (next: Schedule) =>
    setState((s) => ({ ...s, schedule: next }));
  const setShiftTimes = (next: ShiftTimes) =>
    setState((s) => ({ ...s, shiftTimes: next }));
  const setDayOverrides = (next: DayOverrides) =>
    setState((s) => ({ ...s, dayOverrides: next }));

  const dates = weekDates();
  const weekLabel = `${fmtOrdinalDate(dates.Sun)} – ${fmtOrdinalDate(dates.Sat)}`;

  const t = totals(state.staff, state.schedule);

  const flagged = useMemo(() => {
    return DAYS.filter((d) => {
      const dN = dayCount(state.schedule, state.staff, d, "D").length;
      const nN = dayCount(state.schedule, state.staff, d, "N").length;
      return dN !== REQUIRED_DAY || nN !== REQUIRED_NIGHT;
    }).length;
  }, [state.staff, state.schedule]);

  const dateLabel = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  function handleExport() {
    const csv = buildCsv(state.staff, state.schedule);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`roster-${stamp}.csv`, csv);
  }

  function handleReset() {
    if (!confirm("Reset all data to the original PRD defaults?")) return;
    localStorage.removeItem(STORAGE_KEY);
    setState(DEFAULT_STATE);
  }

  const counts: Record<Tab, string> = {
    schedule: `${state.staff.length}`,
    calendar: flagged > 0 ? `${flagged}!` : "ok",
    staff: `${state.staff.length}`,
    payroll: pesos(t.grand),
  };

  return (
    <main className="min-h-screen text-ink">
      {/* MASTHEAD */}
      <header className="screen-only px-6 md:px-12 lg:px-20 pt-10 md:pt-14 pb-10">
        <div className="grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 md:col-span-7 rise">
            <div className="flex items-center gap-4 text-[11px] font-mono tracking-[0.2em] uppercase text-ink-soft">
              <span>Vol. 01</span>
              <span className="w-8 deco-rule" />
              <span>The Weekly Ledger</span>
              <span className="w-8 deco-rule" />
              <span>24/7 Care</span>
            </div>
            <h1 className="font-display text-[clamp(3.2rem,8vw,7rem)] leading-[0.86] mt-4">
              Roster
              <span className="italic text-terracotta"> &amp; </span>
              Payroll
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-soft">
              A weekly staffing record for a children&rsquo;s home running
              continuous care across one day shift and one night shift.
              Schedule live, settle the books, print or export when the week
              closes.
            </p>
            <div className="mt-4 font-mono text-[11px] tracking-[0.2em] uppercase text-ink-soft">
              <span className="text-ink">Week of {weekLabel}</span>
            </div>
          </div>

          <div className="col-span-12 md:col-span-5 rise delay-2">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[12px] font-mono tracking-wider uppercase text-ink-soft">
              <div className="flex justify-between border-b border-ink/20 py-2">
                <span>Day shift</span>
                <span className="text-ink">
                  {REQUIRED_DAY} staff · {state.shiftTimes.D.hours}h
                </span>
              </div>
              <div className="flex justify-between border-b border-ink/20 py-2">
                <span>Night shift</span>
                <span className="text-ink">
                  {REQUIRED_NIGHT} staff · {state.shiftTimes.N.hours}h
                </span>
              </div>
              <div className="flex justify-between border-b border-ink/20 py-2">
                <span>Caregivers</span>
                <span className="text-ink">{state.staff.length}</span>
              </div>
              <div className="flex justify-between border-b border-ink/20 py-2">
                <span>Coverage</span>
                <span
                  className={
                    flagged > 0 ? "text-terracotta" : "text-sage"
                  }
                >
                  {flagged > 0
                    ? `${flagged} flag${flagged > 1 ? "s" : ""}`
                    : "all clear"}
                </span>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <span className="stamp">Edition · {dateLabel}</span>
              <span className="text-[11px] font-mono uppercase tracking-widest text-ink-soft">
                Version 2.0
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* STICKY TAB BAR */}
      <nav className="screen-only sticky top-0 z-40 bg-paper/92 backdrop-blur-md border-y border-ink/30">
        <div className="px-6 md:px-12 lg:px-20">
          <div className="flex items-stretch justify-between gap-6">
            <div className="flex items-stretch overflow-x-auto -mx-2 px-2">
              {TABS.map((tt) => {
                const active = tab === tt.id;
                return (
                  <button
                    key={tt.id}
                    onClick={() => setTab(tt.id)}
                    className={`relative group flex items-baseline gap-3 py-4 pr-7 pl-2 first:pl-0 transition-colors ${
                      active ? "text-ink" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    <span
                      className={`font-mono text-[10px] tracking-[0.25em] uppercase ${
                        active ? "text-terracotta" : "text-ink-soft/70"
                      }`}
                    >
                      §{tt.numeral}
                    </span>
                    <span className="font-display text-[20px] md:text-[24px] leading-none">
                      {tt.label}
                    </span>
                    <span className="font-mono text-[10px] tracking-widest uppercase text-ink-soft/70 hidden md:inline">
                      {counts[tt.id]}
                    </span>
                    <span
                      aria-hidden
                      className={`absolute left-0 right-5 -bottom-px h-[2px] origin-left transition-transform ${
                        active
                          ? "bg-terracotta scale-x-100"
                          : "bg-ink/40 scale-x-0 group-hover:scale-x-100"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="action-btn"
                title="Download CSV"
              >
                ⇣ csv
              </button>
              <button
                onClick={() => window.print()}
                className="action-btn"
                title="Print or save as PDF"
              >
                ⎙ print
              </button>
              <button
                onClick={handleReset}
                className="action-btn-ghost hidden md:inline"
                title="Reset to PRD defaults"
              >
                reset
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* SCREEN PANELS */}
      <div className="screen-only px-6 md:px-12 lg:px-20 pb-24">
        {tab === "schedule" && (
          <SchedulePanel
            staff={state.staff}
            schedule={state.schedule}
            dates={dates}
            setSchedule={setSchedule}
            setStaff={setStaff}
          />
        )}
        {tab === "calendar" && (
          <CalendarPanel
            staff={state.staff}
            schedule={state.schedule}
            shiftTimes={state.shiftTimes}
            dayOverrides={state.dayOverrides}
            dates={dates}
            setSchedule={setSchedule}
            setShiftTimes={setShiftTimes}
            setDayOverrides={setDayOverrides}
          />
        )}
        {tab === "staff" && (
          <StaffPanel
            staff={state.staff}
            schedule={state.schedule}
            setStaff={setStaff}
            setSchedule={setSchedule}
          />
        )}
        {tab === "payroll" && (
          <PayrollPanel
            staff={state.staff}
            schedule={state.schedule}
            setStaff={setStaff}
          />
        )}
      </div>

      {/* FOOTER */}
      <footer className="screen-only px-6 md:px-12 lg:px-20 py-10 border-t border-ink/30 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="font-display text-2xl leading-none">
            Children&rsquo;s Home, Operations
          </div>
          <div className="font-mono text-[11px] tracking-widest uppercase text-ink-soft mt-2">
            Minimum operational staffing · scalable
          </div>
        </div>
        <div className="font-mono text-[10px] tracking-widest uppercase text-ink-soft">
          Set in Fraunces &amp; Bricolage · Pressed for the week of{" "}
          {new Date().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          })}
        </div>
      </footer>

      {/* PRINT VIEW */}
      <PrintView
        staff={state.staff}
        schedule={state.schedule}
        shiftTimes={state.shiftTimes}
        dayOverrides={state.dayOverrides}
        dates={dates}
        weekLabel={weekLabel}
      />
    </main>
  );
}
