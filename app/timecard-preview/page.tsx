"use client";

import { FormEvent, useMemo, useState } from "react";
import { Check, ChevronDown, Clock, DollarSign, Plus } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Field, TextAreaField } from "@/components/form-fields";
import { PageHeader } from "@/components/page-header";
import { currency } from "@/lib/data";
import { canManageOperations } from "@/lib/auth";

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
  const auth = useAuth();
  const drivers = auth.users.filter((user) => user.role === "driver");
  const fallbackDriver = drivers[0] ?? auth.currentUser;
  const today = new Date().toISOString().slice(0, 10);
  const [entries, setEntries] = useState<TimecardEntry[]>([
    {
      id: "preview-1",
      driverId: fallbackDriver?.id ?? "driver-preview",
      driverName: fallbackDriver?.name ?? "Preview Driver",
      date: today,
      startTime: "08:00",
      endTime: "10:00",
      note: "Delivered Job #12, customer requested curb placement."
    },
    {
      id: "preview-2",
      driverId: fallbackDriver?.id ?? "driver-preview",
      driverName: fallbackDriver?.name ?? "Preview Driver",
      date: today,
      startTime: "13:00",
      endTime: "14:30",
      note: "Picked up Job #11 and returned dumpster to yard.",
      paidAt: today,
      paidAmount: 37.5
    }
  ]);
  const [form, setForm] = useState({
    driverId: fallbackDriver?.id ?? "driver-preview",
    date: today,
    startTime: "08:00",
    endTime: "10:00",
    note: ""
  });
  const [rates, setRates] = useState<Record<string, number>>({ [fallbackDriver?.id ?? "driver-preview"]: 25 });
  const [openDriverId, setOpenDriverId] = useState(fallbackDriver?.id ?? "driver-preview");
  const isAdmin = auth.currentUser ? canManageOperations(auth.currentUser.role) : false;

  const previewDrivers = drivers.length > 0 ? drivers : [{ id: "driver-preview", name: "Preview Driver", email: "driver@example.com", role: "driver" as const }];
  const selectedDriver = previewDrivers.find((driver) => driver.id === form.driverId) ?? previewDrivers[0];

  const unpaidByDriver = useMemo(() => {
    const grouped = new Map<string, TimecardEntry[]>();
    entries.filter((entry) => !entry.paidAt).forEach((entry) => {
      grouped.set(entry.driverId, [...(grouped.get(entry.driverId) ?? []), entry]);
    });
    return grouped;
  }, [entries]);

  function submitEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.date || !form.startTime || !form.endTime || !form.note.trim() || form.startTime >= form.endTime) {
      return;
    }
    setEntries((current) => [
      {
        id: `preview-${Date.now()}`,
        driverId: selectedDriver.id,
        driverName: selectedDriver.name,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        note: form.note.trim()
      },
      ...current
    ]);
    setForm({ ...form, note: "" });
  }

  function markPaid(driverId: string) {
    const unpaid = unpaidByDriver.get(driverId) ?? [];
    const rate = rates[driverId] ?? 0;
    const amount = unpaid.reduce((total, entry) => total + entryHours(entry) * rate, 0);
    const paidAt = new Date().toISOString().slice(0, 10);
    setEntries((current) =>
      current.map((entry) =>
        entry.driverId === driverId && !entry.paidAt
          ? { ...entry, paidAt, paidAmount: entryHours(entry) * rate }
          : entry
      )
    );
    window.alert(`Preview only: payout would log ${currency(amount)} as a driver payroll expense.`);
  }

  return (
    <>
      <PageHeader title="Timecard Preview" description="Preview only. This does not save to Supabase or change the live driver payout system yet." />
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <form onSubmit={submitEntry} className="rounded border border-kp-line bg-white p-4 shadow-panel">
          <div className="mb-3 flex items-center gap-2">
            <Clock aria-hidden className="h-5 w-5 text-kp-green" />
            <h2 className="text-lg font-bold text-kp-ink">Driver Timecard Entry</h2>
          </div>
          <div className="grid gap-3">
            {isAdmin ? (
              <label className="block text-sm font-bold text-stone-700">
                Driver
                <select
                  value={form.driverId}
                  onChange={(event) => setForm({ ...form, driverId: event.target.value })}
                  className="mt-1 min-h-10 w-full rounded border border-kp-line bg-white px-3 text-sm font-bold text-kp-ink"
                >
                  {previewDrivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
                </select>
              </label>
            ) : null}
            <Field label="Date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Start Time" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
              <Field label="End Time" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
            </div>
            <TextAreaField label="Required Note" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Example: Dropped off Job #14, customer paid cash, placed at curb." required />
          </div>
          <div className="mt-3 rounded bg-kp-paper p-3 text-sm font-bold text-stone-700">
            Hours: {entryHours(form).toFixed(2)}
          </div>
          <button type="submit" className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded bg-kp-green px-3 text-sm font-bold text-white">
            <Plus aria-hidden className="h-4 w-4" />
            Add Preview Time
          </button>
        </form>

        <section className="rounded border border-kp-line bg-white shadow-panel">
          <div className="border-b border-kp-line p-3">
            <h2 className="font-bold text-kp-ink">Owner/Admin Driver Payroll Preview</h2>
          </div>
          <div className="divide-y divide-kp-line">
            {previewDrivers.map((driver) => {
              const driverEntries = entries.filter((entry) => entry.driverId === driver.id);
              const unpaidEntries = driverEntries.filter((entry) => !entry.paidAt);
              const paidEntries = driverEntries.filter((entry) => entry.paidAt);
              const rate = rates[driver.id] ?? 0;
              const unpaidHours = unpaidEntries.reduce((total, entry) => total + entryHours(entry), 0);
              const paidHours = paidEntries.reduce((total, entry) => total + entryHours(entry), 0);
              const owed = unpaidHours * rate;
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
                      <p className="text-xs font-semibold text-stone-500">{unpaidHours.toFixed(2)} unpaid hrs / {paidHours.toFixed(2)} paid hrs</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-kp-paper px-3 py-1 text-sm font-bold text-kp-ink">{currency(owed)} owed</span>
                      <ChevronDown aria-hidden className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
                    </div>
                  </button>
                  {isOpen ? (
                    <div className="border-t border-kp-line bg-kp-paper p-3">
                      <div className="grid gap-3 md:grid-cols-[160px_1fr_140px] md:items-end">
                        <Field label="Hourly Rate" type="number" min={0} step="0.01" value={rate} onChange={(event) => setRates({ ...rates, [driver.id]: Number(event.target.value) })} />
                        <div className="rounded border border-kp-line bg-white p-3 text-sm">
                          <p><span className="font-bold">Needs paid:</span> {unpaidHours.toFixed(2)} hrs x {currency(rate)} = {currency(owed)}</p>
                          <p><span className="font-bold">Already paid:</span> {paidHours.toFixed(2)} hrs</p>
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
                              <p className="font-bold">{entry.date} · {displayTime(entry.startTime)} - {displayTime(entry.endTime)} · {entryHours(entry).toFixed(2)} hrs</p>
                              <p className="mt-1 text-stone-600">{entry.note}</p>
                            </div>
                          )) : <p className="p-3 text-sm text-stone-500">No unpaid time.</p>}
                        </div>
                        <div className="rounded border border-kp-line bg-white">
                          <h3 className="border-b border-kp-line p-2 text-sm font-bold text-kp-ink">Paid Out</h3>
                          {paidEntries.length > 0 ? paidEntries.map((entry) => (
                            <div key={entry.id} className="border-b border-kp-line p-2 text-sm last:border-b-0">
                              <p className="flex items-center gap-1 font-bold text-emerald-800"><Check aria-hidden className="h-4 w-4" /> {entry.date} · {entryHours(entry).toFixed(2)} hrs · {currency(entry.paidAmount ?? 0)}</p>
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
    </>
  );
}
