"use client";

import { FormEvent, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Field, SelectField } from "@/components/form-fields";
import { PageHeader } from "@/components/page-header";
import type { UserRole } from "@/lib/auth";

export default function DriversPage() {
  const auth = useAuth();
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
              <div key={user.id} className="grid gap-2 p-3 text-sm sm:grid-cols-[1fr_1fr_120px_120px_90px] sm:items-center">
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
