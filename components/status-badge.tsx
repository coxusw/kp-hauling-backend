import { clsx } from "clsx";
import { statusTone } from "@/lib/data";
import type { DumpsterStatus, JobStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: DumpsterStatus | JobStatus | "Available" }) {
  return (
    <span className={clsx("inline-flex items-center rounded px-2 py-1 text-xs font-semibold ring-1", statusTone[status])}>
      {status}
    </span>
  );
}
