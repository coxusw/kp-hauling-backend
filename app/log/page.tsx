"use client";

import { FormEvent, useMemo, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { currency, displayDate, getJobBalance, getJobMileageTotal, getJobPaymentsTotal, getJobTotal } from "@/lib/data";
import { LoadingPanel } from "@/components/loading-panel";
import { PageHeader } from "@/components/page-header";
import { Field, TextAreaField } from "@/components/form-fields";
import { useOperations } from "@/lib/use-operations";
import { JobCard } from "@/components/job-card";

type LogTab = "jobs" | "expenses" | "cash" | "projections";

function monthKey(date: string) {
  return date.slice(0, 7);
}

function csvEscape(value: string | number | undefined) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number | undefined>>) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function LogPage() {
  const operations = useOperations();
  const [tab, setTab] = useState<LogTab>("jobs");
  const [monthFilter, setMonthFilter] = useState("all");
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    label: "",
    amount: 0,
    notes: ""
  });

  const finishedJobs = operations.jobs.filter((job) => job.status === "Picked Up / Completed");
  const driverCashRows = operations.jobs.flatMap((job) =>
    (job.payments ?? [])
      .filter((payment) => payment.method === "Cash" && payment.driverName)
      .map((payment) => ({ job, payment }))
  );
  const paymentRows = operations.jobs.flatMap((job) => (job.payments ?? []).map((payment) => ({ job, payment })));
  const months = Array.from(
    new Set([
      ...finishedJobs.map((job) => monthKey(job.actualPickupDate ?? job.expectedPickupDate)),
      ...operations.expenses.map((expense) => monthKey(expense.date)),
      ...driverCashRows.map(({ payment }) => monthKey(payment.date)),
      ...operations.driverCashHandoffs.map((handoff) => monthKey(handoff.date))
    ])
  ).sort();
  const filteredJobs = monthFilter === "all" ? finishedJobs : finishedJobs.filter((job) => monthKey(job.actualPickupDate ?? job.expectedPickupDate) === monthFilter);
  const filteredExpenses = monthFilter === "all" ? operations.expenses : operations.expenses.filter((expense) => monthKey(expense.date) === monthFilter);
  const filteredDriverCash = monthFilter === "all" ? driverCashRows : driverCashRows.filter(({ payment }) => monthKey(payment.date) === monthFilter);
  const filteredDirectPayments = monthFilter === "all"
    ? paymentRows.filter(({ payment }) => !(payment.method === "Cash" && payment.driverName))
    : paymentRows.filter(({ payment }) => monthKey(payment.date) === monthFilter && !(payment.method === "Cash" && payment.driverName));
  const filteredDriverCashHandoffs = monthFilter === "all"
    ? operations.driverCashHandoffs
    : operations.driverCashHandoffs.filter((handoff) => monthKey(handoff.date) === monthFilter);
  const allDriverCash = driverCashRows.reduce((total, { payment }) => total + payment.amount, 0);
  const allDriverCashTurnedIn = operations.driverCashHandoffs.reduce((total, handoff) => total + handoff.amount, 0);
  const filteredDirectCollected = filteredDirectPayments.reduce((total, { payment }) => total + payment.amount, 0);
  const filteredCashTurnedIn = filteredDriverCashHandoffs.reduce((total, handoff) => total + handoff.amount, 0);

  const totals = {
    mileage: filteredJobs.reduce((total, job) => total + getJobMileageTotal(job), 0),
    billed: filteredJobs.reduce((total, job) => total + getJobTotal(job), 0),
    collected: filteredDirectCollected + filteredCashTurnedIn,
    balance: filteredJobs.reduce((total, job) => total + getJobBalance(job), 0),
    expenses: filteredExpenses.reduce((total, expense) => total + expense.amount, 0),
    driverCash: filteredDriverCash.reduce((total, { payment }) => total + payment.amount, 0),
    driverCashTurnedIn: filteredDriverCashHandoffs.reduce((total, handoff) => total + handoff.amount, 0)
  };
  const driverCashHeld = monthFilter === "all"
    ? Math.max(allDriverCash - allDriverCashTurnedIn, 0)
    : Math.max(totals.driverCash - totals.driverCashTurnedIn, 0);
  const netIncome = totals.collected - totals.expenses;

  const projectionRows = useMemo(() => {
    const grouped = new Map<string, { month: string; income: number; expenses: number }>();
    paymentRows.filter(({ payment }) => !(payment.method === "Cash" && payment.driverName)).forEach(({ payment }) => {
      const key = monthKey(payment.date);
      const current = grouped.get(key) ?? { month: key, income: 0, expenses: 0 };
      current.income += payment.amount;
      grouped.set(key, current);
    });
    operations.driverCashHandoffs.forEach((handoff) => {
      const key = monthKey(handoff.date);
      const current = grouped.get(key) ?? { month: key, income: 0, expenses: 0 };
      current.income += handoff.amount;
      grouped.set(key, current);
    });
    operations.expenses.forEach((expense) => {
      const key = monthKey(expense.date);
      const current = grouped.get(key) ?? { month: key, income: 0, expenses: 0 };
      current.expenses += expense.amount;
      grouped.set(key, current);
    });
    return Array.from(grouped.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [operations.driverCashHandoffs, operations.expenses, paymentRows]);

  const maxProjection = Math.max(...projectionRows.map((row) => row.income), 1);
  const points = projectionRows
    .map((row, index) => {
      const x = projectionRows.length === 1 ? 50 : 20 + (index * 260) / (projectionRows.length - 1);
      const y = 130 - (row.income / maxProjection) * 110;
      return `${x},${y}`;
    })
    .join(" ");

  function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!expenseForm.label.trim() || expenseForm.amount <= 0) {
      return;
    }
    operations.addExpense(expenseForm);
    setExpenseForm({ date: new Date().toISOString().slice(0, 10), label: "", amount: 0, notes: "" });
  }

  function exportJobs() {
    downloadCsv("kp-hauling-job-log.csv", [
      ["Job #", "Customer", "Dumpster", "Completed", "Drop-off Miles To Job", "Drop-off Return Miles", "Pickup Miles To Job", "Pickup Return Miles", "Total Mileage", "Billed", "Collected", "Balances Owed", "Payment Status", "Address", "Pickup Destination"],
      ...filteredJobs.map((job) => [
        job.jobNumber,
        job.customerName,
        job.dumpsterNumber,
        job.actualPickupDate ?? job.expectedPickupDate,
        job.estimatedOneWayMiles ?? 0,
        job.deliveryReturnMiles ?? 0,
        job.pickupOneWayMiles ?? 0,
        job.pickupReturnMiles ?? 0,
        getJobMileageTotal(job),
        getJobTotal(job),
        getJobPaymentsTotal(job),
        getJobBalance(job),
        job.paymentStatus,
        job.jobAddress,
        job.pickupDestinationAddress
      ])
    ]);
  }

  function exportExpenses() {
    downloadCsv("kp-hauling-expenses.csv", [
      ["Date", "Label", "Amount", "Notes"],
      ...filteredExpenses.map((expense) => [expense.date, expense.label, expense.amount, expense.notes])
    ]);
  }

  function exportDriverCash() {
    downloadCsv("kp-hauling-driver-cash.csv", [
      ["Type", "Date", "Driver", "Job #", "Customer", "Dumpster", "Collected During", "Amount", "Note"],
      ...filteredDriverCash.map(({ job, payment }) => [
        "Driver cash collected",
        payment.date,
        payment.driverName,
        job.jobNumber,
        job.customerName,
        job.dumpsterNumber,
        payment.collectedDuring === "delivery" ? "Delivery" : "Pickup",
        payment.amount,
        payment.note
      ]),
      ...filteredDriverCashHandoffs.map((handoff) => [
        "Cash turned in to owner",
        handoff.date,
        handoff.driverName,
        "",
        "",
        "",
        "",
        handoff.amount,
        handoff.notes
      ])
    ]);
  }

  return (
    <>
      <PageHeader title="Log" description="Track finished jobs, collected money, mileage, expenses, and monthly income trends." />
      {!operations.loaded ? <LoadingPanel /> : null}
      {operations.loaded ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded border border-kp-line bg-white p-1">
              {(["jobs", "expenses", "cash", "projections"] as LogTab[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setTab(item)}
                  className={`min-h-9 rounded px-3 text-sm font-bold capitalize ${tab === item ? "bg-kp-green text-white" : "text-stone-700"}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="text-sm font-bold text-stone-700">
              Month
              <select
                value={monthFilter}
                onChange={(event) => setMonthFilter(event.target.value)}
                className="ml-2 min-h-10 rounded border border-kp-line bg-white px-3 text-sm"
              >
                <option value="all">All</option>
                {months.map((month) => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mb-4 grid grid-cols-4 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4 xl:grid-cols-7">
            <div className="rounded border border-kp-line bg-white p-2 text-center sm:p-3 sm:text-left"><p className="text-[10px] font-bold leading-tight text-stone-500 sm:text-xs">Mileage</p><p className="mt-1 text-lg font-bold leading-none sm:text-2xl">{totals.mileage.toFixed(1)}</p></div>
            <div className="rounded border border-kp-line bg-white p-2 text-center sm:p-3 sm:text-left"><p className="text-[10px] font-bold leading-tight text-stone-500 sm:text-xs">Billed</p><p className="mt-1 text-lg font-bold leading-none sm:text-2xl">{currency(totals.billed)}</p></div>
            <div className="rounded border border-kp-line bg-white p-2 text-center sm:p-3 sm:text-left"><p className="text-[10px] font-bold leading-tight text-stone-500 sm:text-xs">Collected</p><p className="mt-1 text-lg font-bold leading-none sm:text-2xl">{currency(totals.collected)}</p></div>
            <div className="rounded border border-kp-line bg-white p-2 text-center sm:p-3 sm:text-left"><p className="text-[10px] font-bold leading-tight text-stone-500 sm:text-xs">Driver Cash</p><p className="mt-1 text-lg font-bold leading-none sm:text-2xl">{currency(driverCashHeld)}</p></div>
            <div className="rounded border border-kp-line bg-white p-2 text-center sm:p-3 sm:text-left"><p className="text-[10px] font-bold leading-tight text-stone-500 sm:text-xs">Owed</p><p className="mt-1 text-lg font-bold leading-none sm:text-2xl">{currency(totals.balance)}</p></div>
            <div className="rounded border border-kp-line bg-white p-2 text-center sm:p-3 sm:text-left"><p className="text-[10px] font-bold leading-tight text-stone-500 sm:text-xs">Expenses</p><p className="mt-1 text-lg font-bold leading-none sm:text-2xl">{currency(totals.expenses)}</p></div>
            <div className="col-span-2 rounded border border-kp-line bg-white p-2 text-center sm:col-span-1 sm:p-3 sm:text-left"><p className="text-[10px] font-bold leading-tight text-stone-500 sm:text-xs">Net Income</p><p className="mt-1 text-lg font-bold leading-none sm:text-2xl">{currency(netIncome)}</p></div>
          </div>

          {tab === "jobs" ? (
            <section className="rounded border border-kp-line bg-white shadow-panel">
              <div className="flex items-center justify-between gap-3 border-b border-kp-line p-3">
                <h2 className="font-bold text-kp-ink">Finished Jobs</h2>
                <button type="button" onClick={exportJobs} className="flex min-h-9 items-center gap-2 rounded border border-kp-line px-3 text-xs font-bold">
                  <Download aria-hidden className="h-4 w-4" />
                  Export CSV
                </button>
              </div>
              <div className="divide-y divide-kp-line">
                <div className="hidden grid-cols-[1.6fr_0.9fr_0.9fr_0.6fr_0.9fr_0.9fr_0.9fr_0.8fr] gap-3 bg-kp-paper p-3 text-xs font-bold uppercase tracking-normal text-stone-500 lg:grid">
                  <span>Job / Customer</span>
                  <span>Completed</span>
                  <span>Dumpster</span>
                  <span>Miles</span>
                  <span>Billed</span>
                  <span>Collected</span>
                  <span>Owed</span>
                  <span>Payment</span>
                </div>
                {filteredJobs.length > 0 ? filteredJobs.map((job) => (
                  <div key={job.id} className="p-3">
                    <div className="grid gap-3 text-sm lg:grid-cols-[1.6fr_0.9fr_0.9fr_0.6fr_0.9fr_0.9fr_0.9fr_0.8fr] lg:items-center">
                      <div>
                        <p className="font-bold text-kp-ink">Job #{job.jobNumber} - {job.customerName}</p>
                        <p className="text-xs text-stone-500 lg:hidden">{job.jobAddress}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">Completed</p>
                        <p>{displayDate(job.actualPickupDate ?? job.expectedPickupDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">Dumpster</p>
                        <p>{job.dumpsterNumber ?? "Unassigned"}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">Miles</p>
                        <p>{getJobMileageTotal(job).toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">Billed</p>
                        <p>{currency(getJobTotal(job))}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">Collected</p>
                        <p>{currency(getJobPaymentsTotal(job))}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">Balances Owed</p>
                        <p className={getJobBalance(job) > 0 ? "font-bold text-red-700" : "font-bold text-emerald-700"}>
                          {currency(getJobBalance(job))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">Payment</p>
                        <p>{job.paymentStatus}</p>
                      </div>
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-bold text-kp-green">Adjust job</summary>
                      <div className="mt-3 max-w-3xl">
                        <JobCard
                          job={job}
                          onDelete={operations.deleteJob}
                          onPaymentChange={operations.updateJobPaymentStatus}
                          onUpdate={operations.updateJob}
                          onStatusChange={operations.updateJobStatus}
                          onAddCharge={operations.addJobCharge}
                          onAddPayment={operations.addJobPayment}
                        />
                      </div>
                    </details>
                  </div>
                )) : (
                  <div className="p-5 text-sm text-stone-600">No finished jobs for this filter.</div>
                )}
              </div>
              <div className="border-t border-kp-line p-3">
                <h3 className="font-bold text-kp-ink">Cash Turned In To Owner</h3>
                <div className="mt-3 divide-y divide-kp-line rounded border border-kp-line">
                  {filteredDriverCashHandoffs.length > 0 ? filteredDriverCashHandoffs.map((handoff) => (
                    <div key={handoff.id} className="grid gap-2 p-3 text-sm md:grid-cols-[0.8fr_1fr_0.8fr_1.5fr] md:items-center">
                      <p>{displayDate(handoff.date)}</p>
                      <p className="font-bold text-kp-ink">{handoff.driverName}</p>
                      <p className="font-bold text-emerald-700">{currency(handoff.amount)}</p>
                      <p className="text-stone-600">{handoff.notes || "No note"}</p>
                    </div>
                  )) : (
                    <div className="p-3 text-sm text-stone-600">No driver cash handoffs for this filter.</div>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {tab === "cash" ? (
            <section className="rounded border border-kp-line bg-white shadow-panel">
              <div className="flex items-center justify-between gap-3 border-b border-kp-line p-3">
                <div>
                  <h2 className="font-bold text-kp-ink">Driver Cash Collected</h2>
                  <p className="text-xs text-stone-500">Cash marked by drivers during delivery or pickup.</p>
                </div>
                <button type="button" onClick={exportDriverCash} className="flex min-h-9 items-center gap-2 rounded border border-kp-line px-3 text-xs font-bold">
                  <Download aria-hidden className="h-4 w-4" />
                  Export CSV
                </button>
              </div>
              <div className="divide-y divide-kp-line">
                <div className="hidden grid-cols-[0.8fr_1fr_1.4fr_0.8fr_0.8fr_0.8fr_1.5fr] gap-3 bg-kp-paper p-3 text-xs font-bold uppercase tracking-normal text-stone-500 lg:grid">
                  <span>Date</span>
                  <span>Driver</span>
                  <span>Job / Customer</span>
                  <span>Dumpster</span>
                  <span>For</span>
                  <span>Amount</span>
                  <span>Note</span>
                </div>
                {filteredDriverCash.length > 0 ? filteredDriverCash.map(({ job, payment }) => (
                  <div key={payment.id} className="grid gap-3 p-3 text-sm lg:grid-cols-[0.8fr_1fr_1.4fr_0.8fr_0.8fr_0.8fr_1.5fr] lg:items-center">
                    <div>
                      <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">Date</p>
                      <p>{displayDate(payment.date)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">Driver</p>
                      <p className="font-bold text-kp-ink">{payment.driverName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">Job / Customer</p>
                      <p>Job #{job.jobNumber} - {job.customerName}</p>
                      <p className="text-xs text-stone-500">{job.jobAddress}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">Dumpster</p>
                      <p>{job.dumpsterNumber ?? "Unassigned"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">For</p>
                      <p className="capitalize">{payment.collectedDuring ?? "driver"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">Amount</p>
                      <p className="font-bold text-emerald-700">{currency(payment.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-stone-500 lg:hidden">Note</p>
                      <p className="text-stone-600">{payment.note || "No note"}</p>
                    </div>
                  </div>
                )) : (
                  <div className="p-5 text-sm text-stone-600">No driver cash has been logged for this filter.</div>
                )}
              </div>
            </section>
          ) : null}

          {tab === "expenses" ? (
            <section className="grid gap-4 lg:grid-cols-[420px_1fr]">
              <form onSubmit={submitExpense} className="rounded border border-kp-line bg-white p-4 shadow-panel">
                <h2 className="mb-3 font-bold text-kp-ink">Add Expense</h2>
                <div className="grid gap-3">
                  <Field label="Date" type="date" value={expenseForm.date} onChange={(event) => setExpenseForm({ ...expenseForm, date: event.target.value })} />
                  <Field label="Expense" value={expenseForm.label} onChange={(event) => setExpenseForm({ ...expenseForm, label: event.target.value })} />
                  <Field label="Amount" type="number" min={0} value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: Number(event.target.value) })} />
                  <TextAreaField label="Notes" value={expenseForm.notes} onChange={(event) => setExpenseForm({ ...expenseForm, notes: event.target.value })} />
                </div>
                <button type="submit" className="mt-4 flex min-h-10 items-center gap-2 rounded bg-kp-green px-3 text-sm font-bold text-white">
                  <Plus aria-hidden className="h-4 w-4" />
                  Add Expense
                </button>
              </form>
              <div className="rounded border border-kp-line bg-white shadow-panel">
                <div className="flex items-center justify-between border-b border-kp-line p-3">
                  <h2 className="font-bold text-kp-ink">Expenses</h2>
                  <button type="button" onClick={exportExpenses} className="flex min-h-9 items-center gap-2 rounded border border-kp-line px-3 text-xs font-bold">
                    <Download aria-hidden className="h-4 w-4" />
                    Export CSV
                  </button>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="hidden bg-kp-paper text-xs uppercase text-stone-500 sm:table-header-group"><tr><th className="p-3">Date</th><th className="p-3">Expense</th><th className="p-3">Amount</th><th className="p-3"></th></tr></thead>
                  <tbody>
                    {filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="grid gap-2 border-t border-kp-line p-3 sm:table-row sm:p-0">
                        <td className="sm:p-3"><span className="mr-2 text-xs font-bold uppercase text-stone-500 sm:hidden">Date</span>{displayDate(expense.date)}</td>
                        <td className="font-bold sm:p-3"><span className="mr-2 text-xs font-bold uppercase text-stone-500 sm:hidden">Expense</span>{expense.label}</td>
                        <td className="sm:p-3"><span className="mr-2 text-xs font-bold uppercase text-stone-500 sm:hidden">Amount</span>{currency(expense.amount)}</td>
                        <td className="sm:p-3 sm:text-right"><button type="button" onClick={() => operations.deleteExpense(expense.id)} className="inline-flex min-h-9 items-center justify-center rounded border border-kp-line bg-white px-3 text-xs font-bold text-red-700"><Trash2 className="h-4 w-4" /><span className="ml-2 sm:hidden">Delete</span></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {tab === "projections" ? (
            <section className="rounded border border-kp-line bg-white p-4 shadow-panel">
              <h2 className="font-bold text-kp-ink">Income Over Time</h2>
              <svg viewBox="0 0 300 150" className="mt-4 h-64 w-full rounded bg-kp-paper">
                <polyline fill="none" stroke="#285a3b" strokeWidth="4" points={points} />
                {projectionRows.map((row, index) => {
                  const x = projectionRows.length === 1 ? 50 : 20 + (index * 260) / (projectionRows.length - 1);
                  const y = 130 - (row.income / maxProjection) * 110;
                  return <circle key={row.month} cx={x} cy={y} r="4" fill="#285a3b" />;
                })}
              </svg>
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {projectionRows.map((row) => (
                  <div key={row.month} className="rounded border border-kp-line p-3 text-sm">
                    <p className="font-bold">{row.month}</p>
                    <p>Income {currency(row.income)}</p>
                    <p>Expenses {currency(row.expenses)}</p>
                    <p>Net Income {currency(row.income - row.expenses)}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </>
  );
}
