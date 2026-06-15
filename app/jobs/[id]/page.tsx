"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { Field, SelectField, TextAreaField } from "@/components/form-fields";
import { LoadingPanel } from "@/components/loading-panel";
import { StatusBadge } from "@/components/status-badge";
import { currency, displayDate, getJobBalance, getJobChargesTotal, getJobMileageTotal, getJobPaymentsTotal, getJobTotal } from "@/lib/data";
import type { PaymentStatus, RentalJob } from "@/lib/types";
import { useOperations } from "@/lib/use-operations";

export default function JobEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const operations = useOperations();
  const job = operations.jobs.find((item) => item.id === params.id);
  const [form, setForm] = useState<Partial<RentalJob>>({});
  const [chargeLabel, setChargeLabel] = useState("");
  const [chargeAmount, setChargeAmount] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  useEffect(() => {
    if (job) {
      setForm(job);
    }
  }, [job]);

  const totals = useMemo(() => {
    if (!job) {
      return null;
    }

    return {
      billed: getJobTotal(job),
      charges: getJobChargesTotal(job),
      paid: getJobPaymentsTotal(job),
      owed: getJobBalance(job),
      miles: getJobMileageTotal(job)
    };
  }, [job]);

  function update<K extends keyof RentalJob>(key: K, value: RentalJob[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function saveJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!job) {
      return;
    }

    const nextStatus = form.status ?? job.status;
    operations.updateJob(job.id, form);
    if (nextStatus !== job.status) {
      if (nextStatus === "Picked Up / Completed") {
        operations.completePickupWithDestination(
          job.id,
          form.pickupDestinationAddress || "KP yard",
          form.pickupOneWayMiles
        );
      } else {
        operations.updateJobStatus(job.id, nextStatus);
      }
    }
  }

  function addCharge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!job) {
      return;
    }
    const amount = Number(chargeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    operations.addJobCharge(job.id, chargeLabel, amount);
    setChargeLabel("");
    setChargeAmount("");
  }

  function addPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!job) {
      return;
    }
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    operations.addJobPayment(job.id, amount, paymentNote);
    setPaymentAmount("");
    setPaymentNote("");
  }

  function deleteJob() {
    if (!job) {
      return;
    }
    operations.deleteJob(job.id);
    router.push("/dispatch");
  }

  if (!operations.loaded) {
    return <LoadingPanel />;
  }

  if (!job || !totals) {
    return (
      <section className="rounded border border-kp-line bg-white p-5 shadow-panel">
        <h1 className="text-xl font-bold text-kp-ink">Job not found</h1>
        <p className="mt-2 text-sm text-stone-600">This job may have been deleted or cleared from local storage.</p>
        <Link href="/dispatch" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded bg-kp-green px-3 text-sm font-bold text-white">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Back to Dispatch
        </Link>
      </section>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/dispatch" className="inline-flex min-h-10 items-center gap-2 rounded border border-kp-line bg-white px-3 text-sm font-bold text-stone-700">
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Dispatch
        </Link>
        <StatusBadge status={job.status} />
      </div>

      <div className="mb-4">
        <h1 className="text-3xl font-bold text-kp-ink">Job #{job.jobNumber} - {job.customerName}</h1>
        <p className="mt-1 text-sm text-stone-600">
          {job.dumpsterNumber ?? "Unassigned"} - {job.dumpsterSize} - {job.jobAddress}
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded border border-kp-line bg-white p-3"><p className="text-xs font-bold text-stone-500">Billed</p><p className="text-2xl font-bold">{currency(totals.billed)}</p></div>
        <div className="rounded border border-kp-line bg-white p-3"><p className="text-xs font-bold text-stone-500">Charges</p><p className="text-2xl font-bold">{currency(totals.charges)}</p></div>
        <div className="rounded border border-kp-line bg-white p-3"><p className="text-xs font-bold text-stone-500">Paid</p><p className="text-2xl font-bold">{currency(totals.paid)}</p></div>
        <div className="rounded border border-kp-line bg-white p-3"><p className="text-xs font-bold text-stone-500">Balances Owed</p><p className="text-2xl font-bold">{currency(totals.owed)}</p></div>
        <div className="rounded border border-kp-line bg-white p-3"><p className="text-xs font-bold text-stone-500">Mileage</p><p className="text-2xl font-bold">{totals.miles.toFixed(1)}</p></div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <form onSubmit={saveJob} className="rounded border border-kp-line bg-white p-4 shadow-panel">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-kp-ink">Edit Job</h2>
            <button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded bg-kp-green px-3 text-sm font-bold text-white">
              <Save aria-hidden className="h-4 w-4" />
              Save Job
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Customer Name" value={form.customerName ?? ""} onChange={(event) => update("customerName", event.target.value)} />
            <Field label="Phone" value={form.phone ?? ""} onChange={(event) => update("phone", event.target.value)} />
            <Field label="Email" type="email" value={form.email ?? ""} onChange={(event) => update("email", event.target.value)} />
            <Field label="Job Address" value={form.jobAddress ?? ""} onChange={(event) => update("jobAddress", event.target.value)} />
            <Field label="Drop-off Date" type="date" value={form.dropOffDate ?? ""} onChange={(event) => update("dropOffDate", event.target.value)} />
            <Field label="Drop-off Time" type="time" value={form.dropOffTime ?? ""} onChange={(event) => update("dropOffTime", event.target.value)} />
            <Field label="Expected Pickup Date" type="date" value={form.expectedPickupDate ?? ""} onChange={(event) => update("expectedPickupDate", event.target.value)} />
            <Field label="Expected Pickup Time" type="time" value={form.expectedPickupTime ?? ""} onChange={(event) => update("expectedPickupTime", event.target.value)} />
            <Field label="Base Price" type="number" min={0} value={form.price ?? 0} onChange={(event) => update("price", Number(event.target.value))} />
            <SelectField label="Payment Status" value={form.paymentStatus ?? job.paymentStatus} onChange={(event) => update("paymentStatus", event.target.value as PaymentStatus)}>
              <option>Unpaid</option>
              <option>Deposit Paid</option>
              <option>Paid</option>
              <option>Invoice Sent</option>
              <option>Past Due</option>
            </SelectField>
            <SelectField label="Job Status" value={form.status ?? job.status} onChange={(event) => update("status", event.target.value as RentalJob["status"])}>
              <option>Scheduled Drop-Off</option>
              <option>Delivered</option>
              <option>Pickup Needed</option>
              <option>Overdue</option>
              <option>Picked Up / Completed</option>
            </SelectField>
            <Field label="Rental Length Days" type="number" min={1} value={form.rentalLengthDays ?? 0} onChange={(event) => update("rentalLengthDays", Number(event.target.value))} />
            <Field label="Starting Dumpster Address" value={form.startingDumpsterAddress ?? ""} onChange={(event) => update("startingDumpsterAddress", event.target.value)} />
            <Field label="Drop-off Miles To Job" type="number" min={0} step="0.1" value={form.estimatedOneWayMiles ?? ""} onChange={(event) => update("estimatedOneWayMiles", event.target.value === "" ? undefined : Number(event.target.value))} />
            <Field label="Drop-off Return To Yard" type="number" min={0} step="0.1" value={form.deliveryReturnMiles ?? ""} onChange={(event) => update("deliveryReturnMiles", event.target.value === "" ? undefined : Number(event.target.value))} />
            <Field label="Pickup Destination" value={form.pickupDestinationAddress ?? ""} onChange={(event) => update("pickupDestinationAddress", event.target.value)} placeholder="KP yard, next job, disposal site..." />
            <Field label="Pickup Miles To Job" type="number" min={0} step="0.1" value={form.pickupOneWayMiles ?? ""} onChange={(event) => update("pickupOneWayMiles", event.target.value === "" ? undefined : Number(event.target.value))} />
            <Field label="Pickup Return To Yard" type="number" min={0} step="0.1" value={form.pickupReturnMiles ?? ""} onChange={(event) => update("pickupReturnMiles", event.target.value === "" ? undefined : Number(event.target.value))} />
          </div>

          <div className="mt-3">
            <TextAreaField label="Job Notes" value={form.jobNotes ?? ""} onChange={(event) => update("jobNotes", event.target.value)} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded bg-kp-green px-3 text-sm font-bold text-white">
              <Save aria-hidden className="h-4 w-4" />
              Save Job
            </button>
            <button type="button" onClick={deleteJob} className="inline-flex min-h-10 items-center gap-2 rounded border border-red-200 bg-white px-3 text-sm font-bold text-red-700">
              <Trash2 aria-hidden className="h-4 w-4" />
              Delete Job
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          <form onSubmit={addCharge} className="rounded border border-kp-line bg-white p-4 shadow-panel">
            <h2 className="mb-3 font-bold text-kp-ink">Add Charge</h2>
            <div className="grid gap-3">
              <Field label="Charge Label" value={chargeLabel} onChange={(event) => setChargeLabel(event.target.value)} placeholder="Extra day, penalty, fuel..." />
              <Field label="Amount" type="number" min={0} value={chargeAmount} onChange={(event) => setChargeAmount(event.target.value)} />
            </div>
            <button type="submit" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded border border-kp-line bg-kp-paper px-3 text-sm font-bold text-stone-700">
              <Plus aria-hidden className="h-4 w-4" />
              Add Charge
            </button>
          </form>

          <form onSubmit={addPayment} className="rounded border border-kp-line bg-white p-4 shadow-panel">
            <h2 className="mb-3 font-bold text-kp-ink">Add Payment</h2>
            <div className="grid gap-3">
              <Field label="Amount" type="number" min={0} value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
              <Field label="Payment Note" value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="Cash, card, check..." />
            </div>
            <button type="submit" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded border border-kp-line bg-kp-paper px-3 text-sm font-bold text-stone-700">
              <Plus aria-hidden className="h-4 w-4" />
              Add Payment
            </button>
          </form>

          <section className="rounded border border-kp-line bg-white p-4 shadow-panel">
            <h2 className="font-bold text-kp-ink">Job Activity</h2>
            <div className="mt-3 space-y-3 text-sm text-stone-700">
              <p><span className="font-bold">Drop-off:</span> {displayDate(job.dropOffDate)} {job.dropOffTime}</p>
              <p><span className="font-bold">Drop-off truck:</span> {job.deliveryTruckType || "Not completed"}</p>
              <p><span className="font-bold">Drop-off miles:</span> {(job.estimatedOneWayMiles ?? 0).toFixed(1)} to job / {(job.deliveryReturnMiles ?? 0).toFixed(1)} return</p>
              <p><span className="font-bold">Pickup:</span> {displayDate(job.expectedPickupDate)} {job.expectedPickupTime}</p>
              <p><span className="font-bold">Pickup truck:</span> {job.pickupTruckType || "Not completed"}</p>
              <p><span className="font-bold">Pickup miles:</span> {(job.pickupOneWayMiles ?? 0).toFixed(1)} to job / {(job.pickupReturnMiles ?? 0).toFixed(1)} return</p>
              <p><span className="font-bold">Destination:</span> {job.pickupDestinationAddress || "Not entered"}</p>
              <div>
                <p className="font-bold text-kp-ink">Charges</p>
                {(job.charges ?? []).length > 0 ? job.charges?.map((charge) => (
                  <p key={charge.id} className="flex justify-between gap-3">
                    <span>{charge.label}</span>
                    <span className="font-bold">{currency(charge.amount)}</span>
                  </p>
                )) : <p className="text-stone-500">No added charges.</p>}
              </div>
              <div>
                <p className="font-bold text-kp-ink">Payments</p>
                {(job.payments ?? []).length > 0 ? job.payments?.map((payment) => (
                  <p key={payment.id} className="flex justify-between gap-3">
                    <span>{payment.note || payment.date}</span>
                    <span className="font-bold">{currency(payment.amount)}</span>
                  </p>
                )) : <p className="text-stone-500">No payments recorded.</p>}
              </div>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
