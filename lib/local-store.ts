import type { Dumpster, DumpsterStatus, Expense, JobCharge, JobPayment, PaymentStatus, RentalJob } from "@/lib/types";

export const EMPTY_DUMPSTERS: Dumpster[] = [];
export const EMPTY_JOBS: RentalJob[] = [];

export const DUMPSTER_STORAGE_KEY = "kp-hauling-dumpsters";
export const JOB_STORAGE_KEY = "kp-hauling-jobs";
export const EXPENSE_STORAGE_KEY = "kp-hauling-expenses";

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

export function createJob(input: NewJobInput, dumpsters: Dumpster[]): RentalJob {
  const assignedDumpster = dumpsters.find((dumpster) => dumpster.id === input.dumpsterId);

  return {
    id: makeId("job"),
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

export function createPayment(amount: number, note: string): JobPayment {
  return {
    id: makeId("payment"),
    amount,
    note: note.trim(),
    date: new Date().toISOString().slice(0, 10)
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
