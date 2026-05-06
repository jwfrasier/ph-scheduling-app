import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import StaffPanel from "../app/components/Staff";
import {
  DEFAULT_STAFF,
  DEFAULT_SCHEDULE,
  DEFAULT_MANUAL_PAY,
  type Schedule,
  type ManualPayMap,
  type LeavesMap,
  type RecurringLeavesMap,
  type Staff,
} from "../app/lib/data";

beforeEach(() => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

function setup(overrides: Partial<Parameters<typeof StaffPanel>[0]> = {}) {
  const setStaff = vi.fn();
  const setSchedule = vi.fn();
  const setManualPay = vi.fn();
  const setLeaves = vi.fn();
  const setRecurringLeaves = vi.fn();
  const props = {
    staff: DEFAULT_STAFF,
    schedule: DEFAULT_SCHEDULE as Schedule,
    manualPay: DEFAULT_MANUAL_PAY as ManualPayMap,
    leaves: {} as LeavesMap,
    recurringLeaves: {} as RecurringLeavesMap,
    setStaff,
    setSchedule,
    setManualPay,
    setLeaves,
    setRecurringLeaves,
    ...overrides,
  };
  render(<StaffPanel {...props} />);
  return { setStaff, setSchedule, setManualPay, setLeaves, setRecurringLeaves, props };
}

describe("<StaffPanel />", () => {
  it("renders an editable card per caregiver", () => {
    setup();
    const tessieInput = screen.getByDisplayValue("Tessie");
    expect(tessieInput).toBeInTheDocument();
    expect(tessieInput.className).toMatch(/staff-name-input/);
  });

  it("editing a name fires setStaff", () => {
    const { setStaff } = setup();
    const tessieInput = screen.getByDisplayValue("Tessie") as HTMLInputElement;
    fireEvent.change(tessieInput, { target: { value: "Tessa" } });
    expect(setStaff).toHaveBeenCalled();
    const next = setStaff.mock.calls[0][0] as Staff[];
    const t = next.find((s) => s.id === "tessie")!;
    expect(t.name).toBe("Tessa");
  });

  it("clicking + add caregiver appends a fresh staff", () => {
    const { setStaff } = setup();
    fireEvent.click(screen.getByRole("button", { name: /add caregiver/i }));
    const next = setStaff.mock.calls[0][0] as Staff[];
    expect(next.length).toBe(DEFAULT_STAFF.length + 1);
    expect(next[next.length - 1].name).toBe("New caregiver");
  });

  it("clicking remove drops the caregiver and clears their schedule entry", () => {
    const { setStaff, setSchedule } = setup();
    const tengCard = screen.getByDisplayValue("Teng").closest("article")!;
    fireEvent.click(within(tengCard).getByRole("button", { name: /remove/i }));
    const next = setStaff.mock.calls[0][0] as Staff[];
    expect(next.find((s) => s.id === "teng")).toBeUndefined();
    const sched = setSchedule.mock.calls[0][0] as Schedule;
    expect(sched.teng).toBeUndefined();
  });

  it("toggling manual on a non-manual staff fires setStaff with manual=true", () => {
    const { setStaff } = setup();
    // Find Teng's manual checkbox
    const tengCard = screen.getByDisplayValue("Teng").closest("article")!;
    const checkbox = within(tengCard).getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    const next = setStaff.mock.calls[0][0] as Staff[];
    expect(next.find((s) => s.id === "teng")?.manual).toBe(true);
  });

  it("rate input updates the staff rate", () => {
    const { setStaff } = setup();
    const tengCard = screen.getByDisplayValue("Teng").closest("article")!;
    const rateInput = within(tengCard)
      .getAllByRole("spinbutton")
      .find((el) => (el as HTMLInputElement).value === "500") as HTMLInputElement;
    fireEvent.change(rateInput, { target: { value: "600" } });
    const next = setStaff.mock.calls[0][0] as Staff[];
    expect(next.find((s) => s.id === "teng")?.rate).toBe(600);
  });

  it("recurring-leave selector fires setRecurringLeaves", () => {
    const { setRecurringLeaves } = setup();
    const tengCard = screen.getByDisplayValue("Teng").closest("article")!;
    // 7 day selectors per card
    const selects = within(tengCard).getAllByRole("combobox");
    expect(selects.length).toBe(7);
    fireEvent.change(selects[1], { target: { value: "vacation" } }); // Mon
    const next = setRecurringLeaves.mock.calls[0][0] as RecurringLeavesMap;
    expect(next.teng?.Mon).toBe("vacation");
  });

  it("clearing a recurring-leave selector removes the rule", () => {
    const { setRecurringLeaves } = setup({
      recurringLeaves: { teng: { Mon: "vacation" } },
    });
    const tengCard = screen.getByDisplayValue("Teng").closest("article")!;
    const selects = within(tengCard).getAllByRole("combobox");
    fireEvent.change(selects[1], { target: { value: "" } });
    const next = setRecurringLeaves.mock.calls[0][0] as RecurringLeavesMap;
    // entire teng row should be removed when last rule cleared
    expect(next.teng).toBeUndefined();
  });
});
