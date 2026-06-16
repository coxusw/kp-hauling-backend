export type UserRole = "owner" | "admin" | "driver";

export type DriverAvailabilityStatus = "Available" | "Unavailable" | "On Call";

export type DriverAvailabilityWindow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
  updatedAt: string;
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  phone?: string;
  availabilityStatus?: DriverAvailabilityStatus;
  availabilityNotes?: string;
  availabilityUpdatedAt?: string;
  availabilityWindows?: DriverAvailabilityWindow[];
};

export const USERS_STORAGE_KEY = "kp-hauling-users";
export const CURRENT_USER_STORAGE_KEY = "kp-hauling-current-user";
export const SESSION_ID_COOKIE = "kp_hauling_session_id";
export const SESSION_ROLE_COOKIE = "kp_hauling_session_role";

export const defaultUsers: AppUser[] = [
  {
    id: "owner-demo",
    name: "KP Owner",
    email: "admin@kp.local",
    password: "admin123",
    role: "owner",
    availabilityStatus: "Available"
  }
];

export function canManageOperations(role: UserRole) {
  return role === "owner" || role === "admin";
}

export function canManageUsers(role: UserRole) {
  return role === "owner" || role === "admin";
}

export function makeUserId() {
  return `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeAvailabilityId() {
  return `avail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getDriverWindowsForDate(driver: AppUser, date: string) {
  return (driver.availabilityWindows ?? [])
    .filter((window) => window.date === date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function isDriverAvailableOnDate(driver: AppUser, date: string) {
  return driver.role === "driver" && getDriverWindowsForDate(driver, date).length > 0;
}
