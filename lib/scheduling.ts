import { parseISO } from "date-fns";
import type { RentalJob } from "@/lib/types";

export function activeJobStatuses(job: RentalJob) {
  return job.status !== "Picked Up / Completed";
}

export function getJobStart(job: Pick<RentalJob, "dropOffDate" | "dropOffTime">) {
  return parseISO(`${job.dropOffDate}T${job.dropOffTime || "00:00"}`);
}

export function getJobEnd(job: Pick<RentalJob, "expectedPickupDate" | "expectedPickupTime">) {
  return parseISO(`${job.expectedPickupDate}T${job.expectedPickupTime || "23:59"}`);
}

export function findDumpsterBookingConflicts(
  jobs: RentalJob[],
  dumpsterId: string,
  candidate: Pick<RentalJob, "dropOffDate" | "dropOffTime" | "expectedPickupDate" | "expectedPickupTime">
) {
  if (!dumpsterId) {
    return [];
  }

  const candidateStart = getJobStart(candidate);
  const candidateEnd = getJobEnd(candidate);

  return jobs.filter((job) => {
    if (job.dumpsterId !== dumpsterId || !activeJobStatuses(job)) {
      return false;
    }

    const jobStart = getJobStart(job);
    const jobEnd = getJobEnd(job);
    return candidateStart < jobEnd && candidateEnd > jobStart;
  });
}
