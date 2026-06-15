"use client";

import { FormEvent, useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { AlertTriangle, ArrowRight, CalendarPlus } from "lucide-react";
import type { Dumpster, PaymentStatus, RentalJob } from "@/lib/types";
import type { NewJobInput } from "@/lib/local-store";
import { Field, SelectField, TextAreaField } from "@/components/form-fields";
import { findDumpsterBookingConflicts } from "@/lib/scheduling";

type ScheduleJobFormProps = {
  dumpsters: Dumpster[];
  jobs: RentalJob[];
  onAdd: (input: NewJobInput) => void;
};

function makeInitialForm(): NewJobInput {
  const today = new Date().toISOString().slice(0, 10);
  return {
    customerName: "",
    phone: "",
    email: "",
    jobAddress: "",
    dumpsterId: "",
    dumpsterSize: "15 yd",
    dropOffDate: today,
    dropOffTime: "08:00",
    rentalLengthDays: 7,
    expectedPickupDate: format(addDays(parseISO(today), 7), "yyyy-MM-dd"),
    expectedPickupTime: "08:00",
    price: 0,
    paymentStatus: "Unpaid",
    jobNotes: ""
  };
}

export function ScheduleJobForm({ dumpsters, jobs, onAdd }: ScheduleJobFormProps) {
  const [form, setForm] = useState<NewJobInput>(makeInitialForm);
  const schedulableDumpsters = useMemo(() => dumpsters.filter((dumpster) => dumpster.status !== "Out of Service"), [dumpsters]);
  const selectedDumpster = useMemo(
    () => dumpsters.find((dumpster) => dumpster.id === form.dumpsterId),
    [dumpsters, form.dumpsterId]
  );
  const conflicts = useMemo(
    () =>
      findDumpsterBookingConflicts(jobs, form.dumpsterId, {
        dropOffDate: form.dropOffDate,
        dropOffTime: form.dropOffTime,
        expectedPickupDate: form.expectedPickupDate,
        expectedPickupTime: form.expectedPickupTime
      }),
    [form.dropOffDate, form.dropOffTime, form.dumpsterId, form.expectedPickupDate, form.expectedPickupTime, jobs]
  );

  function update<K extends keyof NewJobInput>(key: K, value: NewJobInput[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "dropOffDate" || key === "rentalLengthDays") {
        next.expectedPickupDate = format(addDays(parseISO(next.dropOffDate), Number(next.rentalLengthDays) || 0), "yyyy-MM-dd");
      }
      if (key === "dumpsterId") {
        const selected = dumpsters.find((dumpster) => dumpster.id === value);
        if (selected) {
          next.dumpsterSize = selected.size;
        }
      }
      return next;
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.customerName.trim() || !form.jobAddress.trim()) {
      return;
    }
    if (conflicts.length > 0) {
      return;
    }

    onAdd({ ...form, startingDumpsterAddress: selectedDumpster?.currentAddress });
    setForm(makeInitialForm());
  }

  return (
    <form onSubmit={submit} className="rounded border border-kp-line bg-white p-4 shadow-panel">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-kp-ink">Schedule New Job</h2>
        <p className="mt-1 text-sm text-stone-600">Create a customer rental and assign an available dumpster when ready.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Customer Name" value={form.customerName} onChange={(event) => update("customerName", event.target.value)} required />
        <Field label="Phone" value={form.phone} onChange={(event) => update("phone", event.target.value)} />
        <Field label="Email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
        <Field label="Job Address" value={form.jobAddress} onChange={(event) => update("jobAddress", event.target.value)} required />
        <SelectField label="Assign Dumpster" value={form.dumpsterId} onChange={(event) => update("dumpsterId", event.target.value)}>
          <option value="">Unassigned for now</option>
          {schedulableDumpsters.map((dumpster) => (
            <option key={dumpster.id} value={dumpster.id}>
              {dumpster.number} - {dumpster.size} - {dumpster.type} - {dumpster.status}
            </option>
          ))}
        </SelectField>
        <Field label="Drop-off Date" type="date" value={form.dropOffDate} onChange={(event) => update("dropOffDate", event.target.value)} />
        <Field label="Drop-off Time" type="time" value={form.dropOffTime} onChange={(event) => update("dropOffTime", event.target.value)} />
        <Field
          label="Rental Length Days"
          type="number"
          min={1}
          value={form.rentalLengthDays}
          onChange={(event) => update("rentalLengthDays", Number(event.target.value))}
        />
        <Field label="Expected Pickup Date" type="date" value={form.expectedPickupDate} onChange={(event) => update("expectedPickupDate", event.target.value)} />
        <Field label="Expected Pickup Time" type="time" value={form.expectedPickupTime} onChange={(event) => update("expectedPickupTime", event.target.value)} />
        <Field label="Price" type="number" min={0} value={form.price} onChange={(event) => update("price", Number(event.target.value))} />
        <SelectField label="Payment Status" value={form.paymentStatus} onChange={(event) => update("paymentStatus", event.target.value as PaymentStatus)}>
          <option>Unpaid</option>
          <option>Deposit Paid</option>
          <option>Paid</option>
          <option>Invoice Sent</option>
          <option>Past Due</option>
        </SelectField>
        <label className="block text-sm font-semibold text-stone-700 sm:col-span-2">
          <span className="flex flex-wrap items-center gap-2">
            <span>One-way Mileage</span>
            <span className="rounded bg-kp-paper px-2 py-1 text-xs font-medium text-stone-600 ring-1 ring-kp-line">
              <span className="font-bold text-kp-ink">Route:</span>{" "}
              {selectedDumpster ? (
                <span className="inline-flex items-center gap-1.5 align-middle">
                  <span>{selectedDumpster.currentAddress || "No dumpster address"}</span>
                  <ArrowRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-kp-green" />
                  <span>{form.jobAddress || "job address"}</span>
                </span>
              ) : (
                "Assign dumpster to show route"
              )}
            </span>
          </span>
          <input
            type="number"
            min={0}
            step="0.1"
            value={form.estimatedOneWayMiles ?? ""}
            onChange={(event) =>
              update("estimatedOneWayMiles", event.target.value === "" ? undefined : Number(event.target.value))
            }
            className="mt-1 min-h-10 w-full rounded border border-kp-line bg-white px-3 text-sm text-kp-ink outline-none transition focus:border-kp-green focus:ring-2 focus:ring-kp-lime/30"
          />
        </label>
      </div>

      {conflicts.length > 0 ? (
        <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold">Dumpster already booked for this window.</p>
              <p className="mt-1">
                {conflicts
                  .map((job) => `${job.dumpsterNumber ?? "Selected dumpster"} is assigned to ${job.customerName} from ${job.dropOffDate} ${job.dropOffTime} to ${job.expectedPickupDate} ${job.expectedPickupTime}.`)
                  .join(" ")}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-3">
        <TextAreaField label="Job Notes" value={form.jobNotes} onChange={(event) => update("jobNotes", event.target.value)} />
      </div>

      <button
        type="submit"
        disabled={conflicts.length > 0}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded bg-kp-green px-4 text-sm font-bold text-white transition hover:bg-kp-ink disabled:cursor-not-allowed disabled:bg-stone-400 sm:w-auto"
      >
        <CalendarPlus aria-hidden className="h-4 w-4" />
        Schedule Job
      </button>
    </form>
  );
}
