"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  DayOverrides,
  LeavesMap,
  ManualPayMap,
  NotesMap,
  Schedule,
  STORAGE_KEY,
  Staff,
  ShiftTimes,
  WeekData,
  buildPayrollCsv,
  buildScheduleCsv,
  dayCount,
  downloadCsv,
  downloadJson,
  encodeShare,
  fmtOrdinalDate,
  getOrSeedWeek,
  lint,
  loadState,
  makeDefaultState,
  parseState,
  pesos,
  saveState,
  shiftWeekKey,
  thisWeekKey,
  totals,
  weekDatesFromKey,
  effectiveRequired,
  DAYS,
  REQUIRED_DAY,
  REQUIRED_NIGHT,
} from "./lib/data";
import {
  SyncStatus,
  remoteAvailable,
  tryRemoteLoad,
  tryRemoteSave,
} from "./lib/sync";
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
  const [sync, setSync] = useState<SyncStatus>("local");
  const [toast, setToast] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Load — try KV first, fall back to localStorage
  useEffect(() => {
    let mounted = true;
    (async () => {
      const remote = await tryRemoteLoad();
      if (!mounted) return;
      if (remote) {
        setState(remote);
        setSync("synced");
      } else {
        setState(loadState());
        setSync(remoteAvailable() === false ? "off" : "local");
      }
      setHydrated(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Save (local always, KV opportunistically)
  useEffect(() => {
    if (!hydrated) return;
    saveState(state);
    if (remoteAvailable() === false) return;
    setSync("syncing");
    tryRemoteSave(state).then((s) => setSync(s));
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

  /* ---------- setters ---------- */

  const setStaff = (next: Staff[]) => setState((s) => ({ ...s, staff: next }));
  const setShiftTimes = (next: ShiftTimes) =>
    setState((s) => ({ ...s, shiftTimes: next }));
  const setSchedule = (next: Schedule) => updateWeek({ schedule: next });
  const setDayOverrides = (next: DayOverrides) =>
    updateWeek({ dayOverrides: next });
  const setManualPay = (next: ManualPayMap) =>
    updateWeek({ manualPay: next });
  const setNotes = (next: NotesMap) => updateWeek({ notes: next });
  const setLeaves = (next: LeavesMap) => updateWeek({ leaves: next });

  /* ---------- derived ---------- */

  const t = totals(state.staff, week.schedule, week.manualPay, week.leaves);

  const violations = useMemo(
    () => lint(state.staff, week),
    [state.staff, week]
  );

  const flagged = useMemo(() => {
    return DAYS.filter((d) => {
      const r = effectiveRequired(week.dayOverrides, d);
      const dN = dayCount(week.schedule, state.staff, d, "D", week.leaves).length;
      const nN = dayCount(week.schedule, state.staff, d, "N", week.leaves).length;
      return dN !== r.D || nN !== r.N;
    }).length;
  }, [state.staff, week]);

  const isCurrentWeek = state.currentWeekKey === thisWeekKey();
  const archivedCount = Object.keys(state.weeks).length;

  /* ---------- exports + print + share ---------- */

  function exportSchedule() {
    const csv = buildScheduleCsv(
      state.staff,
      week.schedule,
      week.manualPay,
      week.leaves,
      weekLabel
    );
    downloadCsv(`schedule-${state.currentWeekKey}.csv`, csv);
  }
  function exportPayroll() {
    const csv = buildPayrollCsv(
      state.staff,
      week.schedule,
      week.manualPay,
      week.leaves,
      weekLabel
    );
    downloadCsv(`payroll-${state.currentWeekKey}.csv`, csv);
  }
  function exportJson() {
    downloadJson(`roster-backup-${new Date().toISOString().slice(0, 10)}.json`, state);
    flashToast("Backup downloaded");
  }
  function importJson(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const next = parseState(parsed);
        setState(next);
        flashToast("Roster restored from backup");
      } catch {
        flashToast("Could not read that JSON file");
      }
    };
    reader.readAsText(file);
  }
  function shareLink() {
    const code = encodeShare({
      staff: state.staff,
      shiftTimes: state.shiftTimes,
      weekKey: state.currentWeekKey,
      week,
    });
    const url = `${location.origin}/share/${code}`;
    void navigator.clipboard.writeText(url).catch(() => {});
    flashToast("Read-only link copied to clipboard");
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

  function flashToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
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
              continuous care. Each week archived, leaves tracked, and rules
              checked. Print, export, share — pick your channel.
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
                <span>Issues</span>
                <span className={violations.length > 0 ? "text-terracotta" : "text-sage"}>
                  {violations.length === 0 ? "all clear" : violations.length}
                </span>
              </div>
              <div className="flex justify-between border-b border-ink/20 py-2 col-span-2">
                <span>Archived weeks · sync</span>
                <span className="text-ink">
                  {archivedCount} · <SyncDot status={sync} />
                </span>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <span className="stamp">Edition · {weekLabel}</span>
              <span className="text-[11px] font-mono uppercase tracking-widest text-ink-soft">
                Version 4.0
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

            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={exportSchedule} className="action-btn" title="Schedule CSV">
                ⇣ csv·sched
              </button>
              <button onClick={exportPayroll} className="action-btn" title="Payroll CSV">
                ⇣ csv·pay
              </button>
              <button onClick={() => handlePrint("calendar")} className="action-btn" title="Print calendar">
                ⎙ cal
              </button>
              <button onClick={() => handlePrint("payroll")} className="action-btn" title="Print payroll">
                ⎙ pay
              </button>
              <button onClick={shareLink} className="action-btn" title="Copy read-only link">
                ⇪ share
              </button>
              <button onClick={exportJson} className="action-btn-ghost" title="Backup JSON">
                ⇣ json
              </button>
              <button
                onClick={() => importInputRef.current?.click()}
                className="action-btn-ghost"
                title="Restore from JSON"
              >
                ⇡ json
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importJson(f);
                  e.target.value = "";
                }}
              />
              <button onClick={handleReset} className="action-btn-ghost hidden md:inline">
                reset
              </button>
            </div>
          </div>

          {/* Row 2: week navigation */}
          <div className="flex items-center justify-between gap-3 py-3 border-t border-ink/20">
            <div className="flex items-center gap-2">
              <button onClick={() => jumpWeek(-1)} className="week-nav-btn" aria-label="Previous">←</button>
              <button
                onClick={gotoThisWeek}
                className={`action-btn-ghost ${isCurrentWeek ? "opacity-40" : ""}`}
                disabled={isCurrentWeek}
              >
                this week
              </button>
              <button onClick={() => jumpWeek(1)} className="week-nav-btn" aria-label="Next">→</button>
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

      {/* PANELS */}
      <div className="screen-only px-6 md:px-12 lg:px-20 pb-24">
        {tab === "schedule" && (
          <SchedulePanel
            staff={state.staff}
            schedule={week.schedule}
            manualPay={week.manualPay}
            notes={week.notes}
            leaves={week.leaves}
            dates={dates}
            violations={violations}
            setSchedule={setSchedule}
            setManualPay={setManualPay}
            setNotes={setNotes}
            setLeaves={setLeaves}
          />
        )}
        {tab === "calendar" && (
          <CalendarPanel
            staff={state.staff}
            schedule={week.schedule}
            shiftTimes={state.shiftTimes}
            dayOverrides={week.dayOverrides}
            notes={week.notes}
            leaves={week.leaves}
            dates={dates}
            violations={violations}
            setSchedule={setSchedule}
            setShiftTimes={setShiftTimes}
            setDayOverrides={setDayOverrides}
            setNotes={setNotes}
            setLeaves={setLeaves}
          />
        )}
        {tab === "staff" && (
          <StaffPanel
            staff={state.staff}
            schedule={week.schedule}
            manualPay={week.manualPay}
            leaves={week.leaves}
            setStaff={setStaff}
            setSchedule={setSchedule}
            setManualPay={setManualPay}
            setLeaves={setLeaves}
          />
        )}
        {tab === "payroll" && (
          <PayrollPanel
            staff={state.staff}
            schedule={week.schedule}
            manualPay={week.manualPay}
            leaves={week.leaves}
            setManualPay={setManualPay}
          />
        )}
      </div>

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

      {toast && <div className="toast">{toast}</div>}

      <PrintView
        mode={printMode}
        staff={state.staff}
        schedule={week.schedule}
        shiftTimes={state.shiftTimes}
        dayOverrides={week.dayOverrides}
        manualPay={week.manualPay}
        notes={week.notes}
        leaves={week.leaves}
        dates={dates}
        weekLabel={weekLabel}
      />
    </main>
  );
}

function SyncDot({ status }: { status: SyncStatus }) {
  const map: Record<SyncStatus, { color: string; label: string }> = {
    local: { color: "var(--ink-soft)", label: "local" },
    syncing: { color: "var(--ochre)", label: "syncing" },
    synced: { color: "var(--sage)", label: "synced" },
    error: { color: "var(--terracotta)", label: "sync err" },
    off: { color: "var(--ink-soft)", label: "no sync" },
  };
  const { color, label } = map[status];
  return (
    <span title={label} className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-2 h-2 rounded-full align-middle"
        style={{ background: color }}
      />
      <span className="text-[10px]">{label}</span>
    </span>
  );
}
