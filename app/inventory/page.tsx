"use client";

import { AddDumpsterForm } from "@/components/add-dumpster-form";
import { DumpsterCard } from "@/components/dumpster-card";
import { LoadingPanel } from "@/components/loading-panel";
import { PageHeader } from "@/components/page-header";
import { useOperations } from "@/lib/use-operations";

export default function InventoryPage() {
  const operations = useOperations();

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Add dumpsters, take available units out of service, restore them to service, or remove retired inventory."
      />
      {!operations.loaded ? <LoadingPanel /> : null}
      {operations.loaded ? (
        <>
          <div className="mb-6">
            <AddDumpsterForm onAdd={operations.addDumpster} />
          </div>

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-kp-ink">Current Inventory</h2>
              <span className="rounded border border-kp-line bg-white px-3 py-2 text-sm font-bold text-stone-700">
                {operations.dumpsters.length} dumpsters
              </span>
            </div>
            {operations.dumpsters.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {operations.dumpsters.map((dumpster) => (
                  <DumpsterCard
                    key={dumpster.id}
                    dumpster={dumpster}
                    onDelete={operations.deleteDumpster}
                    onTakeOutOfService={operations.takeDumpsterOutOfService}
                    onPutInService={operations.putDumpsterInService}
                    deleteDisabledReason={
                      operations.jobs.some((job) => job.dumpsterId === dumpster.id && job.status !== "Picked Up / Completed")
                        ? "Delete active jobs for this dumpster first."
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="rounded border border-dashed border-kp-line bg-white p-5 text-sm text-stone-600">
                No dumpsters entered yet. Add your first dumpster above.
              </div>
            )}
          </section>
        </>
      ) : null}
    </>
  );
}
