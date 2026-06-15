"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppUser, DriverAvailabilityStatus, UserRole } from "@/lib/auth";
import { CURRENT_USER_STORAGE_KEY, defaultUsers, makeUserId, SESSION_ID_COOKIE, SESSION_ROLE_COOKIE, USERS_STORAGE_KEY } from "@/lib/auth";

type NewUserInput = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
};

type AuthContextValue = {
  users: AppUser[];
  currentUser?: AppUser;
  loaded: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  addUser: (input: NewUserInput) => { ok: boolean; message?: string };
  removeUser: (userId: string) => { ok: boolean; message?: string };
  updateDriverAvailability: (userId: string, status: DriverAvailabilityStatus, notes: string) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(defaultUsers);
  const [currentUserId, setCurrentUserId] = useState<string>();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const storedUsers = readStored<AppUser[]>(USERS_STORAGE_KEY, defaultUsers);
    setUsers(storedUsers.length > 0 ? storedUsers : defaultUsers);
    setCurrentUserId(window.localStorage.getItem(CURRENT_USER_STORAGE_KEY) ?? undefined);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
  }, [loaded, users]);

  const currentUser = users.find((user) => user.id === currentUserId);

  useEffect(() => {
    if (!loaded) {
      return;
    }
    if (currentUser) {
      document.cookie = `${SESSION_ID_COOKIE}=${currentUser.id}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `${SESSION_ROLE_COOKIE}=${currentUser.role}; path=/; max-age=604800; SameSite=Lax`;
    }
  }, [currentUser, loaded]);

  const value = useMemo<AuthContextValue>(
    () => ({
      users,
      currentUser,
      loaded,
      login(email: string, password: string) {
        const match = users.find(
          (user) => user.email.trim().toLowerCase() === email.trim().toLowerCase() && user.password === password
        );
        if (!match) {
          return false;
        }
        window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, match.id);
        document.cookie = `${SESSION_ID_COOKIE}=${match.id}; path=/; max-age=604800; SameSite=Lax`;
        document.cookie = `${SESSION_ROLE_COOKIE}=${match.role}; path=/; max-age=604800; SameSite=Lax`;
        setCurrentUserId(match.id);
        return true;
      },
      logout() {
        window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
        document.cookie = `${SESSION_ID_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
        document.cookie = `${SESSION_ROLE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
        setCurrentUserId(undefined);
      },
      addUser(input: NewUserInput) {
        const email = input.email.trim().toLowerCase();
        if (!input.name.trim() || !email || !input.password.trim()) {
          return { ok: false, message: "Name, email, and password are required." };
        }
        if (users.some((user) => user.email.toLowerCase() === email)) {
          return { ok: false, message: "That login already exists." };
        }

        setUsers((current) => [
          ...current,
          {
            id: makeUserId(),
            name: input.name.trim(),
            email,
            password: input.password,
            role: input.role,
            phone: input.phone?.trim(),
            availabilityStatus: input.role === "driver" ? "Unavailable" : "Available",
            availabilityUpdatedAt: new Date().toISOString()
          }
        ]);
        return { ok: true };
      },
      removeUser(userId: string) {
        if (userId === currentUser?.id) {
          return { ok: false, message: "You cannot remove the login you are currently using." };
        }

        setUsers((current) => current.filter((user) => user.id !== userId));
        return { ok: true };
      },
      updateDriverAvailability(userId: string, status: DriverAvailabilityStatus, notes: string) {
        setUsers((current) =>
          current.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  availabilityStatus: status,
                  availabilityNotes: notes.trim(),
                  availabilityUpdatedAt: new Date().toISOString()
                }
              : user
          )
        );
      }
    }),
    [currentUser, loaded, users]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
