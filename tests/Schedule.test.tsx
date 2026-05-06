import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import SchedulePanel from "../app/components/Schedule";
import {
  DEFAULT_STAFF,
  DEFAULT_SCHEDULE,
  DEFAULT_MANUAL_PAY,
  weekDatesFromKey,
  type Day,
  type Schedule,
  type ManualPayMap,
  type NotesMap,
  type LeavesMap,
  type Violation,
} from "../app/lib/data";

const dates: Record<Day, Date> = weekDatesFromKey("2026-05-03");

function setup(overrides: Partial<Parameters<typeof SchedulePanel>[0]> = {}) {
  const setSchedule = vi.fn();
  const setManualPay = vi.fn();
  const setNotes = vi.fn();
  const setLeaves = vi.fn();
  const props = {
    staff: DEFAULT_STAFF,
    schedule: DEFAULT_SCHEDULE as Schedule,
    manualPay: DEFAULT_MANUAL_PAY as ManualPayMap,
    notes: {} as NotesMap,
    leaves: {} as LeavesMap,
    dayOverrides: {},
    dates,
    violations: [] as Violation[],
    setSchedule,
    setManualPay,
    setNotes,
    setLeaves,
    ...overrides,
  };
  render(<SchedulePanel {...props} />);
  return { setSchedule, setManualPay, setNotes, setLeaves, props };
}

describe("<SchedulePanel />", () => {
  it("renders every caregiver", () => {
    setup();
    for (const name of ["Tessie", "Eula", "Teng", "Jane", "Mary Ann"]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("shows the all-clear violations banner when there are no issues", () => {
    setup();
    expect(screen.getByText(/all clear/i)).toBeInTheDocument();
  });

  it("forwards a violations list to the banner", () => {
    setup({
      violations: [
        {
          kind: "coverage",
          day: "Mon",
          shift: "D",
          have: 2,
          need: 3,
          message: "Mon day shift has 2 caregivers, target 3.",
        },
      ],
    });
    expect(screen.getByText(/1 issue/i)).toBeInTheDocument();
  });

  it("clicking an empty cell schedules a Day shift", () => {
    const { setSchedule } = setup({
      // give Mary Ann an entirely empty week so cell is unambiguous
      schedule: { ...DEFAULT_SCHEDULE, maryann: {} },
    });
    const cell = document.getElementById("cell-maryann-Mon")!;
    expect(cell).toBeTruthy();
    const button = within(cell).getByRole("button");
    fireEvent.click(button);
    expect(setSchedule).toHaveBeenCalledTimes(1);
    const next = setSchedule.mock.calls[0][0] as Schedule;
    expect(next.maryann?.Mon).toBe("D");
  });

  it("cycles D → N when an existing day cell is clicked", () => {
    const { setSchedule } = setup();
    // Tessie has D on Sun
    const cell = document.getElementById("cell-tessie-Sun")!;
    fireEvent.click(within(cell).getByRole("button"));
    const next = setSchedule.mock.calls[0][0] as Schedule;
    expect(next.tessie?.Sun).toBe("N");
  });

  it("cycles N → off when an existing night cell is clicked", () => {
    const { setSchedule } = setup();
    // Trisha has N on Mon
    const cell = document.getElementById("cell-trisha-Mon")!;
    fireEvent.click(within(cell).getByRole("button"));
    const next = setSchedule.mock.calls[0][0] as Schedule;
    expect(next.trisha?.Mon).toBeUndefined();
  });

  it("right-clicking a cell opens the editor", () => {
    setup();
    const cell = document.getElementById("cell-tessie-Sun")!;
    fireEvent.contextMenu(within(cell).getByRole("button"));
    // Editor mounts a modal with the staff name
    expect(screen.getAllByText("Tessie").length).toBeGreaterThan(1);
  });
});
