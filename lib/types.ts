export type DumpsterStatus =
  | "Available"
  | "Scheduled Drop-Off"
  | "Delivered"
  | "Pickup Needed"
  | "Overdue"
  | "In Transit"
  | "Out of Service";

export type JobStatus =
  | "Scheduled Drop-Off"
  | "Delivered"
  | "Pickup Needed"
  | "Overdue"
  | "Picked Up / Completed";

export type PaymentStatus = "Unpaid" | "Deposit Paid" | "Paid" | "Invoice Sent" | "Past Due";

export type DumpsterSize = "10 yd" | "15 yd" | "20 yd" | "30 yd";

export type JobCharge = {
  id: string;
  label: string;
  amount: number;
  date: string;
};

export type JobPayment = {
  id: string;
  amount: number;
  date: string;
  note: string;
};

export type Expense = {
  id: string;
  date: string;
  label: string;
  amount: number;
  notes: string;
};

export type Dumpster = {
  id: string;
  number: string;
  size: DumpsterSize;
  type: "Roll-off" | "Concrete" | "Yard Waste" | "Mixed Debris";
  status: DumpsterStatus;
  currentLocation: string;
  currentAddress: string;
  currentCustomer?: string;
  currentJobId?: string;
  notes: string;
};

export type RentalJob = {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  jobAddress: string;
  dumpsterId?: string;
  dumpsterNumber?: string;
  dumpsterSize: DumpsterSize;
  deliveryDriverId?: string;
  deliveryDriverName?: string;
  deliveryDispatchDate?: string;
  deliveryDispatchNotes?: string;
  deliveryCompletedAt?: string;
  deliveryCompletionNotes?: string;
  pickupDriverId?: string;
  pickupDriverName?: string;
  pickupDispatchDate?: string;
  pickupDispatchNotes?: string;
  pickupCompletedAt?: string;
  pickupCompletionNotes?: string;
  startingDumpsterAddress?: string;
  estimatedOneWayMiles?: number;
  pickupDestinationAddress?: string;
  pickupOneWayMiles?: number;
  dropOffDate: string;
  dropOffTime?: string;
  rentalLengthDays: number;
  expectedPickupDate: string;
  expectedPickupTime?: string;
  actualPickupDate?: string;
  price: number;
  charges?: JobCharge[];
  payments?: JobPayment[];
  paymentStatus: PaymentStatus;
  status: JobStatus;
  jobNotes: string;
  routeNotes?: string;
};

export type AlertSeverity = "info" | "warning" | "danger";

export type DashboardAlert = {
  id: string;
  title: string;
  detail: string;
  severity: AlertSeverity;
};

export type OwnerNotification = {
  id: string;
  createdAt: string;
  title: string;
  detail: string;
  read?: boolean;
};
