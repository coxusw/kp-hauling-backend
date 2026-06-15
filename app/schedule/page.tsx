"use client";

import { JobCard } from "@/components/job-card";
import { LoadingPanel } from "@/components/loading-panel";
import { PageHeader } from "@/components/page-header";
import { ScheduleJobForm } from "@/components/schedule-job-form";
import { Section } from "@/components/section";
import { useOperations } from "@/lib/use-operations";

export default function SchedulePage() {
  const operations = useOperations();
  const activeJobs = operations.jobs.filter((job) => job.status !== "Picked Up / Completed");

  return (
    <>
      <PageHeader
        title="Schedule Job"
        description="Create customer rentals, assign dumpsters, set drop-off and pickup times, and avoid double-booking inventory."
      />
      {!operations.loaded ? <LoadingPanel /> : null}
      {operations.loaded ? (
        <>
          <div className="mb-6">
            <ScheduleJobForm dumpsters={operations.dumpsters} jobs={operations.jobs} onAdd={operations.addJob} />
          </div>
          <Section title="Active Scheduled Work">
            {activeJobs.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activeJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onDelete={operations.deleteJob}
                    onPaymentChange={operations.updateJobPaymentStatus}
                    onUpdate={operations.updateJob}
                    onStatusChange={operations.updateJobStatus}
                    onAddCharge={operations.addJobCharge}
                    onAddPayment={operations.addJobPayment}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded border border-dashed border-kp-line bg-white p-5 text-sm text-stone-600">
                No active jobs scheduled yet.
              </div>
            )}
          </Section>
        </>
      ) : null}
    </>
  );
}
