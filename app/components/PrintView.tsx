"use client";

import {
  DAYS,
  DAYS_LONG,
  Day,
  DayOverrides,
  LEAVE_LABELS,
  LeavesMap,
  ManualPayMap,
  NotesMap,
  Schedule,
  ShiftTimes,
  Staff,
  dayCount,
  effectiveRequired,
  effectiveTimes,
  fmtDayDate,
  fmtTimestamp,
  pesos,
  shiftCount,
  staffPay,
  totals,
} from "../lib/data";

export type PrintMode = "calendar" | "payroll";

export default function PrintView({
  mode,
  staff,
  schedule,
  shiftTimes,
  dayOverrides,
  manualPay,
  notes,
  leaves,
  dates,
  weekLabel,
}: {
  mode: PrintMode;
  staff: Staff[];
  schedule: Schedule;
  shiftTimes: ShiftTimes;
  dayOverrides: DayOverrides;
  manualPay: ManualPayMap;
  notes: NotesMap;
  leaves: LeavesMap;
  dates: Record<Day, Date>;
  weekLabel: string;
}) {
  const printedAt = fmtTimestamp();
  return (
    <div className="print-only print-sheet">
      {mode === "calendar" ? (
        <PrintCalendar
          staff={staff}
          schedule={schedule}
          shiftTimes={shiftTimes}
          dayOverrides={dayOverrides}
          notes={notes}
          leaves={leaves}
          dates={dates}
          weekLabel={weekLabel}
          printedAt={printedAt}
        />
      ) : (
        <PrintPayroll
          staff={staff}
          schedule={schedule}
          manualPay={manualPay}
          leaves={leaves}
          weekLabel={weekLabel}
          printedAt={printedAt}
        />
      )}
    </div>
  );
}

/* ───────────── calendar report ───────────── */

