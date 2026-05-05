"use client";

import {
  DAYS,
  DAYS_LONG,
  Day,
  DayOverrides,
  ManualPayMap,
  REQUIRED_DAY,
  REQUIRED_NIGHT,
  Schedule,
  ShiftTimes,
  Staff,
  dayCount,
  effectiveTimes,
  fmtDayDate,
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
  dates,
  weekLabel,
}: {
  mode: PrintMode;
  staff: Staff[];
  schedule: Schedule;
  shiftTimes: ShiftTimes;
  dayOverrides: DayOverrides;
  manualPay: ManualPayMap;
  dates: Record<Day, Date>;
  weekLabel: string;
}) {
  return (
    <div className="print-only print-sheet">
      {mode === "calendar" ? (
        <PrintCalendar
          staff={staff}
          schedule={schedule}
          shiftTimes={shiftTimes}
          dayOverrides={dayOverrides}
          dates={dates}
          weekLabel={weekLabel}
        />
      ) : (
        <PrintPayroll
          staff={staff}
          schedule={schedule}
          manualPay={manualPay}
          weekLabel={weekLabel}
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
  dates,
  weekLabel,
}: {
  staff: Staff[];
  schedule: Schedule;
  shiftTimes: ShiftTimes;
  dayOverrides: DayOverrides;
  dates: Record<Day, Date>;
  weekLabel: string;
}) {
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
          <div>
            {staff.length} caregivers · target {REQUIRED_DAY}D / {REQUIRED_NIGHT}N
          </div>
        </div>
      </header>

      <div className="print-cal-grid">
        {DAYS.map((d) => {
          const eff = effectiveTimes(shiftTimes, dayOverrides, d);
          const dayStaff = dayCount(schedule, staff, d, "D");
          const nightStaff = dayCount(schedule, staff, d, "N");
          const dayOk = dayStaff.length === REQUIRED_DAY;
          const nightOk = nightStaff.length === REQUIRED_NIGHT;
          const overridden = !!dayOverrides[d];
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
                    {dayStaff.length}/{REQUIRED_DAY}
                  </span>
                </div>
                <ul className="print-roster">
                  {dayStaff.length === 0 && (
                    <li className="print-empty">— unstaffed —</li>
                  )}
                  {dayStaff.map((s) => (
                    <li key={s.id}>{s.name}</li>
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
                    {nightStaff.length}/{REQUIRED_NIGHT}
                  </span>
                </div>
                <ul className="print-roster">
                  {nightStaff.length === 0 && (
                    <li className="print-empty">— unstaffed —</li>
                  )}
                  {nightStaff.map((s) => (
                    <li key={s.id}>{s.name}</li>
                  ))}
                </ul>
              </section>
            </article>
          );
        })}
      </div>

      <p className="print-note">
        ✶ marks a day with custom shift times. Cells where staffing diverges
        from target are flagged.
      </p>
    </>
  );
}

/* ───────────── payroll report ───────────── */

function PrintPayroll({
  staff,
  schedule,
  manualPay,
  weekLabel,
}: {
  staff: Staff[];
  schedule: Schedule;
  manualPay: ManualPayMap;
  weekLabel: string;
}) {
  const t = totals(staff, schedule, manualPay);
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
            {staff.length} caregivers · {auto.length} auto · {manual.length} manual
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
            const c = shiftCount(schedule, s.id);
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
                <td align="right">{pesos(staffPay(s, schedule, manualPay))}</td>
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
    </>
  );
}
