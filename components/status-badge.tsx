import { clsx } from "clsx";
import { statusTone } from "@/lib/data";
import type { DumpsterStatus, JobStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: DumpsterStatus | JobStatus | "Available" }) {
  return (
    <span className={clsx("kp-chip shrink-0 ring-1", statusTone[status])}>
      {status}
    </span>
  );
}
