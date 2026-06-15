"use client";

import { FormEvent, useMemo, useState } from "react";
import { Clock, Save, Users } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Field, SelectField, TextAreaField } from "@/components/form-fields";
import { PageHeader } from "@/components/page-header";
import type { DriverAvailabilityStatus } from "@/lib/auth";
import { canManageOperations } from "@/lib/auth";

function formatUpdatedAt(value?: string) {
  if (!value) {
    return "Not updated yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export default function DriverAvailabilityPage() {
  const auth = useAuth();
  const current = auth.currentUser;
  const [status, setStatus] = useState<DriverAvailabilityStatus>(current?.availabilityStatus ?? "Available");
  const [notes, setNotes] = useState(current?.availabilityNotes ?? "");
  const isAdmin = current ? canManageOperations(current.role) : false;
  const drivers = useMemo(() => auth.users.filter((user) => user.role === "driver"), [auth.users]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!current) {
      return;
    }
    auth.updateDriverAvailability(current.id, status, notes);
  }

  return (
    <>
      <PageHeader
        title={isAdmin ? "Driver Availability" : "Availability"}
        description={isAdmin ? "See which drivers are available for dispatch coverage." : "Update your driver availability for the office."}
      />

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <form onSubmit={submit} className="rounded border border-kp-line bg-white p-4 shadow-panel">
          <div className="mb-3 flex items-center gap-2">
            <Clock aria-hidden className="h-5 w-5 text-kp-green" />
            <h2 className="font-bold text-kp-ink">My Availability</h2>
          </div>
          <div className="grid gap-3">
            <Field label="Name" value={current?.name ?? ""} readOnly />
            <SelectField label="Status" value={status} onChange={(event) => setStatus(event.target.value as DriverAvailabilityStatus)}>
              <option>Available</option>
              <option>Unavailable</option>
              <option>On Call</option>
            </SelectField>
            <TextAreaField
              label="Notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Available after 2 PM, out today, can cover emergency calls..."
            />
          </div>
          <button type="submit" className="mt-4 flex min-h-10 items-center gap-2 rounded bg-kp-green px-3 text-sm font-bold text-white">
            <Save aria-hidden className="h-4 w-4" />
            Save Availability
          </button>
        </form>

        <section className="rounded border border-kp-line bg-white shadow-panel">
          <div className="flex items-center gap-2 border-b border-kp-line p-3">
            <Users aria-hidden className="h-5 w-5 text-kp-green" />
            <h2 className="font-bold text-kp-ink">Driver Board</h2>
          </div>
          <div className="divide-y divide-kp-line">
            {drivers.length > 0 ? drivers.map((driver) => (
              <article key={driver.id} className="grid gap-2 p-3 text-sm md:grid-cols-[1fr_130px_1.4fr_140px] md:items-center">
                <div>
                  <p className="font-bold text-kp-ink">{driver.name}</p>
                  <p className="text-xs text-stone-500">{driver.phone || driver.email}</p>
                </div>
                <p className="rounded bg-kp-paper px-2 py-1 text-xs font-bold text-stone-700">{driver.availabilityStatus ?? "Unavailable"}</p>
                <p className="text-stone-600">{driver.availabilityNotes || "No notes entered."}</p>
                <p className="text-xs font-semibold text-stone-500">{formatUpdatedAt(driver.availabilityUpdatedAt)}</p>
              </article>
            )) : (
              <div className="p-5 text-sm text-stone-600">No driver logins have been added yet.</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
