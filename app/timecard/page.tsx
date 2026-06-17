"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, Clock, Plus } from "lucide-react";
import { Field, TextAreaField } from "@/components/form-fields";
import { LoadingPanel } from "@/components/loading-panel";
import { currency } from "@/lib/data";
import { displayClockTime, getDriverHourlyRate, getDriverTimecardSummary, getTimecardHours } from "@/lib/timecards";
import { useOperations } from "@/lib/use-operations";
import { useAuth } from "@/components/auth-provider";

export default function TimecardPage() {
  const auth = useAuth();
  const operations = useOperations();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    workDate: today,
    startTime: "08:00",
    endTime: "10:00",
    note: ""
  });
  const [message, setMessage] = useState("");

  const currentUser = auth.currentUser;
  const driverEntries = useMemo(() => {
    if (!currentUser) {
      return [];
    }
    return operations.driverTimecards.filter((entry) => entry.driverId === currentUser.id);
  }, [currentUser, operations.driverTimecards]);
  const hourlyRate = currentUser ? getDriverHourlyRate(operations.driverHourlyRates, currentUser.id) : 0;
  const summary = getDriverTimecardSummary(driverEntries, hourlyRate);

  async function submitTime(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser) {
      return;
    }
    if (!form.workDate || !form.startTime || !form.endTime || !form.note.trim()) {
      setMessage("Date, time frame, and note are required.");
      return;
    }
    if (form.startTime >= form.endTime) {
      setMessage("End time must be later than start time.");
      return;
    }

    const saved = await operations.addDriverTimecardEntry(currentUser.id, currentUser.name, form);
    if (!saved) {
      return;
    }
    setMessage(`${getTimecardHours(form).toFixed(2)} hours added.`);
    setForm((current) => ({ ...current, note: "" }));
  }

  if (!operations.loaded || !auth.loaded) {
    return <LoadingPanel />;
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <section className="rounded border border-kp-line bg-white shadow-panel">
        <div className="border-b border-kp-line p-3">
          <div className="flex items-center gap-2">
            <Clock aria-hidden className="h-5 w-5 text-kp-green" />
            <h1 className="font-bold text-kp-ink">Timecard</h1>
          </div>
        </div>

        <div className="p-4">
          <form onSubmit={submitTime} className="rounded border border-kp-line bg-kp-paper p-3">
            <div className="grid gap-3">
              <Field label="Date" type="date" value={form.workDate} onChange={(event) => setForm({ ...form, workDate: event.target.value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Start Time" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
                <Field label="End Time" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
              </div>
              <TextAreaField label="Required Note" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Example: Dropped off Job #14, customer paid cash, placed at curb." required />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded border border-kp-line bg-white p-2">
                <p className="text-xs font-bold text-stone-500">This Entry</p>
                <p className="font-bold text-kp-ink">{getTimecardHours(form).toFixed(2)} hrs</p>
              </div>
              <div className="rounded border border-kp-line bg-white p-2">
                <p className="text-xs font-bold text-stone-500">To Be Paid</p>
                <p className="font-bold text-kp-ink">{summary.unpaidHours.toFixed(2)} hrs</p>
              </div>
              <div className="rounded border border-kp-line bg-white p-2">
                <p className="text-xs font-bold text-stone-500">Paid</p>
                <p className="font-bold text-kp-ink">{summary.paidHours.toFixed(2)} hrs</p>
              </div>
            </div>

            <button type="submit" className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded bg-kp-green px-3 text-sm font-bold text-white">
              <Plus aria-hidden className="h-4 w-4" />
              Add Time
            </button>
          </form>

          {message ? <p className="mt-3 rounded border border-kp-line bg-white p-3 text-sm font-bold text-stone-700">{message}</p> : null}
        </div>
      </section>

      <section className="rounded border border-kp-line bg-white shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-kp-line p-3">
          <h2 className="font-bold text-kp-ink">My Timecard</h2>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded bg-amber-50 px-2 py-1 text-amber-800">{currency(summary.owed)} to be paid</span>
            <span className="rounded bg-kp-paper px-2 py-1 text-stone-700">{hourlyRate > 0 ? `${currency(hourlyRate)}/hr` : "Rate not set"}</span>
          </div>
        </div>
        <div className="divide-y divide-kp-line">
          {driverEntries.length > 0 ? driverEntries.map((entry) => (
            <article key={entry.id} className="p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-kp-ink">{entry.workDate} | {displayClockTime(entry.startTime)} - {displayClockTime(entry.endTime)}</p>
                <span className={`rounded px-2 py-1 text-xs font-bold ${entry.paidAt ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                  {entry.paidAt ? "Paid" : "To be paid"}
                </span>
              </div>
              <p className="mt-1 text-stone-600">{getTimecardHours(entry).toFixed(2)} hrs | {entry.note}</p>
              {entry.paidAt ? (
                <p className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-800">
                  <Check aria-hidden className="h-4 w-4" />
                  Paid {entry.paidAt} for {currency(entry.paidAmount ?? 0)}
                </p>
              ) : null}
            </article>
          )) : <p className="p-4 text-sm text-stone-500">No time entered yet.</p>}
        </div>
      </section>
    </div>
  );
}
