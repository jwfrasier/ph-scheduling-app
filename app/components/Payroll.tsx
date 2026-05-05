"use client";

import {
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
  setManualPay,
}: {
  staff: Staff[];
  schedule: Schedule;
  manualPay: ManualPayMap;
  setManualPay: (next: ManualPayMap) => void;
}) {
  const t = totals(staff, schedule, manualPay);
  const auto = staff.filter((s) => !s.manual);
  const manual = staff.filter((s) => s.manual);

  function setPay(id: string, val: number) {
    setManualPay({ ...manualPay, [id]: val });
  }

  return (
    <section className="pt-10 rise grid grid-cols-12 gap-x-8 gap-y-10">
      <div className="col-span-12 md:col-span-7">
        <div className="flex items-baseline gap-4 mb-5">
          <span className="font-mono text-[11px] tracking-[0.25em] uppercase text-terracotta">
            §IV
          </span>
          <h2 className="font-display text-3xl md:text-4xl">Payroll</h2>
          <span className="flex-1 h-px bg-ink/20 ml-4" />
        </div>
        <p className="text-[15px] leading-relaxed text-ink-soft max-w-prose">
          Automatic line items multiply each caregiver&rsquo;s shift count by
          their personal rate. Manual entries override the calculation for
          staff with bespoke arrangements. Amounts apply to the week currently
          on view.
        </p>

        <div className="mt-8">
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-ink-soft mb-3">
            Auto · shift-based
          </div>
          <ul>
            {auto.map((s) => {
              const c = shiftCount(schedule, s.id);
              return (
                <li
                  key={s.id}
                  className="flex items-baseline py-1.5 border-b border-ink/10"
                >
                  <span className="font-display text-lg">{s.name}</span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-ink-soft ml-3">
                    {c} × {pesos(s.rate)}
                  </span>
                  <span className="flex-1 mx-3 border-b border-dotted border-ink/30 translate-y-[-3px]" />
                  <span className="font-mono tabnum">{pesos(c * s.rate)}</span>
                </li>
              );
            })}
            {auto.length === 0 && (
              <li className="text-ink-soft italic font-mono text-sm py-2">
                No auto-paid staff
              </li>
            )}
          </ul>
        </div>

        <div className="mt-8">
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-ink-soft mb-3">
            Manual · senior
          </div>
          <ul>
            {manual.map((s) => (
              <li
                key={s.id}
                className="flex items-baseline py-2 border-b border-ink/10"
              >
                <span className="font-display text-lg">{s.name}</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-soft ml-3">
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
              <li className="text-ink-soft italic font-mono text-sm py-2">
                No manual entries
              </li>
            )}
          </ul>
        </div>
      </div>

      <aside className="col-span-12 md:col-span-5 md:pl-10 md:border-l md:border-ink/20">
        <div className="md:sticky md:top-[140px]">
          <div className="font-mono text-[10px] tracking-[0.25em] uppercase text-ink-soft mb-4">
            Settlement
          </div>
          <dl className="space-y-1">
            <div className="flex items-baseline">
              <dt className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
                Auto
              </dt>
              <span className="flex-1 mx-3 border-b border-dotted border-ink/30 translate-y-[-3px]" />
              <dd className="font-mono tabnum text-base">{pesos(t.auto)}</dd>
            </div>
            <div className="flex items-baseline">
              <dt className="font-mono text-[11px] uppercase tracking-widest text-ink-soft">
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
          <p className="mt-6 text-[13px] leading-relaxed text-ink-soft">
            Use the toolbar to <span className="font-mono">⎙ payroll</span> or
            export <span className="font-mono">⇣ payroll</span> CSV for the
            week shown above.
          </p>
        </div>
      </aside>
    </section>
  );
}
