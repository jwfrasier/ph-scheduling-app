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
};

export type Schedule = Record<string, Partial<Record<Day, ShiftKind>>>;

export type ShiftWindow = { start: string; end: string; hours: number };
export type ShiftTimes = { D: ShiftWindow; N: ShiftWindow };
export type DayOverrides = Partial<Record<Day, Partial<ShiftTimes>>>;
export type ManualPayMap = Record<string, number>;

export type WeekData = {
  schedule: Schedule;
  dayOverrides: DayOverrides;
  manualPay: ManualPayMap;
};

export const DEFAULT_SHIFT_TIMES: ShiftTimes = {
  D: { start: "06:00", end: "14:00", hours: 8 },
  N: { start: "14:00", end: "06:00", hours: 16 },
};

export const DEFAULT_STAFF: Staff[] = [
  { id: "tessie",  name: "Tessie",   role: "Senior caregiver · Sat–Wed", rate: 500, manual: true  },
  { id: "eula",    name: "Eula",     role: "Senior caregiver · Mon–Fri", rate: 500, manual: true  },
  { id: "teng",    name: "Teng",     role: "Day · weekend-leaning",      rate: 500, manual: false },
  { id: "jane",    name: "Jane",     role: "Mixed · 3 day, 2 night",     rate: 500, manual: false },
  { id: "trisha",  name: "Trisha",   role: "Night · Mon–Fri",            rate: 500, manual: false },
  { id: "jessica", name: "Jessica",  role: "Night · weekends included",  rate: 500, manual: false },
  { id: "alondra", name: "Alondra",  role: "Day · Mon–Fri",              rate: 500, manual: false },
  { id: "maryann", name: "Mary Ann", role: "Night · Sunday only",        rate: 500, manual: false },
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
};

export function blankWeek(): WeekData {
  return { schedule: {}, dayOverrides: {}, manualPay: {} };
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
      },
    },
    currentWeekKey: key,
  };
}

/** Returns a shallow-clone of the week if it exists, otherwise builds one
 *  by cloning the most recent earlier week (so a fresh week starts as a
 *  copy of last week's pattern). Falls back to the PRD defaults if there
 *  is no earlier week. */
