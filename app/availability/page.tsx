"use client";

import { Warehouse } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { getAvailabilityBySize } from "@/lib/data";
import { StatusBadge } from "@/components/status-badge";
import { useOperations } from "@/lib/use-operations";
import { LoadingPanel } from "@/components/loading-panel";

export default function AvailabilityPage() {
  const operations = useOperations();
  const availability = getAvailabilityBySize(operations.dumpsters, operations.jobs);
  const dumpsters = operations.dumpsters;

  return (
    <>
      <PageHeader
        title="Availability Tracker"
        description="Inventory by dumpster size with availability now, rented counts, due-back pressure, and overdue exposure."
      />
      {!operations.loaded ? <LoadingPanel /> : null}
      {operations.loaded ? (
      <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {availability.map((item) => (
          <section key={item.size} className="rounded border border-kp-line bg-white p-4 shadow-panel">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-kp-ink">{item.size}</h2>
                <p className="text-sm text-stone-600">{item.total} total units</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded bg-kp-green text-white">
                <Warehouse aria-hidden className="h-5 w-5" />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded bg-kp-paper p-3">
                <dt className="text-stone-600">Available now</dt>
                <dd className="mt-1 text-2xl font-bold text-kp-ink">{item.availableNow}</dd>
              </div>
              <div className="rounded bg-kp-paper p-3">
                <dt className="text-stone-600">Rented</dt>
                <dd className="mt-1 text-2xl font-bold text-kp-ink">{item.currentlyRented}</dd>
              </div>
              <div className="rounded bg-kp-paper p-3">
                <dt className="text-stone-600">Due soon</dt>
                <dd className="mt-1 text-2xl font-bold text-kp-ink">{item.dueBackSoon}</dd>
              </div>
              <div className="rounded bg-kp-paper p-3">
                <dt className="text-stone-600">Overdue</dt>
                <dd className="mt-1 text-2xl font-bold text-kp-ink">{item.overdue}</dd>
              </div>
            </dl>
            <div className="mt-4 space-y-2">
              {dumpsters
                .filter((dumpster) => dumpster.size === item.size)
                .map((dumpster) => (
                  <div key={dumpster.id} className="flex items-center justify-between gap-2 rounded border border-kp-line px-3 py-2">
                    <span className="text-sm font-bold">{dumpster.number}</span>
                    <StatusBadge status={dumpster.status} />
                  </div>
                ))}
            </div>
          </section>
        ))}
      </div>
      </>
      ) : null}
    </>
  );
}
