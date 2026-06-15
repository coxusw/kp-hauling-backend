"use client";

import { AlertTriangle, CalendarClock, CheckCircle2, Clock, PackageCheck, Route, Trash2, Truck, Warehouse } from "lucide-react";
import Link from "next/link";
import { getAlerts, getDashboardStats } from "@/lib/data";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/section";
import { JobCard } from "@/components/job-card";
import { clsx } from "clsx";
import { useOperations } from "@/lib/use-operations";
import { LoadingPanel } from "@/components/loading-panel";

export default function DashboardPage() {
  const operations = useOperations();
  const stats = getDashboardStats(operations.dumpsters, operations.jobs);
  const alerts = getAlerts(operations.dumpsters, operations.jobs);
  const jobs = operations.jobs;
  const priorityJobs = jobs.filter((job) => ["Pickup Needed", "Overdue", "Scheduled Drop-Off"].includes(job.status)).slice(0, 5);

  const metrics = [
    { label: "Total dumpsters", value: stats.totalDumpsters, detail: "Tracked units across all sizes", icon: Warehouse },
    { label: "Available", value: stats.availableDumpsters, detail: "Ready to dispatch from yard", icon: CheckCircle2 },
    { label: "Delivered", value: stats.deliveredDumpsters, detail: "On customer sites right now", icon: Truck },
    { label: "Due today", value: stats.pickupsDueToday, detail: "Pickup deadline is today", icon: Clock },
    { label: "Overdue", value: stats.overduePickups, detail: "Needs immediate follow-up", icon: AlertTriangle },
    { label: "Drop-offs", value: stats.scheduledDropOffs, detail: "Scheduled future deliveries", icon: Route },
    { label: "Pickups", value: stats.scheduledPickups, detail: "Open pickup work", icon: PackageCheck },
    { label: "Upcoming availability", value: stats.upcomingAvailability, detail: "Expected back within 7 days", icon: CalendarClock }
  ];

  return (
    <>
      <PageHeader
        title="Operations Dashboard"
        description="Watch inventory pressure, pickup deadlines, dispatch status, and operational alerts from one clean command center."
      />
      {operations.loaded ? (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={operations.clearAll}
            className="flex min-h-10 items-center gap-2 rounded border border-kp-line bg-white px-3 text-sm font-semibold text-stone-700 transition hover:border-red-300 hover:text-red-700"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
            Clear Local Data
          </button>
        </div>
      ) : null}
      {!operations.loaded ? <LoadingPanel /> : null}
      {operations.loaded ? (
      <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <Section
          title="Priority Work"
          action={
            <Link href="/dispatch" className="rounded border border-kp-line bg-white px-3 py-2 text-sm font-semibold hover:border-kp-green">
              Open dispatch
            </Link>
          }
        >
          {priorityJobs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {priorityJobs.map((job) => (
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
              No priority jobs yet. Use the Schedule Job tab to create your first rental.
            </div>
          )}
        </Section>

        <Section title="Dashboard Alerts">
          <div className="space-y-3">
            {alerts.length > 0 ? alerts.map((alert) => (
              <div
                key={alert.id}
                className={clsx(
                  "rounded border bg-white p-4 shadow-panel",
                  alert.severity === "danger" && "border-red-200",
                  alert.severity === "warning" && "border-amber-200",
                  alert.severity === "info" && "border-sky-200"
                )}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    aria-hidden
                    className={clsx(
                      "mt-0.5 h-5 w-5 shrink-0",
                      alert.severity === "danger" && "text-red-600",
                      alert.severity === "warning" && "text-amber-600",
                      alert.severity === "info" && "text-sky-600"
                    )}
                  />
                  <div>
                    <p className="font-bold text-kp-ink">{alert.title}</p>
                    <p className="mt-1 text-sm leading-5 text-stone-600">{alert.detail}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="rounded border border-dashed border-kp-line bg-white p-5 text-sm text-stone-600">
                No alerts yet. Alerts appear when pickups are due, dumpsters are overdue, dumpsters are out of service, or a scheduled job has no available dumpster.
              </div>
            )}
          </div>
        </Section>
      </div>
      </>
      ) : null}
    </>
  );
}
