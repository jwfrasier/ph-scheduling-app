import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CellEditor from "../app/components/CellEditor";
import type { Staff, Leave } from "../app/lib/data";

const STAFF: Staff = {
  id: "tessie",
  name: "Tessie",
  role: "Senior caregiver · Sat–Wed",
  rate: 500,
  manual: true,
};

function renderEditor(overrides: Partial<Parameters<typeof CellEditor>[0]> = {}) {
  const props = {
    staff: STAFF,
    day: "Mon" as const,
    shift: null as null | "D" | "N",
    note: "",
    leave: null as Leave | null,
    onShift: vi.fn(),
    onNote: vi.fn(),
    onLeave: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<CellEditor {...props} />);
  return props;
}

describe("<CellEditor />", () => {
  it("displays the caregiver name and day", () => {
    renderEditor();
    expect(screen.getByText("Tessie")).toBeInTheDocument();
    expect(screen.getByText(/Monday/)).toBeInTheDocument();
  });

  it("fires onShift when a shift button is clicked", () => {
    const props = renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /^D Day$/ }));
    expect(props.onShift).toHaveBeenCalledWith("D");
    fireEvent.click(screen.getByRole("button", { name: /^N Night$/ }));
    expect(props.onShift).toHaveBeenCalledWith("N");
    fireEvent.click(screen.getByRole("button", { name: /^· Off$/ }));
    expect(props.onShift).toHaveBeenCalledWith(null);
  });

  it("marks the active shift button", () => {
    renderEditor({ shift: "D" });
    const dayBtn = screen.getByRole("button", { name: /^D Day$/ });
    expect(dayBtn.className).toMatch(/is-active/);
  });

  it("fires onLeave when a leave type is picked, including a detail input", () => {
    const props = renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /vacation/i }));
    expect(props.onLeave).toHaveBeenCalledWith({ type: "vacation", note: "" });
  });

  it("fires onLeave with the typed detail when leave is already set", () => {
    const props = renderEditor({ leave: { type: "vacation" } });
    const input = screen.getByPlaceholderText(/optional leave detail/i);
    fireEvent.change(input, { target: { value: "annual" } });
    expect(props.onLeave).toHaveBeenCalledWith({
      type: "vacation",
      note: "annual",
    });
  });

  it("fires onNote on textarea change", () => {
    const props = renderEditor();
    const textarea = screen.getByPlaceholderText(/covering for J/i);
    fireEvent.change(textarea, { target: { value: "covering" } });
    expect(props.onNote).toHaveBeenCalledWith("covering");
  });

  it("closes when the × button is clicked", () => {
    const props = renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(props.onClose).toHaveBeenCalled();
  });

  it("closes on Escape", () => {
    const props = renderEditor();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(props.onClose).toHaveBeenCalled();
  });
});
