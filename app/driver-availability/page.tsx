"use client";

import { FormEvent, useMemo, useState } from "react";
import { CalendarDays, Clock, Plus, Trash2, Users } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Field, TextAreaField } from "@/components/form-fields";
import { PageHeader } from "@/components/page-header";
import { canManageOperations } from "@/lib/auth";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(2026, 0, 1, hours, minutes));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function DriverAvailabilityPage() {
  const auth = useAuth();
  const current = auth.currentUser;
  const isAdmin = current ? canManageOperations(current.role) : false;
  const drivers = useMemo(() => auth.users.filter((user) => user.role === "driver"), [auth.users]);
  const [message, setMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState(today());
  const [form, setForm] = useState({
    date: today(),
    startTime: "08:00",
    endTime: "20:00",
    notes: ""
  });

  const currentWindows = useMemo(
    () => [...(current?.availabilityWindows ?? [])].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)),
    [current?.availabilityWindows]
  );

  const dayRows = useMemo(
    () =>
      drivers
        .map((driver) => ({
          driver,
          windows: (driver.availabilityWindows ?? [])
            .filter((window) => window.date === selectedDate)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
        }))
        .filter((row) => row.windows.length > 0),
    [drivers, selectedDate]
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current) {
      return;
    }
    const result = await auth.addDriverAvailability(current.id, form);
    if (!result.ok) {
      setMessage(result.message ?? "Unable to save availability.");
      return;
    }
    setMessage("Availability saved.");
    setForm((existing) => ({ ...existing, notes: "" }));
    setSelectedDate(form.date);
  }

  async function removeWindow(availabilityId: string) {
    if (!current) {
      return;
    }
    await auth.removeDriverAvailability(current.id, availabilityId);
    setMessage("Availability removed.");
  }

  return (
    <>
      <PageHeader
        title={isAdmin ? "Driver Availability" : "Availability"}
        description={isAdmin ? "See which drivers are available by date and time window." : "Add the dates and times you are available for dispatch."}
      />

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <form onSubmit={submit} className="rounded border border-kp-line bg-white p-4 shadow-panel">
          <div className="mb-3 flex items-center gap-2">
            <Clock aria-hidden className="h-5 w-5 text-kp-green" />
            <h2 className="font-bold text-kp-ink">Add My Availability</h2>
          </div>
          <p className="mb-3 rounded bg-kp-paper p-3 text-sm font-semibold text-stone-700">
            Logged in as {current?.name}. No name entry needed.
          </p>
          <div className="grid gap-3">
            <Field label="Available Date" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Start Time" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
              <Field label="End Time" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
            </div>
            <TextAreaField
              label="Notes"
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Can cover local routes, unavailable for long hauls, call first..."
            />
          </div>
          {message ? <p className="mt-3 rounded bg-kp-paper p-3 text-sm font-semibold text-stone-700">{message}</p> : null}
          <button type="submit" className="mt-4 flex min-h-10 items-center gap-2 rounded bg-kp-green px-3 text-sm font-bold text-white">
            <Plus aria-hidden className="h-4 w-4" />
            Add Availability
          </button>
        </form>

        <section className="rounded border border-kp-line bg-white shadow-panel">
          <div className="flex items-center gap-2 border-b border-kp-line p-3">
            <CalendarDays aria-hidden className="h-5 w-5 text-kp-green" />
            <h2 className="font-bold text-kp-ink">My Availability</h2>
          </div>
          <div className="divide-y divide-kp-line">
            {currentWindows.length > 0 ? currentWindows.map((window) => (
              <article key={window.id} className="grid gap-2 p-3 text-sm sm:grid-cols-[1fr_1fr_1.4fr_90px] sm:items-center">
                <p className="font-bold text-kp-ink">{formatDate(window.date)}</p>
                <p>{formatTime(window.startTime)} - {formatTime(window.endTime)}</p>
                <p className="text-stone-600">{window.notes || "No notes."}</p>
                <button
                  type="button"
                  onClick={() => removeWindow(window.id)}
                  className="flex min-h-9 items-center justify-center gap-2 rounded border border-kp-line bg-white px-2 text-xs font-bold text-red-700"
                >
                  <Trash2 aria-hidden className="h-4 w-4" />
                  Remove
                </button>
              </article>
            )) : (
              <div className="p-5 text-sm text-stone-600">No availability entered yet.</div>
            )}
          </div>
        </section>

        {isAdmin ? (
          <section className="rounded border border-kp-line bg-white shadow-panel lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-kp-line p-3">
              <div className="flex items-center gap-2">
                <Users aria-hidden className="h-5 w-5 text-kp-green" />
                <h2 className="font-bold text-kp-ink">Driver Availability Calendar</h2>
              </div>
              <label className="text-sm font-bold text-stone-700">
                View Date
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="ml-2 min-h-10 rounded border border-kp-line bg-white px-3 text-sm text-kp-ink"
                />
              </label>
            </div>

            <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3">
              {dayRows.length > 0 ? dayRows.map(({ driver, windows }) => (
                <article key={driver.id} className="rounded border border-kp-line bg-kp-paper p-3">
                  <p className="font-bold text-kp-ink">{driver.name}</p>
                  <p className="text-xs font-semibold text-stone-500">{driver.phone || driver.email}</p>
                  <div className="mt-3 space-y-2">
                    {windows.map((window) => (
                      <div key={window.id} className="rounded bg-white p-2 text-sm ring-1 ring-kp-line">
                        <p className="font-bold text-kp-green">{formatTime(window.startTime)} - {formatTime(window.endTime)}</p>
                        <p className="mt-1 text-stone-600">{window.notes || "Available"}</p>
                      </div>
                    ))}
                  </div>
                </article>
              )) : (
                <div className="rounded border border-dashed border-kp-line bg-white p-5 text-sm text-stone-600 md:col-span-2 xl:col-span-3">
                  No drivers have entered availability for {formatDate(selectedDate)}.
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
