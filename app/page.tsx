"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AppState,
  DayOverrides,
  ManualPayMap,
  Schedule,
  STORAGE_KEY,
  Staff,
  ShiftTimes,
  WeekData,
  buildPayrollCsv,
  buildScheduleCsv,
  dayCount,
  downloadCsv,
  fmtOrdinalDate,
  getOrSeedWeek,
  isSameDay,
  loadState,
  makeDefaultState,
  pesos,
  saveState,
  shiftWeekKey,
  thisWeekKey,
  totals,
  weekDatesFromKey,
  DAYS,
  REQUIRED_DAY,
  REQUIRED_NIGHT,
} from "./lib/data";
import SchedulePanel from "./components/Schedule";
import CalendarPanel from "./components/Calendar";
import StaffPanel from "./components/Staff";
import PayrollPanel from "./components/Payroll";
import PrintView, { PrintMode } from "./components/PrintView";

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
  const [state, setState] = useState<AppState>(() => makeDefaultState());
  const [printMode, setPrintMode] = useState<PrintMode>("calendar");

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);

  /* ---------- week handling ---------- */

  const dates = useMemo(
    () => weekDatesFromKey(state.currentWeekKey),
    [state.currentWeekKey]
  );
  const weekLabel = useMemo(
    () => `${fmtOrdinalDate(dates.Sun)} – ${fmtOrdinalDate(dates.Sat)}`,
    [dates]
  );

  const week: WeekData = useMemo(
    () => getOrSeedWeek(state.weeks, state.currentWeekKey),
    [state.weeks, state.currentWeekKey]
  );

  function updateWeek(patch: Partial<WeekData>) {
    setState((s) => {
      const current = getOrSeedWeek(s.weeks, s.currentWeekKey);
      return {
        ...s,
        weeks: {
          ...s.weeks,
          [s.currentWeekKey]: { ...current, ...patch },
        },
      };
    });
  }

  function jumpWeek(deltaWeeks: number) {
    setState((s) => {
      const next = shiftWeekKey(s.currentWeekKey, deltaWeeks);
      const seeded = getOrSeedWeek(s.weeks, next);
      return {
        ...s,
        currentWeekKey: next,
        weeks: { ...s.weeks, [next]: seeded },
      };
    });
  }

  function gotoThisWeek() {
    const k = thisWeekKey();
    setState((s) => ({
      ...s,
      currentWeekKey: k,
      weeks: { ...s.weeks, [k]: getOrSeedWeek(s.weeks, k) },
    }));
  }

  /* ---------- setters that scope to the current week ---------- */

  const setStaff = (next: Staff[]) =>
    setState((s) => ({ ...s, staff: next }));
  const setShiftTimes = (next: ShiftTimes) =>
    setState((s) => ({ ...s, shiftTimes: next }));
  const setSchedule = (next: Schedule) => updateWeek({ schedule: next });
  const setDayOverrides = (next: DayOverrides) =>
    updateWeek({ dayOverrides: next });
  const setManualPay = (next: ManualPayMap) =>
    updateWeek({ manualPay: next });

  /* ---------- derived ---------- */

  const t = totals(state.staff, week.schedule, week.manualPay);

  const flagged = useMemo(() => {
    return DAYS.filter((d) => {
      const dN = dayCount(week.schedule, state.staff, d, "D").length;
      const nN = dayCount(week.schedule, state.staff, d, "N").length;
      return dN !== REQUIRED_DAY || nN !== REQUIRED_NIGHT;
    }).length;
  }, [state.staff, week.schedule]);

  const isCurrentWeek = state.currentWeekKey === thisWeekKey();
  const archivedCount = Object.keys(state.weeks).length;

  /* ---------- exports + print ---------- */

  function exportSchedule() {
    const csv = buildScheduleCsv(
      state.staff,
      week.schedule,
      week.manualPay,
      weekLabel
    );
    downloadCsv(`schedule-${state.currentWeekKey}.csv`, csv);
  }
  function exportPayroll() {
    const csv = buildPayrollCsv(
      state.staff,
      week.schedule,
      week.manualPay,
      weekLabel
    );
    downloadCsv(`payroll-${state.currentWeekKey}.csv`, csv);
  }
  function handlePrint(mode: PrintMode) {
    setPrintMode(mode);
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }
  function handleReset() {
    if (
      !confirm(
        "Reset ALL data — every archived week, all staff, and all settings — back to PRD defaults?"
      )
    )
      return;
    localStorage.removeItem(STORAGE_KEY);
    setState(makeDefaultState());
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
              continuous care. Each week is archived independently — pick a
              week, tweak the roster, settle the books, then print or export.
            </p>
            <div className="mt-4 font-mono text-[11px] tracking-[0.2em] uppercase text-ink-soft">
              <span className="text-ink">Week of {weekLabel}</span>
              {!isCurrentWeek && (
                <span className="text-terracotta ml-2">· not this week</span>
              )}
            </div>
          </div>

          <div className="col-span-12 md:col-span-5 rise delay-2">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[12px] font-mono tracking-wider uppercase text-ink-soft">
              <div className="flex justify-between border-b border-ink/20 py-2">
                <span>Day shift</span>
                <span className="text-ink">
                  {REQUIRED_DAY} · {state.shiftTimes.D.hours}h
                </span>
              </div>
              <div className="flex justify-between border-b border-ink/20 py-2">
                <span>Night shift</span>
                <span className="text-ink">
                  {REQUIRED_NIGHT} · {state.shiftTimes.N.hours}h
                </span>
              </div>
              <div className="flex justify-between border-b border-ink/20 py-2">
                <span>Caregivers</span>
                <span className="text-ink">{state.staff.length}</span>
              </div>
              <div className="flex justify-between border-b border-ink/20 py-2">
                <span>Coverage</span>
                <span className={flagged > 0 ? "text-terracotta" : "text-sage"}>
                  {flagged > 0
                    ? `${flagged} flag${flagged > 1 ? "s" : ""}`
                    : "all clear"}
                </span>
              </div>
              <div className="flex justify-between border-b border-ink/20 py-2 col-span-2">
                <span>Archived weeks</span>
                <span className="text-ink">{archivedCount}</span>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <span className="stamp">Edition · {weekLabel}</span>
              <span className="text-[11px] font-mono uppercase tracking-widest text-ink-soft">
                Version 3.0
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* STICKY TAB BAR */}
      <nav className="screen-only sticky top-0 z-40 bg-paper/92 backdrop-blur-md border-y border-ink/30">
        <div className="px-6 md:px-12 lg:px-20">
          {/* Row 1: tabs + actions */}
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

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={exportSchedule}
                className="action-btn"
                title="Download schedule CSV"
              >
                ⇣ schedule
              </button>
              <button
                onClick={exportPayroll}
                className="action-btn"
                title="Download payroll CSV"
              >
                ⇣ payroll
              </button>
              <button
                onClick={() => handlePrint("calendar")}
                className="action-btn"
                title="Print weekly calendar"
              >
                ⎙ calendar
              </button>
              <button
                onClick={() => handlePrint("payroll")}
                className="action-btn"
                title="Print weekly payroll"
              >
                ⎙ payroll
              </button>
              <button
                onClick={handleReset}
                className="action-btn-ghost hidden md:inline"
                title="Reset all weeks to PRD defaults"
              >
                reset
              </button>
            </div>
          </div>

          {/* Row 2: week navigation */}
          <div className="flex items-center justify-between gap-3 py-3 border-t border-ink/20">
            <div className="flex items-center gap-2">
              <button
                onClick={() => jumpWeek(-1)}
                className="week-nav-btn"
                title="Previous week"
                aria-label="Previous week"
              >
                ←
              </button>
              <button
                onClick={gotoThisWeek}
                className={`action-btn-ghost ${
                  isCurrentWeek ? "opacity-40" : ""
                }`}
                disabled={isCurrentWeek}
                title="Jump to this week"
              >
                this week
              </button>
              <button
                onClick={() => jumpWeek(1)}
                className="week-nav-btn"
                title="Next week"
                aria-label="Next week"
              >
                →
              </button>
            </div>
            <div className="font-display text-lg md:text-xl leading-none truncate">
              {weekLabel}
              {!isCurrentWeek && (
                <span className="font-mono text-[10px] tracking-widest uppercase text-terracotta ml-3">
                  archived
                </span>
              )}
              {isCurrentWeek && (
                <span className="font-mono text-[10px] tracking-widest uppercase text-sage ml-3">
                  · current
                </span>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* SCREEN PANELS */}
      <div className="screen-only px-6 md:px-12 lg:px-20 pb-24">
        {tab === "schedule" && (
          <SchedulePanel
            staff={state.staff}
            schedule={week.schedule}
            manualPay={week.manualPay}
            dates={dates}
            setSchedule={setSchedule}
            setManualPay={setManualPay}
          />
        )}
        {tab === "calendar" && (
          <CalendarPanel
            staff={state.staff}
            schedule={week.schedule}
            shiftTimes={state.shiftTimes}
            dayOverrides={week.dayOverrides}
            dates={dates}
            setSchedule={setSchedule}
            setShiftTimes={setShiftTimes}
            setDayOverrides={setDayOverrides}
          />
        )}
        {tab === "staff" && (
          <StaffPanel
            staff={state.staff}
            schedule={week.schedule}
            manualPay={week.manualPay}
            setStaff={setStaff}
            setSchedule={setSchedule}
            setManualPay={setManualPay}
          />
        )}
        {tab === "payroll" && (
          <PayrollPanel
            staff={state.staff}
            schedule={week.schedule}
            manualPay={week.manualPay}
            setManualPay={setManualPay}
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
          Set in Fraunces &amp; Bricolage · {archivedCount} week
          {archivedCount === 1 ? "" : "s"} on file
        </div>
      </footer>

      <PrintView
        mode={printMode}
        staff={state.staff}
        schedule={week.schedule}
        shiftTimes={state.shiftTimes}
        dayOverrides={week.dayOverrides}
        manualPay={week.manualPay}
        dates={dates}
        weekLabel={weekLabel}
      />
    </main>
  );
}
