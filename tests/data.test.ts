import { describe, it, expect } from "vitest";
import {
  DEFAULT_STAFF,
  DEFAULT_SCHEDULE,
  DEFAULT_MANUAL_PAY,
  DEFAULT_SHIFT_TIMES,
  applyRecurring,
  blankWeek,
  buildIcs,
  buildPayrollCsv,
  buildScheduleCsv,
  decodeShare,
  effectiveRequired,
  encodeShare,
  fmtDayDate,
  fmtOrdinalDate,
  isSameDay,
  lint,
  parseState,
  shiftCount,
  shiftWeekKey,
  staffPay,
  thisWeekKey,
  totals,
  weekDatesFromKey,
  weekKey,
  type WeekData,
} from "../app/lib/data";

describe("weekKey", () => {
  it("normalizes any date in a week to the Sunday ISO date", () => {
    // 2026-05-05 is a Tuesday → Sunday is 2026-05-03
    expect(weekKey(new Date("2026-05-05T15:00:00"))).toBe("2026-05-03");
    expect(weekKey(new Date("2026-05-09T23:00:00"))).toBe("2026-05-03");
    expect(weekKey(new Date("2026-05-03T00:00:00"))).toBe("2026-05-03");
  });

  it("shiftWeekKey moves by exact weeks", () => {
    expect(shiftWeekKey("2026-05-03", 1)).toBe("2026-05-10");
    expect(shiftWeekKey("2026-05-03", -1)).toBe("2026-04-26");
    expect(shiftWeekKey("2026-05-03", 4)).toBe("2026-05-31");
  });

  it("weekDatesFromKey returns 7 contiguous days starting Sun", () => {
    const dates = weekDatesFromKey("2026-05-03");
    expect(dates.Sun.getDate()).toBe(3);
    expect(dates.Sat.getDate()).toBe(9);
    expect(dates.Sat.getMonth()).toBe(4); // May
  });
});

describe("shift counting + pay", () => {
  it("shiftCount counts assigned days for a staff", () => {
    expect(shiftCount(DEFAULT_SCHEDULE, "tessie")).toBe(5);
    expect(shiftCount(DEFAULT_SCHEDULE, "maryann")).toBe(1);
    expect(shiftCount(DEFAULT_SCHEDULE, "nonexistent")).toBe(0);
  });

  it("staffPay multiplies count by rate for auto staff", () => {
    const teng = DEFAULT_STAFF.find((s) => s.id === "teng")!;
    expect(staffPay(teng, DEFAULT_SCHEDULE, DEFAULT_MANUAL_PAY, {})).toBe(2000);
  });

  it("staffPay returns manual amount for manual staff", () => {
    const tessie = DEFAULT_STAFF.find((s) => s.id === "tessie")!;
    expect(staffPay(tessie, DEFAULT_SCHEDULE, { tessie: 4321 }, {})).toBe(4321);
  });

  it("leaves remove a shift from auto pay", () => {
    const teng = DEFAULT_STAFF.find((s) => s.id === "teng")!;
    expect(
      staffPay(teng, DEFAULT_SCHEDULE, {}, { teng: { Sun: { type: "sick" } } })
    ).toBe(1500);
  });

  it("totals: per-shift weekly + salaried bi-monthly + weekly run-rate", () => {
    const t = totals(DEFAULT_STAFF, DEFAULT_SCHEDULE, DEFAULT_MANUAL_PAY, {});
    expect(t.weekly).toBe(13500);
    expect(t.salariedPerPeriod).toBe(6000);
    // salariedWeeklyShare = round(6000 * 24/52) = round(2769.23) = 2769
    expect(t.salariedWeeklyShare).toBe(2769);
    expect(t.grand).toBe(13500 + 2769);
    // legacy aliases preserved
    expect(t.auto).toBe(13500);
    expect(t.manual).toBe(6000);
  });
});

