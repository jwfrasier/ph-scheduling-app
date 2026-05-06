"use client";

import {
  DAYS,
  LeavesMap,
  ManualPayMap,
  Schedule,
  Staff,
  pesos,
  totals,
} from "../lib/data";

export default function PayrollPanel({
  staff,
  schedule,
  manualPay,
  leaves,
  setManualPay,
}: {
  staff: Staff[];
  schedule: Schedule;
  manualPay: ManualPayMap;
  leaves: LeavesMap;
  setManualPay: (next: ManualPayMap) => void;
}) {
  const t = totals(staff, schedule, manualPay, leaves);
  const perShift = staff.filter((s) => !s.manual);
  const salaried = staff.filter((s) => s.manual);

  function setPay(id: string, val: number) {
    setManualPay({ ...manualPay, [id]: val });
  }

  return (
    <section className="pt-10 rise grid grid-cols-12 gap-x-8 gap-y-10">
      <div className="col-span-12 md:col-span-7">
        <div className="flex items-baseline gap-4 mb-5">
          <h2 className="font-display text-3xl md:text-4xl">Payroll</h2>
          <span className="flex-1 h-px bg-ink/20 ml-4" />
        </div>

        <div className="mt-4">
          <div className="font-mono text-[14px] tracking-[0.25em] uppercase text-ink-soft mb-3">
            Per-shift · paid weekly
          </div>
          <ul>
            {perShift.map((s) => {
              const row = schedule[s.id] ?? {};
              let c = 0;
              for (const d of DAYS) if (row[d] && !leaves[s.id]?.[d]) c++;
              return (
                <li
                  key={s.id}
                  className="flex items-baseline py-1.5 border-b border-ink/10"
                >
                  <span className="font-display text-lg">{s.name}</span>
                  <span className="font-mono text-[14px] uppercase tracking-widest text-ink-soft ml-3">
                    {c} × {pesos(s.rate)}
                  </span>
                  <span className="flex-1 mx-3 border-b border-dotted border-ink/30 translate-y-[-3px]" />
                  <span className="font-mono tabnum">{pesos(c * s.rate)}</span>
                </li>
              );
            })}
            {perShift.length === 0 && (
              <li className="text-ink-soft italic font-mono text-base py-2">
                No per-shift staff
              </li>
            )}
          </ul>
        </div>

        <div className="mt-8">
          <div className="font-mono text-[14px] tracking-[0.25em] uppercase text-ink-soft mb-3">
            Salaried · paid bi-monthly · 2× per month
          </div>
          <ul>
            {salaried.map((s) => (
              <li
                key={s.id}
                className="flex items-baseline py-2 border-b border-ink/10"
              >
                <span className="font-display text-lg">{s.name}</span>
                <span className="font-mono text-[14px] uppercase tracking-widest text-ink-soft ml-3">
                  {s.role}
                </span>
                <span className="flex-1 mx-3 border-b border-dotted border-ink/30 translate-y-[-3px]" />
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-ink/40">₱</span>
                  <input
                    className="amount-input max-w-[120px]"
                    type="number"
                    min={0}
                    step={50}
                    value={manualPay[s.id] ?? 0}
                    onChange={(e) => setPay(s.id, Number(e.target.value))}
                  />
                </div>
              </li>
            ))}
            {salaried.length === 0 && (
              <li className="text-ink-soft italic font-mono text-base py-2">
                No salaried staff
              </li>
            )}
          </ul>
          {salaried.length > 0 && (
            <div className="mt-2 font-mono text-[12px] tracking-widest uppercase text-ink-soft">
              Each amount is for one ½-month pay period (15th &amp; end of
              month)
            </div>
          )}
        </div>
      </div>

      <aside className="col-span-12 md:col-span-5 md:pl-10 md:border-l md:border-ink/20">
        <div className="md:sticky md:top-[140px]">
          <div className="font-mono text-[14px] tracking-[0.25em] uppercase text-ink-soft mb-4">
            Settlement
          </div>
          <dl className="space-y-1">
            <div className="flex items-baseline">
              <dt className="font-mono text-[13px] uppercase tracking-widest text-ink-soft">
                Per-shift · this week
              </dt>
              <span className="flex-1 mx-3 border-b border-dotted border-ink/30 translate-y-[-3px]" />
              <dd className="font-mono tabnum text-base">{pesos(t.weekly)}</dd>
            </div>
            <div className="flex items-baseline">
              <dt className="font-mono text-[13px] uppercase tracking-widest text-ink-soft">
                Salaried · per period
              </dt>
              <span className="flex-1 mx-3 border-b border-dotted border-ink/30 translate-y-[-3px]" />
              <dd className="font-mono tabnum text-base">
                {pesos(t.salariedPerPeriod)}
              </dd>
            </div>
            <div className="flex items-baseline text-ink-soft">
              <dt className="font-mono text-[12px] uppercase tracking-widest">
                Salaried · weekly avg
              </dt>
              <span className="flex-1 mx-3 border-b border-dotted border-ink/20 translate-y-[-3px]" />
              <dd className="font-mono tabnum text-sm">
                {pesos(t.salariedWeeklyShare)}
              </dd>
            </div>
            <div className="rule-h my-4" />
            <div className="flex items-baseline">
              <dt className="font-display text-2xl">Weekly run-rate</dt>
              <span className="flex-1 mx-3" />
              <dd className="font-display text-4xl text-terracotta-deep">
                {pesos(t.grand)}
              </dd>
            </div>
            <div className="font-mono text-[11px] tracking-widest uppercase text-ink-soft mt-1">
              per-shift wages + salary pro-rated to one week
            </div>
          </dl>
        </div>
      </aside>
    </section>
  );
}
