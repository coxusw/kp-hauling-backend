"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, DollarSign, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Field, SelectField } from "@/components/form-fields";
import type { AppUser, UserRole } from "@/lib/auth";
import { currency } from "@/lib/data";
import { displayClockTime, getDriverHourlyRate, getDriverTimecardSummary, getTimecardHours } from "@/lib/timecards";
import { useOperations } from "@/lib/use-operations";

function DriverPayrollSection({
  user,
  cashHeld,
  hourlyRate,
  onCashHandoff,
  onHourlyRate,
  onPayout,
  timecards
}: {
  user: AppUser;
  cashHeld: number;
  hourlyRate: number;
  timecards: ReturnType<typeof useOperations>["driverTimecards"];
  onCashHandoff: (user: AppUser, amount: number, notes: string) => void;
  onHourlyRate: (user: AppUser, hourlyRate: number) => void;
  onPayout: (user: AppUser) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [handoffAmount, setHandoffAmount] = useState("");
  const [handoffNotes, setHandoffNotes] = useState("");
  const [rateValue, setRateValue] = useState(String(hourlyRate || ""));
  const driverEntries = useMemo(() => timecards.filter((entry) => entry.driverId === user.id), [timecards, user.id]);
  const summary = getDriverTimecardSummary(driverEntries, hourlyRate);

  useEffect(() => {
    setRateValue(String(hourlyRate || ""));
  }, [hourlyRate]);

  function submitHandoff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(handoffAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    onCashHandoff(user, amount, handoffNotes);
    setHandoffAmount("");
    setHandoffNotes("");
  }

  function saveRate() {
    const nextRate = Number(rateValue);
    if (!Number.isFinite(nextRate) || nextRate < 0) {
      return;
    }
    onHourlyRate(user, nextRate);
  }

  return (
    <article className="border-b border-kp-line last:border-b-0">
      <button type="button" onClick={() => setIsOpen((current) => !current)} className="flex w-full items-center justify-between gap-3 p-3 text-left">
        <div className="min-w-0">
          <p className="truncate font-bold text-kp-ink">{user.name}</p>
          <p className="truncate text-xs font-semibold text-stone-500">{user.email}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800 sm:inline">{currency(cashHeld)} cash</span>
          <span className="rounded bg-kp-paper px-2 py-1 text-xs font-bold text-kp-ink">{currency(summary.owed)} owed</span>
          <ChevronDown aria-hidden className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {isOpen ? (
        <div className="border-t border-kp-line bg-kp-paper p-3">
          <div className="grid gap-3 lg:grid-cols-[170px_1fr_150px] lg:items-end">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Field label="Hourly Rate" type="number" min={0} step="0.01" value={rateValue} onChange={(event) => setRateValue(event.target.value)} />
              <button type="button" onClick={saveRate} className="mt-6 min-h-10 rounded border border-kp-line bg-white px-3 text-xs font-bold text-kp-ink">
                Save
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded border border-kp-line bg-white p-2">
                <p className="text-xs font-bold text-stone-500">Needs Paid</p>
                <p className="font-bold text-kp-ink">{summary.unpaidHours.toFixed(2)} hrs</p>
              </div>
              <div className="rounded border border-kp-line bg-white p-2">
                <p className="text-xs font-bold text-stone-500">Paid Out</p>
                <p className="font-bold text-kp-ink">{summary.paidHours.toFixed(2)} hrs</p>
              </div>
              <div className="rounded border border-kp-line bg-white p-2">
                <p className="text-xs font-bold text-stone-500">Owed</p>
                <p className="font-bold text-kp-ink">{currency(summary.owed)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onPayout(user)}
              disabled={summary.unpaidEntries.length === 0 || hourlyRate <= 0}
              className="flex min-h-10 items-center justify-center gap-2 rounded bg-kp-green px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              <DollarSign aria-hidden className="h-4 w-4" />
              Payout
            </button>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[330px_1fr]">
            <form onSubmit={submitHandoff} className="rounded border border-kp-line bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-normal text-stone-500">Cash Held By Driver</p>
                <p className={cashHeld > 0 ? "text-lg font-bold text-amber-800" : "text-lg font-bold text-kp-ink"}>{currency(cashHeld)}</p>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-[100px_1fr]">
                <Field label="Amount" type="number" min={0} step="0.01" max={Math.max(cashHeld, 0)} value={handoffAmount} onChange={(event) => setHandoffAmount(event.target.value)} />
                <Field label="Notes" value={handoffNotes} onChange={(event) => setHandoffNotes(event.target.value)} placeholder="Turned in to owner" />
              </div>
              <button type="submit" disabled={cashHeld <= 0} className="mt-2 inline-flex min-h-9 items-center justify-center rounded bg-kp-paper px-3 text-center text-xs font-bold text-stone-700 ring-1 ring-kp-line disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400">
                Mark Collected
              </button>
            </form>

            <div className="grid gap-3 xl:grid-cols-2">
              <div className="rounded border border-kp-line bg-white">
                <h3 className="border-b border-kp-line p-2 text-sm font-bold text-kp-ink">To Be Paid</h3>
                {summary.unpaidEntries.length > 0 ? summary.unpaidEntries.map((entry) => (
                  <div key={entry.id} className="border-b border-kp-line p-2 text-sm last:border-b-0">
                    <p className="font-bold">{entry.workDate} | {displayClockTime(entry.startTime)} - {displayClockTime(entry.endTime)} | {getTimecardHours(entry).toFixed(2)} hrs</p>
                    <p className="mt-1 text-stone-600">{entry.note}</p>
                  </div>
                )) : <p className="p-3 text-sm text-stone-500">No unpaid time.</p>}
              </div>

              <div className="rounded border border-kp-line bg-white">
                <h3 className="border-b border-kp-line p-2 text-sm font-bold text-kp-ink">Paid Out</h3>
                {summary.paidEntries.length > 0 ? summary.paidEntries.map((entry) => (
                  <div key={entry.id} className="border-b border-kp-line p-2 text-sm last:border-b-0">
                    <p className="flex items-center gap-1 font-bold text-emerald-800">
                      <Check aria-hidden className="h-4 w-4" />
                      {entry.workDate} | {getTimecardHours(entry).toFixed(2)} hrs | {currency(entry.paidAmount ?? 0)}
                    </p>
                    <p className="mt-1 text-stone-600">{entry.note}</p>
                  </div>
                )) : <p className="p-3 text-sm text-stone-500">No paid time yet.</p>}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function DriversPage() {
  const auth = useAuth();
  const operations = useOperations();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "driver" as UserRole
  });
  const drivers = useMemo(() => auth.users.filter((user) => user.role === "driver"), [auth.users]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await auth.addUser(form);
    if (!result.ok) {
      setMessage(result.message ?? "Unable to add login.");
      return;
    }
    setMessage(form.role === "driver" ? "Driver login added." : "Admin login added.");
    setForm({ name: "", email: "", password: "", phone: "", role: "driver" });
  }

  async function removeUser(userId: string) {
    const result = await auth.removeUser(userId);
    setMessage(result.ok ? "Login removed." : result.message ?? "Unable to remove login.");
  }

  function getDriverCashHeld(user: AppUser) {
    const collected = operations.jobs.reduce((total, job) => {
      return total + (job.payments ?? [])
        .filter((payment) => payment.method === "Cash" && payment.driverId === user.id)
        .reduce((paymentTotal, payment) => paymentTotal + payment.amount, 0);
    }, 0);
    const turnedIn = operations.driverCashHandoffs
      .filter((handoff) => handoff.driverId === user.id)
      .reduce((total, handoff) => total + handoff.amount, 0);
    return Math.max(collected - turnedIn, 0);
  }

  function addCashHandoff(user: AppUser, amount: number, notes: string) {
    const cashHeld = getDriverCashHeld(user);
    if (amount > cashHeld) {
      setMessage(`${user.name} only has ${currency(cashHeld)} marked as driver-held cash.`);
      return;
    }
    operations.addDriverCashHandoff(user.id, user.name, amount, notes || "Cash turned in to owner");
    setMessage(`Collected ${currency(amount)} from ${user.name}.`);
  }

  function saveHourlyRate(user: AppUser, hourlyRate: number) {
    operations.setDriverHourlyRate(user.id, hourlyRate);
    setMessage(`${user.name}'s hourly rate saved at ${currency(hourlyRate)}/hr.`);
  }

  async function payoutTimecards(user: AppUser) {
    const ok = await operations.payoutDriverTimecards(user.id, user.name);
    setMessage(ok ? `${user.name}'s unpaid timecard was paid out and logged as an expense.` : "No unpaid timecard balance to pay.");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
      <form onSubmit={submit} className="rounded border border-kp-line bg-white p-4 shadow-panel">
        <h1 className="mb-3 text-lg font-bold text-kp-ink">Add Driver/Admin Login</h1>
        <div className="grid gap-3">
          <Field label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <Field label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <Field label="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          <Field label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <SelectField label="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}>
            <option value="driver">Driver</option>
            <option value="admin">Admin</option>
          </SelectField>
        </div>
        {message ? <p className="mt-3 rounded bg-kp-paper p-3 text-sm font-semibold text-stone-700">{message}</p> : null}
        <button type="submit" className="mt-4 flex min-h-10 items-center gap-2 rounded bg-kp-green px-3 text-sm font-bold text-white">
          <Plus aria-hidden className="h-4 w-4" />
          Add Login
        </button>
      </form>

      <section className="rounded border border-kp-line bg-white shadow-panel">
        <div className="border-b border-kp-line p-3">
          <h2 className="font-bold text-kp-ink">Drivers</h2>
        </div>
        <div>
          {drivers.length > 0 ? drivers.map((driver) => (
            <div key={driver.id} className="relative">
              <DriverPayrollSection
                user={driver}
                cashHeld={getDriverCashHeld(driver)}
                hourlyRate={getDriverHourlyRate(operations.driverHourlyRates, driver.id)}
                timecards={operations.driverTimecards}
                onCashHandoff={addCashHandoff}
                onHourlyRate={saveHourlyRate}
                onPayout={payoutTimecards}
              />
              <button
                type="button"
                onClick={() => removeUser(driver.id)}
                title="Remove driver login"
                className="absolute right-11 top-3 flex min-h-8 items-center justify-center gap-1 rounded border border-kp-line bg-white px-2 text-xs font-bold text-red-700 transition hover:border-red-300"
              >
                <Trash2 aria-hidden className="h-4 w-4" />
                <span className="hidden sm:inline">Remove</span>
              </button>
            </div>
          )) : <p className="p-4 text-sm text-stone-600">No driver logins added yet.</p>}
        </div>
      </section>

      <section className="rounded border border-kp-line bg-white shadow-panel lg:col-span-2">
        <div className="border-b border-kp-line p-3">
          <h2 className="font-bold text-kp-ink">Admin Logins</h2>
        </div>
        <div className="divide-y divide-kp-line">
          {auth.users.filter((user) => user.role !== "driver").map((user) => (
            <div key={user.id} className="grid gap-2 p-3 text-sm sm:grid-cols-[1fr_1fr_110px_90px] sm:items-center">
              <div>
                <p className="font-bold text-kp-ink">{user.name}</p>
                <p className="text-xs text-stone-500">{user.email}</p>
              </div>
              <p>{user.phone || "No phone"}</p>
              <p className="kp-chip bg-kp-paper capitalize text-stone-700">{user.role}</p>
              <button
                type="button"
                onClick={() => removeUser(user.id)}
                disabled={user.id === auth.currentUser?.id}
                title={user.id === auth.currentUser?.id ? "You cannot remove your active login." : "Remove login"}
                className="flex min-h-9 items-center justify-center gap-2 rounded border border-kp-line bg-white px-2 text-xs font-bold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
              >
                <Trash2 aria-hidden className="h-4 w-4" />
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
