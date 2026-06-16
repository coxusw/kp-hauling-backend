import { supabase } from "@/lib/supabase/client";
import type { DriverCashHandoff, Dumpster, Expense, JobCharge, JobPayment, OwnerNotification, RentalJob } from "@/lib/types";

function cleanTime(value?: string | null) {
  return value ? value.slice(0, 5) : undefined;
}

function nullable<T>(value: T | undefined) {
  return value === undefined ? null : value;
}

type JobRow = Record<string, any>;
type DumpsterRow = Record<string, any>;
type ChargeRow = Record<string, any>;
type PaymentRow = Record<string, any>;
type ExpenseRow = Record<string, any>;
type HandoffRow = Record<string, any>;
type NotificationRow = Record<string, any>;

export function useSupabaseOperations() {
  return Boolean(supabase);
}

export function mapDumpster(row: DumpsterRow): Dumpster {
  return {
    id: row.id,
    number: row.number,
    size: row.size,
    type: row.type,
    status: row.status,
    currentLocation: row.current_location ?? "KP yard",
    currentAddress: row.current_address ?? "",
    currentCustomer: row.current_customer ?? undefined,
    currentJobId: row.current_job_id ?? undefined,
    notes: row.notes ?? ""
  };
}

export function dumpsterToRow(input: Partial<Dumpster>) {
  return {
    number: input.number,
    size: input.size,
    type: input.type,
    status: input.status,
    current_location: input.currentLocation,
    current_address: input.currentAddress,
    current_customer: nullable(input.currentCustomer),
    current_job_id: nullable(input.currentJobId),
    notes: input.notes
  };
}

function mapCharge(row: ChargeRow): JobCharge {
  return {
    id: row.id,
    label: row.label,
    amount: Number(row.amount ?? 0),
    date: row.charge_date
  };
}

function mapPayment(row: PaymentRow): JobPayment {
  return {
    id: row.id,
    amount: Number(row.amount ?? 0),
    date: row.payment_date,
    note: row.note ?? "",
    method: row.method ?? undefined,
    driverId: row.driver_id ?? undefined,
    driverName: row.driver_name ?? undefined,
    collectedDuring: row.collected_during ?? undefined
  };
}

function mapJob(row: JobRow, charges: JobCharge[], payments: JobPayment[]): RentalJob {
  return {
    id: row.id,
    jobNumber: Number(row.job_number ?? 0),
    customerName: row.customer_name,
    phone: row.phone ?? "",
    email: row.email ?? "",
    jobAddress: row.job_address,
    dumpsterId: row.dumpster_id ?? undefined,
    dumpsterNumber: row.dumpster_number ?? undefined,
    dumpsterSize: row.dumpster_size,
    deliveryDriverId: row.delivery_driver_id ?? undefined,
    deliveryDriverName: row.delivery_driver_name ?? undefined,
    deliveryDispatchDate: row.delivery_dispatch_date ?? undefined,
    deliveryDispatchNotes: row.delivery_dispatch_notes ?? undefined,
    deliveryTruckType: row.delivery_truck_type ?? undefined,
    deliveryCompletedAt: cleanTime(row.delivery_completed_at),
    deliveryCompletionNotes: row.delivery_completion_notes ?? undefined,
    deliveryDriverPaidAt: row.delivery_driver_paid_at ?? undefined,
    deliveryDriverPayAmount: row.delivery_driver_pay_amount === null ? undefined : Number(row.delivery_driver_pay_amount),
    deliveryDriverPayNotes: row.delivery_driver_pay_notes ?? undefined,
    pickupDriverId: row.pickup_driver_id ?? undefined,
    pickupDriverName: row.pickup_driver_name ?? undefined,
    pickupDispatchDate: row.pickup_dispatch_date ?? undefined,
    pickupDispatchNotes: row.pickup_dispatch_notes ?? undefined,
    pickupTruckType: row.pickup_truck_type ?? undefined,
    pickupCompletedAt: cleanTime(row.pickup_completed_at),
    pickupCompletionNotes: row.pickup_completion_notes ?? undefined,
    pickupDriverPaidAt: row.pickup_driver_paid_at ?? undefined,
    pickupDriverPayAmount: row.pickup_driver_pay_amount === null ? undefined : Number(row.pickup_driver_pay_amount),
    pickupDriverPayNotes: row.pickup_driver_pay_notes ?? undefined,
    startingDumpsterAddress: row.starting_dumpster_address ?? undefined,
    estimatedOneWayMiles: row.estimated_one_way_miles === null ? undefined : Number(row.estimated_one_way_miles),
    deliveryReturnMiles: row.delivery_return_miles === null ? undefined : Number(row.delivery_return_miles),
    pickupDestinationAddress: row.pickup_destination_address ?? "KP yard",
    pickupOneWayMiles: row.pickup_one_way_miles === null ? undefined : Number(row.pickup_one_way_miles),
    pickupReturnMiles: row.pickup_return_miles === null ? undefined : Number(row.pickup_return_miles),
    dropOffDate: row.drop_off_date,
    dropOffTime: cleanTime(row.drop_off_time),
    rentalLengthDays: Number(row.rental_length_days ?? 7),
    expectedPickupDate: row.expected_pickup_date,
    expectedPickupTime: cleanTime(row.expected_pickup_time),
    actualPickupDate: row.actual_pickup_date ?? undefined,
    price: Number(row.price ?? 0),
    charges,
    payments,
    paymentStatus: row.payment_status,
    status: row.status,
    jobNotes: row.job_notes ?? ""
  };
}

