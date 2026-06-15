"use client";

import { useMemo } from "react";
import { Check, MapPin, Phone, PackageCheck, Truck } from "lucide-react";
import { displayTime, getDriverTasks } from "@/lib/data";
import type { RentalJob } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { useOperations } from "@/lib/use-operations";
import { LoadingPanel } from "@/components/loading-panel";

type DriverTaskProps = {
  job: RentalJob;
  type: "delivery" | "pickup";
  onComplete: (jobId: string, type: "delivery" | "pickup") => void;
};

function DriverTask({ job, type, onComplete }: DriverTaskProps) {
  const isDelivery = type === "delivery";

  return (
    <article className="rounded border border-kp-line bg-white p-4 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-stone-500">{isDelivery ? "Delivery" : "Pickup"}</p>
          <h2 className="mt-1 text-lg font-bold text-kp-ink">{job.customerName}</h2>
          <p className="mt-1 text-sm font-semibold text-stone-600">{job.dumpsterNumber ?? "Unassigned"} - {job.dumpsterSize}</p>
          <p className="mt-1 text-sm font-bold text-kp-green">
            {isDelivery ? `Drop-off ${displayTime(job.dropOffTime)}` : `Pickup ${displayTime(job.expectedPickupTime)}`}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="mt-4 space-y-3 text-sm text-stone-700">
        <p className="flex gap-2">
          <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-kp-green" />
          <span>{job.jobAddress}</span>
        </p>
        <a className="flex gap-2 font-semibold text-kp-green" href={`tel:${job.phone}`}>
          <Phone aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{job.phone}</span>
        </a>
        <p className="rounded bg-kp-paper p-3 leading-5">{job.jobNotes || "No notes entered."}</p>
      </div>

      <button
        type="button"
        onClick={() => onComplete(job.id, type)}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded bg-kp-green px-4 text-sm font-bold text-white transition hover:bg-kp-ink"
      >
        <Check aria-hidden className="h-4 w-4" />
        {isDelivery ? "Mark Delivered" : "Mark Picked Up"}
      </button>
    </article>
  );
}

export default function DriverPage() {
  const operations = useOperations();
  const tasks = useMemo(() => getDriverTasks(operations.jobs), [operations.jobs]);

  function completeTask(jobId: string, type: "delivery" | "pickup") {
    // Future Supabase integration point: update the rental job and dumpster status in one transaction.
    if (type === "delivery") {
      operations.completeDelivery(jobId);
    } else {
      operations.completePickup(jobId);
    }
  }

  return (
    <>
      <PageHeader
        title="Driver View"
        description="A mobile-first work list for today's deliveries and pickups with quick completion actions."
      />
      {!operations.loaded ? <LoadingPanel /> : null}
      {operations.loaded ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Truck aria-hidden className="h-5 w-5 text-kp-green" />
              <h2 className="text-lg font-bold text-kp-ink">Today&apos;s Deliveries</h2>
            </div>
            <div className="space-y-3">
              {tasks.deliveries.map((job) => (
                <DriverTask key={job.id} job={job} type="delivery" onComplete={completeTask} />
              ))}
              {tasks.deliveries.length === 0 ? (
                <div className="rounded border border-dashed border-kp-line bg-white p-4 text-sm text-stone-500">No deliveries left for today.</div>
              ) : null}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <PackageCheck aria-hidden className="h-5 w-5 text-kp-green" />
              <h2 className="text-lg font-bold text-kp-ink">Today&apos;s Pickups</h2>
            </div>
            <div className="space-y-3">
              {tasks.pickups.map((job) => (
                <DriverTask key={job.id} job={job} type="pickup" onComplete={completeTask} />
              ))}
              {tasks.pickups.length === 0 ? (
                <div className="rounded border border-dashed border-kp-line bg-white p-4 text-sm text-stone-500">No pickups left for today.</div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
