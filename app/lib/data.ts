export type ShiftKind = "D" | "N";
export type Day = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

export const DAYS: Day[] = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const DAYS_LONG: Record<Day, string> = {
  Sun: "Sunday",
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
};

export const REQUIRED_DAY = 3;
export const REQUIRED_NIGHT = 2;
export const MAX_SHIFTS = 5;
export const DEFAULT_RATE = 500;

export type Staff = {
  id: string;
  name: string;
  role: string;
  rate: number;
  manual: boolean;
  /** Optional hard constraints — used by lint(). */
  allowedDays?: Day[];
};

export type Schedule = Record<string, Partial<Record<Day, ShiftKind>>>;

export type ShiftWindow = { start: string; end: string; hours: number };
export type ShiftTimes = { D: ShiftWindow; N: ShiftWindow };

export type DayOverride = {
  D?: Partial<ShiftWindow>;
  N?: Partial<ShiftWindow>;
  required?: { D?: number; N?: number };
};
export type DayOverrides = Partial<Record<Day, DayOverride>>;
export type ManualPayMap = Record<string, number>;

export type LeaveType = "vacation" | "sick" | "training" | "holiday";
export const LEAVE_LABELS: Record<LeaveType, string> = {
  vacation: "Vacation",
  sick: "Sick",
  training: "Training",
  holiday: "Holiday",
};

export type Leave = { type: LeaveType; note?: string };
export type LeavesMap = Record<string, Partial<Record<Day, Leave>>>;
export type NotesMap = Record<string, Partial<Record<Day, string>>>;

export type WeekData = {
  schedule: Schedule;
  dayOverrides: DayOverrides;
  manualPay: ManualPayMap;
  notes: NotesMap;
  leaves: LeavesMap;
  /** Unix ms of last edit. Set on any week-scoped setter. */
  modifiedAt?: number;
};

/** Per-staff recurring leave by weekday — applied when a new week seeds. */
export type RecurringLeavesMap = Record<string, Partial<Record<Day, LeaveType>>>;

export const DEFAULT_SHIFT_TIMES: ShiftTimes = {
  D: { start: "08:00", end: "17:00", hours: 9 },
  N: { start: "17:00", end: "08:00", hours: 15 },
};

export const ORG_SHORT = "MCCH";
export const ORG_FULL = "Manaoag Christian Children's Home";

/** Salaried staff are paid twice per month; per-shift staff are paid weekly. */
export const SALARIED_LABEL = "Bi-monthly";
export const PER_SHIFT_LABEL = "Weekly";

