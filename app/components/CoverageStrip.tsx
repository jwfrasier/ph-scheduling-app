"use client";

import {
  DAYS,
  DAYS_LONG,
  Day,
  LeavesMap,
  Schedule,
  Staff,
  dayCount,
  effectiveRequired,
  fmtDayDate,
  isSameDay,
  type DayOverrides,
} from "../lib/data";

export default function CoverageStrip({
  staff,
  schedule,
  leaves,
  dayOverrides,
  dates,
  onJumpDay,
}: {
  staff: Staff[];
  schedule: Schedule;
  leaves: LeavesMap;
  dayOverrides: DayOverrides;
  dates: Record<Day, Date>;
  onJumpDay?: (d: Day) => void;
}) {
  const today = new Date();

  // Tally totals
  let neededTotal = 0;
  let filledTotal = 0;
  let surplus = 0;
  let deficit = 0;

  const perDay = DAYS.map((d) => {
    const req = effectiveRequired(dayOverrides, d);
    const day = dayCount(schedule, staff, d, "D", leaves).length;
    const night = dayCount(schedule, staff, d, "N", leaves).length;

    neededTotal += req.D + req.N;
    filledTotal += Math.min(day, req.D) + Math.min(night, req.N);
    if (day > req.D) surplus += day - req.D;
    if (night > req.N) surplus += night - req.N;
    if (day < req.D) deficit += req.D - day;
    if (night < req.N) deficit += req.N - night;

    return { d, day, night, req };
  });

  const pct = neededTotal === 0 ? 100 : Math.round((filledTotal / neededTotal) * 100);
  const allOk = surplus === 0 && deficit === 0 && pct === 100;

  const headlineColor = allOk
    ? "text-sage"
    : deficit > 0
    ? "text-terracotta"
    : "text-ochre";
  const headline = allOk
    ? "Fully covered"
    : deficit > 0
    ? `${deficit} unstaffed`
    : `${surplus} surplus`;

  return (
    <section className="coverage-strip">
      <header className="coverage-strip-head">
        <div className="coverage-strip-title">
          <span className="font-mono text-[12px] tracking-[0.25em] uppercase text-ink-soft">
            Coverage
          </span>
          <span className={`coverage-strip-status ${headlineColor}`}>
            {headline}
          </span>
        </div>
        <div className="coverage-strip-meter" aria-label={`${pct} percent covered`}>
          <div
            className="coverage-strip-meter-fill"
            style={{
              width: `${Math.min(pct, 100)}%`,
              background: allOk
                ? "var(--sage)"
                : deficit > 0
                ? "var(--terracotta)"
                : "var(--ochre)",
            }}
          />
          <span className="coverage-strip-pct font-mono tabnum">{pct}%</span>
        </div>
      </header>

      <div className="coverage-strip-grid">
        {perDay.map(({ d, day, night, req }) => {
          const isToday = isSameDay(dates[d], today);
          const dayDeficit = Math.max(0, req.D - day);
          const daySurplus = Math.max(0, day - req.D);
          const nightDeficit = Math.max(0, req.N - night);
          const nightSurplus = Math.max(0, night - req.N);
          const dayOk = dayDeficit === 0 && daySurplus === 0;
          const nightOk = nightDeficit === 0 && nightSurplus === 0;

          return (
            <button
              key={d}
              type="button"
              onClick={() => onJumpDay?.(d)}
              className={`coverage-day ${isToday ? "is-today" : ""}`}
              title={`${DAYS_LONG[d]} · ${day}/${req.D}D · ${night}/${req.N}N`}
            >
              <div className="coverage-day-label">
                <span
                  className={`font-display text-[18px] leading-none ${
                    isToday ? "text-terracotta" : ""
                  }`}
                >
                  {d}
                </span>
                <span className="font-mono text-[11px] tabnum text-ink-soft ml-1">
                  {dates[d].getDate()}
                </span>
              </div>

              <Pips
                kind="D"
                filled={Math.min(day, req.D)}
                required={req.D}
                surplus={daySurplus}
                ok={dayOk}
              />
              <Pips
                kind="N"
                filled={Math.min(night, req.N)}
                required={req.N}
                surplus={nightSurplus}
                ok={nightOk}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Pips({
  kind,
  filled,
  required,
  surplus,
  ok,
}: {
  kind: "D" | "N";
  filled: number;
  required: number;
  surplus: number;
  ok: boolean;
}) {
  const empty = required - filled;
  return (
    <div className={`coverage-row coverage-row-${kind.toLowerCase()}`}>
      {Array.from({ length: filled }).map((_, i) => (
        <span
          key={`f${i}`}
          className={`coverage-pip ${
            kind === "D" ? "coverage-pip-day" : "coverage-pip-night"
          }`}
        />
      ))}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e${i}`} className="coverage-pip coverage-pip-missing" />
      ))}
      {surplus > 0 && <span className="coverage-surplus">+{surplus}</span>}
      <span className="coverage-row-label" aria-hidden>
        {kind}
      </span>
      {!ok && <span className="coverage-row-flag" aria-hidden />}
    </div>
  );
}
