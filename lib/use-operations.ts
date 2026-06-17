"use client";

import { useEffect, useMemo, useState } from "react";
import type { DriverCashHandoff, DriverHourlyRate, DriverTimecardEntry, Dumpster, Expense, OwnerNotification, PaymentStatus, RentalJob, TruckType } from "@/lib/types";
import {
  createCharge,
  createDriverCashHandoff,
  createDriverTimecardEntry,
  createDumpster,
  createExpense,
  createJob,
  createPayment,
  DRIVER_CASH_HANDOFF_STORAGE_KEY,
  DRIVER_HOURLY_RATE_STORAGE_KEY,
  DRIVER_TIMECARD_STORAGE_KEY,
  DUMPSTER_STORAGE_KEY,
  EMPTY_DUMPSTERS,
  EMPTY_JOBS,
  EXPENSE_STORAGE_KEY,
  JOB_STORAGE_KEY,
  makeId,
  type NewExpenseInput,
  type NewDumpsterInput,
  type NewDriverTimecardInput,
  type NewJobInput
} from "@/lib/local-store";
import { getJobBalance } from "@/lib/data";
import { getTimecardHours } from "@/lib/timecards";
import { supabase } from "@/lib/supabase/client";
import { compactRow, dumpsterToRow, jobToRow, loadSupabaseOperations } from "@/lib/supabase/operations-db";

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeDumpsters(dumpsters: Dumpster[]) {
  return dumpsters.map((dumpster) => ({
    ...dumpster,
    type: dumpster.type === "Mixed Debris" ? "Garbage" : dumpster.type,
    status: (dumpster.status as string) === "Maintenance" ? "Out of Service" : dumpster.status
  })) as Dumpster[];
}

function normalizeJobs(jobs: RentalJob[]) {
  let nextJobNumber = Math.max(0, ...jobs.map((job) => job.jobNumber ?? 0)) + 1;
  return jobs.map((job) => {
    const jobNumber = job.jobNumber ?? nextJobNumber++;
    return {
      ...job,
      jobNumber,
      pickupDestinationAddress: job.pickupDestinationAddress ?? "KP yard"
    };
  });
}

function removeUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;
}

async function notify(title: string, detail: string, audience: "admin" | "driver" = "admin", userId?: string) {
  if (!supabase) {
    return;
  }

  const { data } = await supabase.auth.getSession();
  await fetch("/hauling/api/push/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ title, detail, audience, userId, type: audience === "driver" ? "dispatch" : "driver_updates" })
  }).catch(() => undefined);
}

