import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CalendarPanel from "../app/components/Calendar";
import {
  DEFAULT_STAFF,
  DEFAULT_SCHEDULE,
  DEFAULT_SHIFT_TIMES,
  weekDatesFromKey,
  type Day,
  type Schedule,
  type ShiftTimes,
  type DayOverrides,
  type NotesMap,
  type LeavesMap,
  type Violation,
} from "../app/lib/data";

const dates: Record<Day, Date> = weekDatesFromKey("2026-05-03");

function setup(overrides: Partial<Parameters<typeof CalendarPanel>[0]> = {}) {
  const setSchedule = vi.fn();
  const setShiftTimes = vi.fn();
  const setDayOverrides = vi.fn();
  const setNotes = vi.fn();
  const setLeaves = vi.fn();
  const props = {
    staff: DEFAULT_STAFF,
    schedule: DEFAULT_SCHEDULE as Schedule,
    shiftTimes: DEFAULT_SHIFT_TIMES as ShiftTimes,
    dayOverrides: {} as DayOverrides,
    notes: {} as NotesMap,
    leaves: {} as LeavesMap,
    dates,
    violations: [] as Violation[],
    setSchedule,
    setShiftTimes,
    setDayOverrides,
    setNotes,
    setLeaves,
    ...overrides,
  };
  render(<CalendarPanel {...props} />);
  return { setSchedule, setDayOverrides, setLeaves, props };
}

describe("<CalendarPanel />", () => {
  it("renders all four zones plus the day strip", () => {
    setup();
    expect(screen.getByText("Day shift")).toBeInTheDocument();
    expect(screen.getByText("Night shift")).toBeInTheDocument();
    expect(screen.getByText("On leave")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    // 7 day-strip buttons
    expect(screen.getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/).length).toBeGreaterThanOrEqual(7);
  });

  it("clicking a day in the strip switches the detail view", () => {
    setup();
    // Default selects today (or Mon if no match). Click Friday.
    const fri = screen.getAllByText("Fri")[0];
    fireEvent.click(fri.closest("button") as HTMLElement);
    expect(screen.getByText(/Friday/)).toBeInTheDocument();
  });

  it("typing in the required input fires setDayOverrides", () => {
    const { setDayOverrides } = setup();
    const requiredInputs = document.querySelectorAll(
      "input[type=number].time-input"
    );
    expect(requiredInputs.length).toBeGreaterThan(0);
    // The Required (third) inputs follow Hours; just grab any spinbutton labeled
    // by its sibling label via DOM order: 4th column on each card is "Required".
    // Simpler: target the input whose value === default required count (3 or 2).
    const requiredDay = Array.from(requiredInputs).find(
      (el) => (el as HTMLInputElement).value === "3"
    ) as HTMLInputElement | undefined;
    expect(requiredDay).toBeDefined();
    fireEvent.change(requiredDay!, { target: { value: "4" } });
    expect(setDayOverrides).toHaveBeenCalled();
    const arg = setDayOverrides.mock.calls[0][0] as DayOverrides;
    const onlyDay = Object.keys(arg)[0] as Day;
    expect(arg[onlyDay]?.required?.D).toBe(4);
  });

  it("displays staff already on leave for the selected day in the Out zone", () => {
    setup({
      // Mary Ann on leave Tuesday
      leaves: { maryann: { Tue: { type: "vacation" } } },
    });
    const tue = screen.getAllByText("Tue")[0];
    fireEvent.click(tue.closest("button") as HTMLElement);
    expect(screen.getAllByText("Mary Ann").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Vacation/).length).toBeGreaterThan(0);
  });

  it("dropping a staff id into the Day zone calls setSchedule", () => {
    const { setSchedule } = setup();
    const dayHeader = screen.getByText("Day shift");
    const card = dayHeader.closest("article")!;
    // Simulate drop with our drag payload
    const dataTransfer = {
      data: { "text/plain": "maryann" } as Record<string, string>,
      getData(t: string) {
        return this.data[t] ?? "";
      },
      setData() {},
      effectAllowed: "move",
    };
    fireEvent.dragOver(card, { dataTransfer });
    fireEvent.drop(card, { dataTransfer });
    expect(setSchedule).toHaveBeenCalled();
    const next = setSchedule.mock.calls[0][0] as Schedule;
    // Mary Ann was originally Sun:N — now we just dropped onto whatever day
    // is selected (today if matches, otherwise Mon). The chosen day's value
    // must be "D".
    const row = next.maryann ?? {};
    const assignedDays = Object.entries(row).filter(([, v]) => v === "D");
    expect(assignedDays.length).toBeGreaterThan(0);
  });
});
