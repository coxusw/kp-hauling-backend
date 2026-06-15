import { MapPin, Trash2 } from "lucide-react";
import type { Dumpster } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";

export function DumpsterCard({
  dumpster,
  onDelete,
  onTakeOutOfService,
  onPutInService,
  deleteDisabledReason,
  compact = false
}: {
  dumpster: Dumpster;
  onDelete?: (dumpsterId: string) => void;
  onTakeOutOfService?: (dumpsterId: string) => void;
  onPutInService?: (dumpsterId: string) => void;
  deleteDisabledReason?: string;
  compact?: boolean;
}) {
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
