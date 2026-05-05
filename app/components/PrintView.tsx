"use client";

import {
  DAYS,
  DAYS_LONG,
  Day,
  DayOverrides,
  REQUIRED_DAY,
  REQUIRED_NIGHT,
  Schedule,
  ShiftTimes,
  Staff,
  dayCount,
  effectiveTimes,
  fmtDayDate,
  pesos,
  totals,
} from "../lib/data";

export default function PrintView({
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
  const t = totals(staff, schedule);

  return (
    <div className="print-only print-sheet">
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
                    className={`print-shift-count ${
                      dayOk ? "" : "print-flag"
                    }`}
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
                    className={`print-shift-count ${
                      nightOk ? "" : "print-flag"
                    }`}
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

      <footer className="print-foot">
        <div>
          <div className="print-eyebrow">Settlement</div>
          <div>Auto · {pesos(t.auto)}</div>
          <div>Manual · {pesos(t.manual)}</div>
        </div>
        <div className="print-grand">
          <div className="print-eyebrow">Grand total</div>
          <div className="print-grand-num">{pesos(t.grand)}</div>
        </div>
      </footer>

      <p className="print-note">
        ✶ marks a day with custom shift times. Cells where staffing diverges
        from target are flagged. Pay summary covers the full week.
      </p>
    </div>
  );
}