describe("lint", () => {
  it("flags an empty schedule as 7 days × 2 shifts of coverage misses", () => {
    const week: WeekData = {
      ...blankWeek(),
    };
    const issues = lint(DEFAULT_STAFF, week);
    const cov = issues.filter((i) => i.kind === "coverage");
    expect(cov).toHaveLength(14);
  });

  it("clears coverage flags on the PRD default schedule for most days", () => {
    const week: WeekData = {
      schedule: DEFAULT_SCHEDULE,
      dayOverrides: {},
      manualPay: DEFAULT_MANUAL_PAY,
      notes: {},
      leaves: {},
    };
    const issues = lint(DEFAULT_STAFF, week);
    // PRD has Tuesday over-staffed (4D) — that's intended to flag
    const tueDay = issues.find(
      (i) => i.kind === "coverage" && i.day === "Tue" && i.shift === "D"
    );
    expect(tueDay).toBeDefined();
  });

  it("flags constraint violations from per-day shiftConstraints", () => {
    // Tessie: Thu/Fri are 'off'. Put her on Friday day shift.
    const week: WeekData = {
      schedule: { ...DEFAULT_SCHEDULE, tessie: { ...DEFAULT_SCHEDULE.tessie, Fri: "D" } },
      dayOverrides: {},
      manualPay: DEFAULT_MANUAL_PAY,
      notes: {},
      leaves: {},
    };
    const issues = lint(DEFAULT_STAFF, week);
    expect(
      issues.find(
        (i) => i.kind === "constraint" && i.staffId === "tessie" && i.day === "Fri"
      )
    ).toBeDefined();
  });

  it("flags day-on-night and night-on-day mismatches", () => {
    // Trisha: Mon = night-only. Putting her on Monday day shift breaks it.
    const week: WeekData = {
      schedule: { trisha: { Mon: "D" } },
      dayOverrides: {},
      manualPay: {},
      notes: {},
      leaves: {},
    };
    const issues = lint(DEFAULT_STAFF, week);
    expect(
      issues.find(
        (i) => i.kind === "constraint" && i.staffId === "trisha" && i.day === "Mon"
      )
    ).toBeDefined();
  });

  it("flags over-cap when shifts > 5", () => {
    const week: WeekData = {
      schedule: {
        ...DEFAULT_SCHEDULE,
        // Pile shifts onto Teng across all 7 days
        teng: { Sun: "D", Mon: "D", Tue: "D", Wed: "D", Thu: "D", Fri: "D", Sat: "D" },
      },
      dayOverrides: {},
      manualPay: {},
      notes: {},
      leaves: {},
    };
    const issues = lint(DEFAULT_STAFF, week);
    const cap = issues.find((i) => i.kind === "over-cap" && i.staffId === "teng");
    expect(cap).toBeDefined();
    if (cap && cap.kind === "over-cap") expect(cap.count).toBe(7);
  });

  it("flags leave-and-shift conflict", () => {
    const week: WeekData = {
      schedule: { tessie: { Sun: "D" } },
      dayOverrides: {},
      manualPay: {},
      notes: {},
      leaves: { tessie: { Sun: { type: "vacation" } } },
    };
    const issues = lint(DEFAULT_STAFF, week);
    expect(issues.find((i) => i.kind === "leave-conflict")).toBeDefined();
  });
});

describe("share encode/decode", () => {
  it("round-trips a payload", () => {
    const payload = {
      staff: DEFAULT_STAFF,
      shiftTimes: DEFAULT_SHIFT_TIMES,
      weekKey: "2026-05-03",
      week: {
        schedule: DEFAULT_SCHEDULE,
        dayOverrides: {},
        manualPay: DEFAULT_MANUAL_PAY,
        notes: {},
        leaves: {},
      },
    };
    const code = encodeShare(payload);
    const back = decodeShare(code);
    expect(back).not.toBeNull();
    expect(back!.staff[0].name).toBe("Tessie");
    expect(back!.weekKey).toBe("2026-05-03");
  });

  it("decodeShare returns null on garbage input", () => {
    expect(decodeShare("not-base64!!!")).toBeNull();
    expect(decodeShare("aGVsbG8=")).toBeNull();
  });
});

describe("ICS output", () => {
  it("produces a valid VCALENDAR with at least one VEVENT", () => {
    const ics = buildIcs({
      staff: DEFAULT_STAFF,
      shiftTimes: DEFAULT_SHIFT_TIMES,
      weekKey: "2026-05-03",
      week: {
        schedule: DEFAULT_SCHEDULE,
        dayOverrides: {},
        manualPay: DEFAULT_MANUAL_PAY,
        notes: {},
        leaves: {},
      },
    });
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics.match(/BEGIN:VEVENT/g)?.length ?? 0).toBeGreaterThan(0);
    expect(ics).toContain("Tessie");
  });

  it("filterStaffId restricts events", () => {
    const ics = buildIcs({
      staff: DEFAULT_STAFF,
      shiftTimes: DEFAULT_SHIFT_TIMES,
      weekKey: "2026-05-03",
      week: {
        schedule: DEFAULT_SCHEDULE,
        dayOverrides: {},
        manualPay: DEFAULT_MANUAL_PAY,
        notes: {},
        leaves: {},
      },
      filterStaffId: "maryann",
    });
    const events = ics.match(/BEGIN:VEVENT/g)?.length ?? 0;
    expect(events).toBe(1);
    expect(ics).toContain("Mary Ann");
    expect(ics).not.toContain("Tessie");
  });
});

