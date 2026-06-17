import type { DriverCashHandoff, DriverTimecardEntry, Dumpster, DumpsterStatus, Expense, JobCharge, JobPayment, PaymentStatus, RentalJob } from "@/lib/types";

export const EMPTY_DUMPSTERS: Dumpster[] = [];
export const EMPTY_JOBS: RentalJob[] = [];

export const DUMPSTER_STORAGE_KEY = "kp-hauling-dumpsters";
export const JOB_STORAGE_KEY = "kp-hauling-jobs";
export const EXPENSE_STORAGE_KEY = "kp-hauling-expenses";
export const DRIVER_CASH_HANDOFF_STORAGE_KEY = "kp-hauling-driver-cash-handoffs";
export const DRIVER_HOURLY_RATE_STORAGE_KEY = "kp-hauling-driver-hourly-rates";
export const DRIVER_TIMECARD_STORAGE_KEY = "kp-hauling-driver-timecards";

export type NewDumpsterInput = {
  number: string;
  size: Dumpster["size"];
  type: Dumpster["type"];
  status: DumpsterStatus;
  currentLocation: string;
  currentAddress: string;
  notes: string;
};

export type NewJobInput = {
  customerName: string;
  phone: string;
  email: string;
  jobAddress: string;
  dumpsterId: string;
  dumpsterSize: Dumpster["size"];
  startingDumpsterAddress?: string;
  estimatedOneWayMiles?: number;
  dropOffDate: string;
  dropOffTime: string;
  rentalLengthDays: number;
  expectedPickupDate: string;
  expectedPickupTime: string;
  price: number;
  paymentStatus: PaymentStatus;
  jobNotes: string;
};

export type NewExpenseInput = {
  date: string;
  label: string;
  amount: number;
  notes: string;
};

export type NewDriverTimecardInput = {
  workDate: string;
  startTime: string;
  endTime: string;
  note: string;
};

export function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDumpster(input: NewDumpsterInput): Dumpster {
  return {
    id: makeId("dump"),
    number: input.number.trim(),
    size: input.size,
    type: input.type,
    status: input.status,
    currentLocation: input.currentLocation.trim() || "KP yard",
    currentAddress: input.currentAddress.trim(),
    notes: input.notes.trim()
  };
}

export function createJob(input: NewJobInput, dumpsters: Dumpster[], existingJobs: RentalJob[] = []): RentalJob {
  const assignedDumpster = dumpsters.find((dumpster) => dumpster.id === input.dumpsterId);
  const nextJobNumber = Math.max(0, ...existingJobs.map((job) => job.jobNumber ?? 0)) + 1;

  return {
    id: makeId("job"),
    jobNumber: nextJobNumber,
    customerName: input.customerName.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    jobAddress: input.jobAddress.trim(),
    dumpsterId: assignedDumpster?.id,
    dumpsterNumber: assignedDumpster?.number,
    dumpsterSize: assignedDumpster?.size ?? input.dumpsterSize,
    startingDumpsterAddress: input.startingDumpsterAddress ?? assignedDumpster?.currentAddress,
    estimatedOneWayMiles: input.estimatedOneWayMiles,
    dropOffDate: input.dropOffDate,
    dropOffTime: input.dropOffTime,
    rentalLengthDays: input.rentalLengthDays,
    expectedPickupDate: input.expectedPickupDate,
    expectedPickupTime: input.expectedPickupTime,
    price: input.price,
    charges: [],
    payments: [],
    paymentStatus: input.paymentStatus,
    status: "Scheduled Drop-Off",
    jobNotes: input.jobNotes.trim()
  };
}

export function createCharge(label: string, amount: number): JobCharge {
  return {
    id: makeId("charge"),
    label: label.trim() || "Additional charge",
    amount,
    date: new Date().toISOString().slice(0, 10)
  };
}

export function createPayment(amount: number, note: string, extra?: Partial<JobPayment>): JobPayment {
  return {
    id: makeId("payment"),
    amount,
    note: note.trim(),
    date: new Date().toISOString().slice(0, 10),
    ...extra
  };
}

export function createExpense(input: NewExpenseInput): Expense {
  return {
    id: makeId("expense"),
    date: input.date,
    label: input.label.trim() || "Expense",
    amount: input.amount,
    notes: input.notes.trim()
  };
}

export function createDriverCashHandoff(driverId: string, driverName: string, amount: number, notes: string): DriverCashHandoff {
  return {
    id: makeId("cash-handoff"),
    date: new Date().toISOString().slice(0, 10),
    driverId,
    driverName,
    amount,
    notes: notes.trim()
  };
}

export function createDriverTimecardEntry(driverId: string, driverName: string, input: NewDriverTimecardInput): DriverTimecardEntry {
  return {
    id: makeId("timecard"),
    driverId,
    driverName,
    workDate: input.workDate,
    startTime: input.startTime,
    endTime: input.endTime,
    note: input.note.trim(),
    createdAt: new Date().toISOString()
  };
}
