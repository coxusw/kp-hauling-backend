"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppUser, DriverAvailabilityStatus, DriverAvailabilityWindow, UserRole } from "@/lib/auth";
import { CURRENT_USER_STORAGE_KEY, defaultUsers, makeAvailabilityId, makeUserId, SESSION_ID_COOKIE, SESSION_ROLE_COOKIE, USERS_STORAGE_KEY } from "@/lib/auth";
import { isSupabaseConfigured, loadSupabaseUsers } from "@/lib/supabase/auth-db";
import { supabase } from "@/lib/supabase/client";

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
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  addUser: (input: NewUserInput) => Promise<{ ok: boolean; message?: string }>;
  removeUser: (userId: string) => Promise<{ ok: boolean; message?: string }>;
  addDriverAvailability: (userId: string, input: Pick<DriverAvailabilityWindow, "date" | "startTime" | "endTime" | "notes">) => Promise<{ ok: boolean; message?: string }>;
  removeDriverAvailability: (userId: string, availabilityId: string) => Promise<void>;
  updateDriverAvailability: (userId: string, status: DriverAvailabilityStatus, notes: string) => Promise<void>;
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
  const useSupabaseAuth = isSupabaseConfigured();

  async function reloadSupabaseUsers(nextCurrentUserId?: string) {
    if (!supabase) {
      return;
    }
    const nextUsers = await loadSupabaseUsers();
    setUsers(nextUsers.length > 0 ? nextUsers : defaultUsers);
    if (nextCurrentUserId !== undefined) {
      setCurrentUserId(nextCurrentUserId);
    }
  }

  useEffect(() => {
    if (useSupabaseAuth && supabase) {
      supabase.auth.getSession().then(async ({ data }) => {
        try {
          await reloadSupabaseUsers(data.session?.user.id);
        } finally {
          setLoaded(true);
        }
      });
      return;
    }

    const storedUsers = readStored<AppUser[]>(USERS_STORAGE_KEY, defaultUsers);
    setUsers(storedUsers.length > 0 ? storedUsers : defaultUsers);
    setCurrentUserId(window.localStorage.getItem(CURRENT_USER_STORAGE_KEY) ?? undefined);
    setLoaded(true);
  }, [useSupabaseAuth]);

  useEffect(() => {
    if (loaded && !useSupabaseAuth) {
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
  }, [loaded, useSupabaseAuth, users]);

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
      async login(email: string, password: string) {
        if (supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password
          });
          if (error || !data.user) {
            return false;
          }
          await reloadSupabaseUsers(data.user.id);
          return true;
        }

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
      async logout() {
        if (supabase) {
          await supabase.auth.signOut();
        }
        window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
        document.cookie = `${SESSION_ID_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
        document.cookie = `${SESSION_ROLE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
        setCurrentUserId(undefined);
      },
      async addUser(input: NewUserInput) {
        const email = input.email.trim().toLowerCase();
        if (!input.name.trim() || !email || !input.password.trim()) {
          return { ok: false, message: "Name, email, and password are required." };
        }
        if (users.some((user) => user.email.toLowerCase() === email)) {
          return { ok: false, message: "That login already exists." };
        }

        if (supabase) {
          const { data: sessionData } = await supabase.auth.getSession();
          const response = await fetch("/hauling/api/hauling-users", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionData.session?.access_token ?? ""}`
            },
            body: JSON.stringify({ ...input, email })
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            return { ok: false, message: result.message ?? "Unable to add login." };
          }
          await reloadSupabaseUsers(currentUserId);
          return { ok: true };
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
            availabilityWindows: [],
            availabilityUpdatedAt: new Date().toISOString()
          }
        ]);
        return { ok: true };
      },
      async removeUser(userId: string) {
        if (userId === currentUser?.id) {
          return { ok: false, message: "You cannot remove the login you are currently using." };
        }

        if (supabase) {
          const { data: sessionData } = await supabase.auth.getSession();
          const response = await fetch("/hauling/api/hauling-users", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionData.session?.access_token ?? ""}`
            },
            body: JSON.stringify({ userId })
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) {
            return { ok: false, message: result.message ?? "Unable to remove login." };
          }
          await reloadSupabaseUsers(currentUserId);
          return { ok: true };
        }

        setUsers((current) => current.filter((user) => user.id !== userId));
        return { ok: true };
      },
      async addDriverAvailability(userId, input) {
        if (!input.date || !input.startTime || !input.endTime) {
          return { ok: false, message: "Date, start time, and end time are required." };
        }
        if (input.startTime >= input.endTime) {
          return { ok: false, message: "End time must be after start time." };
        }

        if (supabase) {
          const { error } = await supabase.from("kp_hauling_driver_availability_windows").insert({
            driver_id: userId,
            available_date: input.date,
            start_time: input.startTime,
            end_time: input.endTime,
            notes: input.notes?.trim() || null
          });
          if (error) {
            return { ok: false, message: error.message };
          }
          await supabase.from("kp_hauling_profiles").update({
            availability_status: "Available",
            availability_updated_at: new Date().toISOString()
          }).eq("id", userId);
          const { data: sessionData } = await supabase.auth.getSession();
          await fetch("/hauling/api/push/notify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${sessionData.session?.access_token ?? ""}`
            },
            body: JSON.stringify({
              title: "Driver availability updated",
              detail: `${currentUser?.name ?? "A driver"} added availability for ${input.date}.`,
              audience: "admin",
              type: "availability"
            })
          }).catch(() => undefined);
          await reloadSupabaseUsers(currentUserId);
          return { ok: true };
        }

        setUsers((current) =>
          current.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  availabilityStatus: "Available",
                  availabilityUpdatedAt: new Date().toISOString(),
                  availabilityWindows: [
                    ...(user.availabilityWindows ?? []),
                    {
                      id: makeAvailabilityId(),
                      date: input.date,
                      startTime: input.startTime,
                      endTime: input.endTime,
                      notes: input.notes?.trim(),
                      updatedAt: new Date().toISOString()
                    }
                  ]
                }
              : user
          )
        );
        return { ok: true };
      },
      async removeDriverAvailability(userId, availabilityId) {
        if (supabase) {
          await supabase.from("kp_hauling_driver_availability_windows").delete().eq("id", availabilityId).eq("driver_id", userId);
          await supabase.from("kp_hauling_profiles").update({ availability_updated_at: new Date().toISOString() }).eq("id", userId);
          await reloadSupabaseUsers(currentUserId);
          return;
        }

        setUsers((current) =>
          current.map((user) =>
            user.id === userId
              ? {
                  ...user,
                  availabilityWindows: (user.availabilityWindows ?? []).filter((window) => window.id !== availabilityId),
                  availabilityUpdatedAt: new Date().toISOString()
                }
              : user
          )
        );
      },
      async updateDriverAvailability(userId: string, status: DriverAvailabilityStatus, notes: string) {
        if (supabase) {
          await supabase.from("kp_hauling_profiles").update({
            availability_status: status,
            availability_notes: notes.trim(),
            availability_updated_at: new Date().toISOString()
          }).eq("id", userId);
          await reloadSupabaseUsers(currentUserId);
          return;
        }

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
    [currentUser, currentUserId, loaded, users]
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
