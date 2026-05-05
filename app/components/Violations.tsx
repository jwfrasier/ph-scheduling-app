"use client";

import { useState } from "react";
import { Violation } from "../lib/data";

export default function Violations({
  issues,
}: {
  issues: Violation[];
}) {
  const [open, setOpen] = useState(false);
  if (issues.length === 0) {
    return (
      <aside className="violations violations-clear">
        <span className="violations-icon">✓</span>
        <span className="violations-headline">All clear</span>
        <span className="violations-detail">
          No conflicts, cap breaches, or coverage misses for this week.
        </span>
      </aside>
    );
  }

  const top = issues.slice(0, 3);
  const rest = issues.slice(3);
  const summary = countSummary(issues);

  return (
    <aside className="violations violations-warn">
      <div className="violations-row">
        <span className="violations-icon">!</span>
        <span className="violations-headline">
          {issues.length} issue{issues.length === 1 ? "" : "s"}
        </span>
        <span className="violations-detail">{summary}</span>
        {rest.length > 0 && (
          <button
            onClick={() => setOpen((o) => !o)}
            className="violations-toggle"
          >
            {open ? "hide" : `show all ${issues.length}`}
          </button>
        )}
      </div>
      <ul className="violations-list">
        {top.map((v, i) => (
          <li key={i}>
            <span className="violations-tag">{tagFor(v)}</span>
            {v.message}
          </li>
        ))}
        {open &&
          rest.map((v, i) => (
            <li key={`r${i}`}>
              <span className="violations-tag">{tagFor(v)}</span>
              {v.message}
            </li>
          ))}
      </ul>
    </aside>
  );
}

function tagFor(v: Violation): string {
  switch (v.kind) {
    case "double-booked": return "double";
    case "over-cap": return "over cap";
    case "constraint": return "constraint";
    case "coverage": return "coverage";
    case "leave-conflict": return "leave";
  }
}

function countSummary(issues: Violation[]): string {
  const counts = new Map<string, number>();
  for (const v of issues) {
    counts.set(v.kind, (counts.get(v.kind) ?? 0) + 1);
  }
  const parts: string[] = [];
  if (counts.get("coverage")) parts.push(`${counts.get("coverage")} coverage`);
  if (counts.get("over-cap")) parts.push(`${counts.get("over-cap")} cap`);
  if (counts.get("constraint")) parts.push(`${counts.get("constraint")} constraint`);
  if (counts.get("leave-conflict")) parts.push(`${counts.get("leave-conflict")} leave`);
  if (counts.get("double-booked")) parts.push(`${counts.get("double-booked")} double`);
  return parts.join(" · ");
}
