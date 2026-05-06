import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Violations from "../app/components/Violations";
import type { Violation } from "../app/lib/data";

describe("<Violations />", () => {
  it("shows the all-clear state when there are no issues", () => {
    render(<Violations issues={[]} />);
    expect(screen.getByText(/all clear/i)).toBeInTheDocument();
    expect(
      screen.getByText(/no conflicts, cap breaches/i)
    ).toBeInTheDocument();
  });

  it("renders an issue count and the first three messages", () => {
    const issues: Violation[] = [
      { kind: "coverage", day: "Mon", shift: "D", have: 2, need: 3, message: "Mon day shift has 2 caregivers, target 3." },
      { kind: "over-cap", staffId: "tessie", count: 6, message: "Tessie is over the 5-shift weekly cap (6)." },
      { kind: "constraint", staffId: "trisha", day: "Sun", message: "Trisha is rostered Sun but constraint says Mon/Tue/Wed/Thu/Fri only." },
      { kind: "leave-conflict", staffId: "jane", day: "Wed", message: "Jane is on leave Wed but still rostered for a shift." },
    ];
    render(<Violations issues={issues} />);
    expect(screen.getByText(/4 issues/i)).toBeInTheDocument();
    // top 3 immediately visible
    expect(screen.getByText(/Mon day shift has 2/)).toBeInTheDocument();
    expect(screen.getByText(/over the 5-shift weekly cap/)).toBeInTheDocument();
    expect(screen.getByText(/Trisha is rostered Sun/)).toBeInTheDocument();
    // 4th is hidden behind the toggle
    expect(screen.queryByText(/Jane is on leave Wed/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /show all 4/i }));
    expect(screen.getByText(/Jane is on leave Wed/)).toBeInTheDocument();
  });

  it("invokes onJumpTo when an issue row is clicked", () => {
    const issues: Violation[] = [
      { kind: "constraint", staffId: "tessie", day: "Fri", message: "Tessie rostered Fri." },
    ];
    const onJumpTo = vi.fn();
    render(<Violations issues={issues} onJumpTo={onJumpTo} />);
    fireEvent.click(screen.getByText(/Tessie rostered Fri/));
    expect(onJumpTo).toHaveBeenCalledTimes(1);
    expect(onJumpTo.mock.calls[0][0].kind).toBe("constraint");
  });

  it("supports keyboard activation when items are clickable", () => {
    const issues: Violation[] = [
      { kind: "coverage", day: "Tue", shift: "D", have: 4, need: 3, message: "Tue day shift has 4 caregivers, target 3." },
    ];
    const onJumpTo = vi.fn();
    render(<Violations issues={issues} onJumpTo={onJumpTo} />);
    const item = screen.getByText(/Tue day shift has 4/);
    fireEvent.keyDown(item, { key: "Enter" });
    expect(onJumpTo).toHaveBeenCalled();
  });
});
