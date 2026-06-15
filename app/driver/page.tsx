"use client";

import { useMemo } from "react";
import { Check, Clock, MapPin, PackageCheck, Phone, Truck } from "lucide-react";
import { displayDate, displayTime } from "@/lib/data";
import type { RentalJob } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { useOperations } from "@/lib/use-operations";
import { LoadingPanel } from "@/components/loading-panel";
import { useAuth } from "@/components/auth-provider";

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
          <p className="text-xs font-bold uppercase tracking-normal text-stone-500">{isDelivery ? "Assigned Delivery" : "Assigned Pickup"}</p>
          <h2 className="mt-1 text-lg font-bold text-kp-ink">{job.customerName}</h2>
          <p className="mt-1 text-sm font-semibold text-stone-600">{job.dumpsterNumber ?? "Unassigned"} - {job.dumpsterSize}</p>
          <p className="mt-1 text-sm font-bold text-kp-green">
            {isDelivery
              ? `Drop-off ${displayDate(job.dropOffDate)} ${displayTime(job.dropOffTime)}`
              : `Pickup ${displayDate(job.expectedPickupDate)} ${displayTime(job.expectedPickupTime)}`}
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
          <span>{job.phone || "No phone"}</span>
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

function OpenJobCard({ job, type }: { job: RentalJob; type: "delivery" | "pickup" }) {
  const isDelivery = type === "delivery";

  return (
    <article className="rounded border border-kp-line bg-white p-3 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-stone-500">Open {isDelivery ? "Delivery" : "Pickup"}</p>
          <h3 className="mt-1 font-bold text-kp-ink">{job.customerName}</h3>
          <p className="text-xs font-semibold text-stone-600">{job.dumpsterNumber ?? "Unassigned"} - {job.dumpsterSize}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>
      <p className="mt-3 flex gap-2 text-stone-700">
        <Clock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-kp-green" />
        <span>
          {isDelivery
            ? `${displayDate(job.dropOffDate)} ${displayTime(job.dropOffTime)}`
            : `${displayDate(job.expectedPickupDate)} ${displayTime(job.expectedPickupTime)}`}
        </span>
      </p>
      <p className="mt-2 flex gap-2 text-stone-700">
        <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-kp-green" />
        <span>{job.jobAddress}</span>
      </p>
    </article>
  );
}

export default function DriverPage() {
  const operations = useOperations();
  const auth = useAuth();
  const currentDriverId = auth.currentUser?.id;

  const assigned = useMemo(() => ({
    deliveries: operations.jobs.filter((job) => job.deliveryDriverId === currentDriverId && job.status === "Scheduled Drop-Off"),
    pickups: operations.jobs.filter((job) => job.pickupDriverId === currentDriverId && ["Delivered", "Pickup Needed", "Overdue"].includes(job.status))
  }), [currentDriverId, operations.jobs]);

  const openJobs = useMemo(() => ({
    deliveries: operations.jobs.filter((job) => job.status === "Scheduled Drop-Off" && !job.deliveryDriverId),
    pickups: operations.jobs.filter((job) => ["Delivered", "Pickup Needed", "Overdue"].includes(job.status) && !job.pickupDriverId)
  }), [operations.jobs]);

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
        description="Assigned dispatch work plus open jobs waiting for dispatch so drivers can adjust availability."
      />
      {!operations.loaded ? <LoadingPanel /> : null}
      {operations.loaded ? (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <section>
              <div className="mb-3 flex items-center gap-2">
                <Truck aria-hidden className="h-5 w-5 text-kp-green" />
                <h2 className="text-lg font-bold text-kp-ink">My Assigned Deliveries</h2>
              </div>
              <div className="space-y-3">
                {assigned.deliveries.map((job) => (
                  <DriverTask key={job.id} job={job} type="delivery" onComplete={completeTask} />
                ))}
                {assigned.deliveries.length === 0 ? (
                  <div className="rounded border border-dashed border-kp-line bg-white p-4 text-sm text-stone-500">No deliveries assigned to you yet.</div>
                ) : null}
              </div>
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2">
                <PackageCheck aria-hidden className="h-5 w-5 text-kp-green" />
                <h2 className="text-lg font-bold text-kp-ink">My Assigned Pickups</h2>
              </div>
              <div className="space-y-3">
                {assigned.pickups.map((job) => (
                  <DriverTask key={job.id} job={job} type="pickup" onComplete={completeTask} />
                ))}
                {assigned.pickups.length === 0 ? (
                  <div className="rounded border border-dashed border-kp-line bg-white p-4 text-sm text-stone-500">No pickups assigned to you yet.</div>
                ) : null}
              </div>
            </section>
          </div>

          <section className="rounded border border-kp-line bg-kp-paper p-3">
            <h2 className="mb-3 text-lg font-bold text-kp-ink">Open Jobs Waiting For Dispatch</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-bold text-kp-ink">Deliveries</h3>
                {openJobs.deliveries.map((job) => <OpenJobCard key={job.id} job={job} type="delivery" />)}
                {openJobs.deliveries.length === 0 ? <div className="rounded border border-dashed border-kp-line bg-white p-4 text-sm text-stone-500">No open deliveries.</div> : null}
              </div>
              <div className="space-y-3">
                <h3 className="font-bold text-kp-ink">Pickups</h3>
                {openJobs.pickups.map((job) => <OpenJobCard key={job.id} job={job} type="pickup" />)}
                {openJobs.pickups.length === 0 ? <div className="rounded border border-dashed border-kp-line bg-white p-4 text-sm text-stone-500">No open pickups.</div> : null}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
