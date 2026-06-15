"use client";

import { FormEvent, useState } from "react";
import { LogIn } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { BrandLogo } from "@/components/brand-logo";
import { Field } from "@/components/form-fields";

export default function LoginPage() {
  const auth = useAuth();
  const [email, setEmail] = useState("admin@kp.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = auth.login(email, password);
    if (!ok) {
      setError("Login not found. Check the email and password.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-kp-paper px-4 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded border border-kp-line bg-white p-6 shadow-panel">
        <div className="mb-5 flex items-center gap-3">
          <BrandLogo size="lg" />
          <div>
            <h1 className="text-xl font-bold text-kp-ink">KP Hauling Login</h1>
            <p className="text-sm text-stone-600">Owner/admin and driver access</p>
          </div>
        </div>

        <div className="grid gap-3">
          <Field label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Field label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>

        {error ? <p className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

        <button type="submit" className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded bg-kp-green px-4 text-sm font-bold text-white transition hover:bg-kp-ink">
          <LogIn aria-hidden className="h-4 w-4" />
          Login
        </button>

        <p className="mt-4 rounded bg-kp-paper p-3 text-xs leading-5 text-stone-600">
          Demo owner login: <span className="font-bold text-kp-ink">admin@kp.local</span> / <span className="font-bold text-kp-ink">admin123</span>.
        </p>
      </form>
    </main>
  );
}
