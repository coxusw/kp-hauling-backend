"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Field, SelectField } from "@/components/form-fields";
import { PageHeader } from "@/components/page-header";
import type { AppUser, UserRole } from "@/lib/auth";
import { currency } from "@/lib/data";
import { useOperations } from "@/lib/use-operations";

function DriverMoneyActions({
  user,
  cashHeld,
  routePayDueCount,
  onCashHandoff,
  onDriverPay
}: {
  user: AppUser;
  cashHeld: number;
  routePayDueCount: number;
  onCashHandoff: (user: AppUser, amount: number, notes: string) => void;
  onDriverPay: (user: AppUser, amount: number, notes: string) => void;
}) {
  const [handoffAmount, setHandoffAmount] = useState("");
  const [handoffNotes, setHandoffNotes] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payNotes, setPayNotes] = useState("");

  function submitHandoff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(handoffAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    onCashHandoff(user, amount, handoffNotes);
    setHandoffAmount("");
    setHandoffNotes("");
  }

  function submitPay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    onDriverPay(user, amount, payNotes);
    setPayAmount("");
    setPayNotes("");
  }

  return (
    <div className="space-y-2 sm:col-span-full">
      <div className="rounded border border-kp-line bg-kp-paper p-2">
        <p className="text-xs font-bold uppercase tracking-normal text-stone-500">Cash Held By Driver</p>
        <p className={cashHeld > 0 ? "text-lg font-bold text-amber-800" : "text-lg font-bold text-kp-ink"}>{currency(cashHeld)}</p>
        <p className={routePayDueCount > 0 ? "mt-1 text-xs font-bold text-amber-800" : "mt-1 text-xs font-semibold text-stone-500"}>
          {routePayDueCount} route{routePayDueCount === 1 ? "" : "s"} need driver pay
        </p>
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        <form onSubmit={submitHandoff} className="rounded border border-kp-line bg-kp-paper p-2">
          <p className="mb-2 text-xs font-bold uppercase tracking-normal text-stone-500">Collect Cash From Driver</p>
          <div className="grid gap-2 sm:grid-cols-[100px_1fr]">
            <Field label="Amount" type="number" min={0} step="0.01" max={Math.max(cashHeld, 0)} value={handoffAmount} onChange={(event) => setHandoffAmount(event.target.value)} />
            <Field label="Notes" value={handoffNotes} onChange={(event) => setHandoffNotes(event.target.value)} placeholder="Turned in to owner" />
          </div>
          <button type="submit" disabled={cashHeld <= 0} className="mt-2 min-h-9 rounded bg-white px-3 text-xs font-bold text-stone-700 ring-1 ring-kp-line disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400">
            Mark Collected
          </button>
        </form>
        <form onSubmit={submitPay} className="rounded border border-kp-line bg-kp-paper p-2">
          <p className="mb-2 text-xs font-bold uppercase tracking-normal text-stone-500">Pay Driver</p>
          <div className="grid gap-2 sm:grid-cols-[100px_1fr]">
            <Field label="Amount" type="number" min={0} step="0.01" value={payAmount} onChange={(event) => setPayAmount(event.target.value)} />
            <Field label="Notes" value={payNotes} onChange={(event) => setPayNotes(event.target.value)} placeholder="Route pay, day pay..." />
          </div>
          <button type="submit" className="mt-2 min-h-9 rounded bg-white px-3 text-xs font-bold text-stone-700 ring-1 ring-kp-line">
            Log Driver Pay
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DriversPage() {
  const auth = useAuth();
  const operations = useOperations();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "driver" as UserRole
  });
  const drivers = useMemo(() => auth.users.filter((user) => user.role === "driver"), [auth.users]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = auth.addUser(form);
    if (!result.ok) {
      setMessage(result.message ?? "Unable to add login.");
      return;
    }
    setMessage(form.role === "driver" ? "Driver login added." : "Admin login added.");
    setForm({ name: "", email: "", password: "", phone: "", role: "driver" });
  }

  function removeUser(userId: string) {
    const result = auth.removeUser(userId);
    setMessage(result.ok ? "Login removed." : result.message ?? "Unable to remove login.");
  }

  function getDriverCashHeld(user: AppUser) {
    const collected = operations.jobs.reduce((total, job) => {
      return total + (job.payments ?? [])
        .filter((payment) => payment.method === "Cash" && payment.driverId === user.id)
        .reduce((paymentTotal, payment) => paymentTotal + payment.amount, 0);
    }, 0);
    const turnedIn = operations.driverCashHandoffs
      .filter((handoff) => handoff.driverId === user.id)
      .reduce((total, handoff) => total + handoff.amount, 0);
    return Math.max(collected - turnedIn, 0);
  }

  function getDriverRoutePayDueCount(user: AppUser) {
    return operations.jobs.reduce((total, job) => {
      const deliveryNeedsPay = job.deliveryDriverId === user.id && job.deliveryCompletedAt && !job.deliveryDriverPaidAt;
      const pickupNeedsPay = job.pickupDriverId === user.id && job.pickupCompletedAt && !job.pickupDriverPaidAt;
      return total + (deliveryNeedsPay ? 1 : 0) + (pickupNeedsPay ? 1 : 0);
    }, 0);
  }

  function addCashHandoff(user: AppUser, amount: number, notes: string) {
    const cashHeld = getDriverCashHeld(user);
    if (amount > cashHeld) {
      setMessage(`${user.name} only has ${currency(cashHeld)} marked as driver-held cash.`);
      return;
    }
    operations.addDriverCashHandoff(user.id, user.name, amount, notes || "Cash turned in to owner");
    setMessage(`Collected ${currency(amount)} from ${user.name}.`);
  }

  function addDriverPay(user: AppUser, amount: number, notes: string) {
    operations.addDriverPay(user.name, amount, notes || "Driver pay");
    setMessage(`Logged ${currency(amount)} driver pay for ${user.name}.`);
  }

  return (
    <>
      <PageHeader title="Drivers" description="Create driver logins, add admin access, and remove old logins from the test workspace." />
      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <form onSubmit={submit} className="rounded border border-kp-line bg-white p-4 shadow-panel">
          <h2 className="mb-3 text-lg font-bold text-kp-ink">Add Driver/Admin Login</h2>
          <div className="grid gap-3">
            <Field label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <Field label="Email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <Field label="Password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            <Field label="Phone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
            <SelectField label="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}>
              <option value="driver">Driver</option>
              <option value="admin">Admin</option>
            </SelectField>
          </div>
          {message ? <p className="mt-3 rounded bg-kp-paper p-3 text-sm font-semibold text-stone-700">{message}</p> : null}
          <button type="submit" className="mt-4 flex min-h-10 items-center gap-2 rounded bg-kp-green px-3 text-sm font-bold text-white">
            <Plus aria-hidden className="h-4 w-4" />
            Add Login
          </button>
        </form>

        <section className="rounded border border-kp-line bg-white shadow-panel">
          <div className="border-b border-kp-line p-3">
            <h2 className="font-bold text-kp-ink">Current Driver/Admin Logins</h2>
          </div>
          <div className="divide-y divide-kp-line">
            {auth.users.map((user) => (
              <div key={user.id} className="grid gap-2 p-3 text-sm sm:grid-cols-[1fr_1fr_110px_110px_90px] sm:items-start">
                <div>
                  <p className="font-bold text-kp-ink">{user.name}</p>
                  <p className="text-xs text-stone-500">{user.email}</p>
                </div>
                <p>{user.phone || "No phone"}</p>
                <p className="rounded bg-kp-paper px-2 py-1 text-xs font-bold capitalize text-stone-700">{user.role}</p>
                <p className="text-xs font-semibold text-stone-600">{(user.availabilityWindows ?? []).length} windows</p>
                <button
                  type="button"
                  onClick={() => removeUser(user.id)}
                  disabled={user.id === auth.currentUser?.id}
                  title={user.id === auth.currentUser?.id ? "You cannot remove your active login." : "Remove login"}
                  className="flex min-h-9 items-center justify-center gap-2 rounded border border-kp-line bg-white px-2 text-xs font-bold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
                >
                  <Trash2 aria-hidden className="h-4 w-4" />
                  Remove
                </button>
                {user.role === "driver" ? (
                  <DriverMoneyActions
                    user={user}
                    cashHeld={getDriverCashHeld(user)}
                    routePayDueCount={getDriverRoutePayDueCount(user)}
                    onCashHandoff={addCashHandoff}
                    onDriverPay={addDriverPay}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded border border-kp-line bg-white p-4 shadow-panel lg:col-span-2">
          <h2 className="font-bold text-kp-ink">Driver Availability Snapshot</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {drivers.length > 0 ? drivers.map((driver) => (
              <article key={driver.id} className="rounded border border-kp-line bg-kp-paper p-3">
                <p className="font-bold text-kp-ink">{driver.name}</p>
                <p className="mt-1 text-sm font-semibold text-kp-green">{(driver.availabilityWindows ?? []).length} availability windows</p>
                <p className="mt-2 text-sm text-stone-600">{driver.availabilityNotes || "Open Driver Availability to view by date."}</p>
              </article>
            )) : <p className="text-sm text-stone-600">No driver logins added yet.</p>}
          </div>
        </section>
      </div>
    </>
  );
}
