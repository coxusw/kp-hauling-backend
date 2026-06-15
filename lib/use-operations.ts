"use client";

import { useEffect, useMemo, useState } from "react";
import type { DriverCashHandoff, Dumpster, Expense, OwnerNotification, PaymentStatus, RentalJob, TruckType } from "@/lib/types";
import {
  createCharge,
  createDriverCashHandoff,
  createDumpster,
  createExpense,
  createJob,
  createPayment,
  DRIVER_CASH_HANDOFF_STORAGE_KEY,
  DUMPSTER_STORAGE_KEY,
  EMPTY_DUMPSTERS,
  EMPTY_JOBS,
  EXPENSE_STORAGE_KEY,
  JOB_STORAGE_KEY,
  makeId,
  type NewExpenseInput,
  type NewDumpsterInput,
  type NewJobInput
} from "@/lib/local-store";
import { getJobBalance } from "@/lib/data";

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
    status: (dumpster.status as string) === "Maintenance" ? "Out of Service" : dumpster.status
  })) as Dumpster[];
}

function normalizeJobs(jobs: RentalJob[]) {
  return jobs.map((job) => ({
    ...job,
    pickupDestinationAddress: job.pickupDestinationAddress ?? "KP yard"
  }));
}

export function useOperations() {
  const [dumpsters, setDumpsters] = useState<Dumpster[]>(EMPTY_DUMPSTERS);
  const [jobs, setJobs] = useState<RentalJob[]>(EMPTY_JOBS);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [driverCashHandoffs, setDriverCashHandoffs] = useState<DriverCashHandoff[]>([]);
  const [notifications, setNotifications] = useState<OwnerNotification[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setDumpsters(normalizeDumpsters(readStored(DUMPSTER_STORAGE_KEY, EMPTY_DUMPSTERS)));
    setJobs(normalizeJobs(readStored(JOB_STORAGE_KEY, EMPTY_JOBS)));
    setExpenses(readStored(EXPENSE_STORAGE_KEY, []));
    setDriverCashHandoffs(readStored(DRIVER_CASH_HANDOFF_STORAGE_KEY, []));
    setNotifications(readStored("kp-hauling-owner-notifications", []));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(DUMPSTER_STORAGE_KEY, JSON.stringify(dumpsters));
    }
  }, [dumpsters, loaded]);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(jobs));
    }
  }, [jobs, loaded]);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(expenses));
    }
  }, [expenses, loaded]);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(DRIVER_CASH_HANDOFF_STORAGE_KEY, JSON.stringify(driverCashHandoffs));
    }
  }, [driverCashHandoffs, loaded]);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem("kp-hauling-owner-notifications", JSON.stringify(notifications));
    }
  }, [loaded, notifications]);

  return useMemo(
    () => ({
      dumpsters,
      jobs,
      expenses,
      driverCashHandoffs,
      notifications,
      loaded,
      addDumpster(input: NewDumpsterInput) {
        setDumpsters((current) => [...current, createDumpster(input)]);
      },
      updateDumpster(dumpsterId: string, updates: Partial<Dumpster>) {
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
      addJob(input: NewJobInput) {
        const newJob = createJob(input, dumpsters);
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
      deleteJob(jobId: string) {
        const jobToDelete = jobs.find((job) => job.id === jobId);
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
      updateJobPaymentStatus(jobId: string, paymentStatus: PaymentStatus) {
        setJobs((current) => current.map((job) => (job.id === jobId ? { ...job, paymentStatus } : job)));
      },
      updateJob(jobId: string, updates: Partial<RentalJob>) {
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
      addOwnerNotification(title: string, detail: string) {
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
      clearOwnerNotification(notificationId: string) {
        setNotifications((current) => current.filter((notification) => notification.id !== notificationId));
      },
      updateJobStatus(jobId: string, status: RentalJob["status"]) {
        setJobs((current) =>
          current.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  status,
                  actualPickupDate: status === "Picked Up / Completed" ? new Date().toISOString().slice(0, 10) : job.actualPickupDate
                }
              : job
          )
        );
        const targetJob = jobs.find((job) => job.id === jobId);
        if (targetJob?.dumpsterId) {
          setDumpsters((current) =>
            current.map((dumpster) => {
              if (dumpster.id !== targetJob.dumpsterId) {
                return dumpster;
              }
              if (status === "Picked Up / Completed") {
                return {
                  ...dumpster,
                  status: "Available",
                  currentCustomer: undefined,
                  currentJobId: undefined,
                  currentLocation: targetJob.pickupDestinationAddress || "KP yard",
                  currentAddress: targetJob.pickupDestinationAddress ?? ""
                };
              }
              return {
                ...dumpster,
                status,
                currentCustomer: targetJob.customerName,
                currentJobId: targetJob.id,
                currentLocation: status === "Delivered" || status === "Pickup Needed" || status === "Overdue" ? targetJob.jobAddress : dumpster.currentLocation,
                currentAddress: status === "Delivered" || status === "Pickup Needed" || status === "Overdue" ? targetJob.jobAddress : dumpster.currentAddress
              };
            })
          );
        }
      },
      addJobCharge(jobId: string, label: string, amount: number) {
        setJobs((current) =>
          current.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  charges: [...(job.charges ?? []), createCharge(label, amount)],
                  paymentStatus: "Unpaid"
                }
              : job
          )
        );
      },
      completePickupWithDestination(jobId: string, pickupDestinationAddress: string, pickupOneWayMiles?: number) {
        const destination = pickupDestinationAddress.trim() || "KP yard";
        setJobs((current) =>
          current.map((job) =>
            job.id === jobId
              ? {
                  ...job,
                  status: "Picked Up / Completed" as const,
                  actualPickupDate: new Date().toISOString().slice(0, 10),
                  pickupDestinationAddress: destination,
                  pickupOneWayMiles
                }
              : job
          )
        );
        setDumpsters((current) =>
          current.map((dumpster) =>
            dumpster.currentJobId === jobId
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
      addJobPayment(jobId: string, amount: number, note: string) {
        setJobs((current) =>
          current.map((job) => {
            if (job.id !== jobId) {
              return job;
            }
            const next = { ...job, payments: [...(job.payments ?? []), createPayment(amount, note)] };
            return { ...next, paymentStatus: getJobBalance(next) <= 0 ? "Paid" : "Deposit Paid" };
          })
        );
      },
      addExpense(input: NewExpenseInput) {
        setExpenses((current) => [...current, createExpense(input)]);
      },
      addDriverPay(driverName: string, amount: number, notes: string) {
        setExpenses((current) => [
          ...current,
          createExpense({
            date: new Date().toISOString().slice(0, 10),
            label: `Driver pay - ${driverName}`,
            amount,
            notes
          })
        ]);
      },
      markDriverRoutePaid(jobId: string, routeType: "delivery" | "pickup", amount: number, notes: string) {
        const targetJob = jobs.find((job) => job.id === jobId);
        if (!targetJob) {
          return;
        }
        const driverName = routeType === "delivery" ? targetJob.deliveryDriverName : targetJob.pickupDriverName;
        if (!driverName) {
          return;
        }

        const paidAt = new Date().toISOString().slice(0, 10);
        setJobs((current) =>
          current.map((job) => {
            if (job.id !== jobId) {
              return job;
            }
            return routeType === "delivery"
              ? {
                  ...job,
                  deliveryDriverPaidAt: paidAt,
                  deliveryDriverPayAmount: amount,
                  deliveryDriverPayNotes: notes.trim()
                }
              : {
                  ...job,
                  pickupDriverPaidAt: paidAt,
                  pickupDriverPayAmount: amount,
                  pickupDriverPayNotes: notes.trim()
                };
          })
        );
        setExpenses((current) => [
          ...current,
          createExpense({
            date: paidAt,
            label: `Driver route pay - ${driverName}`,
            amount,
            notes: `${routeType === "delivery" ? "Delivery" : "Pickup"} route for ${targetJob.customerName}${notes.trim() ? `: ${notes.trim()}` : ""}`
          })
        ]);
      },
      addDriverCashHandoff(driverId: string, driverName: string, amount: number, notes: string) {
        setDriverCashHandoffs((current) => [...current, createDriverCashHandoff(driverId, driverName, amount, notes)]);
      },
      deleteExpense(expenseId: string) {
        setExpenses((current) => current.filter((expense) => expense.id !== expenseId));
      },
      deleteDumpster(dumpsterId: string) {
        const hasActiveJob = jobs.some((job) => job.dumpsterId === dumpsterId && job.status !== "Picked Up / Completed");
        if (hasActiveJob) {
          return false;
        }

        setDumpsters((current) => current.filter((dumpster) => dumpster.id !== dumpsterId));
        return true;
      },
      takeDumpsterOutOfService(dumpsterId: string) {
        setDumpsters((current) =>
          current.map((dumpster) => (dumpster.id === dumpsterId && dumpster.status === "Available" ? { ...dumpster, status: "Out of Service" } : dumpster))
        );
      },
      putDumpsterInService(dumpsterId: string) {
        setDumpsters((current) =>
          current.map((dumpster) => (dumpster.id === dumpsterId && dumpster.status === "Out of Service" ? { ...dumpster, status: "Available" } : dumpster))
        );
      },
      completeDelivery(
        jobId: string,
        driverName?: string,
        completedAt?: string,
        notes?: string,
        cashCollected?: number,
        driverId?: string,
        truckType?: TruckType,
        companyMiles?: number
      ) {
        const deliveredJob = jobs.find((job) => job.id === jobId);
        setJobs((current) => current.map((job) => {
          if (job.id !== jobId) {
            return job;
          }
          const payments = cashCollected && cashCollected > 0
            ? [
                ...(job.payments ?? []),
                createPayment(cashCollected, notes?.trim() || "Driver cash collected at drop-off", {
                  method: "Cash",
                  driverId,
                  driverName,
                  collectedDuring: "delivery"
                })
              ]
            : job.payments;
          const next = {
            ...job,
            status: "Delivered" as const,
            deliveryTruckType: truckType,
            deliveryCompletedAt: completedAt,
            deliveryCompletionNotes: notes?.trim(),
            estimatedOneWayMiles: truckType === "Company Truck" ? companyMiles : job.estimatedOneWayMiles,
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
        if (deliveredJob) {
          setNotifications((current) => [
            {
              id: makeId("note"),
              createdAt: new Date().toISOString(),
              title: `${driverName || deliveredJob.deliveryDriverName || "Driver"} dropped off dumpster ${deliveredJob.dumpsterNumber ?? "Unassigned"}`,
              detail: `${notes?.trim() || "No driver notes entered."}${truckType ? ` ${truckType}.` : ""}${truckType === "Company Truck" && companyMiles !== undefined ? ` Business miles: ${companyMiles}.` : ""}${cashCollected && cashCollected > 0 ? ` Cash collected: $${cashCollected}.` : ""}`
            },
            ...current
          ]);
        }
      },
      completePickup(
        jobId: string,
        driverName?: string,
        completedAt?: string,
        notes?: string,
        cashCollected?: number,
        driverId?: string,
        truckType?: TruckType,
        companyMiles?: number
      ) {
        const pickupJob = jobs.find((job) => job.id === jobId);
        const destination = pickupJob?.pickupDestinationAddress?.trim() || "KP yard";
        setJobs((current) =>
          current.map((job) => {
            if (job.id !== jobId) {
              return job;
            }
            const payments = cashCollected && cashCollected > 0
              ? [
                  ...(job.payments ?? []),
                  createPayment(cashCollected, notes?.trim() || "Driver cash collected at pickup", {
                    method: "Cash",
                    driverId,
                    driverName,
                    collectedDuring: "pickup"
                  })
                ]
              : job.payments;
            const next = {
                  ...job,
                  status: "Picked Up / Completed" as const,
                  actualPickupDate: new Date().toISOString().slice(0, 10),
                  pickupDestinationAddress: destination,
                  pickupTruckType: truckType,
                  pickupCompletedAt: completedAt,
                  pickupCompletionNotes: notes?.trim(),
                  pickupOneWayMiles: truckType === "Company Truck" ? companyMiles : job.pickupOneWayMiles,
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
            dumpster.currentJobId === jobId
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
        if (pickupJob) {
          setNotifications((current) => [
            {
              id: makeId("note"),
              createdAt: new Date().toISOString(),
              title: `${driverName || pickupJob.pickupDriverName || "Driver"} picked up dumpster ${pickupJob.dumpsterNumber ?? "Unassigned"}`,
              detail: `${notes?.trim() || "No driver notes entered."}${truckType ? ` ${truckType}.` : ""}${truckType === "Company Truck" && companyMiles !== undefined ? ` Business miles: ${companyMiles}.` : ""}${cashCollected && cashCollected > 0 ? ` Cash collected: $${cashCollected}.` : ""}`
            },
            ...current
          ]);
        }
      },
      clearAll() {
        setDumpsters([]);
        setJobs([]);
        setExpenses([]);
        setDriverCashHandoffs([]);
        setNotifications([]);
      }
    }),
    [driverCashHandoffs, dumpsters, expenses, jobs, loaded, notifications]
  );
}
