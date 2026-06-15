"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Edit2, MapPin, Milestone, PackageCheck, Phone, Plus, Trash2 } from "lucide-react";
import { currency, displayDate, displayTime, getJobBalance, getJobMileageTotal } from "@/lib/data";
import type { PaymentStatus, RentalJob } from "@/lib/types";
import { Field } from "@/components/form-fields";
import { StatusBadge } from "@/components/status-badge";

type DispatchJobCardProps = {
  job: RentalJob;
  onDelete: (jobId: string) => void;
  onPaymentChange: (jobId: string, paymentStatus: PaymentStatus) => void;
  onStatusChange: (jobId: string, status: RentalJob["status"]) => void;
  onCompletePickup: (jobId: string, pickupDestinationAddress: string, pickupOneWayMiles?: number) => void;
  onAddCharge: (jobId: string, label: string, amount: number) => void;
  onAddPayment: (jobId: string, amount: number, note: string) => void;
};

export function DispatchJobCard({
  job,
  onDelete,
  onPaymentChange,
  onStatusChange,
  onCompletePickup,
  onAddCharge,
  onAddPayment
}: DispatchJobCardProps) {
  const [panel, setPanel] = useState<"charge" | "payment" | "pickup" | null>(null);
  const [chargeLabel, setChargeLabel] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [pickupDestination, setPickupDestination] = useState(job.pickupDestinationAddress || "KP yard");
  const [pickupMiles, setPickupMiles] = useState(job.pickupOneWayMiles === undefined ? "" : String(job.pickupOneWayMiles));
  const balance = getJobBalance(job);

  function submitCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(chargeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    onAddCharge(job.id, chargeLabel, amount);
    setChargeLabel("");
    setChargeAmount("");
    setPanel(null);
  }

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    onAddPayment(job.id, amount, paymentNote);
    setPaymentAmount("");
    setPaymentNote("");
    setPanel(null);
  }

  function submitPickup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const miles = pickupMiles === "" ? undefined : Number(pickupMiles);
    if (miles !== undefined && (!Number.isFinite(miles) || miles < 0)) {
      return;
    }
    onCompletePickup(job.id, pickupDestination, miles);
    setPanel(null);
  }

  return (
    <article className="rounded border border-kp-line bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-kp-ink">{job.customerName}</h3>
          <p className="mt-0.5 text-xs font-semibold text-stone-600">{job.dumpsterNumber ?? "Unassigned"} - {job.dumpsterSize}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="mt-2 grid gap-1 text-xs text-stone-700">
        <p className="flex gap-1.5">
          <MapPin aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kp-green" />
          <span className="line-clamp-2">{job.jobAddress}</span>
        </p>
        <p className="flex gap-1.5">
          <Phone aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kp-green" />
          <span>{job.phone || "No phone"}</span>
        </p>
        <p className="flex gap-1.5">
          <CalendarDays aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kp-green" />
          <span>D {displayDate(job.dropOffDate)} {displayTime(job.dropOffTime)} / P {displayDate(job.expectedPickupDate)} {displayTime(job.expectedPickupTime)}</span>
        </p>
        <p className="flex gap-1.5">
          <Milestone aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kp-green" />
          <span>{getJobMileageTotal(job).toFixed(1)} mi total</span>
        </p>
      </div>

      {(job.status === "Pickup Needed" || job.status === "Overdue") ? (
        <div className="mt-2 rounded bg-kp-paper px-2 py-1.5 text-xs text-stone-600 ring-1 ring-kp-line">
          <span className="font-bold text-kp-ink">Pickup route:</span>{" "}
          <span className="inline-flex items-center gap-1 align-middle">
            <span>{job.jobAddress}</span>
            <ArrowRight aria-hidden className="h-3 w-3 shrink-0 text-kp-green" />
            <span>{job.pickupDestinationAddress || "enter destination"}</span>
          </span>
        </div>
      ) : null}

      <div className="mt-2 grid grid-cols-3 gap-1 text-[11px] font-bold">
        <span className="rounded bg-kp-paper px-2 py-1 text-stone-700">Owed {currency(balance)}</span>
        <span className="rounded bg-kp-paper px-2 py-1 text-stone-700">{job.paymentStatus}</span>
        <select
          value={job.paymentStatus}
          onChange={(event) => onPaymentChange(job.id, event.target.value as PaymentStatus)}
          className="rounded border border-kp-line bg-white px-1 py-1 text-[11px] font-bold text-kp-ink"
          aria-label="Payment status"
        >
          <option>Unpaid</option>
          <option>Deposit Paid</option>
          <option>Paid</option>
          <option>Invoice Sent</option>
          <option>Past Due</option>
        </select>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {job.status === "Scheduled Drop-Off" ? (
          <button type="button" onClick={() => onStatusChange(job.id, "Delivered")} className="rounded bg-kp-green px-2 py-1 text-xs font-bold text-white">
            Dropped Off
          </button>
        ) : null}
        {job.status === "Delivered" ? (
          <button type="button" onClick={() => onStatusChange(job.id, "Pickup Needed")} className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800">
            Request Pickup
          </button>
        ) : null}
        {(job.status === "Pickup Needed" || job.status === "Overdue") ? (
          <button type="button" onClick={() => setPanel(panel === "pickup" ? null : "pickup")} className="flex items-center gap-1 rounded bg-kp-green px-2 py-1 text-xs font-bold text-white">
            <PackageCheck aria-hidden className="h-3.5 w-3.5" />
            Picked Up
          </button>
        ) : null}
        <Link href={`/jobs/${job.id}`} className="flex items-center gap-1 rounded border border-kp-line bg-white px-2 py-1 text-xs font-bold text-stone-700">
          <Edit2 aria-hidden className="h-3.5 w-3.5" />
          Edit
        </Link>
        <button type="button" onClick={() => setPanel(panel === "charge" ? null : "charge")} className="flex items-center gap-1 rounded border border-kp-line bg-white px-2 py-1 text-xs font-bold text-stone-700">
          <Plus aria-hidden className="h-3.5 w-3.5" />
          Charge
        </button>
        <button type="button" onClick={() => setPanel(panel === "payment" ? null : "payment")} className="flex items-center gap-1 rounded border border-kp-line bg-white px-2 py-1 text-xs font-bold text-stone-700">
          <Plus aria-hidden className="h-3.5 w-3.5" />
          Pay
        </button>
        <button type="button" onClick={() => onDelete(job.id)} className="rounded border border-kp-line bg-white px-2 py-1 text-xs font-bold text-red-700">
          <Trash2 aria-hidden className="h-3.5 w-3.5" />
        </button>
      </div>

      {panel === "pickup" ? (
        <form onSubmit={submitPickup} className="mt-2 rounded border border-kp-line bg-kp-paper p-2">
          <div className="grid gap-2">
            <Field label="Dumpster Going To" value={pickupDestination} onChange={(event) => setPickupDestination(event.target.value)} placeholder="KP yard, next job, disposal site..." />
            <Field label="Pickup Mileage" type="number" min={0} step="0.1" value={pickupMiles} onChange={(event) => setPickupMiles(event.target.value)} />
          </div>
          <button type="submit" className="mt-2 rounded bg-kp-green px-3 py-2 text-xs font-bold text-white">Save Pickup</button>
        </form>
      ) : null}

      {panel === "charge" ? (
        <form onSubmit={submitCharge} className="mt-2 rounded border border-kp-line bg-kp-paper p-2">
          <div className="grid gap-2 sm:grid-cols-[1fr_90px]">
            <Field label="Charge" value={chargeLabel} onChange={(event) => setChargeLabel(event.target.value)} placeholder="Extra day, penalty..." />
            <Field label="Amount" type="number" min={0} value={chargeAmount} onChange={(event) => setChargeAmount(event.target.value)} />
          </div>
          <button type="submit" className="mt-2 rounded bg-white px-3 py-2 text-xs font-bold text-stone-700 ring-1 ring-kp-line">Add Charge</button>
        </form>
      ) : null}

      {panel === "payment" ? (
        <form onSubmit={submitPayment} className="mt-2 rounded border border-kp-line bg-kp-paper p-2">
          <div className="grid gap-2 sm:grid-cols-[90px_1fr]">
            <Field label="Amount" type="number" min={0} value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
            <Field label="Note" value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="Cash, card, check..." />
          </div>
          <button type="submit" className="mt-2 rounded bg-white px-3 py-2 text-xs font-bold text-stone-700 ring-1 ring-kp-line">Add Payment</button>
        </form>
      ) : null}
    </article>
  );
}
