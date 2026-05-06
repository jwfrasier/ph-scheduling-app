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
    notify: vi.fn(),
    ...overrides,
  };
  render(<StaffPanel {...props} />);
  return { setStaff, setSchedule, setManualPay, setLeaves, setRecurringLeaves, props };
}

function getCard(name: string): HTMLElement {
  return screen.getByText(name, { selector: "div" }).closest("article")!;
}

function startEditing(card: HTMLElement) {
  fireEvent.click(within(card).getByRole("button", { name: /^edit$/i }));
}

describe("<StaffPanel />", () => {
  it("renders a card per caregiver", () => {
    setup();
    expect(screen.getByText("Tessie", { selector: "div" })).toBeInTheDocument();
    expect(screen.getByText("Teng", { selector: "div" })).toBeInTheDocument();
  });

  it("clicking edit then changing the name and saving fires setStaff", () => {
    const { setStaff } = setup();
    const card = getCard("Tessie");
    startEditing(card);
    const nameInput = within(card).getByDisplayValue("Tessie") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Tessa" } });
    fireEvent.click(within(card).getByRole("button", { name: /^save$/i }));
    expect(setStaff).toHaveBeenCalled();
    const next = setStaff.mock.calls[0][0] as Staff[];
    expect(next.find((s) => s.id === "tessie")?.name).toBe("Tessa");
  });

  it("cancel discards edits without firing setStaff", () => {
    const { setStaff } = setup();
    const card = getCard("Tessie");
    startEditing(card);
    fireEvent.change(within(card).getByDisplayValue("Tessie"), {
      target: { value: "WRONG" },
    });
    fireEvent.click(within(card).getByRole("button", { name: /^cancel$/i }));
    expect(setStaff).not.toHaveBeenCalled();
  });

  it("clicking + add caregiver opens the modal", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Add caregiver" }));
    expect(screen.getAllByText(/Add caregiver/).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/e.g., Maria/)).toBeInTheDocument();
  });

  it("submitting the modal prepends the new caregiver", () => {
    const { setStaff } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Add caregiver" }));
    fireEvent.change(screen.getByPlaceholderText(/e.g., Maria/), {
      target: { value: "Cora" },
    });
    fireEvent.click(screen.getByRole("button", { name: "add caregiver" }));
    const next = setStaff.mock.calls[0][0] as Staff[];
    expect(next.length).toBe(DEFAULT_STAFF.length + 1);
    expect(next[0].name).toBe("Cora"); // newest at top
  });

  it("clicking remove drops the caregiver", () => {
    const { setStaff, setSchedule } = setup();
    const card = getCard("Teng");
    fireEvent.click(within(card).getByRole("button", { name: /^remove$/i }));
    const next = setStaff.mock.calls[0][0] as Staff[];
    expect(next.find((s) => s.id === "teng")).toBeUndefined();
    const sched = setSchedule.mock.calls[0][0] as Schedule;
    expect(sched.teng).toBeUndefined();
  });

  it("toggling manual in edit mode and saving fires setStaff with manual=true", () => {
    const { setStaff } = setup();
    const card = getCard("Teng");
    startEditing(card);
    const checkbox = within(card).getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    fireEvent.click(within(card).getByRole("button", { name: /^save$/i }));
    const next = setStaff.mock.calls[0][0] as Staff[];
    expect(next.find((s) => s.id === "teng")?.manual).toBe(true);
  });

  it("rate input in edit mode updates the staff rate on save", () => {
    const { setStaff } = setup();
    const card = getCard("Teng");
    startEditing(card);
    const rateInput = within(card)
      .getAllByRole("spinbutton")
      .find(
        (el) => (el as HTMLInputElement).value === "500"
      ) as HTMLInputElement;
    fireEvent.change(rateInput, { target: { value: "600" } });
    fireEvent.click(within(card).getByRole("button", { name: /^save$/i }));
    const next = setStaff.mock.calls[0][0] as Staff[];
    expect(next.find((s) => s.id === "teng")?.rate).toBe(600);
  });

  it("changing a shift dropdown to Off clears that day", () => {
    const { setSchedule } = setup();
    const card = getCard("Mary Ann");
    const shiftSelects = within(card)
      .getAllByRole("combobox")
      .filter((el) => el.className.includes("shift-select"));
    expect(shiftSelects).toHaveLength(7);
    fireEvent.change(shiftSelects[0], { target: { value: "" } }); // Sun → Off
    expect(setSchedule).toHaveBeenCalled();
    const sched = setSchedule.mock.calls[0][0] as Schedule;
    expect(sched.maryann?.Sun).toBeUndefined();
  });

  it("changing a shift dropdown to Night sets that day to N", () => {
    const { setSchedule } = setup();
    const card = getCard("Tessie");
    const shiftSelects = within(card)
      .getAllByRole("combobox")
      .filter((el) => el.className.includes("shift-select"));
    fireEvent.change(shiftSelects[0], { target: { value: "N" } }); // Sun → Night
    const sched = setSchedule.mock.calls[0][0] as Schedule;
    expect(sched.tessie?.Sun).toBe("N");
  });

  it("toggling an available-day in edit mode commits allowedDays on save", () => {
    const { setStaff } = setup();
    const card = getCard("Tessie");
    startEditing(card);
    // Tessie's allowedDays = ["Sat","Sun","Mon","Tue","Wed"]
    const dayToggles = within(card).getAllByRole("button").filter((b) =>
      b.className.includes("staff-day-toggle")
    );
    expect(dayToggles).toHaveLength(7);
    // Toggle off Mon (currently allowed)
    fireEvent.click(dayToggles[1]);
    fireEvent.click(within(card).getByRole("button", { name: /^save$/i }));
    const next = setStaff.mock.calls[0][0] as Staff[];
    const t = next.find((s) => s.id === "tessie")!;
    expect(t.allowedDays).not.toContain("Mon");
    expect(t.allowedDays).toContain("Sat");
  });

  it("salaried badge shows for manual staff", () => {
    setup();
    // Tessie is manual=true in DEFAULT_STAFF
    const card = getCard("Tessie");
    expect(within(card).getAllByText(/salaried/i).length).toBeGreaterThan(0);
  });
});
