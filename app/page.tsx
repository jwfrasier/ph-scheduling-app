"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  DayOverrides,
  LeavesMap,
  ManualPayMap,
  NotesMap,
  RecurringLeavesMap,
  Schedule,
  STORAGE_KEY,
  Staff,
  ShiftTimes,
  WeekData,
  applyRecurring,
  buildPayrollCsv,
  buildScheduleCsv,
  dayCount,
  downloadCsv,
  downloadJson,
  encodeShare,
  fmtOrdinalDate,
  fmtTimestamp,
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

  // Keyboard shortcuts
  const [helpOpen, setHelpOpen] = useState(false);
  useEffect(() => {
    function isTyping(t: EventTarget | null): boolean {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    }
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;
      switch (e.key) {
        case "ArrowLeft":
          jumpWeek(-1);
          break;
        case "ArrowRight":
          jumpWeek(1);
          break;
        case "t":
        case "T":
          gotoThisWeek();
          break;
        case "1":
          setTab("schedule");
          break;
        case "2":
          setTab("calendar");
          break;
        case "3":
          setTab("staff");
          break;
        case "4":
          setTab("payroll");
          break;
        case "c":
        case "C":
          handlePrint("calendar");
          break;
        case "p":
        case "P":
          handlePrint("payroll");
          break;
        case "s":
        case "S":
          shareLink();
          break;
        case "?":
          setHelpOpen((o) => !o);
          break;
        case "Escape":
          setHelpOpen(false);
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

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
          [s.currentWeekKey]: { ...current, ...patch, modifiedAt: Date.now() },
        },
      };
    });
  }

  function jumpWeek(deltaWeeks: number) {
    setState((s) => {
      const next = shiftWeekKey(s.currentWeekKey, deltaWeeks);
      const seeded = applyRecurring(getOrSeedWeek(s.weeks, next), s.recurringLeaves);
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
      weeks: {
        ...s.weeks,
        [k]: applyRecurring(getOrSeedWeek(s.weeks, k), s.recurringLeaves),
      },
    }));
  }

  /* ---------- bulk operations ---------- */

  function bulkCopyToNext(n: number) {
    if (n <= 0) return;
    if (
      !confirm(
        `Copy this week's pattern to the next ${n} week${n === 1 ? "" : "s"}? Existing entries on those weeks will be overwritten.`
      )
    )
      return;
    setState((s) => {
      const src = getOrSeedWeek(s.weeks, s.currentWeekKey);
      const next = { ...s.weeks };
      let key = s.currentWeekKey;
      for (let i = 0; i < n; i++) {
        key = shiftWeekKey(key, 1);
        next[key] = {
          schedule: { ...src.schedule },
          dayOverrides: { ...src.dayOverrides },
          manualPay: { ...src.manualPay },
          notes: {},
          leaves: {},
          modifiedAt: Date.now(),
        };
      }
      return { ...s, weeks: next };
    });
    flashToast(`Copied to next ${n} week${n === 1 ? "" : "s"}`);
  }

  function bulkClearWeek() {
    if (
      !confirm(
        "Clear all shifts, notes, and leaves on this week? Manual pay entries will be reset to ₱0."
      )
    )
      return;
    updateWeek({
      schedule: {},
      dayOverrides: {},
      manualPay: {},
      notes: {},
      leaves: {},
    });
    flashToast("Week cleared");
  }

  function setRecurringLeaves(next: RecurringLeavesMap) {
    setState((s) => ({ ...s, recurringLeaves: next }));
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
      <header className="screen-only px-5 sm:px-6 md:px-12 lg:px-20 pt-6 sm:pt-10 md:pt-12 pb-6 sm:pb-8">
        <div className="grid grid-cols-12 gap-4 md:gap-6 items-end">
          <div className="col-span-12 md:col-span-7 rise">
            <h1 className="font-display text-[clamp(2.4rem,7vw,5.6rem)] leading-[0.9]">
              Roster
              <span className="italic text-terracotta"> &amp; </span>
              Payroll
            </h1>
            <div className="mt-3 font-mono text-[13px] tracking-[0.2em] uppercase text-ink-soft">
              <span className="text-ink">Week of {weekLabel}</span>
              {!isCurrentWeek && (
                <span className="text-terracotta ml-2">· archived</span>
              )}
            </div>
          </div>

          <div className="col-span-12 md:col-span-5 rise delay-2">
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[14px] font-mono tracking-wider uppercase text-ink-soft">
              <div className="flex justify-between border-b border-ink/20 py-2">
                <span>Day</span>
                <span className="text-ink">
                  {REQUIRED_DAY} · {state.shiftTimes.D.hours}h
                </span>
              </div>
              <div className="flex justify-between border-b border-ink/20 py-2">
                <span>Night</span>
                <span className="text-ink">
                  {REQUIRED_NIGHT} · {state.shiftTimes.N.hours}h
                </span>
              </div>
              <div className="flex justify-between border-b border-ink/20 py-2">
                <span>Staff</span>
                <span className="text-ink">{state.staff.length}</span>
              </div>
              <div className="flex justify-between border-b border-ink/20 py-2">
                <span>Issues</span>
                <span className={violations.length > 0 ? "text-terracotta" : "text-sage"}>
                  {violations.length === 0 ? "—" : violations.length}
                </span>
              </div>
              <div className="flex justify-between border-b border-ink/20 py-2 col-span-2">
                <span>Sync</span>
                <SyncDot status={sync} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* STICKY TAB BAR */}
      <nav className="screen-only sticky top-0 z-40 bg-paper/92 backdrop-blur-md border-y border-ink/30">
        <div className="px-5 sm:px-6 md:px-12 lg:px-20">
          <div className="flex items-stretch justify-between gap-6">
            <div className="flex items-stretch overflow-x-auto -mx-2 px-2">
              {TABS.map((tt) => {
                const active = tab === tt.id;
                return (
                  <button
                    key={tt.id}
                    onClick={() => setTab(tt.id)}
                    className={`tab-btn ${active ? "tab-btn-active" : ""}`}
                  >
                    <span className="font-display text-[20px] md:text-[24px] leading-none">
                      {tt.label}
                    </span>
                    <span className="font-mono text-[13px] tracking-widest uppercase text-ink-soft/80 hidden md:inline">
                      {counts[tt.id]}
                    </span>
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

          {/* Row 2: week navigation + bulk + audit */}
          <div className="flex items-center justify-between gap-3 py-3 border-t border-ink/20 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => jumpWeek(-1)} className="week-nav-btn" aria-label="Previous">←</button>
              <button
                onClick={gotoThisWeek}
                className={`action-btn-ghost ${isCurrentWeek ? "opacity-40" : ""}`}
                disabled={isCurrentWeek}
              >
                this week
              </button>
              <button onClick={() => jumpWeek(1)} className="week-nav-btn" aria-label="Next">→</button>

              <span className="hidden md:inline text-ink/30 mx-1">·</span>

              <button
                onClick={() => bulkCopyToNext(1)}
                className="action-btn-ghost"
                title="Copy this week's pattern to next week"
              >
                copy → next
              </button>
              <button
                onClick={() => bulkCopyToNext(4)}
                className="action-btn-ghost hidden md:inline"
                title="Copy this week's pattern to next 4 weeks"
              >
                copy → 4w
              </button>
              <button
                onClick={bulkClearWeek}
                className="action-btn-ghost"
                title="Clear all entries for this week"
              >
                clear
              </button>
              <button
                onClick={() => setHelpOpen(true)}
                className="action-btn-ghost"
                title="Keyboard shortcuts"
                aria-label="Keyboard shortcuts"
              >
                ?
              </button>
            </div>
            <div className="flex items-baseline gap-3 truncate">
              <div className="font-display text-lg md:text-xl leading-none truncate">
                {weekLabel}
              </div>
              {!isCurrentWeek && (
                <span className="font-mono text-[14px] tracking-widest uppercase text-terracotta">
                  archived
                </span>
              )}
              {isCurrentWeek && (
                <span className="font-mono text-[14px] tracking-widest uppercase text-sage">
                  · current
                </span>
              )}
              {week.modifiedAt && (
                <span
                  className="font-mono text-[14px] tracking-widest uppercase text-ink-soft hidden md:inline"
                  title={fmtTimestamp(new Date(week.modifiedAt))}
                >
                  · modified {timeAgo(week.modifiedAt)}
                </span>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* PANELS */}
      <div className="screen-only px-5 sm:px-5 sm:px-6 md:px-12 lg:px-20 pb-24">
        {tab === "schedule" && (
          <SchedulePanel
            staff={state.staff}
            schedule={week.schedule}
            manualPay={week.manualPay}
            notes={week.notes}
            leaves={week.leaves}
            dayOverrides={week.dayOverrides}
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
            recurringLeaves={state.recurringLeaves ?? {}}
            setStaff={setStaff}
            setSchedule={setSchedule}
            setManualPay={setManualPay}
            setLeaves={setLeaves}
            setRecurringLeaves={setRecurringLeaves}
            notify={flashToast}
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

      <footer className="screen-only px-5 sm:px-6 md:px-12 lg:px-20 py-6 border-t border-ink/20 font-mono text-[14px] tracking-widest uppercase text-ink-soft text-right">
        {archivedCount} week{archivedCount === 1 ? "" : "s"} on file
      </footer>

      {toast && <div className="toast">{toast}</div>}

      {helpOpen && (
        <div
          className="cell-editor-backdrop"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="cell-editor"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="cell-editor-head">
              <div>
                <div className="font-display text-2xl leading-none">
                  Keyboard
                </div>
                <div className="font-mono text-[14px] tracking-widest uppercase text-ink-soft mt-1">
                  Shortcuts &amp; tips
                </div>
              </div>
              <button onClick={() => setHelpOpen(false)} className="cell-editor-close">
                ×
              </button>
            </header>
            <ul className="cell-editor-section font-mono text-[14px] leading-loose">
              <li><kbd>←</kbd> / <kbd>→</kbd> &nbsp; previous / next week</li>
              <li><kbd>T</kbd> &nbsp; jump to this week</li>
              <li><kbd>1</kbd>–<kbd>4</kbd> &nbsp; switch tabs (schedule, calendar, staff, payroll)</li>
              <li><kbd>C</kbd> &nbsp; print calendar</li>
              <li><kbd>P</kbd> &nbsp; print payroll</li>
              <li><kbd>S</kbd> &nbsp; copy share link</li>
              <li><kbd>?</kbd> &nbsp; open this help</li>
              <li><kbd>Esc</kbd> &nbsp; close</li>
            </ul>
            <p className="cell-editor-section font-mono text-[13px] leading-relaxed text-ink-soft">
              Long-press any cell on the schedule, right-click, or
              shift-click to open the editor for shift, leave, and notes.
            </p>
          </div>
        </div>
      )}

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

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
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
      <span className="text-[14px]">{label}</span>
    </span>
  );
}