export const DEFAULT_STAFF: Staff[] = [
  { id: "tessie",  name: "Tessie",   role: "Senior caregiver · Sat–Wed", rate: 500, manual: true,  allowedDays: ["Sat", "Sun", "Mon", "Tue", "Wed"] },
  { id: "eula",    name: "Eula",     role: "Senior caregiver · Mon–Fri", rate: 500, manual: true,  allowedDays: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  { id: "teng",    name: "Teng",     role: "Day · weekend-leaning",      rate: 500, manual: false },
  { id: "jane",    name: "Jane",     role: "Mixed · 3 day, 2 night",     rate: 500, manual: false },
  { id: "trisha",  name: "Trisha",   role: "Night · Mon–Fri",            rate: 500, manual: false, allowedDays: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  { id: "jessica", name: "Jessica",  role: "Night · weekends included",  rate: 500, manual: false },
  { id: "alondra", name: "Alondra",  role: "Day · Mon–Fri",              rate: 500, manual: false, allowedDays: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
  { id: "maryann", name: "Mary Ann", role: "Night · Sunday only",        rate: 500, manual: false, allowedDays: ["Sun"] },
  { id: "j",       name: "J",        role: "Flexible night cover",       rate: 500, manual: false },
];

export const DEFAULT_SCHEDULE: Schedule = {
  tessie:  { Sun: "D", Mon: "D", Tue: "D", Wed: "D", Sat: "D" },
  eula:    { Mon: "D", Tue: "D", Wed: "D", Thu: "D", Fri: "D" },
  teng:    { Sun: "D", Thu: "D", Fri: "D", Sat: "D" },
  jane:    { Sun: "D", Tue: "D", Thu: "N", Fri: "N", Sat: "D" },
  trisha:  { Mon: "N", Tue: "N", Wed: "N", Thu: "N", Fri: "N" },
  jessica: { Sun: "N", Mon: "N", Tue: "N", Wed: "N", Sat: "N" },
  alondra: { Mon: "D", Tue: "D", Wed: "D", Thu: "D", Fri: "D" },
  maryann: { Sun: "N" },
  j:       { Fri: "N", Sat: "N" },
};

export const DEFAULT_MANUAL_PAY: ManualPayMap = { tessie: 3000, eula: 3000 };

/* ---------- week keys ---------- */

export function weekKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d + "T00:00:00") : new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay());
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function shiftWeekKey(key: string, weeks: number): string {
  const d = new Date(key + "T00:00:00");
  d.setDate(d.getDate() + weeks * 7);
  return weekKey(d);
}

export function weekDatesFromKey(key: string): Record<Day, Date> {
  const sunday = new Date(key + "T00:00:00");
  const out = {} as Record<Day, Date>;
  DAYS.forEach((d, i) => {
    const dt = new Date(sunday);
    dt.setDate(sunday.getDate() + i);
    out[d] = dt;
  });
  return out;
}

export function thisWeekKey(): string {
  return weekKey(new Date());
}

/* ---------- state ---------- */

export type AppState = {
  staff: Staff[];
  shiftTimes: ShiftTimes;
  weeks: Record<string, WeekData>;
  currentWeekKey: string;
  recurringLeaves?: RecurringLeavesMap;
};

export function blankWeek(): WeekData {
  return { schedule: {}, dayOverrides: {}, manualPay: {}, notes: {}, leaves: {} };
}

/** Apply recurring leaves into a fresh week's leaves map. */
export function applyRecurring(
  base: WeekData,
  recurring?: RecurringLeavesMap
): WeekData {
  if (!recurring) return base;
  const leaves: LeavesMap = { ...base.leaves };
  for (const id of Object.keys(recurring)) {
    const row = recurring[id] ?? {};
    for (const d of Object.keys(row) as Day[]) {
      const t = row[d];
      if (!t) continue;
      if (!leaves[id]) leaves[id] = {};
      // don't overwrite an existing leave entry on the week
      if (!leaves[id][d]) leaves[id]![d] = { type: t };
    }
  }
  return { ...base, leaves };
}

export function makeDefaultState(): AppState {
  const key = thisWeekKey();
  return {
    staff: DEFAULT_STAFF,
    shiftTimes: DEFAULT_SHIFT_TIMES,
    weeks: {
      [key]: {
        schedule: DEFAULT_SCHEDULE,
        dayOverrides: {},
        manualPay: { ...DEFAULT_MANUAL_PAY },
        notes: {},
        leaves: {},
      },
    },
    currentWeekKey: key,
  };
}

export function getOrSeedWeek(
  weeks: Record<string, WeekData>,
  key: string
): WeekData {
  const existing = weeks[key];
  if (existing) return ensureWeekShape(existing);
  const earlier = Object.keys(weeks)
    .filter((k) => k < key)
    .sort()
    .pop();
  const source: WeekData = earlier
    ? ensureWeekShape(weeks[earlier])
    : {
        schedule: DEFAULT_SCHEDULE,
        dayOverrides: {},
        manualPay: { ...DEFAULT_MANUAL_PAY },
        notes: {},
        leaves: {},
      };
  return {
    schedule: cloneSchedule(source.schedule),
    dayOverrides: { ...source.dayOverrides },
    manualPay: { ...source.manualPay },
    notes: {}, // notes do NOT carry forward — new week, fresh slate
    leaves: {}, // same for leaves
  };
}

function ensureWeekShape(w: WeekData): WeekData {
  return {
    schedule: w.schedule ?? {},
    dayOverrides: w.dayOverrides ?? {},
    manualPay: w.manualPay ?? {},
    notes: w.notes ?? {},
    leaves: w.leaves ?? {},
    modifiedAt: w.modifiedAt,
  };
}

function cloneSchedule(s: Schedule): Schedule {
  const out: Schedule = {};
  for (const k of Object.keys(s)) out[k] = { ...s[k] };
  return out;
}

/* ---------- counts and money ---------- */

export function shiftCount(schedule: Schedule, id: string): number {
  const row = schedule[id];
  if (!row) return 0;
  return DAYS.reduce((n, d) => n + (row[d] ? 1 : 0), 0);
}

export function dayCount(
  schedule: Schedule,
  staff: Staff[],
  day: Day,
  kind: ShiftKind,
  leaves: LeavesMap = {}
): Staff[] {
  return staff.filter(
    (s) => schedule[s.id]?.[day] === kind && !leaves[s.id]?.[day]
  );
}

export function pesos(n: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  })
    .format(n)
    .replace("PHP", "₱");
}

