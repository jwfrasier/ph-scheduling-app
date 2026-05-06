import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PayrollPanel from "../app/components/Payroll";
import {
  DEFAULT_STAFF,
  DEFAULT_SCHEDULE,
  DEFAULT_MANUAL_PAY,
  type Schedule,
  type ManualPayMap,
  type LeavesMap,
} from "../app/lib/data";

function setup(overrides: Partial<Parameters<typeof PayrollPanel>[0]> = {}) {
  const setManualPay = vi.fn();
  const props = {
    staff: DEFAULT_STAFF,
    schedule: DEFAULT_SCHEDULE as Schedule,
    manualPay: DEFAULT_MANUAL_PAY as ManualPayMap,
    leaves: {} as LeavesMap,
    setManualPay,
    ...overrides,
  };
  render(<PayrollPanel {...props} />);
  return { setManualPay, props };
}

describe("<PayrollPanel />", () => {
  it("renders per-shift and salaried section headings", () => {
    setup();
    expect(screen.getByText(/Per-shift · paid weekly/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Salaried · paid bi-monthly/i)
    ).toBeInTheDocument();
  });

  it("lists every auto staff with a multiplier", () => {
    setup();
    // Teng: 4 × ₱500
    expect(screen.getByText(/4 × ₱500/)).toBeInTheDocument();
    // Trisha: 5 × ₱500
    expect(screen.getAllByText(/5 × ₱500/).length).toBeGreaterThan(0);
  });

  it("renders the per-shift weekly total ₱13,500", () => {
    setup();
    expect(screen.getByText("₱13,500")).toBeInTheDocument();
  });

  it("editing a manual amount fires setManualPay", () => {
    const { setManualPay } = setup();
    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    expect(inputs.length).toBeGreaterThan(0);
    fireEvent.change(inputs[0], { target: { value: "5000" } });
    expect(setManualPay).toHaveBeenCalled();
    const next = setManualPay.mock.calls[0][0] as ManualPayMap;
    expect(Object.values(next)).toContain(5000);
  });

  it("subtracts leave days from auto pay", () => {
    // Teng works Sun, Thu, Fri, Sat (4 days). Mark Sat as leave.
    setup({
      leaves: { teng: { Sat: { type: "sick" } } },
    });
    // 3 × ₱500 = ₱1500
    expect(screen.getByText(/3 × ₱500/)).toBeInTheDocument();
  });

  it("shows empty-state copy when no auto staff", () => {
    setup({
      staff: DEFAULT_STAFF.filter((s) => s.manual),
    });
    expect(screen.getByText(/No per-shift staff/i)).toBeInTheDocument();
  });
});
