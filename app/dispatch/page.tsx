"use client";

import { DumpsterCard } from "@/components/dumpster-card";
import { DispatchJobCard } from "@/components/dispatch-job-card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { boardStatuses, groupJobsForBoard, isDumpster } from "@/lib/data";
import { useOperations } from "@/lib/use-operations";
import { LoadingPanel } from "@/components/loading-panel";

export default function DispatchPage() {
  const operations = useOperations();
  const grouped = groupJobsForBoard(operations.dumpsters, operations.jobs);

  return (
    <>
      <PageHeader
        title="Dispatch Board"
        description="Group every active rental and available unit by operational status so office and dispatch can scan the day fast."
      />
      {!operations.loaded ? <LoadingPanel /> : null}
      {operations.loaded ? (
      <>
      <div className="grid gap-3 xl:grid-cols-5 lg:grid-cols-3">
        {boardStatuses.map((status) => (
          <section key={status} className="rounded border border-kp-line bg-kp-paper p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <StatusBadge status={status} />
              <span className="rounded bg-white px-2 py-1 text-xs font-bold text-stone-600">{grouped[status].length}</span>
            </div>
            <div className="space-y-2">
              {grouped[status].map((item) =>
                isDumpster(item) ? (
                  <DumpsterCard key={item.id} dumpster={item} compact />
                ) : (
                  <DispatchJobCard
                    key={item.id}
                    job={item}
                    onDelete={operations.deleteJob}
                    onPaymentChange={operations.updateJobPaymentStatus}
                    onStatusChange={operations.updateJobStatus}
                    onCompletePickup={operations.completePickupWithDestination}
                    onAddCharge={operations.addJobCharge}
                    onAddPayment={operations.addJobPayment}
                  />
                )
              )}
              {grouped[status].length === 0 ? (
                <div className="rounded border border-dashed border-kp-line bg-white p-4 text-sm text-stone-500">No items in this lane.</div>
              ) : null}
            </div>
          </section>
        ))}
      </div>
      </>
      ) : null}
    </>
  );
}
