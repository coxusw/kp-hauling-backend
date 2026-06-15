"use client";

import { LoadingPanel } from "@/components/loading-panel";
import { PageHeader } from "@/components/page-header";
import { ScheduleJobForm } from "@/components/schedule-job-form";
import { useOperations } from "@/lib/use-operations";

export default function SchedulePage() {
  const operations = useOperations();

  return (
    <>
      <PageHeader
        title="Schedule Job"
        description="Create customer rentals, assign dumpsters, set drop-off and pickup times, and avoid double-booking inventory."
      />
      {!operations.loaded ? <LoadingPanel /> : null}
      {operations.loaded ? (
        <ScheduleJobForm dumpsters={operations.dumpsters} jobs={operations.jobs} onAdd={operations.addJob} />
      ) : null}
    </>
  );
}