export function staffPay(
  s: Staff,
  schedule: Schedule,
  manualPay: ManualPayMap,
  leaves: LeavesMap = {}
): number {
  if (s.manual) return manualPay[s.id] ?? 0;
  // auto: only paid for shifts not on leave
  const row = schedule[s.id] ?? {};
  let n = 0;
  for (const d of DAYS) {
    if (row[d] && !leaves[s.id]?.[d]) n++;
  }
  return n * s.rate;
}

/**
 * Returns four figures:
 *   weekly  — sum of per-shift staff pay for the current week
 *   salariedPerPeriod — sum of salaried staff's bi-monthly amount
 *   salariedWeeklyShare — salariedPerPeriod × 2 ÷ ~4.33 weeks/month, expressed
 *     as a per-week pro-rated figure (24 pay periods / 52 weeks ≈ 0.462)
 *   grand   — weekly + salariedWeeklyShare (apples-to-apples weekly view)
 */
export function totals(
  staff: Staff[],
  schedule: Schedule,
  manualPay: ManualPayMap,
  leaves: LeavesMap = {}
) {
  const weekly = staff
    .filter((s) => !s.manual)
    .reduce((sum, s) => sum + staffPay(s, schedule, manualPay, leaves), 0);
  const salariedPerPeriod = staff
    .filter((s) => s.manual)
    .reduce((sum, s) => sum + (manualPay[s.id] ?? 0), 0);
  // 24 bi-monthly pay periods per year ÷ 52 weeks ≈ 0.4615 of one period per
  // week. Used only when showing an apples-to-apples weekly figure.
  const salariedWeeklyShare = Math.round(salariedPerPeriod * (24 / 52));
  return {
    weekly,
    salariedPerPeriod,
    salariedWeeklyShare,
    grand: weekly + salariedWeeklyShare,
    // Legacy aliases retained so existing call sites keep compiling
    auto: weekly,
    manual: salariedPerPeriod,
  };
}

export function effectiveTimes(
  base: ShiftTimes,
  overrides: DayOverrides,
  day: Day
): ShiftTimes {
  const o = overrides[day];
  return {
    D: { ...base.D, ...(o?.D ?? {}) },
    N: { ...base.N, ...(o?.N ?? {}) },
  };
}

export function effectiveRequired(
  overrides: DayOverrides,
  day: Day
): { D: number; N: number } {
  const o = overrides[day]?.required ?? {};
  return {
    D: o.D ?? REQUIRED_DAY,
    N: o.N ?? REQUIRED_NIGHT,
  };
}

/* ---------- lint ---------- */

export type Violation =
  | {
      kind: "double-booked";
      staffId: string;
      day: Day;
      message: string;
    }
  | {
      kind: "over-cap";
      staffId: string;
      count: number;
      message: string;
    }
  | {
      kind: "constraint";
      staffId: string;
      day: Day;
      message: string;
    }
  | {
      kind: "coverage";
      day: Day;
      shift: ShiftKind;
      have: number;
      need: number;
      message: string;
    }
  | {
      kind: "leave-conflict";
      staffId: string;
      day: Day;
      message: string;
    };

