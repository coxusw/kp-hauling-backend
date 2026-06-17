"use client";

import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import type { Dumpster } from "@/lib/types";
import type { NewDumpsterInput } from "@/lib/local-store";
import { Field, SelectField, TextAreaField } from "@/components/form-fields";
import { defaultDumpsterSizes, dumpsterTypes, getDumpsterSizeOptions, normalizeDumpsterSize } from "@/lib/inventory-options";

type AddDumpsterFormProps = {
  dumpsters?: Dumpster[];
  onAdd: (input: NewDumpsterInput) => void;
};

const initialForm: NewDumpsterInput = {
  number: "",
  size: "14 yd",
  type: "Roll-off",
  status: "Available",
  currentLocation: "KP yard",
  currentAddress: "",
  notes: ""
};

export function AddDumpsterForm({ dumpsters = [], onAdd }: AddDumpsterFormProps) {
  const [form, setForm] = useState<NewDumpsterInput>(initialForm);
  const [sizeMode, setSizeMode] = useState("14 yd");
  const [customSize, setCustomSize] = useState("");
  const sizeOptions = getDumpsterSizeOptions(dumpsters);

  function update<K extends keyof NewDumpsterInput>(key: K, value: NewDumpsterInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateSize(value: string) {
    setSizeMode(value);
    if (value !== "Custom") {
      update("size", value);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.number.trim()) {
      return;
    }
    const size = sizeMode === "Custom" ? normalizeDumpsterSize(customSize) : form.size;
    onAdd({ ...form, size });
    setForm(initialForm);
    setSizeMode(defaultDumpsterSizes[0]);
    setCustomSize("");
  }

  return (
    <form onSubmit={submit} className="rounded border border-kp-line bg-white p-4 shadow-panel">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-kp-ink">Add Dumpster</h2>
        <p className="mt-1 text-sm text-stone-600">Create inventory records as dumpsters enter your yard.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Dumpster ID / Number" value={form.number} onChange={(event) => update("number", event.target.value)} required />
        <SelectField label="Size" value={sizeMode} onChange={(event) => updateSize(event.target.value)}>
          {sizeOptions.map((size) => <option key={size}>{size}</option>)}
          <option>Custom</option>
        </SelectField>
        {sizeMode === "Custom" ? (
          <Field
            label="Custom Size"
            value={customSize}
            onChange={(event) => {
              setCustomSize(event.target.value);
              update("size", normalizeDumpsterSize(event.target.value));
            }}
            placeholder="18 yd, 25 yd, etc."
            required
          />
        ) : null}
        <SelectField label="Type" value={form.type} onChange={(event) => update("type", event.target.value as Dumpster["type"])}>
          {dumpsterTypes.map((type) => <option key={type}>{type}</option>)}
        </SelectField>
        <SelectField label="Status" value={form.status} onChange={(event) => update("status", event.target.value as NewDumpsterInput["status"])}>
          <option>Available</option>
          <option>Out of Service</option>
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
