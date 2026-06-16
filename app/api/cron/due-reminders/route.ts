import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

type SubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  daily_reminder_time: string | null;
  reminder_timezone: string | null;
  kp_hauling_profiles: { name: string; role: "owner" | "admin" | "driver" } | Array<{ name: string; role: "owner" | "admin" | "driver" }>;
};

type JobRow = {
  id: string;
  job_number: number;
  customer_name: string;
  job_address: string;
  dumpster_number: string | null;
  dumpster_size: string;
  drop_off_date: string;
  drop_off_time: string | null;
  expected_pickup_date: string;
  expected_pickup_time: string | null;
  actual_pickup_date: string | null;
  status: string;
  delivery_driver_id: string | null;
  pickup_driver_id: string | null;
};

function serverClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

function getZonedDateAndTime(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = values.hour === "24" ? "00" : values.hour;

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(hour) * 60 + Number(values.minute)
  };
}

function timeToMinutes(time?: string | null) {
  const [hour = "7", minute = "0"] = (time ?? "07:00").slice(0, 5).split(":");
  return Number(hour) * 60 + Number(minute);
}

function isReminderWindow(currentMinutes: number, reminderMinutes: number) {
  const diff = currentMinutes - reminderMinutes;
  return diff >= 0 && diff < 15;
}

function profileFromSubscription(row: SubscriptionRow) {
  return Array.isArray(row.kp_hauling_profiles) ? row.kp_hauling_profiles[0] : row.kp_hauling_profiles;
}

function formatTime(time?: string | null) {
  if (!time) return "";
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function summarizeJobs(deliveries: JobRow[], pickups: JobRow[], overdue: JobRow[]) {
  const bits = [
    deliveries.length ? `${deliveries.length} drop-off${deliveries.length === 1 ? "" : "s"}` : "",
    pickups.length ? `${pickups.length} pickup${pickups.length === 1 ? "" : "s"}` : "",
    overdue.length ? `${overdue.length} overdue` : ""
  ].filter(Boolean);

  const firstJob = deliveries[0] ?? pickups[0] ?? overdue[0];
  const firstTime = firstJob?.drop_off_date === firstJob?.expected_pickup_date
    ? formatTime(firstJob.drop_off_time ?? firstJob.expected_pickup_time)
    : formatTime(deliveries[0]?.drop_off_time ?? pickups[0]?.expected_pickup_time ?? overdue[0]?.expected_pickup_time);
  const firstLine = firstJob ? `First: Job #${firstJob.job_number} ${firstJob.customer_name}${firstTime ? ` at ${firstTime}` : ""}.` : "";

  return `${bits.join(", ")} due today. ${firstLine}`.trim();
}

function filterJobsForSubscription(row: SubscriptionRow, jobs: JobRow[], today: string) {
  const profile = profileFromSubscription(row);
  const isAdmin = profile?.role === "owner" || profile?.role === "admin";
  const visibleJobs = isAdmin
    ? jobs
    : jobs.filter((job) => job.delivery_driver_id === row.user_id || job.pickup_driver_id === row.user_id);

  return {
    deliveries: visibleJobs.filter((job) =>
      job.status === "Scheduled Drop-Off" &&
      job.drop_off_date === today &&
      (isAdmin || job.delivery_driver_id === row.user_id)
    ),
    pickups: visibleJobs.filter((job) =>
      job.status !== "Picked Up / Completed" &&
      !job.actual_pickup_date &&
      job.expected_pickup_date === today &&
      (isAdmin || job.pickup_driver_id === row.user_id)
    ),
    overdue: visibleJobs.filter((job) =>
      job.status !== "Picked Up / Completed" &&
      !job.actual_pickup_date &&
      job.expected_pickup_date < today &&
      (isAdmin || job.pickup_driver_id === row.user_id)
    )
  };
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const client = serverClient();
  if (!client || !publicKey || !privateKey) {
    return NextResponse.json({ message: "Cron reminders are not configured." }, { status: 500 });
  }

  const { data: subscriptions, error: subscriptionsError } = await client
    .from("kp_hauling_push_subscriptions")
    .select("id,user_id,endpoint,p256dh,auth,daily_reminder_time,reminder_timezone,kp_hauling_profiles!inner(name,role)")
    .eq("notify_pickup_due", true);

  if (subscriptionsError) {
    return NextResponse.json({ message: subscriptionsError.message }, { status: 400 });
  }

  const { data: jobs, error: jobsError } = await client
    .from("kp_hauling_jobs")
    .select("id,job_number,customer_name,job_address,dumpster_number,dumpster_size,drop_off_date,drop_off_time,expected_pickup_date,expected_pickup_time,actual_pickup_date,status,delivery_driver_id,pickup_driver_id")
    .neq("status", "Picked Up / Completed");

  if (jobsError) {
    return NextResponse.json({ message: jobsError.message }, { status: 400 });
  }

  webpush.setVapidDetails("mailto:admin@kp.local", publicKey, privateKey);

  let checked = 0;
  let sent = 0;
  let skipped = 0;

  for (const row of (subscriptions ?? []) as SubscriptionRow[]) {
    const timeZone = row.reminder_timezone ?? "America/Chicago";
    const { date: today, minutes: currentMinutes } = getZonedDateAndTime(timeZone);
    const reminderMinutes = timeToMinutes(row.daily_reminder_time);

    if (!isReminderWindow(currentMinutes, reminderMinutes)) {
      skipped += 1;
      continue;
    }

    checked += 1;

    const { data: existing } = await client
      .from("kp_hauling_due_reminder_sends")
      .select("id")
      .eq("subscription_id", row.id)
      .eq("reminder_date", today)
      .maybeSingle();

    if (existing) {
      skipped += 1;
      continue;
    }

    const due = filterJobsForSubscription(row, (jobs ?? []) as JobRow[], today);
    const dueCount = due.deliveries.length + due.pickups.length + due.overdue.length;
    if (dueCount === 0) {
      skipped += 1;
      continue;
    }

    const result = await webpush.sendNotification(
      {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth }
      },
      JSON.stringify({
        title: "KP Hauling due work",
        body: summarizeJobs(due.deliveries, due.pickups, due.overdue),
        url: "/hauling/dispatch"
      })
    ).then(() => ({ ok: true })).catch(async (error) => {
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await client.from("kp_hauling_push_subscriptions").delete().eq("id", row.id);
      }
      return { ok: false };
    });

    if (result.ok) {
      await client.from("kp_hauling_due_reminder_sends").insert({
        subscription_id: row.id,
        user_id: row.user_id,
        reminder_date: today
      });
      sent += 1;
    }
  }

  return NextResponse.json({ ok: true, checked, sent, skipped });
}