export function jobToRow(input: Partial<RentalJob>) {
  return {
    customer_name: input.customerName,
    phone: input.phone,
    email: input.email,
    job_address: input.jobAddress,
    dumpster_id: nullable(input.dumpsterId),
    dumpster_number: nullable(input.dumpsterNumber),
    dumpster_size: input.dumpsterSize,
    delivery_driver_id: nullable(input.deliveryDriverId),
    delivery_driver_name: nullable(input.deliveryDriverName),
    delivery_dispatch_date: nullable(input.deliveryDispatchDate),
    delivery_dispatch_notes: nullable(input.deliveryDispatchNotes),
    delivery_truck_type: nullable(input.deliveryTruckType),
    delivery_completed_at: nullable(input.deliveryCompletedAt),
    delivery_completion_notes: nullable(input.deliveryCompletionNotes),
    delivery_driver_paid_at: nullable(input.deliveryDriverPaidAt),
    delivery_driver_pay_amount: nullable(input.deliveryDriverPayAmount),
    delivery_driver_pay_notes: nullable(input.deliveryDriverPayNotes),
    pickup_driver_id: nullable(input.pickupDriverId),
    pickup_driver_name: nullable(input.pickupDriverName),
    pickup_dispatch_date: nullable(input.pickupDispatchDate),
    pickup_dispatch_notes: nullable(input.pickupDispatchNotes),
    pickup_truck_type: nullable(input.pickupTruckType),
    pickup_completed_at: nullable(input.pickupCompletedAt),
    pickup_completion_notes: nullable(input.pickupCompletionNotes),
    pickup_driver_paid_at: nullable(input.pickupDriverPaidAt),
    pickup_driver_pay_amount: nullable(input.pickupDriverPayAmount),
    pickup_driver_pay_notes: nullable(input.pickupDriverPayNotes),
    starting_dumpster_address: nullable(input.startingDumpsterAddress),
    estimated_one_way_miles: nullable(input.estimatedOneWayMiles),
    delivery_return_miles: nullable(input.deliveryReturnMiles),
    pickup_destination_address: nullable(input.pickupDestinationAddress),
    pickup_one_way_miles: nullable(input.pickupOneWayMiles),
    pickup_return_miles: nullable(input.pickupReturnMiles),
    drop_off_date: input.dropOffDate,
    drop_off_time: nullable(input.dropOffTime),
    rental_length_days: input.rentalLengthDays,
    expected_pickup_date: input.expectedPickupDate,
    expected_pickup_time: nullable(input.expectedPickupTime),
    actual_pickup_date: nullable(input.actualPickupDate),
    price: input.price,
    payment_status: input.paymentStatus,
    status: input.status,
    job_notes: input.jobNotes
  };
}

export function compactRow<T extends Record<string, any>>(row: T) {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
}

export async function loadSupabaseOperations() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const [
    dumpstersResult,
    jobsResult,
    chargesResult,
    paymentsResult,
    expensesResult,
    handoffsResult,
    notificationsResult
  ] = await Promise.all([
    supabase.from("kp_hauling_dumpsters").select("*").order("number"),
    supabase.from("kp_hauling_jobs").select("*").order("job_number", { ascending: false }),
    supabase.from("kp_hauling_job_charges").select("*").order("charge_date"),
    supabase.from("kp_hauling_job_payments").select("*").order("payment_date"),
    supabase.from("kp_hauling_expenses").select("*").order("expense_date", { ascending: false }),
    supabase.from("kp_hauling_driver_cash_handoffs").select("*").order("handoff_date", { ascending: false }),
    supabase.from("kp_hauling_owner_notifications").select("*").order("created_at", { ascending: false })
  ]);

  if (dumpstersResult.error) throw dumpstersResult.error;
  if (jobsResult.error) throw jobsResult.error;
  if (chargesResult.error) throw chargesResult.error;
  if (paymentsResult.error) throw paymentsResult.error;

  const chargesByJob = new Map<string, JobCharge[]>();
  (chargesResult.data as ChargeRow[] | null ?? []).forEach((row) => {
    const current = chargesByJob.get(row.job_id) ?? [];
    current.push(mapCharge(row));
    chargesByJob.set(row.job_id, current);
  });

  const paymentsByJob = new Map<string, JobPayment[]>();
  (paymentsResult.data as PaymentRow[] | null ?? []).forEach((row) => {
    const current = paymentsByJob.get(row.job_id) ?? [];
    current.push(mapPayment(row));
    paymentsByJob.set(row.job_id, current);
  });

  return {
    dumpsters: (dumpstersResult.data as DumpsterRow[] | null ?? []).map(mapDumpster),
    jobs: (jobsResult.data as JobRow[] | null ?? []).map((row) => mapJob(row, chargesByJob.get(row.id) ?? [], paymentsByJob.get(row.id) ?? [])),
    expenses: expensesResult.error ? [] : (expensesResult.data as ExpenseRow[] | null ?? []).map((row) => ({
      id: row.id,
      date: row.expense_date,
      label: row.label,
      amount: Number(row.amount ?? 0),
      notes: row.notes ?? ""
    } satisfies Expense)),
    driverCashHandoffs: handoffsResult.error ? [] : (handoffsResult.data as HandoffRow[] | null ?? []).map((row) => ({
      id: row.id,
      date: row.handoff_date,
      driverId: row.driver_id ?? "",
      driverName: row.driver_name,
      amount: Number(row.amount ?? 0),
      notes: row.notes ?? ""
    } satisfies DriverCashHandoff)),
    notifications: notificationsResult.error ? [] : (notificationsResult.data as NotificationRow[] | null ?? []).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      title: row.title,
      detail: row.detail,
      read: row.read
    } satisfies OwnerNotification))
  };
}
