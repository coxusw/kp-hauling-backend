"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Field, SelectField } from "@/components/form-fields";
import { PageHeader } from "@/components/page-header";
import type { AppUser, UserRole } from "@/lib/auth";
import { currency } from "@/lib/data";
import type { RentalJob } from "@/lib/types";
import { useOperations } from "@/lib/use-operations";

type PayableDriverRoute = {
  id: string;
  job: RentalJob;
  routeType: "delivery" | "pickup";
  label: string;
};

function DriverMoneyActions({
  user,
  cashHeld,
  payableRoutes,
  onCashHandoff,
  onRoutePay
}: {
  user: AppUser;
  cashHeld: number;
  payableRoutes: PayableDriverRoute[];
  onCashHandoff: (user: AppUser, amount: number, notes: string) => void;
  onRoutePay: (route: PayableDriverRoute, amount: number, notes: string) => void;
}) {
  const [handoffAmount, setHandoffAmount] = useState("");
  const [handoffNotes, setHandoffNotes] = useState("");
  const [selectedRouteId, setSelectedRouteId] = useState(payableRoutes[0]?.id ?? "");
  const [payAmount, setPayAmount] = useState("");
  const [payNotes, setPayNotes] = useState("");

  useEffect(() => {
    if (selectedRouteId && !payableRoutes.some((route) => route.id === selectedRouteId)) {
      setSelectedRouteId(payableRoutes[0]?.id ?? "");
      return;
    }
    if (!selectedRouteId && payableRoutes[0]) {
      setSelectedRouteId(payableRoutes[0].id);
    }
  }, [payableRoutes, selectedRouteId]);

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
    const route = payableRoutes.find((item) => item.id === selectedRouteId);
    if (!route || !Number.isFinite(amount) || amount <= 0) {
      return;
    }
    onRoutePay(route, amount, payNotes);
    setPayAmount("");
    setPayNotes("");
  }

  return (
    <div className="space-y-2 sm:col-span-full">
      <div className="rounded border border-kp-line bg-kp-paper p-2">
        <p className="text-xs font-bold uppercase tracking-normal text-stone-500">Cash Held By Driver</p>
        <p className={cashHeld > 0 ? "text-lg font-bold text-amber-800" : "text-lg font-bold text-kp-ink"}>{currency(cashHeld)}</p>
        <p className={payableRoutes.length > 0 ? "mt-1 text-xs font-bold text-amber-800" : "mt-1 text-xs font-semibold text-stone-500"}>
          {payableRoutes.length} completed route{payableRoutes.length === 1 ? "" : "s"} need driver pay
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
          <p className="mb-2 text-xs font-bold uppercase tracking-normal text-stone-500">Pay Driver For Completed Route</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_100px]">
            <label className="block text-sm font-bold text-stone-700">
              Completed Route
              <select
                value={selectedRouteId}
                onChange={(event) => setSelectedRouteId(event.target.value)}
                className="mt-1 min-h-10 w-full rounded border border-kp-line bg-white px-3 text-sm font-bold text-kp-ink"
              >
                <option value="">Select route</option>
                {payableRoutes.map((route) => (
                  <option key={route.id} value={route.id}>{route.label}</option>
                ))}
              </select>
            </label>
            <Field label="Amount" type="number" min={0} step="0.01" value={payAmount} onChange={(event) => setPayAmount(event.target.value)} />
          </div>
          <div className="mt-2">
            <Field label="Notes" value={payNotes} onChange={(event) => setPayNotes(event.target.value)} placeholder="Route pay, cash, check..." />
          </div>
          <button type="submit" disabled={payableRoutes.length === 0} className="mt-2 min-h-9 rounded bg-white px-3 text-xs font-bold text-stone-700 ring-1 ring-kp-line disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400">
            Mark Route Paid
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

  function getPayableRoutes(user: AppUser): PayableDriverRoute[] {
    return operations.jobs.flatMap((job) => {
      const routes: PayableDriverRoute[] = [];
      if (job.deliveryDriverId === user.id && job.deliveryCompletedAt && !job.deliveryDriverPaidAt) {
        routes.push({
          id: `${job.id}:delivery`,
          job,
          routeType: "delivery",
          label: `Job #${job.jobNumber} drop-off - ${job.customerName}`
        });
      }
      if (job.pickupDriverId === user.id && job.pickupCompletedAt && !job.pickupDriverPaidAt) {
        routes.push({
          id: `${job.id}:pickup`,
          job,
          routeType: "pickup",
          label: `Job #${job.jobNumber} pickup - ${job.customerName}`
        });
      }
      return routes;
    });
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

  function addRoutePay(route: PayableDriverRoute, amount: number, notes: string) {
    operations.markDriverRoutePaid(route.job.id, route.routeType, amount, notes || route.label);
    setMessage(`Marked ${route.label} paid for ${currency(amount)}.`);
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
                    payableRoutes={getPayableRoutes(user)}
                    onCashHandoff={addCashHandoff}
                    onRoutePay={addRoutePay}
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
