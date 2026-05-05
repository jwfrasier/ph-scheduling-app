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
  manualPay: number;
};

export type Schedule = Record<string, Partial<Record<Day, ShiftKind>>>;

export type ShiftWindow = { start: string; end: string; hours: number };
export type ShiftTimes = {
  D: ShiftWindow;
  N: ShiftWindow;
};
export type DayOverrides = Partial<Record<Day, Partial<ShiftTimes>>>;

export const DEFAULT_SHIFT_TIMES: ShiftTimes = {
  D: { start: "06:00", end: "14:00", hours: 8 },
  N: { start: "14:00", end: "06:00", hours: 16 },
};

export const DEFAULT_STAFF: Staff[] = [
  { id: "tessie",   name: "Tessie",   role: "Senior caregiver · Sat–Wed",     rate: 500, manual: true,  manualPay: 3000 },
  { id: "eula",     name: "Eula",     role: "Senior caregiver · Mon–Fri",     rate: 500, manual: true,  manualPay: 3000 },
  { id: "teng",     name: "Teng",     role: "Day · weekend-leaning",          rate: 500, manual: false, manualPay: 0 },
  { id: "jane",     name: "Jane",     role: "Mixed · 3 day, 2 night",         rate: 500, manual: false, manualPay: 0 },
  { id: "trisha",   name: "Trisha",   role: "Night · Mon–Fri",                rate: 500, manual: false, manualPay: 0 },
  { id: "jessica",  name: "Jessica",  role: "Night · weekends included",      rate: 500, manual: false, manualPay: 0 },
  { id: "alondra",  name: "Alondra",  role: "Day · Mon–Fri",                  rate: 500, manual: false, manualPay: 0 },
  { id: "maryann",  name: "Mary Ann", role: "Night · Sunday only",            rate: 500, manual: false, manualPay: 0 },
  { id: "j",        name: "J",        role: "Flexible night cover",           rate: 500, manual: false, manualPay: 0 },
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

export function staffPay(s: Staff, schedule: Schedule): number {
  if (s.manual) return s.manualPay || 0;
  return shiftCount(schedule, s.id) * s.rate;
}

export function totals(staff: Staff[], schedule: Schedule) {
  const auto = staff
    .filter((s) => !s.manual)
    .reduce((sum, s) => sum + shiftCount(schedule, s.id) * s.rate, 0);
  const manual = staff
    .filter((s) => s.manual)
    .reduce((sum, s) => sum + (s.manualPay || 0), 0);
  return { auto, manual, grand: auto + manual };
}

export type AppState = {
  staff: Staff[];
  schedule: Schedule;
  shiftTimes: ShiftTimes;
  dayOverrides: DayOverrides;
};

export const DEFAULT_STATE: AppState = {
  staff: DEFAULT_STAFF,
  schedule: DEFAULT_SCHEDULE,
  shiftTimes: DEFAULT_SHIFT_TIMES,
  dayOverrides: {},
};

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

export const STORAGE_KEY = "childrens-home-roster-v2";

export function loadState(): AppState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      staff: parsed.staff ?? DEFAULT_STAFF,
      schedule: parsed.schedule ?? DEFAULT_SCHEDULE,
      shiftTimes: parsed.shiftTimes ?? DEFAULT_SHIFT_TIMES,
      dayOverrides: parsed.dayOverrides ?? {},
    };
  } catch {
    return DEFAULT_STATE;
  }
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

/* ---------- week dates ---------- */

export function weekDates(reference: Date = new Date()): Record<Day, Date> {
  const ref = new Date(reference);
  ref.setHours(0, 0, 0, 0);
  const sundayOffset = ref.getDay();
  const sunday = new Date(ref);
  sunday.setDate(ref.getDate() - sundayOffset);
  const out = {} as Record<Day, Date>;
  DAYS.forEach((d, i) => {
    const dt = new Date(sunday);
    dt.setDate(sunday.getDate() + i);
    out[d] = dt;
  });
  return out;
}

export function fmtDayDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function fmtOrdinalDate(d: Date): string {
  const day = d.getDate();
  const j = day % 10;
  const k = day % 100;
  const suffix =
    j === 1 && k !== 11 ? "st" :
    j === 2 && k !== 12 ? "nd" :
    j === 3 && k !== 13 ? "rd" : "th";
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

export function buildCsv(staff: Staff[], schedule: Schedule): string {
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
      String(staffPay(s, schedule)),
    ];
  });
  const t = totals(staff, schedule);
  rows.push([]);
  rows.push(["Auto subtotal", "", "", "", "", "", "", "", "", "", "", String(t.auto)]);
  rows.push(["Manual subtotal", "", "", "", "", "", "", "", "", "", "", String(t.manual)]);
  rows.push(["Grand total", "", "", "", "", "", "", "", "", "", "", String(t.grand)]);

  const escape = (s: string) =>
    /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  return [head, ...rows].map((r) => r.map(escape).join(",")).join("\n");
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
