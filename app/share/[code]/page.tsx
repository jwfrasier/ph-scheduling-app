import {
  DAYS,
  DAYS_LONG,
  REQUIRED_DAY,
  REQUIRED_NIGHT,
  decodeShare,
  effectiveRequired,
  effectiveTimes,
  fmtDayDate,
  fmtOrdinalDate,
  weekDatesFromKey,
  dayCount,
  LEAVE_LABELS,
} from "../../lib/data";

export const dynamic = "force-static";

export default async function SharePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const payload = decodeShare(code);

  if (!payload) {
    return (
      <main className="min-h-screen px-6 md:px-12 py-16 text-ink">
        <div className="max-w-xl">
          <div className="font-mono text-[13px] tracking-[0.2em] uppercase text-terracotta">
            Bad share link
          </div>
          <h1 className="font-display text-5xl mt-4">Couldn&rsquo;t read that</h1>
          <p className="mt-4 text-ink-soft text-[15px] leading-relaxed">
            The encoded payload didn&rsquo;t parse. The link may be truncated or
            the format may have changed since it was created. Ask the sender
            to re-share.
          </p>
        </div>
      </main>
    );
  }

  const { staff, shiftTimes, weekKey, week } = payload;
  const dates = weekDatesFromKey(weekKey);
  const weekLabel = `${fmtOrdinalDate(dates.Sun)} – ${fmtOrdinalDate(dates.Sat)}`;

  return (
    <main className="min-h-screen px-6 md:px-12 lg:px-20 py-10 md:py-14 text-ink">
      <header className="pb-8 border-b border-ink/30">
        <div className="font-mono text-[13px] tracking-[0.2em] uppercase text-terracotta">
          Read-only · shared roster
        </div>
        <h1 className="font-display text-[clamp(2.6rem,7vw,5.4rem)] leading-[0.9] mt-3">
          Week of {weekLabel}
        </h1>
        <div className="font-mono text-[13px] tracking-widest uppercase text-ink-soft mt-3">
          Day {shiftTimes.D.start}–{shiftTimes.D.end} · Night {shiftTimes.N.start}–
          {shiftTimes.N.end} · {staff.length} caregivers
        </div>
      </header>

      <section className="mt-10 grid grid-cols-1 md:grid-cols-7 gap-3">
        {DAYS.map((d) => {
          const eff = effectiveTimes(shiftTimes, week.dayOverrides, d);
          const req = effectiveRequired(week.dayOverrides, d);
          const onDay = dayCount(week.schedule, staff, d, "D", week.leaves);
          const onNight = dayCount(week.schedule, staff, d, "N", week.leaves);
          const onLeave = staff.filter((s) => week.leaves[s.id]?.[d]);
          return (
            <article
              key={d}
              className="bg-paper-deep/40 border border-ink/30 p-4 min-h-[200px] flex flex-col"
            >
              <header className="border-b border-ink/15 pb-2 mb-2">
                <div className="font-display text-2xl leading-none">
                  {DAYS_LONG[d]}
                </div>
                <div className="font-mono text-[14px] tracking-widest uppercase text-ink-soft mt-1">
                  {fmtDayDate(dates[d])}
                </div>
              </header>

              <Section
                label="Day"
                time={`${eff.D.start}–${eff.D.end}`}
                count={onDay.length}
                target={req.D}
                rows={onDay.map((s) => ({
                  name: s.name,
                  note: week.notes[s.id]?.[d],
                }))}
              />
              <Section
                label="Night"
                time={`${eff.N.start}–${eff.N.end}`}
                count={onNight.length}
                target={req.N}
                rows={onNight.map((s) => ({
                  name: s.name,
                  note: week.notes[s.id]?.[d],
                }))}
              />

              {onLeave.length > 0 && (
                <div className="mt-3 pt-2 border-t border-dashed border-ink/15">
                  <div className="font-mono text-[13px] tracking-widest uppercase text-sage">
                    Out
                  </div>
                  <ul className="text-[14px] leading-tight mt-1">
                    {onLeave.map((s) => {
                      const lv = week.leaves[s.id]![d]!;
                      return (
                        <li key={s.id}>
                          {s.name} · {LEAVE_LABELS[lv.type]}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <p className="mt-8 font-mono text-[14px] tracking-widest uppercase text-ink-soft max-w-prose">
        This is a read-only snapshot. The live schedule may have changed since
        this link was created.
      </p>
    </main>
  );
}

function Section({
  label,
  time,
  count,
  target,
  rows,
}: {
  label: string;
  time: string;
  count: number;
  target: number;
  rows: { name: string; note?: string }[];
}) {
  const ok = count === target;
  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between gap-1">
        <span className="font-mono text-[14px] tracking-widest uppercase text-ink-soft">
          {label}
        </span>
        <span className="font-mono text-[13px] text-ink-soft">{time}</span>
        <span
          className={`font-mono text-[14px] tabnum ${
            ok ? "" : "text-terracotta"
          }`}
        >
          {count}/{target}
        </span>
      </div>
      <ul className="text-[13px] leading-tight mt-1">
        {rows.length === 0 && (
          <li className="text-ink-soft italic font-mono text-[13px]">
            unstaffed
          </li>
        )}
        {rows.map((r, i) => (
          <li key={i}>
            {r.name}
            {r.note && (
              <span className="text-ink-soft font-mono text-[14px] ml-1">
                · {r.note}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
