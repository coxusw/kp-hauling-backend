"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import type { Dumpster } from "@/lib/types";
import type { NewDumpsterInput } from "@/lib/local-store";
import { Field, SelectField, TextAreaField } from "@/components/form-fields";

type AddDumpsterFormProps = {
  onAdd: (input: NewDumpsterInput) => void;
};

const initialForm: NewDumpsterInput = {
  number: "",
  size: "15 yd",
  type: "Roll-off",
  status: "Available",
  currentLocation: "KP yard",
  currentAddress: "",
  notes: ""
};

export function AddDumpsterForm({ onAdd }: AddDumpsterFormProps) {
  const [form, setForm] = useState<NewDumpsterInput>(initialForm);

  function update<K extends keyof NewDumpsterInput>(key: K, value: NewDumpsterInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.number.trim()) {
      return;
    }
    onAdd(form);
    setForm(initialForm);
  }

  return (
    <form onSubmit={submit} className="rounded border border-kp-line bg-white p-4 shadow-panel">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-kp-ink">Add Dumpster</h2>
        <p className="mt-1 text-sm text-stone-600">Create inventory records as dumpsters enter your yard.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Dumpster ID / Number" value={form.number} onChange={(event) => update("number", event.target.value)} required />
        <SelectField label="Size" value={form.size} onChange={(event) => update("size", event.target.value as Dumpster["size"])}>
          <option>10 yd</option>
          <option>15 yd</option>
          <option>20 yd</option>
          <option>30 yd</option>
        </SelectField>
        <SelectField label="Type" value={form.type} onChange={(event) => update("type", event.target.value as Dumpster["type"])}>
          <option>Roll-off</option>
          <option>Concrete</option>
          <option>Yard Waste</option>
          <option>Mixed Debris</option>
        </SelectField>
        <SelectField label="Status" value={form.status} onChange={(event) => update("status", event.target.value as NewDumpsterInput["status"])}>
          <option>Available</option>
          <option>Out of Service</option>
          <option>In Transit</option>
        </SelectField>
        <Field label="Current Location Label" value={form.currentLocation} onChange={(event) => update("currentLocation", event.target.value)} />
        <Field
          label="Current Address"
          value={form.currentAddress}
          onChange={(event) => update("currentAddress", event.target.value)}
          placeholder="Street, city, state"
        />
      </div>
      <div className="mt-3">
        <TextAreaField label="Notes" value={form.notes} onChange={(event) => update("notes", event.target.value)} />
      </div>
      <button
        type="submit"
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded bg-kp-green px-4 text-sm font-bold text-white transition hover:bg-kp-ink sm:w-auto"
      >
        <Plus aria-hidden className="h-4 w-4" />
        Add Dumpster
      </button>
    </form>
  );
}
