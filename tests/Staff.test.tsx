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

  it("clicking 'Off' on a shift cell clears that day's assignment", () => {
    const { setSchedule } = setup();
    const card = getCard("Mary Ann");
    // Mary Ann's Sun is N. Find the Off button in the Sun cell.
    const offButtons = within(card)
      .getAllByRole("button")
      .filter((b) => /^Off$/.test(b.textContent ?? ""));
    expect(offButtons.length).toBeGreaterThanOrEqual(7);
    fireEvent.click(offButtons[0]); // Sun's Off
    expect(setSchedule).toHaveBeenCalled();
    const sched = setSchedule.mock.calls[0][0] as Schedule;
    expect(sched.maryann?.Sun).toBeUndefined();
  });

  it("clicking 'Night' on a shift cell sets that day to night", () => {
    const { setSchedule } = setup();
    const card = getCard("Tessie");
    const nightButtons = within(card)
      .getAllByRole("button")
      .filter((b) => /^Night$/.test(b.textContent ?? ""));
    fireEvent.click(nightButtons[0]); // Sun's Night
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

  it("recurring-leave selector fires setRecurringLeaves", () => {
    const { setRecurringLeaves } = setup();
    const card = getCard("Teng");
    const selects = within(card).getAllByRole("combobox");
    expect(selects.length).toBe(7);
    fireEvent.change(selects[1], { target: { value: "vacation" } });
    const next = setRecurringLeaves.mock.calls[0][0] as RecurringLeavesMap;
    expect(next.teng?.Mon).toBe("vacation");
  });

  it("clearing a recurring-leave selector removes the rule", () => {
    const { setRecurringLeaves } = setup({
      recurringLeaves: { teng: { Mon: "vacation" } },
    });
    const card = getCard("Teng");
    const selects = within(card).getAllByRole("combobox");
    fireEvent.change(selects[1], { target: { value: "" } });
    const next = setRecurringLeaves.mock.calls[0][0] as RecurringLeavesMap;
    expect(next.teng).toBeUndefined();
  });

  it("shows restore-defaults banner when default IDs are missing", () => {
    setup({ staff: DEFAULT_STAFF.filter((s) => s.id !== "tessie") });
    expect(screen.getByText(/default caregiver/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /restore defaults/i })
    ).toBeInTheDocument();
  });

  it("clicking restore-defaults adds the missing caregivers back", () => {
    const { setStaff } = setup({
      staff: DEFAULT_STAFF.filter((s) => s.id !== "tessie"),
    });
    fireEvent.click(screen.getByRole("button", { name: /restore defaults/i }));
    const next = setStaff.mock.calls[0][0] as Staff[];
    expect(next.find((s) => s.id === "tessie")?.name).toBe("Tessie");
  });
});