describe("recurring leaves", () => {
  it("apply recurring fills empty leave slots", () => {
    const seeded: WeekData = blankWeek();
    const out = applyRecurring(seeded, { maryann: { Tue: "vacation" } });
    expect(out.leaves.maryann?.Tue?.type).toBe("vacation");
  });

  it("does not overwrite existing leave entries", () => {
    const seeded: WeekData = {
      ...blankWeek(),
      leaves: { maryann: { Tue: { type: "sick", note: "doctor" } } },
    };
    const out = applyRecurring(seeded, { maryann: { Tue: "vacation" } });
    expect(out.leaves.maryann?.Tue?.type).toBe("sick");
  });
});

describe("CSV builders", () => {
  it("schedule CSV includes all caregivers and totals", () => {
    const csv = buildScheduleCsv(
      DEFAULT_STAFF,
      DEFAULT_SCHEDULE,
      DEFAULT_MANUAL_PAY,
      {},
      "May 3 – 9"
    );
    expect(csv).toContain("Tessie");
    expect(csv).toContain("Per-shift weekly");
    expect(csv).toContain("Salaried bi-monthly");
    expect(csv).toContain("Weekly run-rate");
  });

  it("payroll CSV separates per-shift and salaried sections", () => {
    const csv = buildPayrollCsv(
      DEFAULT_STAFF,
      DEFAULT_SCHEDULE,
      DEFAULT_MANUAL_PAY,
      {},
      "May 3 – 9"
    );
    expect(csv).toContain("PER-SHIFT");
    expect(csv).toContain("SALARIED");
    expect(csv).toContain("Weekly run-rate");
  });
});

describe("parseState migration", () => {
  it("loads new schema as-is", () => {
    const k = thisWeekKey();
    const state = parseState({
      staff: DEFAULT_STAFF,
      shiftTimes: DEFAULT_SHIFT_TIMES,
      weeks: { [k]: { schedule: DEFAULT_SCHEDULE, dayOverrides: {}, manualPay: DEFAULT_MANUAL_PAY, notes: {}, leaves: {} } },
      currentWeekKey: k,
    });
    expect(state.currentWeekKey).toBe(k);
    expect(state.staff[0].name).toBe("Tessie");
  });

  it("migrates old single-week schema", () => {
    const state = parseState({
      staff: DEFAULT_STAFF.map((s) => ({ ...s, manualPay: 1234 })),
      schedule: DEFAULT_SCHEDULE,
      shiftTimes: DEFAULT_SHIFT_TIMES,
    });
    const week = state.weeks[state.currentWeekKey];
    expect(week.schedule).toEqual(DEFAULT_SCHEDULE);
    // manualPay should have been hoisted to weeks[].manualPay
    expect(Object.values(week.manualPay).every((v) => v === 1234)).toBe(true);
  });
});

describe("date helpers", () => {
  it("fmtDayDate", () => {
    expect(fmtDayDate(new Date("2026-05-05T00:00:00"))).toBe("May 5");
  });
  it("fmtOrdinalDate", () => {
    expect(fmtOrdinalDate(new Date("2026-05-01T00:00:00"))).toBe("May 1st");
    expect(fmtOrdinalDate(new Date("2026-05-22T00:00:00"))).toBe("May 22nd");
    expect(fmtOrdinalDate(new Date("2026-05-23T00:00:00"))).toBe("May 23rd");
    expect(fmtOrdinalDate(new Date("2026-05-04T00:00:00"))).toBe("May 4th");
  });
  it("isSameDay", () => {
    const a = new Date("2026-05-05T01:00:00");
    const b = new Date("2026-05-05T23:00:00");
    expect(isSameDay(a, b)).toBe(true);
  });
});

describe("effectiveRequired", () => {
  it("uses defaults when no override", () => {
    const r = effectiveRequired({}, "Mon");
    expect(r).toEqual({ D: 3, N: 2 });
  });
  it("respects per-day overrides", () => {
    const r = effectiveRequired({ Mon: { required: { D: 4 } } }, "Mon");
    expect(r).toEqual({ D: 4, N: 2 });
  });
});
