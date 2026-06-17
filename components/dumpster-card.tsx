import { FormEvent, useState } from "react";
import { Edit2, MapPin, Save, Trash2 } from "lucide-react";
import type { Dumpster } from "@/lib/types";
import { Field, SelectField, TextAreaField } from "@/components/form-fields";
import { StatusBadge } from "@/components/status-badge";
import { defaultDumpsterSizes, dumpsterTypes, getDumpsterSizeOptions, normalizeDumpsterSize } from "@/lib/inventory-options";

export function DumpsterCard({
  dumpster,
  onUpdate,
  onDelete,
  onTakeOutOfService,
  onPutInService,
  deleteDisabledReason,
  compact = false
}: {
  dumpster: Dumpster;
  onUpdate?: (dumpsterId: string, updates: Partial<Dumpster>) => void;
  onDelete?: (dumpsterId: string) => void;
  onTakeOutOfService?: (dumpsterId: string) => void;
  onPutInService?: (dumpsterId: string) => void;
  deleteDisabledReason?: string;
  compact?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Dumpster>>(dumpster);
  const [sizeMode, setSizeMode] = useState(defaultDumpsterSizes.includes(dumpster.size) ? dumpster.size : "Custom");
  const [customSize, setCustomSize] = useState(defaultDumpsterSizes.includes(dumpster.size) ? "" : dumpster.size);
  const sizeOptions = getDumpsterSizeOptions([dumpster]);

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onUpdate?.(dumpster.id, {
      ...editForm,
      size: sizeMode === "Custom" ? normalizeDumpsterSize(customSize) : (editForm.size ?? dumpster.size)
    });
    setIsEditing(false);
  }

  if (compact) {
    return (
      <article className="rounded border border-kp-line bg-white p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-kp-ink">{dumpster.number}</h3>
            <p className="mt-0.5 text-xs font-semibold text-stone-600">{dumpster.size} - {dumpster.type}</p>
          </div>
          <StatusBadge status={dumpster.status} />
        </div>
        <p className="mt-2 flex gap-1.5 text-xs text-stone-700">
          <MapPin aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kp-green" />
          <span className="line-clamp-2">{dumpster.currentAddress || dumpster.currentLocation}</span>
        </p>
      </article>
    );
  }

  return (
    <article className="rounded border border-kp-line bg-white p-4 shadow-panel">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-kp-ink">{dumpster.number}</h3>
          <p className="mt-1 text-sm text-stone-600">{dumpster.size} - {dumpster.type}</p>
        </div>
        <StatusBadge status={dumpster.status} />
      </div>
      <p className="mt-4 flex gap-2 text-sm text-stone-700">
        <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-kp-green" />
        <span>{dumpster.currentAddress || dumpster.currentLocation}</span>
      </p>
      <p className="mt-3 text-sm text-stone-600">{dumpster.notes}</p>
      {isEditing ? (
        <form onSubmit={saveEdit} className="mt-4 rounded border border-kp-line bg-kp-paper p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Dumpster ID / Number" value={editForm.number ?? ""} onChange={(event) => setEditForm({ ...editForm, number: event.target.value })} />
            <SelectField
              label="Size"
              value={sizeMode}
              onChange={(event) => {
                setSizeMode(event.target.value);
                if (event.target.value !== "Custom") {
                  setEditForm({ ...editForm, size: event.target.value });
                }
              }}
            >
              {sizeOptions.map((size) => <option key={size}>{size}</option>)}
              <option>Custom</option>
            </SelectField>
            {sizeMode === "Custom" ? (
              <Field
                label="Custom Size"
                value={customSize}
                onChange={(event) => {
                  setCustomSize(event.target.value);
                  setEditForm({ ...editForm, size: normalizeDumpsterSize(event.target.value) });
                }}
                placeholder="18 yd, 25 yd, etc."
              />
            ) : null}
            <SelectField label="Type" value={editForm.type ?? dumpster.type} onChange={(event) => setEditForm({ ...editForm, type: event.target.value as Dumpster["type"] })}>
              {dumpsterTypes.map((type) => <option key={type}>{type}</option>)}
            </SelectField>
            <SelectField label="Status" value={editForm.status ?? dumpster.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value as Dumpster["status"] })}>
              <option>Available</option>
              <option>Scheduled Drop-Off</option>
              <option>Delivered</option>
              <option>Pickup Needed</option>
              <option>Overdue</option>
              <option>Out of Service</option>
            </SelectField>
            <Field label="Current Location Label" value={editForm.currentLocation ?? ""} onChange={(event) => setEditForm({ ...editForm, currentLocation: event.target.value })} />
            <Field label="Current Address" value={editForm.currentAddress ?? ""} onChange={(event) => setEditForm({ ...editForm, currentAddress: event.target.value })} placeholder="Street, city, state" />
          </div>
          <div className="mt-3">
            <TextAreaField label="Notes" value={editForm.notes ?? ""} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" className="flex min-h-9 items-center gap-2 rounded bg-kp-green px-3 text-xs font-bold text-white">
              <Save aria-hidden className="h-4 w-4" />
              Save Dumpster
            </button>
            <button type="button" onClick={() => setIsEditing(false)} className="rounded border border-kp-line bg-white px-3 text-xs font-bold text-stone-700">
              Cancel
            </button>
          </div>
        </form>
      ) : null}
      {onUpdate ? (
        <button
          type="button"
          onClick={() => {
            setEditForm(dumpster);
            setSizeMode(defaultDumpsterSizes.includes(dumpster.size) ? dumpster.size : "Custom");
            setCustomSize(defaultDumpsterSizes.includes(dumpster.size) ? "" : dumpster.size);
            setIsEditing((current) => !current);
          }}
          className="mt-4 flex min-h-9 items-center gap-2 rounded border border-kp-line bg-white px-3 text-xs font-bold text-stone-700 transition hover:border-kp-green hover:text-kp-green"
        >
          <Edit2 aria-hidden className="h-4 w-4" />
          Edit Dumpster
        </button>
      ) : null}
      {onTakeOutOfService && dumpster.status === "Available" ? (
        <button
          type="button"
          onClick={() => onTakeOutOfService(dumpster.id)}
          className="mt-4 flex min-h-9 items-center gap-2 rounded border border-kp-line bg-white px-3 text-xs font-bold text-stone-700 transition hover:border-amber-300 hover:text-amber-700"
        >
          Take Out of Service
        </button>
      ) : null}
      {onPutInService && dumpster.status === "Out of Service" ? (
        <button
          type="button"
          onClick={() => onPutInService(dumpster.id)}
          className="mt-4 flex min-h-9 items-center gap-2 rounded border border-kp-line bg-white px-3 text-xs font-bold text-stone-700 transition hover:border-emerald-300 hover:text-emerald-700"
        >
          Put Back in Service
        </button>
      ) : null}
      {onDelete ? (
        <button
          type="button"
          onClick={() => onDelete(dumpster.id)}
          disabled={Boolean(deleteDisabledReason)}
          title={deleteDisabledReason}
          className="mt-4 flex min-h-9 items-center gap-2 rounded border border-kp-line bg-white px-3 text-xs font-bold text-stone-700 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400"
        >
          <Trash2 aria-hidden className="h-4 w-4" />
          Delete Dumpster
        </button>
      ) : null}
      {deleteDisabledReason ? <p className="mt-2 text-xs font-semibold text-amber-700">{deleteDisabledReason}</p> : null}
    </article>
  );
}