export function getOrSeedWeek(
  weeks: Record<string, WeekData>,
  key: string
): WeekData {
  const existing = weeks[key];
  if (existing) return existing;
  const earlier = Object.keys(weeks)
    .filter((k) => k < key)
    .sort()
    .pop();
  const source: WeekData = earlier
    ? weeks[earlier]
    : {
        schedule: DEFAULT_SCHEDULE,
        dayOverrides: {},
        manualPay: { ...DEFAULT_MANUAL_PAY },
      };
  return {
    schedule: cloneSchedule(source.schedule),
    dayOverrides: { ...source.dayOverrides },
    manualPay: { ...source.manualPay },
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
  kind: ShiftKind
): Staff[] {
  return staff.filter((s) => schedule[s.id]?.[day] === kind);
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
  manualPay: ManualPayMap
): number {
  if (s.manual) return manualPay[s.id] ?? 0;
  return shiftCount(schedule, s.id) * s.rate;
}

export function totals(
  staff: Staff[],
  schedule: Schedule,
  manualPay: ManualPayMap
) {
  const auto = staff
    .filter((s) => !s.manual)
    .reduce((sum, s) => sum + shiftCount(schedule, s.id) * s.rate, 0);
  const manual = staff
    .filter((s) => s.manual)
    .reduce((sum, s) => sum + (manualPay[s.id] ?? 0), 0);
  return { auto, manual, grand: auto + manual };
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

/* ---------- persistence + migration ---------- */

export const STORAGE_KEY = "childrens-home-roster-v2";

export function loadState(): AppState {
  if (typeof window === "undefined") return makeDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return makeDefaultState();
    const parsed = JSON.parse(raw);

    // Already on the multi-week schema
    if (parsed?.weeks && parsed?.currentWeekKey) {
      return {
        staff: (parsed.staff ?? DEFAULT_STAFF).map(stripStaff),
        shiftTimes: parsed.shiftTimes ?? DEFAULT_SHIFT_TIMES,
        weeks: parsed.weeks,
        currentWeekKey: parsed.currentWeekKey,
      };
    }

    // Old single-week schema → migrate
    const key = thisWeekKey();
    const manualPay: ManualPayMap = {};
    const oldStaff = (parsed.staff ?? DEFAULT_STAFF) as Array<
      Staff & { manualPay?: number }
    >;
    const cleanStaff = oldStaff.map((s) => {
      if (typeof s.manualPay === "number") manualPay[s.id] = s.manualPay;
      return stripStaff(s);
    });
    return {
      staff: cleanStaff,
      shiftTimes: parsed.shiftTimes ?? DEFAULT_SHIFT_TIMES,
      weeks: {
        [key]: {
          schedule: parsed.schedule ?? DEFAULT_SCHEDULE,
          dayOverrides: parsed.dayOverrides ?? {},
          manualPay:
            Object.keys(manualPay).length > 0
              ? manualPay
              : { ...DEFAULT_MANUAL_PAY },
        },
      },
      currentWeekKey: key,
    };
  } catch {
    return makeDefaultState();
  }
}

function stripStaff(s: Staff & { manualPay?: number }): Staff {
  return {
    id: s.id,
    name: s.name,
    role: s.role,
    rate: s.rate,
    manual: s.manual,
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

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/* ---------- export helpers ---------- */

export function buildScheduleCsv(
  staff: Staff[],
  schedule: Schedule,
  manualPay: ManualPayMap,
  weekLabel: string
): string {
  const head = ["Caregiver", "Role", ...DAYS, "Shifts", "Rate", "Pay"];
  const rows = staff.map((s) => {
    const row = schedule[s.id] ?? {};
    const cells = DAYS.map((d) => row[d] ?? "");
    const c = shiftCount(schedule, s.id);
    return [
      s.name,
      s.role,
      ...cells,
      String(c),
      s.manual ? "manual" : `₱${s.rate}`,
      String(staffPay(s, schedule, manualPay)),
    ];
  });
  const t = totals(staff, schedule, manualPay);
  const blank: string[] = new Array(head.length).fill("");
  rows.push(blank);
  rows.push([`Week of ${weekLabel}`, ...blank.slice(1)]);
  rows.push([
    "Auto subtotal",
    ...blank.slice(1, head.length - 1),
    String(t.auto),
  ]);
  rows.push([
    "Manual subtotal",
    ...blank.slice(1, head.length - 1),
    String(t.manual),
  ]);
  rows.push([
    "Grand total",
    ...blank.slice(1, head.length - 1),
    String(t.grand),
  ]);

  return toCsv([head, ...rows]);
}

export function buildPayrollCsv(
  staff: Staff[],
  schedule: Schedule,
  manualPay: ManualPayMap,
  weekLabel: string
): string {
  const head = ["Caregiver", "Role", "Type", "Shifts", "Rate", "Pay"];
  const rows: string[][] = [];
  rows.push([`Week of ${weekLabel}`, "", "", "", "", ""]);
  rows.push([]);

  const auto = staff.filter((s) => !s.manual);
  const manual = staff.filter((s) => s.manual);

  if (auto.length > 0) rows.push(["AUTO", "", "", "", "", ""]);
  for (const s of auto) {
    const c = shiftCount(schedule, s.id);
    rows.push([
      s.name,
      s.role,
      "auto",
      String(c),
      String(s.rate),
      String(c * s.rate),
    ]);
  }
  if (manual.length > 0) {
    rows.push([]);
    rows.push(["MANUAL", "", "", "", "", ""]);
  }
  for (const s of manual) {
    const c = shiftCount(schedule, s.id);
    rows.push([
      s.name,
      s.role,
      "manual",
      String(c),
      "—",
      String(manualPay[s.id] ?? 0),
    ]);
  }

  const t = totals(staff, schedule, manualPay);
  rows.push([]);
  rows.push(["Auto subtotal", "", "", "", "", String(t.auto)]);
  rows.push(["Manual subtotal", "", "", "", "", String(t.manual)]);
  rows.push(["Grand total", "", "", "", "", String(t.grand)]);

  return toCsv([head, ...rows]);
}

function toCsv(rows: string[][]): string {
  const escape = (s: string) =>
    /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  return rows.map((r) => r.map(escape).join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
