"use client";

import {
  DAYS,
  LeavesMap,
  ManualPayMap,
  Schedule,
  Staff,
  pesos,
  shiftCount,
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
  const auto = staff.filter((s) => !s.manual);
  const manual = staff.filter((s) => s.manual);

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

        <div className="mt-8">
          <div className="font-mono text-[14px] tracking-[0.25em] uppercase text-ink-soft mb-3">
            Auto · shift-based
          </div>
          <ul>
            {auto.map((s) => {
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
            {auto.length === 0 && (
              <li className="text-ink-soft italic font-mono text-base py-2">
                No auto-paid staff
              </li>
            )}
          </ul>
        </div>

        <div className="mt-8">
          <div className="font-mono text-[14px] tracking-[0.25em] uppercase text-ink-soft mb-3">
            Manual · senior
          </div>
          <ul>
            {manual.map((s) => (
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
            {manual.length === 0 && (
              <li className="text-ink-soft italic font-mono text-base py-2">
                No manual entries
              </li>
            )}
          </ul>
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
                Auto
              </dt>
              <span className="flex-1 mx-3 border-b border-dotted border-ink/30 translate-y-[-3px]" />
              <dd className="font-mono tabnum text-base">{pesos(t.auto)}</dd>
            </div>
            <div className="flex items-baseline">
              <dt className="font-mono text-[13px] uppercase tracking-widest text-ink-soft">
                Manual
              </dt>
              <span className="flex-1 mx-3 border-b border-dotted border-ink/30 translate-y-[-3px]" />
              <dd className="font-mono tabnum text-base">{pesos(t.manual)}</dd>
            </div>
            <div className="rule-h my-4" />
            <div className="flex items-baseline">
              <dt className="font-display text-2xl">Grand total</dt>
              <span className="flex-1 mx-3" />
              <dd className="font-display text-4xl text-terracotta-deep">
                {pesos(t.grand)}
              </dd>
            </div>
          </dl>
        </div>
      </aside>
    </section>
  );
}