export function lint(
  staff: Staff[],
  week: WeekData
): Violation[] {
  const issues: Violation[] = [];
  const byId = new Map(staff.map((s) => [s.id, s]));
  const { schedule, leaves, dayOverrides } = week;

  // Per-staff checks
  for (const s of staff) {
    const row = schedule[s.id] ?? {};
    let count = 0;
    for (const d of DAYS) {
      const k = row[d];
      if (k) count++;
      if (k && s.allowedDays && !s.allowedDays.includes(d)) {
        issues.push({
          kind: "constraint",
          staffId: s.id,
          day: d,
          message: `${s.name} is rostered ${d} but constraint says ${s.allowedDays.join("/")} only.`,
        });
      }
      if (k && leaves[s.id]?.[d]) {
        issues.push({
          kind: "leave-conflict",
          staffId: s.id,
          day: d,
          message: `${s.name} is on leave ${d} but still rostered for a shift.`,
        });
      }
    }
    if (count > MAX_SHIFTS) {
      issues.push({
        kind: "over-cap",
        staffId: s.id,
        count,
        message: `${s.name} is over the ${MAX_SHIFTS}-shift weekly cap (${count}).`,
      });
    }
  }

  // A single (staff, day) cell can only hold D or N — schedule shape prevents
  // double-booking, but a leave + a shift on the same day is its own issue
  // already covered above.

  // Coverage per day
  for (const d of DAYS) {
    const req = effectiveRequired(dayOverrides, d);
    const dN = dayCount(schedule, staff, d, "D", leaves).length;
    const nN = dayCount(schedule, staff, d, "N", leaves).length;
    if (dN !== req.D) {
      issues.push({
        kind: "coverage",
        day: d,
        shift: "D",
        have: dN,
        need: req.D,
        message: `${d} day shift has ${dN} caregivers, target ${req.D}.`,
      });
    }
    if (nN !== req.N) {
      issues.push({
        kind: "coverage",
        day: d,
        shift: "N",
        have: nN,
        need: req.N,
        message: `${d} night shift has ${nN} caregivers, target ${req.N}.`,
      });
    }
  }

  return issues;
}

/* ---------- persistence + migration ---------- */

export const STORAGE_KEY = "childrens-home-roster-v3";
const LEGACY_KEYS = ["childrens-home-roster-v2"];

export function loadState(): AppState {
  if (typeof window === "undefined") return makeDefaultState();
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      for (const k of LEGACY_KEYS) {
        const legacy = localStorage.getItem(k);
        if (legacy) {
          raw = legacy;
          break;
        }
      }
    }
    if (!raw) return makeDefaultState();
    return parseState(JSON.parse(raw));
  } catch {
    return makeDefaultState();
  }
}

/** Ensure any staff id referenced in any week's schedule is also in the
 *  staff list. Looks up names from DEFAULT_STAFF when available; otherwise
 *  creates a stub. This protects against stale states losing staff. */
export function repairState(state: AppState): AppState {
  const known = new Set(state.staff.map((s) => s.id));
  const referenced = new Set<string>();
  for (const wk of Object.values(state.weeks)) {
    for (const id of Object.keys(wk.schedule ?? {})) referenced.add(id);
    for (const id of Object.keys(wk.manualPay ?? {})) referenced.add(id);
    for (const id of Object.keys(wk.leaves ?? {})) referenced.add(id);
    for (const id of Object.keys(wk.notes ?? {})) referenced.add(id);
  }
  const missingIds = [...referenced].filter((id) => !known.has(id));
  if (missingIds.length === 0) return state;
  const restored: Staff[] = missingIds.map((id) => {
    const def = DEFAULT_STAFF.find((d) => d.id === id);
    return (
      def ?? {
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        role: "Restored caregiver",
        rate: DEFAULT_RATE,
        manual: false,
      }
    );
  });
  return { ...state, staff: [...state.staff, ...restored] };
}

export function parseState(parsed: unknown): AppState {
  if (!parsed || typeof parsed !== "object") return makeDefaultState();
  const p = parsed as Record<string, unknown>;

  // Multi-week schema (v2+)
  if (p.weeks && p.currentWeekKey) {
    const weeks = p.weeks as Record<string, WeekData>;
    const filled: Record<string, WeekData> = {};
    for (const k of Object.keys(weeks)) filled[k] = ensureWeekShape(weeks[k]);
    return repairState({
      staff: ((p.staff as Staff[]) ?? DEFAULT_STAFF).map(stripStaff),
      shiftTimes: (p.shiftTimes as ShiftTimes) ?? DEFAULT_SHIFT_TIMES,
      weeks: filled,
      currentWeekKey: p.currentWeekKey as string,
      recurringLeaves: (p.recurringLeaves as RecurringLeavesMap) ?? {},
    });
  }

  // Old single-week schema → migrate
  if (p.schedule) {
    const key = thisWeekKey();
    const manualPay: ManualPayMap = {};
    const oldStaff = (p.staff as Array<Staff & { manualPay?: number }>) ?? DEFAULT_STAFF;
    const cleanStaff = oldStaff.map((s) => {
      if (typeof s.manualPay === "number") manualPay[s.id] = s.manualPay;
      return stripStaff(s);
    });
    return {
      staff: cleanStaff,
      shiftTimes: (p.shiftTimes as ShiftTimes) ?? DEFAULT_SHIFT_TIMES,
      weeks: {
        [key]: {
          schedule: (p.schedule as Schedule) ?? DEFAULT_SCHEDULE,
          dayOverrides: (p.dayOverrides as DayOverrides) ?? {},
          manualPay:
            Object.keys(manualPay).length > 0
              ? manualPay
              : { ...DEFAULT_MANUAL_PAY },
          notes: {},
          leaves: {},
        },
      },
      currentWeekKey: key,
    };
  }

  return makeDefaultState();
}

