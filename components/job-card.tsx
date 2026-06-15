"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Milestone, Phone, Plus, Save, Trash2 } from "lucide-react";
import { currency, displayDate, displayTime, getJobBalance, getJobChargesTotal, getJobMileageTotal, getJobPaymentsTotal, getJobTotal } from "@/lib/data";
import type { PaymentStatus, RentalJob } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { Field, SelectField, TextAreaField } from "@/components/form-fields";

type JobCardProps = {
  job: RentalJob;
  onDelete?: (jobId: string) => void;
  onPaymentChange?: (jobId: string, paymentStatus: PaymentStatus) => void;
  onUpdate?: (jobId: string, updates: Partial<RentalJob>) => void;
  onStatusChange?: (jobId: string, status: RentalJob["status"]) => void;
  onAddCharge?: (jobId: string, label: string, amount: number) => void;
  onAddPayment?: (jobId: string, amount: number, note: string) => void;
};

export function JobCard({ job, onDelete, onPaymentChange, onUpdate, onStatusChange, onAddCharge, onAddPayment }: JobCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<RentalJob>>(job);
  const [chargeLabel, setChargeLabel] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  const total = getJobTotal(job);
  const paid = getJobPaymentsTotal(job);
  const balance = getJobBalance(job);

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onUpdate?.(job.id, editForm);
    setIsEditing(false);
  }

  function submitCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(chargeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    onAddCharge?.(job.id, chargeLabel, amount);
    setChargeLabel("");
    setChargeAmount("");
  }

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    onAddPayment?.(job.id, amount, paymentNote);
    setPaymentAmount("");
    setPaymentNote("");
  }

  return (
    <article className="rounded border border-kp-line bg-white p-4 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-kp-ink">{job.customerName}</h3>
          <p className="mt-1 text-sm text-stone-600">{job.dumpsterNumber ?? "Unassigned"} - {job.dumpsterSize}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="mt-4 space-y-2 text-sm text-stone-700">
        <p className="flex gap-2">
          <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-kp-green" />
          <span>{job.jobAddress}</span>
        </p>
        <p className="flex gap-2">
          <Phone aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-kp-green" />
          <span>{job.phone}</span>
        </p>
        <p className="flex gap-2">
          <CalendarDays aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-kp-green" />
          <span>
            Drop {displayDate(job.dropOffDate)} {displayTime(job.dropOffTime)} - Pickup {displayDate(job.expectedPickupDate)}{" "}
            {displayTime(job.expectedPickupTime)}
          </span>
        </p>
        <p className="flex gap-2">
          <Milestone aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-kp-green" />
          <span>
            {getJobMileageTotal(job) > 0
              ? `${getJobMileageTotal(job).toFixed(1)} total miles`
              : "Mileage not entered"}
          </span>
        </p>
        {job.pickupDestinationAddress ? (
          <p className="flex gap-2">
            <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-kp-green" />
            <span>Pickup destination: {job.pickupDestinationAddress}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold sm:grid-cols-4">
        <span className="rounded bg-kp-paper px-2 py-2 text-stone-700">Base {currency(job.price)}</span>
        <span className="rounded bg-kp-paper px-2 py-2 text-stone-700">Charges {currency(getJobChargesTotal(job))}</span>
        <span className="rounded bg-kp-paper px-2 py-2 text-stone-700">Paid {currency(paid)}</span>
        <span className="rounded bg-kp-paper px-2 py-2 text-stone-700">Owed {currency(balance)}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
        {onPaymentChange ? (
          <label className="flex items-center gap-2 rounded bg-kp-paper px-2 py-1 text-stone-700">
            <span>Payment</span>
            <select
              value={job.paymentStatus}
              onChange={(event) => onPaymentChange(job.id, event.target.value as PaymentStatus)}
              className="rounded border border-kp-line bg-white px-2 py-1 text-xs font-bold text-kp-ink"
            >
              <option>Unpaid</option>
              <option>Deposit Paid</option>
              <option>Paid</option>
              <option>Invoice Sent</option>
              <option>Past Due</option>
            </select>
          </label>
        ) : (
          <span className="rounded bg-kp-paper px-2 py-1 text-stone-700">{job.paymentStatus}</span>
        )}
        <span className="rounded bg-kp-paper px-2 py-1 text-stone-700">Total {currency(total)}</span>
      </div>

      {job.charges?.length ? (
        <div className="mt-3 rounded bg-kp-paper p-3 text-xs text-stone-700">
          <p className="font-bold text-kp-ink">Additional charges</p>
          {job.charges.map((charge) => (
            <p key={charge.id} className="mt-1 flex justify-between gap-3">
              <span>{charge.label}</span>
              <span className="font-bold">{currency(charge.amount)}</span>
            </p>
          ))}
        </div>
      ) : null}

      {job.payments?.length ? (
        <div className="mt-3 rounded bg-kp-paper p-3 text-xs text-stone-700">
          <p className="font-bold text-kp-ink">Payments</p>
          {job.payments.map((payment) => (
            <p key={payment.id} className="mt-1 flex justify-between gap-3">
              <span>{payment.note || payment.date}</span>
              <span className="font-bold">{currency(payment.amount)}</span>
            </p>
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-sm leading-5 text-stone-600">{job.jobNotes}</p>

      {isEditing ? (
        <form onSubmit={saveEdit} className="mt-4 rounded border border-kp-line bg-kp-paper p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Customer Name" value={editForm.customerName ?? ""} onChange={(event) => setEditForm({ ...editForm, customerName: event.target.value })} />
            <Field label="Phone" value={editForm.phone ?? ""} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} />
            <Field label="Email" value={editForm.email ?? ""} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} />
            <Field label="Job Address" value={editForm.jobAddress ?? ""} onChange={(event) => setEditForm({ ...editForm, jobAddress: event.target.value })} />
            <Field label="Drop-off Date" type="date" value={editForm.dropOffDate ?? ""} onChange={(event) => setEditForm({ ...editForm, dropOffDate: event.target.value })} />
            <Field label="Drop-off Time" type="time" value={editForm.dropOffTime ?? ""} onChange={(event) => setEditForm({ ...editForm, dropOffTime: event.target.value })} />
            <Field label="Pickup Date" type="date" value={editForm.expectedPickupDate ?? ""} onChange={(event) => setEditForm({ ...editForm, expectedPickupDate: event.target.value })} />
            <Field label="Pickup Time" type="time" value={editForm.expectedPickupTime ?? ""} onChange={(event) => setEditForm({ ...editForm, expectedPickupTime: event.target.value })} />
            <Field label="Base Price" type="number" value={editForm.price ?? 0} onChange={(event) => setEditForm({ ...editForm, price: Number(event.target.value) })} />
            <Field label="Drop-off Mileage" type="number" value={editForm.estimatedOneWayMiles ?? ""} onChange={(event) => setEditForm({ ...editForm, estimatedOneWayMiles: event.target.value === "" ? undefined : Number(event.target.value) })} />
            <Field label="Pickup Destination" value={editForm.pickupDestinationAddress ?? ""} onChange={(event) => setEditForm({ ...editForm, pickupDestinationAddress: event.target.value })} />
            <Field label="Pickup Mileage" type="number" value={editForm.pickupOneWayMiles ?? ""} onChange={(event) => setEditForm({ ...editForm, pickupOneWayMiles: event.target.value === "" ? undefined : Number(event.target.value) })} />
            <SelectField label="Status" value={editForm.status ?? job.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value as RentalJob["status"] })}>
              <option>Scheduled Drop-Off</option>
              <option>Delivered</option>
              <option>Pickup Needed</option>
              <option>Overdue</option>
              <option>Picked Up / Completed</option>
            </SelectField>
          </div>
          <div className="mt-3">
            <TextAreaField label="Job Notes" value={editForm.jobNotes ?? ""} onChange={(event) => setEditForm({ ...editForm, jobNotes: event.target.value })} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" className="flex min-h-9 items-center gap-2 rounded bg-kp-green px-3 text-xs font-bold text-white">
              <Save aria-hidden className="h-4 w-4" />
              Save Job
            </button>
            <button type="button" onClick={() => setIsEditing(false)} className="rounded border border-kp-line bg-white px-3 text-xs font-bold text-stone-700">
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {onAddCharge ? (
          <form onSubmit={submitCharge} className="rounded border border-kp-line bg-kp-paper p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-normal text-stone-500">Add Charge</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_100px]">
              <Field label="Charge Label" value={chargeLabel} onChange={(event) => setChargeLabel(event.target.value)} placeholder="Extra day, penalty, fuel..." />
              <Field label="Amount" type="number" min={0} value={chargeAmount} onChange={(event) => setChargeAmount(event.target.value)} />
            </div>
            <button type="submit" className="mt-3 flex min-h-9 items-center gap-2 rounded border border-kp-line bg-white px-3 text-xs font-bold text-stone-700">
              <Plus aria-hidden className="h-4 w-4" />
              Add Charge
            </button>
          </form>
        ) : null}

        {onAddPayment ? (
          <form onSubmit={submitPayment} className="rounded border border-kp-line bg-kp-paper p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-normal text-stone-500">Add Payment</p>
            <div className="grid gap-2 sm:grid-cols-[100px_1fr]">
              <Field label="Amount" type="number" min={0} value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
              <Field label="Payment Note" value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="Drop-off cash, pickup card..." />
            </div>
            <button type="submit" className="mt-3 flex min-h-9 items-center gap-2 rounded border border-kp-line bg-white px-3 text-xs font-bold text-stone-700">
              <Plus aria-hidden className="h-4 w-4" />
              Add Payment
            </button>
          </form>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {onStatusChange && job.status === "Scheduled Drop-Off" ? (
          <button
            type="button"
            onClick={() => onStatusChange(job.id, "Delivered")}
            className="flex min-h-9 items-center gap-2 rounded bg-kp-green px-3 text-xs font-bold text-white transition hover:bg-kp-ink"
          >
            Mark Dropped Off
          </button>
        ) : null}
        {onStatusChange && job.status === "Delivered" ? (
          <button
            type="button"
            onClick={() => onStatusChange(job.id, "Pickup Needed")}
            className="flex min-h-9 items-center gap-2 rounded border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-800 transition hover:bg-amber-100"
          >
            Request Pickup
          </button>
        ) : null}
        {onStatusChange && (job.status === "Pickup Needed" || job.status === "Overdue") ? (
          <button
            type="button"
            onClick={() => onStatusChange(job.id, "Picked Up / Completed")}
            className="flex min-h-9 items-center gap-2 rounded bg-kp-green px-3 text-xs font-bold text-white transition hover:bg-kp-ink"
          >
            Mark Picked Up
          </button>
        ) : null}
        {onUpdate ? (
          <Link
            href={`/jobs/${job.id}`}
            className="flex min-h-9 items-center gap-2 rounded border border-kp-line bg-white px-3 text-xs font-bold text-stone-700 transition hover:border-kp-green hover:text-kp-green"
          >
            Edit Job
          </Link>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(job.id)}
            className="flex min-h-9 items-center gap-2 rounded border border-kp-line bg-white px-3 text-xs font-bold text-stone-700 transition hover:border-red-300 hover:text-red-700"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
            Delete Job
          </button>
        ) : null}
      </div>
    </article>
  );
}
