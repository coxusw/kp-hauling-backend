import { supabase } from "@/lib/supabase/client";
import type { AppUser, DriverAvailabilityWindow, UserRole } from "@/lib/auth";

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string | null;
  availability_status: AppUser["availabilityStatus"];
  availability_notes: string | null;
  availability_updated_at: string | null;
};

type AvailabilityRow = {
  id: string;
  driver_id: string;
  available_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  updated_at: string;
};

function cleanTime(value: string) {
  return value.slice(0, 5);
}

function mapAvailability(row: AvailabilityRow): DriverAvailabilityWindow {
  return {
    id: row.id,
    date: row.available_date,
    startTime: cleanTime(row.start_time),
    endTime: cleanTime(row.end_time),
    notes: row.notes ?? undefined,
    updatedAt: row.updated_at
  };
}

export function isSupabaseConfigured() {
  return Boolean(supabase);
}

export async function loadSupabaseUsers(): Promise<AppUser[]> {
  if (!supabase) {
    return [];
  }

  const [{ data: profiles, error: profileError }, { data: windows, error: windowError }] = await Promise.all([
    supabase.from("kp_hauling_profiles").select("*").order("role").order("name"),
    supabase.from("kp_hauling_driver_availability_windows").select("*").order("available_date").order("start_time")
  ]);

  if (profileError) {
    throw profileError;
  }
  if (windowError) {
    throw windowError;
  }

  const windowsByDriver = new Map<string, DriverAvailabilityWindow[]>();
  (windows as AvailabilityRow[] | null ?? []).forEach((window) => {
    const existing = windowsByDriver.get(window.driver_id) ?? [];
    existing.push(mapAvailability(window));
    windowsByDriver.set(window.driver_id, existing);
  });

  return (profiles as ProfileRow[] | null ?? []).map((profile) => ({
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    phone: profile.phone ?? undefined,
    availabilityStatus: profile.availability_status,
    availabilityNotes: profile.availability_notes ?? undefined,
    availabilityUpdatedAt: profile.availability_updated_at ?? undefined,
    availabilityWindows: windowsByDriver.get(profile.id) ?? []
  }));
}

export async function getSupabaseCurrentUser() {
  if (!supabase) {
    return undefined;
  }

  const { data } = await supabase.auth.getUser();
  return data.user ?? undefined;
}
