"use client";

import { CalendarDays } from "lucide-react";
import { JobCard } from "@/components/job-card";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { getCalendarBuckets } from "@/lib/data";
import type { RentalJob } from "@/lib/types";
import { useOperations } from "@/lib/use-operations";
import { LoadingPanel } from "@/components/loading-panel";

function JobList({
  jobs,
  onDelete,
  onPaymentChange,
  operations
}: {
  jobs: RentalJob[];
  onDelete: (jobId: string) => void;
  onPaymentChange: Parameters<typeof JobCard>[0]["onPaymentChange"];
  operations: ReturnType<typeof useOperations>;
}) {
  if (jobs.length === 0) {
    return <div className="rounded border border-dashed border-kp-line bg-white p-4 text-sm text-stone-500">Nothing scheduled.</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {jobs.map((job) => (
        <JobCard
          key={job.id}
          job={job}
          onDelete={onDelete}
          onPaymentChange={onPaymentChange}
          onUpdate={operations.updateJob}
          onStatusChange={operations.updateJobStatus}
          onAddCharge={operations.addJobCharge}
          onAddPayment={operations.addJobPayment}
        />
      ))}
    </div>
  );
}

export default function CalendarPage() {
  const operations = useOperations();
  const buckets = getCalendarBuckets(operations.jobs);

  return (
    <>
      <PageHeader
        title="Calendar & Pickup List"
        description="A practical date-driven view for today, tomorrow, overdue work, and future scheduled rentals."
      />
      {!operations.loaded ? <LoadingPanel /> : null}
      {operations.loaded ? (
      <>
      <div className="mb-6 flex items-center gap-3 rounded border border-kp-line bg-white p-4 text-sm font-semibold text-stone-700">
        <CalendarDays aria-hidden className="h-5 w-5 text-kp-green" />
        Today is Sunday, Jun 7, 2026 in this local demo dataset.
      </div>
      <Section title="Today's Drop-Offs">
        <JobList jobs={buckets.todaysDropOffs} onDelete={operations.deleteJob} onPaymentChange={operations.updateJobPaymentStatus} operations={operations} />
      </Section>
      <Section title="Today's Pickups">
        <JobList jobs={buckets.todaysPickups} onDelete={operations.deleteJob} onPaymentChange={operations.updateJobPaymentStatus} operations={operations} />
      </Section>
      <Section title="Tomorrow's Pickups">
        <JobList jobs={buckets.tomorrowsPickups} onDelete={operations.deleteJob} onPaymentChange={operations.updateJobPaymentStatus} operations={operations} />
      </Section>
      <Section title="Overdue Pickups">
        <JobList jobs={buckets.overduePickups} onDelete={operations.deleteJob} onPaymentChange={operations.updateJobPaymentStatus} operations={operations} />
      </Section>
      <Section title="Future Scheduled Jobs">
        <JobList jobs={buckets.futureScheduledJobs} onDelete={operations.deleteJob} onPaymentChange={operations.updateJobPaymentStatus} operations={operations} />
      </Section>
      </>
      ) : null}
    </>
  );
}
