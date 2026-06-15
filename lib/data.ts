import { addDays, differenceInCalendarDays, format, isBefore, isSameDay, parseISO } from "date-fns";
import { EMPTY_DUMPSTERS, EMPTY_JOBS } from "@/lib/local-store";
import type { DashboardAlert, Dumpster, DumpsterSize, DumpsterStatus, JobStatus, RentalJob } from "@/lib/types";
import { activeJobStatuses, getJobEnd, getJobStart } from "@/lib/scheduling";

export const TODAY = "2026-06-07";

export const statusOrder: JobStatus[] = [
  "Scheduled Drop-Off",
  "Delivered",
  "Pickup Needed",
  "Overdue",
  "Picked Up / Completed"
];

export const boardStatuses: Array<JobStatus | DumpsterStatus> = [
  "Available",
  "Scheduled Drop-Off",
  "Delivered",
  "Pickup Needed",
  "Overdue"
];

export const statusTone: Record<DumpsterStatus | JobStatus | "Available", string> = {
  Available: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  "Scheduled Drop-Off": "bg-sky-50 text-sky-800 ring-sky-200",
  Delivered: "bg-stone-100 text-stone-800 ring-stone-200",
  "Pickup Needed": "bg-amber-50 text-amber-800 ring-amber-200",
  Overdue: "bg-red-50 text-red-800 ring-red-200",
  "In Transit": "bg-indigo-50 text-indigo-800 ring-indigo-200",
  "Out of Service": "bg-zinc-100 text-zinc-800 ring-zinc-300",
  "Picked Up / Completed": "bg-green-50 text-green-800 ring-green-200"
};

export function getDumpsters(): Dumpster[] {
  // Future Supabase integration point: query `dumpsters` table here when `supabase` is configured.
  return EMPTY_DUMPSTERS;
}

export function getJobs(): RentalJob[] {
  // Future Supabase integration point: query `rental_jobs` table here when `supabase` is configured.
  return EMPTY_JOBS;
}

export function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function preciseCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function getJobChargesTotal(job: RentalJob) {
  return (job.charges ?? []).reduce((total, charge) => total + charge.amount, 0);
}

export function getJobPaymentsTotal(job: RentalJob) {
  return (job.payments ?? []).reduce((total, payment) => total + payment.amount, 0);
}

export function getJobTotal(job: RentalJob) {
  return job.price + getJobChargesTotal(job);
}

export function getJobBalance(job: RentalJob) {
  return Math.max(getJobTotal(job) - getJobPaymentsTotal(job), 0);
}

export function getJobMileageTotal(job: RentalJob) {
  return (job.estimatedOneWayMiles ?? 0) + (job.pickupOneWayMiles ?? 0);
}

export function displayDate(date: string) {
  return format(parseISO(date), "MMM d");
}

export function displayTime(time?: string) {
  if (!time) {
    return "";
  }

  const [hours, minutes] = time.split(":").map(Number);
  return format(new Date(2026, 0, 1, hours, minutes), "h:mm a");
}

export function fullDate(date: string) {
  return format(parseISO(date), "EEEE, MMM d");
}

export function daysUntil(date: string, today = TODAY) {
  return differenceInCalendarDays(parseISO(date), parseISO(today));
}

export function getDashboardStats(dumpsters = getDumpsters(), jobs = getJobs(), today = TODAY) {
  const pickupsDueToday = jobs.filter((job) => job.actualPickupDate === undefined && isSameDay(parseISO(job.expectedPickupDate), parseISO(today)));
  const overdue = jobs.filter((job) => job.actualPickupDate === undefined && isBefore(parseISO(job.expectedPickupDate), parseISO(today)));
  const scheduledDropOffs = jobs.filter((job) => job.status === "Scheduled Drop-Off");
  const scheduledPickups = jobs.filter((job) => ["Pickup Needed", "Overdue"].includes(job.status));
  const upcomingAvailability = jobs.filter((job) => daysUntil(job.expectedPickupDate, today) > 0 && daysUntil(job.expectedPickupDate, today) <= 7);

  return {
    totalDumpsters: dumpsters.length,
    availableDumpsters: dumpsters.filter((dumpster) => dumpster.status === "Available").length,
    deliveredDumpsters: dumpsters.filter((dumpster) => ["Delivered", "Pickup Needed", "Overdue"].includes(dumpster.status)).length,
    pickupsDueToday: pickupsDueToday.length,
    overduePickups: overdue.length,
    scheduledDropOffs: scheduledDropOffs.length,
    scheduledPickups: scheduledPickups.length,
    upcomingAvailability: upcomingAvailability.length
  };
}

