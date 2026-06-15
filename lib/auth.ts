export type UserRole = "owner" | "admin" | "driver";

export type DriverAvailabilityStatus = "Available" | "Unavailable" | "On Call";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  availabilityStatus?: DriverAvailabilityStatus;
  availabilityNotes?: string;
  availabilityUpdatedAt?: string;
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