export function useOperations() {
  const [dumpsters, setDumpsters] = useState<Dumpster[]>(EMPTY_DUMPSTERS);
  const [jobs, setJobs] = useState<RentalJob[]>(EMPTY_JOBS);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [driverCashHandoffs, setDriverCashHandoffs] = useState<DriverCashHandoff[]>([]);
  const [driverHourlyRates, setDriverHourlyRates] = useState<DriverHourlyRate[]>([]);
  const [driverTimecards, setDriverTimecards] = useState<DriverTimecardEntry[]>([]);
  const [notifications, setNotifications] = useState<OwnerNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const useDb = Boolean(supabase);

  async function reloadFromSupabase() {
    if (!supabase) {
      return;
    }

    const snapshot = await loadSupabaseOperations();
    setDumpsters(normalizeDumpsters(snapshot.dumpsters));
    setJobs(normalizeJobs(snapshot.jobs));
    setExpenses(snapshot.expenses);
    setDriverCashHandoffs(snapshot.driverCashHandoffs);
    setDriverHourlyRates(snapshot.driverHourlyRates);
    setDriverTimecards(snapshot.driverTimecards);
    setNotifications(snapshot.notifications);
  }

  useEffect(() => {
    if (supabase) {
      reloadFromSupabase().finally(() => setLoaded(true));
      return;
    }

    setDumpsters(normalizeDumpsters(readStored(DUMPSTER_STORAGE_KEY, EMPTY_DUMPSTERS)));
    setJobs(normalizeJobs(readStored(JOB_STORAGE_KEY, EMPTY_JOBS)));
    setExpenses(readStored(EXPENSE_STORAGE_KEY, []));
    setDriverCashHandoffs(readStored(DRIVER_CASH_HANDOFF_STORAGE_KEY, []));
    setDriverHourlyRates(readStored(DRIVER_HOURLY_RATE_STORAGE_KEY, []));
    setDriverTimecards(readStored(DRIVER_TIMECARD_STORAGE_KEY, []));
    setNotifications(readStored("kp-hauling-owner-notifications", []));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded && !useDb) {
      window.localStorage.setItem(DUMPSTER_STORAGE_KEY, JSON.stringify(dumpsters));
    }
  }, [dumpsters, loaded, useDb]);

  useEffect(() => {
    if (loaded && !useDb) {
      window.localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(jobs));
    }
  }, [jobs, loaded, useDb]);

  useEffect(() => {
    if (loaded && !useDb) {
      window.localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(expenses));
    }
  }, [expenses, loaded, useDb]);

  useEffect(() => {
    if (loaded && !useDb) {
      window.localStorage.setItem(DRIVER_CASH_HANDOFF_STORAGE_KEY, JSON.stringify(driverCashHandoffs));
    }
  }, [driverCashHandoffs, loaded, useDb]);

  useEffect(() => {
    if (loaded && !useDb) {
      window.localStorage.setItem(DRIVER_HOURLY_RATE_STORAGE_KEY, JSON.stringify(driverHourlyRates));
    }
  }, [driverHourlyRates, loaded, useDb]);

  useEffect(() => {
    if (loaded && !useDb) {
      window.localStorage.setItem(DRIVER_TIMECARD_STORAGE_KEY, JSON.stringify(driverTimecards));
    }
  }, [driverTimecards, loaded, useDb]);

  useEffect(() => {
    if (loaded && !useDb) {
      window.localStorage.setItem("kp-hauling-owner-notifications", JSON.stringify(notifications));
    }
  }, [loaded, notifications, useDb]);

  return useMemo(
    () => ({
      dumpsters,
      jobs,
      expenses,
      driverCashHandoffs,
      driverHourlyRates,
      driverTimecards,
      notifications,
      loaded,
      async addDumpster(input: NewDumpsterInput) {
        const newDumpster = createDumpster(input);
        if (supabase) {
          const { data, error } = await supabase.from("kp_hauling_dumpsters").insert(compactRow(dumpsterToRow(newDumpster))).select("*").single();
          if (error) {
            window.alert(`Unable to add dumpster: ${error.message}`);
            return;
          }
          if (!error && data) {
            await reloadFromSupabase();
            return;
          }
        }
        setDumpsters((current) => [...current, newDumpster]);
      },
      async updateDumpster(dumpsterId: string, updates: Partial<Dumpster>) {
        if (supabase) {
          const { error } = await supabase.from("kp_hauling_dumpsters").update(compactRow(dumpsterToRow(updates))).eq("id", dumpsterId);
          if (error) {
            window.alert(`Unable to update dumpster: ${error.message}`);
            return;
          }
          await reloadFromSupabase();
          return;
        }
        setDumpsters((current) =>
          current.map((dumpster) =>
            dumpster.id === dumpsterId
              ? {
                  ...dumpster,
                  ...updates,
                  number: updates.number?.trim() || dumpster.number,
                  currentLocation: updates.currentLocation?.trim() || "KP yard",
                  currentAddress: updates.currentAddress?.trim() ?? dumpster.currentAddress,
                  notes: updates.notes?.trim() ?? dumpster.notes
                }
              : dumpster
          )
        );
      },
      async addJob(input: NewJobInput) {
        const newJob = createJob(input, dumpsters, jobs);
        if (supabase) {
          const { data, error } = await supabase.from("kp_hauling_jobs").insert(compactRow(jobToRow(newJob))).select("*").single();
          if (error) {
            window.alert(`Unable to schedule job: ${error.message}`);
            return;
          }
          if (!error && data && newJob.dumpsterId) {
            await supabase.from("kp_hauling_dumpsters").update({
              status: "Scheduled Drop-Off",
              current_customer: newJob.customerName,
              current_job_id: data.id
            }).eq("id", newJob.dumpsterId);
          }
          await reloadFromSupabase();
          return;
        }
        setJobs((current) => [...current, newJob]);
        if (newJob.dumpsterId) {
          setDumpsters((current) =>
            current.map((dumpster) =>
              dumpster.id === newJob.dumpsterId
                ? {
                    ...dumpster,
                    status: "Scheduled Drop-Off",
                    currentCustomer: newJob.customerName,
                    currentJobId: newJob.id
                  }
                : dumpster
            )
          );
        }
      },
      async deleteJob(jobId: string) {
        const jobToDelete = jobs.find((job) => job.id === jobId);
        if (supabase) {
          await supabase.from("kp_hauling_jobs").delete().eq("id", jobId);
          if (jobToDelete?.dumpsterId) {
            await supabase.from("kp_hauling_dumpsters").update({
              status: "Available",
              current_customer: null,
              current_job_id: null
            }).eq("id", jobToDelete.dumpsterId);
          }
          await reloadFromSupabase();
          return;
        }
        setJobs((current) => current.filter((job) => job.id !== jobId));
        if (jobToDelete?.dumpsterId) {
          const hasOtherActiveJob = jobs.some(
            (job) => job.id !== jobId && job.dumpsterId === jobToDelete.dumpsterId && job.status !== "Picked Up / Completed"
          );
          if (!hasOtherActiveJob) {
            setDumpsters((current) =>
              current.map((dumpster) =>
                dumpster.id === jobToDelete.dumpsterId
                  ? {
                      ...dumpster,
                      status: "Available",
                      currentCustomer: undefined,
                      currentJobId: undefined
                    }
                  : dumpster
              )
            );
          }
        }
      },
      async updateJobPaymentStatus(jobId: string, paymentStatus: PaymentStatus) {
        if (supabase) {
          await supabase.from("kp_hauling_jobs").update({ payment_status: paymentStatus }).eq("id", jobId);
          await reloadFromSupabase();
          return;
        }
        setJobs((current) => current.map((job) => (job.id === jobId ? { ...job, paymentStatus } : job)));
      },
      async updateJob(jobId: string, updates: Partial<RentalJob>) {
        if (supabase) {
          const existing = jobs.find((job) => job.id === jobId);
          const next = existing ? { ...existing, ...updates } : updates;
          await supabase.from("kp_hauling_jobs").update(compactRow(jobToRow({
            ...updates,
            paymentStatus: existing && getJobBalance(next as RentalJob) <= 0 ? "Paid" : updates.paymentStatus
          }))).eq("id", jobId);
          if (updates.deliveryDriverId && updates.deliveryDriverId !== existing?.deliveryDriverId) {
            await notify(
              `Job #${existing?.jobNumber ?? ""} delivery dispatched`,
              `${existing?.customerName ?? "A job"} is assigned for drop-off.`,
              "driver",
              updates.deliveryDriverId
            );
          }
          if (updates.pickupDriverId && updates.pickupDriverId !== existing?.pickupDriverId) {
            await notify(
              `Job #${existing?.jobNumber ?? ""} pickup dispatched`,
              `${existing?.customerName ?? "A job"} is assigned for pickup.`,
              "driver",
              updates.pickupDriverId
            );
          }
          await reloadFromSupabase();
          return;
        }
        setJobs((current) =>
          current.map((job) => {
            if (job.id !== jobId) {
              return job;
            }
            const next = { ...job, ...updates };
            return { ...next, paymentStatus: getJobBalance(next) <= 0 ? "Paid" : next.paymentStatus };
          })
        );
      },
      async addOwnerNotification(title: string, detail: string) {
        if (supabase) {
          await supabase.from("kp_hauling_owner_notifications").insert({ title, detail });
          await notify(title, detail, "admin");
          await reloadFromSupabase();
          return;
        }
        setNotifications((current) => [
          {
            id: makeId("note"),
            createdAt: new Date().toISOString(),
            title,
            detail
          },
          ...current
        ]);
      },
      async clearOwnerNotification(notificationId: string) {
        if (supabase) {
          await supabase.from("kp_hauling_owner_notifications").delete().eq("id", notificationId);
          await reloadFromSupabase();
          return;
        }
        setNotifications((current) => current.filter((notification) => notification.id !== notificationId));
      },
      async updateJobStatus(jobId: string, status: RentalJob["status"]) {
        const targetJob = jobs.find((job) => job.id === jobId);
        const jobUpdate = {
          status,
          actualPickupDate: status === "Picked Up / Completed" ? new Date().toISOString().slice(0, 10) : targetJob?.actualPickupDate
        };
        const dumpsterUpdate = (() => {
          if (!targetJob?.dumpsterId) return undefined;
          if (status === "Picked Up / Completed") {
            return {
              status: "Available",
              currentCustomer: undefined,
              currentJobId: undefined,
              currentLocation: targetJob.pickupDestinationAddress || "KP yard",
              currentAddress: targetJob.pickupDestinationAddress ?? ""
            } satisfies Partial<Dumpster>;
          }
          return {
            status,
            currentCustomer: targetJob.customerName,
            currentJobId: targetJob.id,
            currentLocation: status === "Delivered" || status === "Pickup Needed" || status === "Overdue" ? targetJob.jobAddress : undefined,
            currentAddress: status === "Delivered" || status === "Pickup Needed" || status === "Overdue" ? targetJob.jobAddress : undefined
          } satisfies Partial<Dumpster>;
        })();
        if (supabase) {
          await supabase.from("kp_hauling_jobs").update(compactRow(jobToRow(jobUpdate))).eq("id", jobId);
          if (targetJob?.dumpsterId && dumpsterUpdate) {
            await supabase.from("kp_hauling_dumpsters").update(compactRow(dumpsterToRow(dumpsterUpdate))).eq("id", targetJob.dumpsterId);
          } else if (dumpsterUpdate) {
            await supabase.from("kp_hauling_dumpsters").update(compactRow(dumpsterToRow(dumpsterUpdate))).eq("current_job_id", jobId);
          }
          await reloadFromSupabase();
          return;
        }
        setJobs((current) => current.map((job) => (job.id === jobId ? { ...job, ...jobUpdate } : job)));
        if (targetJob?.dumpsterId && dumpsterUpdate) {
          setDumpsters((current) =>
            current.map((dumpster) => (dumpster.id === targetJob.dumpsterId ? { ...dumpster, ...removeUndefined(dumpsterUpdate) } : dumpster))
          );
        }
      },
      async addJobCharge(jobId: string, label: string, amount: number) {
        const charge = createCharge(label, amount);
        if (supabase) {
          await supabase.from("kp_hauling_job_charges").insert({ job_id: jobId, label: charge.label, amount, charge_date: charge.date });
          await supabase.from("kp_hauling_jobs").update({ payment_status: "Unpaid" }).eq("id", jobId);
          await reloadFromSupabase();
          return;
        }
        setJobs((current) =>
          current.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  charges: [...(job.charges ?? []), charge],
                  paymentStatus: "Unpaid"
                }
              : job
          )
        );
      },
      async completePickupWithDestination(jobId: string, pickupDestinationAddress: string, pickupOneWayMiles?: number, pickupReturnMiles?: number) {
        const destination = pickupDestinationAddress.trim() || "KP yard";
        const pickupJob = jobs.find((job) => job.id === jobId);
        if (supabase) {
          await supabase.from("kp_hauling_jobs").update({
            status: "Picked Up / Completed",
            actual_pickup_date: new Date().toISOString().slice(0, 10),
            pickup_destination_address: destination,
            pickup_one_way_miles: pickupOneWayMiles ?? null,
            pickup_return_miles: pickupReturnMiles ?? null
          }).eq("id", jobId);
          const dumpsterUpdate = {
            status: "Available",
            current_customer: null,
            current_job_id: null,
            current_location: destination,
            current_address: destination
          };
          if (pickupJob?.dumpsterId) {
            await supabase.from("kp_hauling_dumpsters").update(dumpsterUpdate).eq("id", pickupJob.dumpsterId);
          } else {
            await supabase.from("kp_hauling_dumpsters").update(dumpsterUpdate).eq("current_job_id", jobId);
          }
          await reloadFromSupabase();
          return;
        }
        setJobs((current) =>
          current.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  status: "Picked Up / Completed" as const,
                  actualPickupDate: new Date().toISOString().slice(0, 10),
                  pickupDestinationAddress: destination,
                  pickupOneWayMiles,
                  pickupReturnMiles
                }
              : job
          )
        );
        setDumpsters((current) =>
          current.map((dumpster) =>
            dumpster.currentJobId === jobId || dumpster.id === pickupJob?.dumpsterId
              ? {
                  ...dumpster,
                  status: "Available",
                  currentCustomer: undefined,
                  currentJobId: undefined,
                  currentLocation: destination,
                  currentAddress: destination
                }
              : dumpster
          )
        );
      },
      async addJobPayment(jobId: string, amount: number, note: string) {
        const payment = createPayment(amount, note);
        if (supabase) {
          await supabase.from("kp_hauling_job_payments").insert({
            job_id: jobId,
            amount,
            payment_date: payment.date,
            note: payment.note,
            method: "Other"
          });
          const targetJob = jobs.find((job) => job.id === jobId);
          if (targetJob) {
            const next = { ...targetJob, payments: [...(targetJob.payments ?? []), payment] };
            await supabase.from("kp_hauling_jobs").update({ payment_status: getJobBalance(next) <= 0 ? "Paid" : "Deposit Paid" }).eq("id", jobId);
          }
          await reloadFromSupabase();
          return;
        }
        setJobs((current) =>
          current.map((job) => {
            if (job.id !== jobId) {
              return job;
            }
            const next = { ...job, payments: [...(job.payments ?? []), payment] };
            return { ...next, paymentStatus: getJobBalance(next) <= 0 ? "Paid" : "Deposit Paid" };
          })
        );
      },
      async addExpense(input: NewExpenseInput) {
        const expense = createExpense(input);
        if (supabase) {
          await supabase.from("kp_hauling_expenses").insert({
            expense_date: expense.date,
            label: expense.label,
            amount: expense.amount,
            notes: expense.notes
          });
          await reloadFromSupabase();
          return;
        }
        setExpenses((current) => [...current, expense]);
      },
      async markDriverRoutePaid(jobId: string, routeType: "delivery" | "pickup", amount: number, notes: string) {
        const targetJob = jobs.find((job) => job.id === jobId);
        if (!targetJob) {
          return;
        }
        const driverName = routeType === "delivery" ? targetJob.deliveryDriverName : targetJob.pickupDriverName;
        if (!driverName) {
          return;
        }

        const paidAt = new Date().toISOString().slice(0, 10);
        const updates = routeType === "delivery"
          ? { deliveryDriverPaidAt: paidAt, deliveryDriverPayAmount: amount, deliveryDriverPayNotes: notes.trim() }
          : { pickupDriverPaidAt: paidAt, pickupDriverPayAmount: amount, pickupDriverPayNotes: notes.trim() };
        const expenseInput = {
          date: paidAt,
          label: `Driver route pay - Job #${targetJob.jobNumber}`,
          amount,
          notes: `${routeType === "delivery" ? "Drop-off" : "Pickup"} route paid to ${driverName} for ${targetJob.customerName}${notes.trim() ? `: ${notes.trim()}` : ""}`
        };
        if (supabase) {
          await supabase.from("kp_hauling_jobs").update(compactRow(jobToRow(updates))).eq("id", jobId);
          await supabase.from("kp_hauling_expenses").insert({
            expense_date: expenseInput.date,
            label: expenseInput.label,
            amount,
            notes: expenseInput.notes
          });
          await reloadFromSupabase();
          return;
        }
        setJobs((current) => current.map((job) => (job.id === jobId ? { ...job, ...updates } : job)));
        setExpenses((current) => [...current, createExpense(expenseInput)]);
      },
      async addDriverCashHandoff(driverId: string, driverName: string, amount: number, notes: string) {
        const handoff = createDriverCashHandoff(driverId, driverName, amount, notes);
        if (supabase) {
          await supabase.from("kp_hauling_driver_cash_handoffs").insert({
            handoff_date: handoff.date,
            driver_id: driverId,
            driver_name: driverName,
            amount,
            notes: handoff.notes
          });
          await reloadFromSupabase();
          return;
        }
        setDriverCashHandoffs((current) => [...current, handoff]);
      },
      async setDriverHourlyRate(driverId: string, hourlyRate: number) {
        const cleanRate = Math.max(Number(hourlyRate) || 0, 0);
        if (supabase) {
          const { error } = await supabase.from("kp_hauling_driver_hourly_rates").upsert({
            driver_id: driverId,
            hourly_rate: cleanRate,
            updated_at: new Date().toISOString()
          }, { onConflict: "driver_id" });
          if (error) {
            window.alert(`Unable to save hourly rate: ${error.message}`);
            return;
          }
          await reloadFromSupabase();
          return;
        }
        setDriverHourlyRates((current) => {
          const existing = current.some((rate) => rate.driverId === driverId);
          if (existing) {
            return current.map((rate) => (rate.driverId === driverId ? { ...rate, hourlyRate: cleanRate } : rate));
          }
          return [...current, { driverId, hourlyRate: cleanRate }];
        });
      },
      async addDriverTimecardEntry(driverId: string, driverName: string, input: NewDriverTimecardInput) {
        const entry = createDriverTimecardEntry(driverId, driverName, input);
        if (supabase) {
          const { error } = await supabase.from("kp_hauling_driver_timecards").insert({
            driver_id: driverId,
            driver_name: driverName,
            work_date: entry.workDate,
            start_time: entry.startTime,
            end_time: entry.endTime,
            note: entry.note
          });
          if (error) {
            window.alert(`Unable to add timecard entry: ${error.message}`);
            return false;
          }
          await reloadFromSupabase();
          return true;
        }
        setDriverTimecards((current) => [entry, ...current]);
        return true;
      },
      async payoutDriverTimecards(driverId: string, driverName: string) {
        const rate = driverHourlyRates.find((item) => item.driverId === driverId)?.hourlyRate ?? 0;
        const unpaidEntries = driverTimecards.filter((entry) => entry.driverId === driverId && !entry.paidAt);
        const hours = unpaidEntries.reduce((total, entry) => total + getTimecardHours(entry), 0);
        const total = hours * rate;
        if (unpaidEntries.length === 0 || total <= 0) {
          return false;
        }

        const paidAt = new Date().toISOString().slice(0, 10);
        const expenseInput = {
          date: paidAt,
          label: `Driver timecard payout - ${driverName}`,
          amount: total,
          notes: `${hours.toFixed(2)} hours at $${rate.toFixed(2)}/hr`
        };

        if (supabase) {
          const db = supabase;
          const updateResults = await Promise.all(unpaidEntries.map((entry) =>
            db.from("kp_hauling_driver_timecards").update({
              paid_at: paidAt,
              paid_amount: Number((getTimecardHours(entry) * rate).toFixed(2)),
              updated_at: new Date().toISOString()
            }).eq("id", entry.id)
          ));
          const failedUpdate = updateResults.find((result) => result.error);
          if (failedUpdate?.error) {
            window.alert(`Unable to mark timecard paid: ${failedUpdate.error.message}`);
            return false;
          }
          const { error } = await db.from("kp_hauling_expenses").insert({
            expense_date: expenseInput.date,
            label: expenseInput.label,
            amount: Number(total.toFixed(2)),
            notes: expenseInput.notes
          });
          if (error) {
            window.alert(`Unable to log payout expense: ${error.message}`);
            return false;
          }
          await reloadFromSupabase();
          return true;
        }

        setDriverTimecards((current) =>
          current.map((entry) =>
            entry.driverId === driverId && !entry.paidAt
              ? { ...entry, paidAt, paidAmount: Number((getTimecardHours(entry) * rate).toFixed(2)) }
              : entry
          )
        );
        setExpenses((current) => [...current, createExpense(expenseInput)]);
        return true;
      },
      async deleteExpense(expenseId: string) {
        if (supabase) {
          await supabase.from("kp_hauling_expenses").delete().eq("id", expenseId);
          await reloadFromSupabase();
          return;
        }
        setExpenses((current) => current.filter((expense) => expense.id !== expenseId));
      },
      async deleteDumpster(dumpsterId: string) {
        const hasActiveJob = jobs.some((job) => job.dumpsterId === dumpsterId && job.status !== "Picked Up / Completed");
        if (hasActiveJob) {
          return false;
        }

        if (supabase) {
          await supabase.from("kp_hauling_dumpsters").delete().eq("id", dumpsterId);
          await reloadFromSupabase();
          return true;
        }
        setDumpsters((current) => current.filter((dumpster) => dumpster.id !== dumpsterId));
        return true;
      },
      async takeDumpsterOutOfService(dumpsterId: string) {
        if (supabase) {
          await supabase.from("kp_hauling_dumpsters").update({ status: "Out of Service" }).eq("id", dumpsterId).eq("status", "Available");
          await reloadFromSupabase();
          return;
        }
        setDumpsters((current) =>
          current.map((dumpster) => (dumpster.id === dumpsterId && dumpster.status === "Available" ? { ...dumpster, status: "Out of Service" } : dumpster))
        );
      },
      async putDumpsterInService(dumpsterId: string) {
        if (supabase) {
          await supabase.from("kp_hauling_dumpsters").update({ status: "Available" }).eq("id", dumpsterId).eq("status", "Out of Service");
          await reloadFromSupabase();
          return;
        }
        setDumpsters((current) =>
          current.map((dumpster) => (dumpster.id === dumpsterId && dumpster.status === "Out of Service" ? { ...dumpster, status: "Available" } : dumpster))
        );
      },
      async completeDelivery(
        jobId: string,
        driverName?: string,
        completedAt?: string,
        notes?: string,
        cashCollected?: number,
        driverId?: string,
        truckType?: TruckType,
        outboundMiles?: number,
        returnMiles?: number
      ) {
        const deliveredJob = jobs.find((job) => job.id === jobId);
        const payment = cashCollected && cashCollected > 0
          ? createPayment(cashCollected, notes?.trim() || "Driver cash collected at drop-off", {
              method: "Cash",
              driverId,
              driverName,
              collectedDuring: "delivery"
            })
          : undefined;
        if (supabase) {
          const targetJob = jobs.find((job) => job.id === jobId);
          const next = targetJob && payment ? { ...targetJob, payments: [...(targetJob.payments ?? []), payment] } : targetJob;
          await supabase.from("kp_hauling_jobs").update({
            status: "Delivered",
            delivery_truck_type: truckType ?? null,
            delivery_completed_at: completedAt ?? null,
            delivery_completion_notes: notes?.trim() ?? null,
            estimated_one_way_miles: truckType === "Company Truck" ? outboundMiles ?? null : targetJob?.estimatedOneWayMiles ?? null,
            delivery_return_miles: truckType === "Company Truck" ? returnMiles ?? null : targetJob?.deliveryReturnMiles ?? null,
            payment_status: next && getJobBalance(next) <= 0 ? "Paid" : payment ? "Deposit Paid" : targetJob?.paymentStatus
          }).eq("id", jobId);
          await supabase.from("kp_hauling_dumpsters").update({
            status: "Delivered",
            current_location: deliveredJob?.jobAddress,
            current_address: deliveredJob?.jobAddress
          }).eq("current_job_id", jobId);
          if (payment) {
            await supabase.from("kp_hauling_job_payments").insert({
              job_id: jobId,
              amount: payment.amount,
              payment_date: payment.date,
              note: payment.note,
              method: payment.method,
              driver_id: driverId ?? null,
              driver_name: driverName ?? null,
              collected_during: "delivery"
            });
          }
          if (deliveredJob) {
            const title = `${driverName || deliveredJob.deliveryDriverName || "Driver"} dropped off dumpster ${deliveredJob.dumpsterNumber ?? "Unassigned"}`;
            const detail = `${notes?.trim() || "No driver notes entered."}${truckType ? ` ${truckType}.` : ""}${truckType === "Company Truck" && outboundMiles !== undefined && returnMiles !== undefined ? ` Business miles: ${(outboundMiles + returnMiles).toFixed(1)}.` : ""}${cashCollected && cashCollected > 0 ? ` Cash collected: $${cashCollected}.` : ""}`;
            await supabase.from("kp_hauling_owner_notifications").insert({ title, detail });
            await notify(title, detail, "admin");
          }
          await reloadFromSupabase();
          return;
        }
        setJobs((current) => current.map((job) => {
          if (job.id !== jobId) {
            return job;
          }
          const payments = payment ? [...(job.payments ?? []), payment] : job.payments;
          const next = {
            ...job,
            status: "Delivered" as const,
            deliveryTruckType: truckType,
            deliveryCompletedAt: completedAt,
            deliveryCompletionNotes: notes?.trim(),
            estimatedOneWayMiles: truckType === "Company Truck" ? outboundMiles : job.estimatedOneWayMiles,
            deliveryReturnMiles: truckType === "Company Truck" ? returnMiles : job.deliveryReturnMiles,
            payments
          };
          return {
            ...next,
            paymentStatus: getJobBalance(next) <= 0 ? "Paid" : cashCollected && cashCollected > 0 ? "Deposit Paid" : next.paymentStatus
          };
        }));
        setDumpsters((current) =>
          current.map((dumpster) =>
            dumpster.currentJobId === jobId
              ? {
                  ...dumpster,
                  status: "Delivered",
                  currentLocation: deliveredJob?.jobAddress ?? dumpster.currentLocation,
                  currentAddress: deliveredJob?.jobAddress ?? dumpster.currentAddress
                }
              : dumpster
          )
        );
      },
      async completePickup(
        jobId: string,
        driverName?: string,
        completedAt?: string,
        notes?: string,
        cashCollected?: number,
        driverId?: string,
        truckType?: TruckType,
        outboundMiles?: number,
        returnMiles?: number
      ) {
        const pickupJob = jobs.find((job) => job.id === jobId);
        const destination = pickupJob?.pickupDestinationAddress?.trim() || "KP yard";
        const payment = cashCollected && cashCollected > 0
          ? createPayment(cashCollected, notes?.trim() || "Driver cash collected at pickup", {
              method: "Cash",
              driverId,
              driverName,
              collectedDuring: "pickup"
            })
          : undefined;
        if (supabase) {
          const next = pickupJob && payment ? { ...pickupJob, payments: [...(pickupJob.payments ?? []), payment] } : pickupJob;
          await supabase.from("kp_hauling_jobs").update({
            status: "Picked Up / Completed",
            actual_pickup_date: new Date().toISOString().slice(0, 10),
            pickup_destination_address: destination,
            pickup_truck_type: truckType ?? null,
            pickup_completed_at: completedAt ?? null,
            pickup_completion_notes: notes?.trim() ?? null,
            pickup_one_way_miles: truckType === "Company Truck" ? outboundMiles ?? null : pickupJob?.pickupOneWayMiles ?? null,
            pickup_return_miles: truckType === "Company Truck" ? returnMiles ?? null : pickupJob?.pickupReturnMiles ?? null,
            payment_status: next && getJobBalance(next) <= 0 ? "Paid" : payment ? "Deposit Paid" : pickupJob?.paymentStatus
          }).eq("id", jobId);
          const dumpsterUpdate = {
            status: "Available",
            current_customer: null,
            current_job_id: null,
            current_location: destination,
            current_address: destination
          };
          if (pickupJob?.dumpsterId) {
            await supabase.from("kp_hauling_dumpsters").update(dumpsterUpdate).eq("id", pickupJob.dumpsterId);
          } else {
            await supabase.from("kp_hauling_dumpsters").update(dumpsterUpdate).eq("current_job_id", jobId);
          }
          if (payment) {
            await supabase.from("kp_hauling_job_payments").insert({
              job_id: jobId,
              amount: payment.amount,
              payment_date: payment.date,
              note: payment.note,
              method: payment.method,
              driver_id: driverId ?? null,
              driver_name: driverName ?? null,
              collected_during: "pickup"
            });
          }
          if (pickupJob) {
            const title = `${driverName || pickupJob.pickupDriverName || "Driver"} picked up dumpster ${pickupJob.dumpsterNumber ?? "Unassigned"}`;
            const detail = `${notes?.trim() || "No driver notes entered."}${truckType ? ` ${truckType}.` : ""}${truckType === "Company Truck" && outboundMiles !== undefined && returnMiles !== undefined ? ` Business miles: ${(outboundMiles + returnMiles).toFixed(1)}.` : ""}${cashCollected && cashCollected > 0 ? ` Cash collected: $${cashCollected}.` : ""}`;
            await supabase.from("kp_hauling_owner_notifications").insert({ title, detail });
            await notify(title, detail, "admin");
          }
          await reloadFromSupabase();
          return;
        }
        setJobs((current) =>
          current.map((job) => {
            if (job.id !== jobId) {
              return job;
            }
            const payments = payment ? [...(job.payments ?? []), payment] : job.payments;
            const next = {
                  ...job,
                  status: "Picked Up / Completed" as const,
                  actualPickupDate: new Date().toISOString().slice(0, 10),
                  pickupDestinationAddress: destination,
                  pickupTruckType: truckType,
                  pickupCompletedAt: completedAt,
                  pickupCompletionNotes: notes?.trim(),
                  pickupOneWayMiles: truckType === "Company Truck" ? outboundMiles : job.pickupOneWayMiles,
                  pickupReturnMiles: truckType === "Company Truck" ? returnMiles : job.pickupReturnMiles,
                  payments
                };
            return {
              ...next,
              paymentStatus: getJobBalance(next) <= 0 ? "Paid" : cashCollected && cashCollected > 0 ? "Deposit Paid" : next.paymentStatus
            };
          })
        );
        setDumpsters((current) =>
          current.map((dumpster) =>
            dumpster.currentJobId === jobId || dumpster.id === pickupJob?.dumpsterId
              ? {
                  ...dumpster,
                  status: "Available",
                  currentCustomer: undefined,
                  currentJobId: undefined,
                  currentLocation: destination,
                  currentAddress: destination
                }
              : dumpster
          )
        );
      },
      async clearAll() {
        if (supabase) {
          return;
        }
        setDumpsters([]);
        setJobs([]);
        setExpenses([]);
        setDriverCashHandoffs([]);
        setDriverHourlyRates([]);
        setDriverTimecards([]);
        setNotifications([]);
      }
    }),
    [driverCashHandoffs, driverHourlyRates, driverTimecards, dumpsters, expenses, jobs, loaded, notifications]
  );
}