export function getAlerts(dumpsters = getDumpsters(), jobs = getJobs(), today = TODAY): DashboardAlert[] {
  const tomorrow = format(addDays(parseISO(today), 1), "yyyy-MM-dd");
  const availableBySize = dumpsters.reduce<Record<string, number>>((acc, dumpster) => {
    if (dumpster.status === "Available") {
      acc[dumpster.size] = (acc[dumpster.size] ?? 0) + 1;
    }
    return acc;
  }, {});

  const dueTomorrow = jobs.filter((job) => job.actualPickupDate === undefined && job.expectedPickupDate === tomorrow);
  const dueToday = jobs.filter((job) => job.actualPickupDate === undefined && job.expectedPickupDate === today);
  const overdue = jobs.filter((job) => job.actualPickupDate === undefined && isBefore(parseISO(job.expectedPickupDate), parseISO(today)));
  const outOfService = dumpsters.filter((dumpster) => dumpster.status === "Out of Service");
  const doubleBookings = jobs.flatMap((job, index) => {
    if (!job.dumpsterId || !activeJobStatuses(job)) {
      return [];
    }

    return jobs.slice(index + 1).filter((otherJob) => {
      if (otherJob.dumpsterId !== job.dumpsterId || !activeJobStatuses(otherJob)) {
        return false;
      }

      return getJobStart(job) < getJobEnd(otherJob) && getJobEnd(job) > getJobStart(otherJob);
    }).map((otherJob) => ({ job, otherJob }));
  });
  const noAvailableDumpster = jobs.filter(
    (job) =>
      job.status === "Scheduled Drop-Off" &&
      !job.dumpsterId &&
      (availableBySize[job.dumpsterSize] ?? 0) === 0
  );

  return [
    ...dueTomorrow.map((job) => ({
      id: `tomorrow-${job.id}`,
      title: "Pickup due tomorrow",
      detail: `${job.customerName} at ${job.jobAddress} has ${job.dumpsterNumber ?? job.dumpsterSize} due ${displayDate(job.expectedPickupDate)}.`,
      severity: "info" as const
    })),
    ...dueToday.map((job) => ({
      id: `today-${job.id}`,
      title: "Pickup due today",
      detail: `${job.customerName} needs pickup today at ${job.jobAddress}.`,
      severity: "warning" as const
    })),
    ...overdue.map((job) => ({
      id: `overdue-${job.id}`,
      title: "Dumpster overdue",
      detail: `${job.dumpsterNumber ?? job.dumpsterSize} is overdue at ${job.jobAddress}.`,
      severity: "danger" as const
    })),
    ...outOfService.map((dumpster) => ({
      id: `out-of-service-${dumpster.id}`,
      title: "Dumpster out of service",
      detail: `${dumpster.number} is currently out of service${dumpster.notes ? `: ${dumpster.notes}` : "."}`,
      severity: "warning" as const
    })),
    ...doubleBookings.map(({ job, otherJob }) => ({
      id: `double-booking-${job.id}-${otherJob.id}`,
      title: "Dumpster double-booked",
      detail: `${job.dumpsterNumber ?? "A dumpster"} is assigned to both ${job.customerName} and ${otherJob.customerName} during overlapping rental windows.`,
      severity: "danger" as const
    })),
    ...noAvailableDumpster.map((job) => ({
      id: `availability-${job.id}`,
      title: "No dumpster available",
      detail: `${job.customerName} needs a ${job.dumpsterSize} dumpster on ${displayDate(job.dropOffDate)}, but none are available now.`,
      severity: "danger" as const
    }))
  ];
}

export function groupJobsForBoard(dumpsters = getDumpsters(), jobs = getJobs()) {
  const grouped: Record<string, Array<RentalJob | Dumpster>> = Object.fromEntries(boardStatuses.map((status) => [status, []]));

  dumpsters
    .filter((dumpster) => dumpster.status === "Available")
    .forEach((dumpster) => grouped[dumpster.status].push(dumpster));

  jobs.forEach((job) => {
    if (job.status !== "Picked Up / Completed") {
      grouped[job.status].push(job);
    }
  });

  return grouped;
}

export function getCalendarBuckets(jobs = getJobs(), today = TODAY) {
  const tomorrow = format(addDays(parseISO(today), 1), "yyyy-MM-dd");

  return {
    todaysDropOffs: jobs.filter((job) => job.dropOffDate === today && job.status === "Scheduled Drop-Off"),
    todaysPickups: jobs.filter((job) => job.expectedPickupDate === today && job.status !== "Picked Up / Completed"),
    tomorrowsPickups: jobs.filter((job) => job.expectedPickupDate === tomorrow && job.status !== "Picked Up / Completed"),
    overduePickups: jobs.filter((job) => isBefore(parseISO(job.expectedPickupDate), parseISO(today)) && job.status !== "Picked Up / Completed"),
    futureScheduledJobs: jobs.filter((job) => isBefore(parseISO(today), parseISO(job.dropOffDate)))
  };
}

export function getAvailabilityBySize(dumpsters = getDumpsters(), jobs = getJobs(), today = TODAY) {
  const sizes: DumpsterSize[] = ["10 yd", "15 yd", "20 yd", "30 yd"];

  return sizes.map((size) => {
    const sizeDumpsters = dumpsters.filter((dumpster) => dumpster.size === size);
    const activeJobs = jobs.filter((job) => job.dumpsterSize === size && job.status !== "Picked Up / Completed");

    return {
      size,
      total: sizeDumpsters.length,
      availableNow: sizeDumpsters.filter((dumpster) => dumpster.status === "Available").length,
      currentlyRented: sizeDumpsters.filter((dumpster) => ["Delivered", "Pickup Needed", "Overdue"].includes(dumpster.status)).length,
      dueBackSoon: activeJobs.filter((job) => daysUntil(job.expectedPickupDate, today) >= 0 && daysUntil(job.expectedPickupDate, today) <= 2).length,
      overdue: activeJobs.filter((job) => isBefore(parseISO(job.expectedPickupDate), parseISO(today))).length
    };
  });
}

export function getDriverTasks(jobs = getJobs(), today = TODAY) {
  return {
    deliveries: jobs.filter((job) => job.dropOffDate === today && job.status === "Scheduled Drop-Off"),
    pickups: jobs.filter((job) => job.expectedPickupDate === today && ["Delivered", "Pickup Needed", "Overdue"].includes(job.status))
  };
}

export function isDumpster(item: RentalJob | Dumpster): item is Dumpster {
  return "number" in item && "type" in item;
}