function PrintCalendar({
  staff,
  schedule,
  shiftTimes,
  dayOverrides,
  notes,
  leaves,
  dates,
  weekLabel,
  printedAt,
}: {
  staff: Staff[];
  schedule: Schedule;
  shiftTimes: ShiftTimes;
  dayOverrides: DayOverrides;
  notes: NotesMap;
  leaves: LeavesMap;
  dates: Record<Day, Date>;
  weekLabel: string;
  printedAt: string;
}) {
  const allNotesByDay: Partial<Record<Day, { name: string; text: string }[]>> = {};
  for (const id of Object.keys(notes)) {
    const s = staff.find((x) => x.id === id);
    if (!s) continue;
    for (const d of Object.keys(notes[id] ?? {}) as Day[]) {
      const text = notes[id]![d];
      if (!text) continue;
      (allNotesByDay[d] ??= []).push({ name: s.name, text });
    }
  }

  const allLeavesByDay: Partial<Record<Day, { name: string; type: string; note?: string }[]>> = {};
  for (const id of Object.keys(leaves)) {
    const s = staff.find((x) => x.id === id);
    if (!s) continue;
    for (const d of Object.keys(leaves[id] ?? {}) as Day[]) {
      const lv = leaves[id]![d];
      if (!lv) continue;
      (allLeavesByDay[d] ??= []).push({
        name: s.name,
        type: LEAVE_LABELS[lv.type],
        note: lv.note,
      });
    }
  }

  return (
    <>
      <header className="print-head">
        <div>
          <div className="print-eyebrow">Children&rsquo;s Home · Operations</div>
          <h1 className="print-title">
            Weekly <em>Calendar</em>
          </h1>
        </div>
        <div className="print-meta">
          <div>
            <strong>{weekLabel}</strong>
          </div>
          <div>
            Day {shiftTimes.D.start}–{shiftTimes.D.end} · {shiftTimes.D.hours}h
            &nbsp;·&nbsp; Night {shiftTimes.N.start}–{shiftTimes.N.end} ·{" "}
            {shiftTimes.N.hours}h
          </div>
          <div>{staff.length} caregivers on roster</div>
        </div>
      </header>

      <div className="print-cal-grid">
        {DAYS.map((d) => {
          const eff = effectiveTimes(shiftTimes, dayOverrides, d);
          const req = effectiveRequired(dayOverrides, d);
          const dayStaff = dayCount(schedule, staff, d, "D", leaves);
          const nightStaff = dayCount(schedule, staff, d, "N", leaves);
          const dayOk = dayStaff.length === req.D;
          const nightOk = nightStaff.length === req.N;
          const overridden = !!dayOverrides[d];
          const dNotes = allNotesByDay[d] ?? [];
          const dLeaves = allLeavesByDay[d] ?? [];
          return (
            <article key={d} className="print-day">
              <header className="print-day-head">
                <div>
                  <div className="print-day-name">
                    {DAYS_LONG[d]}
                    {overridden && <span className="print-mark"> ✶</span>}
                  </div>
                  <div className="print-day-date">{fmtDayDate(dates[d])}</div>
                </div>
              </header>

              <section className="print-shift">
                <div className="print-shift-head">
                  <span className="print-shift-label">Day</span>
                  <span className="print-shift-time">
                    {eff.D.start}–{eff.D.end}
                  </span>
                  <span
                    className={`print-shift-count ${dayOk ? "" : "print-flag"}`}
                  >
                    {dayStaff.length}/{req.D}
                  </span>
                </div>
                <ul className="print-roster">
                  {dayStaff.length === 0 && (
                    <li className="print-empty">— unstaffed —</li>
                  )}
                  {dayStaff.map((s) => (
                    <li key={s.id}>
                      {s.name}
                      {notes[s.id]?.[d] && (
                        <div className="print-cell-note">{notes[s.id]![d]}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="print-shift print-shift-night">
                <div className="print-shift-head">
                  <span className="print-shift-label">Night</span>
                  <span className="print-shift-time">
                    {eff.N.start}–{eff.N.end}
                  </span>
                  <span
                    className={`print-shift-count ${nightOk ? "" : "print-flag"}`}
                  >
                    {nightStaff.length}/{req.N}
                  </span>
                </div>
                <ul className="print-roster">
                  {nightStaff.length === 0 && (
                    <li className="print-empty">— unstaffed —</li>
                  )}
                  {nightStaff.map((s) => (
                    <li key={s.id}>
                      {s.name}
                      {notes[s.id]?.[d] && (
                        <div className="print-cell-note">{notes[s.id]![d]}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>

              {dLeaves.length > 0 && (
                <section className="print-leave">
                  <div className="print-leave-label">Out</div>
                  <ul>
                    {dLeaves.map((l, i) => (
                      <li key={i}>
                        {l.name} · {l.type}
                        {l.note && ` · ${l.note}`}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </article>
          );
        })}
      </div>

      <p className="print-note">
        ✶ marks a day with custom shift times or required-headcount
        overrides. Cells where staffing diverges from target are flagged.
      </p>

      <footer className="print-stamp">
        <div>
          <div className="print-eyebrow">Audit</div>
          <div>Printed {printedAt}</div>
        </div>
        <div className="print-sign">
          <div>
            <div className="print-sign-line" />
            <div className="print-sign-label">Prepared by</div>
          </div>
          <div>
            <div className="print-sign-line" />
            <div className="print-sign-label">Approved · date</div>
          </div>
        </div>
      </footer>
    </>
  );
}

/* ───────────── payroll report ───────────── */

function PrintPayroll({
  staff,
  schedule,
  manualPay,
  leaves,
  weekLabel,
  printedAt,
}: {
  staff: Staff[];
  schedule: Schedule;
  manualPay: ManualPayMap;
  leaves: LeavesMap;
  weekLabel: string;
  printedAt: string;
}) {
  const t = totals(staff, schedule, manualPay, leaves);
  const auto = staff.filter((s) => !s.manual);
  const manual = staff.filter((s) => s.manual);

  return (
    <>
      <header className="print-head">
        <div>
          <div className="print-eyebrow">Children&rsquo;s Home · Operations</div>
          <h1 className="print-title">
            Weekly <em>Payroll</em>
          </h1>
        </div>
        <div className="print-meta">
          <div>
            <strong>{weekLabel}</strong>
          </div>
          <div>
            {staff.length} caregivers · {auto.length} auto · {manual.length}{" "}
            manual
          </div>
        </div>
      </header>

      <table className="print-table">
        <thead>
          <tr>
            <th align="left">Caregiver</th>
            <th align="left">Role</th>
            <th align="center">Shifts</th>
            <th align="right">Rate</th>
            <th align="right">Pay</th>
          </tr>
        </thead>
        <tbody>
          {auto.length > 0 && (
            <tr>
              <td colSpan={5} className="print-section">
                Auto · shift-based
              </td>
            </tr>
          )}
          {auto.map((s) => {
            let c = 0;
            const row = schedule[s.id] ?? {};
            for (const d of DAYS) if (row[d] && !leaves[s.id]?.[d]) c++;
            return (
              <tr key={s.id}>
                <td>
                  <strong>{s.name}</strong>
                </td>
                <td className="print-role">{s.role}</td>
                <td align="center">{c}</td>
                <td align="right">{pesos(s.rate)}</td>
                <td align="right">{pesos(c * s.rate)}</td>
              </tr>
            );
          })}
          <tr className="print-subtotal">
            <td colSpan={4} align="right">
              Auto subtotal
            </td>
            <td align="right">{pesos(t.auto)}</td>
          </tr>

          {manual.length > 0 && (
            <tr>
              <td colSpan={5} className="print-section">
                Manual · senior arrangements
              </td>
            </tr>
          )}
          {manual.map((s) => {
            const c = shiftCount(schedule, s.id);
            return (
              <tr key={s.id}>
                <td>
                  <strong>{s.name}</strong>
                </td>
                <td className="print-role">{s.role}</td>
                <td align="center">{c}</td>
                <td align="right">manual</td>
                <td align="right">
                  {pesos(staffPay(s, schedule, manualPay, leaves))}
                </td>
              </tr>
            );
          })}
          {manual.length > 0 && (
            <tr className="print-subtotal">
              <td colSpan={4} align="right">
                Manual subtotal
              </td>
              <td align="right">{pesos(t.manual)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <footer className="print-foot">
        <div>
          <div className="print-eyebrow">Summary</div>
          <div>Auto · {pesos(t.auto)}</div>
          <div>Manual · {pesos(t.manual)}</div>
        </div>
        <div className="print-grand">
          <div className="print-eyebrow">Grand total</div>
          <div className="print-grand-num">{pesos(t.grand)}</div>
        </div>
      </footer>

      <div className="print-stamp">
        <div>
          <div className="print-eyebrow">Audit</div>
          <div>Printed {printedAt}</div>
        </div>
        <div className="print-sign">
          <div>
            <div className="print-sign-line" />
            <div className="print-sign-label">Prepared by</div>
          </div>
          <div>
            <div className="print-sign-line" />
            <div className="print-sign-label">Approved · date</div>
          </div>
        </div>
      </div>
    </>
  );
}