function stripStaff(s: Staff & { manualPay?: number }): Staff {
  return {
    id: s.id,
    name: s.name,
    role: s.role,
    rate: s.rate,
    manual: s.manual,
    allowedDays: s.allowedDays,
  };
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

/* ---------- date formatting ---------- */

export function fmtDayDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function fmtOrdinalDate(d: Date): string {
  const day = d.getDate();
  const j = day % 10;
  const k = day % 100;
  const suffix =
    j === 1 && k !== 11
      ? "st"
      : j === 2 && k !== 12
      ? "nd"
      : j === 3 && k !== 13
      ? "rd"
      : "th";
  return `${d.toLocaleDateString("en-US", { month: "long" })} ${day}${suffix}`;
}

/** "08:00" → "8am", "17:30" → "5:30pm". Pass any HH:MM string. */
export function fmt12Hour(hhmm: string): string {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return hhmm;
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h >= 12 ? "pm" : "am";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, "0")}${period}`;
}

export function fmtTimestamp(d: Date = new Date()): string {
  return (
    d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }) +
    " · " +
    d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/* ---------- shareable encoding ---------- */

/** A compact, URL-safe payload of a single week + roster + times. */
export type SharePayload = {
  staff: Staff[];
  shiftTimes: ShiftTimes;
  weekKey: string;
  week: WeekData;
};

export function encodeShare(p: SharePayload): string {
  const json = JSON.stringify(p);
  if (typeof window === "undefined") {
    return Buffer.from(json, "utf-8").toString("base64url");
  }
  // browser path
  const b64 =
    btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  return b64;
}

export function decodeShare(code: string): SharePayload | null {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "===".slice((b64.length + 3) % 4);
    let json: string;
    if (typeof window === "undefined") {
      json = Buffer.from(padded, "base64").toString("utf-8");
    } else {
      json = decodeURIComponent(escape(atob(padded)));
    }
    const obj = JSON.parse(json);
    if (!obj || !obj.staff || !obj.week || !obj.weekKey) return null;
    return obj as SharePayload;
  } catch {
    return null;
  }
}

/* ---------- export helpers ---------- */

export function buildScheduleCsv(
  staff: Staff[],
  schedule: Schedule,
  manualPay: ManualPayMap,
  leaves: LeavesMap,
  weekLabel: string
): string {
  const head = ["Caregiver", "Role", ...DAYS, "Shifts", "Rate", "Pay"];
  const rows = staff.map((s) => {
    const row = schedule[s.id] ?? {};
    const cells = DAYS.map((d) => {
      const lv = leaves[s.id]?.[d];
      if (lv) return lv.type.toUpperCase();
      return row[d] ?? "";
    });
    let count = 0;
    for (const d of DAYS) if (row[d] && !leaves[s.id]?.[d]) count++;
    return [
      s.name,
      s.role,
      ...cells,
      String(count),
      s.manual ? "manual" : `₱${s.rate}`,
      String(staffPay(s, schedule, manualPay, leaves)),
    ];
  });
  const t = totals(staff, schedule, manualPay, leaves);
  const blank: string[] = new Array(head.length).fill("");
  rows.push(blank);
  rows.push([`Week of ${weekLabel}`, ...blank.slice(1)]);
  rows.push(["Per-shift weekly", ...blank.slice(1, head.length - 1), String(t.weekly)]);
  rows.push(["Salaried bi-monthly (per period)", ...blank.slice(1, head.length - 1), String(t.salariedPerPeriod)]);
  rows.push(["Weekly run-rate", ...blank.slice(1, head.length - 1), String(t.grand)]);

  return toCsv([head, ...rows]);
}

export function buildPayrollCsv(
  staff: Staff[],
  schedule: Schedule,
  manualPay: ManualPayMap,
  leaves: LeavesMap,
  weekLabel: string
): string {
  const head = ["Caregiver", "Role", "Type", "Shifts", "Rate", "Pay"];
  const rows: string[][] = [];
  rows.push([`Week of ${weekLabel}`, "", "", "", "", ""]);
  rows.push([]);

  const auto = staff.filter((s) => !s.manual);
  const manual = staff.filter((s) => s.manual);

  if (auto.length > 0)
    rows.push(["PER-SHIFT (weekly)", "", "", "", "", ""]);
  for (const s of auto) {
    let c = 0;
    const row = schedule[s.id] ?? {};
    for (const d of DAYS) if (row[d] && !leaves[s.id]?.[d]) c++;
    rows.push([s.name, s.role, "auto", String(c), String(s.rate), String(c * s.rate)]);
  }
  if (manual.length > 0) {
    rows.push([]);
    rows.push(["SALARIED (bi-monthly · per period)", "", "", "", "", ""]);
  }
  for (const s of manual) {
    let c = 0;
    const row = schedule[s.id] ?? {};
    for (const d of DAYS) if (row[d] && !leaves[s.id]?.[d]) c++;
    rows.push([s.name, s.role, "manual", String(c), "—", String(manualPay[s.id] ?? 0)]);
  }

  const t = totals(staff, schedule, manualPay, leaves);
  rows.push([]);
  rows.push(["Per-shift weekly subtotal", "", "", "", "", String(t.weekly)]);
  rows.push(["Salaried bi-monthly subtotal", "", "", "", "", String(t.salariedPerPeriod)]);
  rows.push(["Weekly run-rate (incl. salary pro-rate)", "", "", "", "", String(t.grand)]);

  return toCsv([head, ...rows]);
}

function toCsv(rows: string[][]): string {
  const escape = (s: string) =>
    /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  return rows.map((r) => r.map(escape).join(",")).join("\n");
}

/* ---------- iCal generation ---------- */

export function buildIcs(opts: {
  staff: Staff[];
  shiftTimes: ShiftTimes;
  weekKey: string;
  week: WeekData;
  /** If set, only emit events for this staff id. */
  filterStaffId?: string;
  prodId?: string;
}): string {
  const { staff, shiftTimes, weekKey, week, filterStaffId } = opts;
  const dates = weekDatesFromKey(weekKey);
  const lines: string[] = [];
  const stamp = formatIcsTime(new Date());

  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push(`PRODID:-//mcch-weekly-schedule//EN`);
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push(`X-WR-CALNAME:${ORG_SHORT} Weekly Schedule`);

  for (const s of staff) {
    if (filterStaffId && s.id !== filterStaffId) continue;
    const row = week.schedule[s.id] ?? {};
    for (const d of DAYS) {
      const kind = row[d];
      if (!kind) continue;
      if (week.leaves[s.id]?.[d]) continue;
      const w = effectiveTimes(shiftTimes, week.dayOverrides, d)[kind];
      const startDt = combineDateTime(dates[d], w.start);
      const endDt = combineDateTime(dates[d], w.end);
      // night shift wraps past midnight if end < start
      if (endDt.getTime() <= startDt.getTime()) {
        endDt.setDate(endDt.getDate() + 1);
      }
      const note = week.notes[s.id]?.[d];
      const summary = `${kind === "D" ? "Day" : "Night"} shift · ${s.name}`;
      const desc = [
        `Caregiver: ${s.name}`,
        `Role: ${s.role}`,
        note ? `Note: ${note}` : null,
      ]
        .filter(Boolean)
        .join("\\n");
      const uid = `${weekKey}-${s.id}-${d}-${kind}@childrens-home`;

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART:${formatIcsTime(startDt)}`);
      lines.push(`DTEND:${formatIcsTime(endDt)}`);
      lines.push(`SUMMARY:${escapeIcs(summary)}`);
      if (desc) lines.push(`DESCRIPTION:${escapeIcs(desc)}`);
      lines.push("END:VEVENT");
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function combineDateTime(date: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const out = new Date(date);
  out.setHours(h ?? 0, m ?? 0, 0, 0);
  return out;
}

function formatIcsTime(d: Date): string {
  // Floating local time. Subscribers will interpret in their own zone, which
  // matches how staff use the schedule on their phones.
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear().toString() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

export function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  triggerDownload(blob, filename);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
