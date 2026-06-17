"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, ChevronDown, Clock, DollarSign, Plus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Field, TextAreaField } from "@/components/form-fields";
import { currency } from "@/lib/data";

type PreviewDriver = {
  id: string;
  name: string;
  email: string;
};

type TimecardEntry = {
  id: string;
  driverId: string;
  driverName: string;
  date: string;
  startTime: string;
  endTime: string;
  note: string;
  paidAt?: string;
  paidAmount?: number;
};

const previewDrivers: PreviewDriver[] = [
  { id: "driver-preview-1", name: "Chris Driver", email: "driver@example.com" },
  { id: "driver-preview-2", name: "Sam Helper", email: "helper@example.com" }
];

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function entryHours(entry: Pick<TimecardEntry, "startTime" | "endTime">) {
  return Math.max((timeToMinutes(entry.endTime) - timeToMinutes(entry.startTime)) / 60, 0);
}

function displayTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export default function TimecardPreviewPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [viewDriverId, setViewDriverId] = useState(previewDrivers[0].id);
  const [openDriverId, setOpenDriverId] = useState(previewDrivers[0].id);
  const [rates, setRates] = useState<Record<string, number>>({
    "driver-preview-1": 25,
    "driver-preview-2": 22
  });
  const [entries, setEntries] = useState<TimecardEntry[]>([
    {
      id: "preview-1",
      driverId: "driver-preview-1",
      driverName: "Chris Driver",
      date: today,
      startTime: "08:00",
      endTime: "10:00",
      note: "Dropped off Job #12, placed dumpster at curb."
    },
    {
      id: "preview-2",
      driverId: "driver-preview-1",
      driverName: "Chris Driver",
      date: today,
      startTime: "13:00",
      endTime: "14:30",
      note: "Picked up Job #11 and returned dumpster to yard.",
      paidAt: today,
      paidAmount: 37.5
    },
    {
      id: "preview-3",
      driverId: "driver-preview-2",
      driverName: "Sam Helper",
      date: today,
      startTime: "09:30",
      endTime: "12:00",
      note: "Helped with two-yard cleanup and tarp check."
    }
  ]);
  const [form, setForm] = useState({
    date: today,
    startTime: "08:00",
    endTime: "10:00",
    note: ""
  });
  const [message, setMessage] = useState("");

  const viewDriver = previewDrivers.find((driver) => driver.id === viewDriverId) ?? previewDrivers[0];
  const driverEntries = entries.filter((entry) => entry.driverId === viewDriver.id);
  const driverUnpaidHours = driverEntries.filter((entry) => !entry.paidAt).reduce((total, entry) => total + entryHours(entry), 0);
  const driverPaidHours = driverEntries.filter((entry) => entry.paidAt).reduce((total, entry) => total + entryHours(entry), 0);

  const summaryByDriver = useMemo(() => {
    return previewDrivers.map((driver) => {
      const allEntries = entries.filter((entry) => entry.driverId === driver.id);
      const unpaidEntries = allEntries.filter((entry) => !entry.paidAt);
      const paidEntries = allEntries.filter((entry) => entry.paidAt);
      const rate = rates[driver.id] ?? 0;
      const unpaidHours = unpaidEntries.reduce((total, entry) => total + entryHours(entry), 0);
      const paidHours = paidEntries.reduce((total, entry) => total + entryHours(entry), 0);

      return {
        driver,
        unpaidEntries,
        paidEntries,
        rate,
        unpaidHours,
        paidHours,
        owed: unpaidHours * rate
      };
    });
  }, [entries, rates]);

  function submitDriverTime(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.date || !form.startTime || !form.endTime || !form.note.trim() || form.startTime >= form.endTime) {
      setMessage("Preview: date, valid time frame, and note are required.");
      return;
    }

    setEntries((current) => [
      {
        id: `preview-${Date.now()}`,
        driverId: viewDriver.id,
        driverName: viewDriver.name,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        note: form.note.trim()
      },
      ...current
    ]);
    setForm({ ...form, note: "" });
    setMessage(`Preview: ${entryHours(form).toFixed(2)} hours added for ${viewDriver.name}.`);
  }

  function markPaid(driverId: string) {
    const summary = summaryByDriver.find((item) => item.driver.id === driverId);
    if (!summary || summary.unpaidEntries.length === 0) {
      return;
    }
    const paidAt = new Date().toISOString().slice(0, 10);
    setEntries((current) =>
      current.map((entry) =>
        entry.driverId === driverId && !entry.paidAt
          ? { ...entry, paidAt, paidAmount: entryHours(entry) * summary.rate }
          : entry
      )
    );
    setMessage(`Preview: payout would log ${currency(summary.owed)} as a driver payroll expense.`);
  }

  return (
    <>
      <PageHeader title="Timecard Preview" description="Preview only. This mockup does not save to Supabase or change the live driver payout system." />

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <section className="rounded border border-kp-line bg-white shadow-panel">
          <div className="border-b border-kp-line p-3">
            <div className="flex items-center gap-2">
              <Clock aria-hidden className="h-5 w-5 text-kp-green" />
              <h2 className="font-bold text-kp-ink">Driver View Preview</h2>
            </div>
          </div>

          <div className="p-4">
            <label className="block text-sm font-bold text-stone-700">
              Preview As Driver
              <select
                value={viewDriverId}
                onChange={(event) => setViewDriverId(event.target.value)}
                className="mt-1 min-h-10 w-full rounded border border-kp-line bg-white px-3 text-sm font-bold text-kp-ink"
              >
                {previewDrivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
              </select>
            </label>

            <form onSubmit={submitDriverTime} className="mt-4 rounded border border-kp-line bg-kp-paper p-3">
              <div className="grid gap-3">
                <Field label="Date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Start Time" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
                  <Field label="End Time" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
                </div>
                <TextAreaField label="Required Note" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Example: Dropped off Job #14, customer paid cash, placed at curb." required />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded border border-kp-line bg-white p-2">
                  <p className="text-xs font-bold text-stone-500">This Entry</p>
                  <p className="font-bold text-kp-ink">{entryHours(form).toFixed(2)} hrs</p>
                </div>
                <div className="rounded border border-kp-line bg-white p-2">
                  <p className="text-xs font-bold text-stone-500">To Be Paid</p>
                  <p className="font-bold text-kp-ink">{driverUnpaidHours.toFixed(2)} hrs</p>
                </div>
                <div className="rounded border border-kp-line bg-white p-2">
                  <p className="text-xs font-bold text-stone-500">Paid</p>
                  <p className="font-bold text-kp-ink">{driverPaidHours.toFixed(2)} hrs</p>
                </div>
              </div>

              <button type="submit" className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded bg-kp-green px-3 text-sm font-bold text-white">
                <Plus aria-hidden className="h-4 w-4" />
                Add Time
              </button>
            </form>

            <div className="mt-4 rounded border border-kp-line bg-white">
              <h3 className="border-b border-kp-line p-2 text-sm font-bold text-kp-ink">My Timecard</h3>
              {driverEntries.length > 0 ? driverEntries.map((entry) => (
                <div key={entry.id} className="border-b border-kp-line p-2 text-sm last:border-b-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold text-kp-ink">{entry.date} | {displayTime(entry.startTime)} - {displayTime(entry.endTime)}</p>
                    <span className={`rounded px-2 py-1 text-xs font-bold ${entry.paidAt ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                      {entry.paidAt ? "Paid" : "To be paid"}
                    </span>
                  </div>
                  <p className="mt-1 text-stone-600">{entryHours(entry).toFixed(2)} hrs | {entry.note}</p>
                </div>
              )) : <p className="p-3 text-sm text-stone-500">No time entered.</p>}
            </div>
          </div>
        </section>

        <section className="rounded border border-kp-line bg-white shadow-panel">
          <div className="border-b border-kp-line p-3">
            <h2 className="font-bold text-kp-ink">Admin Drivers Tab Preview</h2>
          </div>

          <div className="divide-y divide-kp-line">
            {summaryByDriver.map(({ driver, unpaidEntries, paidEntries, rate, unpaidHours, paidHours, owed }) => {
              const isOpen = openDriverId === driver.id;
              return (
                <article key={driver.id}>
                  <button
                    type="button"
                    onClick={() => setOpenDriverId(isOpen ? "" : driver.id)}
                    className="flex w-full items-center justify-between gap-3 p-3 text-left"
                  >
                    <div>
                      <p className="font-bold text-kp-ink">{driver.name}</p>
                      <p className="text-xs font-semibold text-stone-500">{driver.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-kp-paper px-3 py-1 text-sm font-bold text-kp-ink">{currency(owed)} owed</span>
                      <ChevronDown aria-hidden className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {isOpen ? (
                    <div className="border-t border-kp-line bg-kp-paper p-3">
                      <div className="grid gap-3 lg:grid-cols-[160px_1fr_140px] lg:items-end">
                        <Field
                          label="Hourly Rate"
                          type="number"
                          min={0}
                          step="0.01"
                          value={rate}
                          onChange={(event) => setRates({ ...rates, [driver.id]: Number(event.target.value) })}
                        />
                        <div className="grid grid-cols-3 gap-2 text-center text-sm">
                          <div className="rounded border border-kp-line bg-white p-2">
                            <p className="text-xs font-bold text-stone-500">Needs Paid</p>
                            <p className="font-bold text-kp-ink">{unpaidHours.toFixed(2)} hrs</p>
                          </div>
                          <div className="rounded border border-kp-line bg-white p-2">
                            <p className="text-xs font-bold text-stone-500">Paid Out</p>
                            <p className="font-bold text-kp-ink">{paidHours.toFixed(2)} hrs</p>
                          </div>
                          <div className="rounded border border-kp-line bg-white p-2">
                            <p className="text-xs font-bold text-stone-500">Owed</p>
                            <p className="font-bold text-kp-ink">{currency(owed)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => markPaid(driver.id)}
                          disabled={unpaidEntries.length === 0 || rate <= 0}
                          className="flex min-h-10 items-center justify-center gap-2 rounded bg-kp-green px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
                        >
                          <DollarSign aria-hidden className="h-4 w-4" />
                          Payout
                        </button>
                      </div>

                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        <div className="rounded border border-kp-line bg-white">
                          <h3 className="border-b border-kp-line p-2 text-sm font-bold text-kp-ink">To Be Paid</h3>
                          {unpaidEntries.length > 0 ? unpaidEntries.map((entry) => (
                            <div key={entry.id} className="border-b border-kp-line p-2 text-sm last:border-b-0">
                              <p className="font-bold">{entry.date} | {displayTime(entry.startTime)} - {displayTime(entry.endTime)} | {entryHours(entry).toFixed(2)} hrs</p>
                              <p className="mt-1 text-stone-600">{entry.note}</p>
                            </div>
                          )) : <p className="p-3 text-sm text-stone-500">No unpaid time.</p>}
                        </div>

                        <div className="rounded border border-kp-line bg-white">
                          <h3 className="border-b border-kp-line p-2 text-sm font-bold text-kp-ink">Paid Out</h3>
                          {paidEntries.length > 0 ? paidEntries.map((entry) => (
                            <div key={entry.id} className="border-b border-kp-line p-2 text-sm last:border-b-0">
                              <p className="flex items-center gap-1 font-bold text-emerald-800">
                                <Check aria-hidden className="h-4 w-4" />
                                {entry.date} | {entryHours(entry).toFixed(2)} hrs | {currency(entry.paidAmount ?? 0)}
                              </p>
                              <p className="mt-1 text-stone-600">{entry.note}</p>
                            </div>
                          )) : <p className="p-3 text-sm text-stone-500">No paid time yet.</p>}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {message ? <p className="mt-4 rounded border border-kp-line bg-white p-3 text-sm font-bold text-stone-700 shadow-panel">{message}</p> : null}
    </>
  );
}
