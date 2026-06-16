import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

function serverClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function isLoggedIn(request: NextRequest, client: ReturnType<typeof serverClient>) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!client || !token) {
    return false;
  }

  const { data, error } = await client.auth.getUser(token);
  return !error && Boolean(data.user);
}

export async function POST(request: NextRequest) {
  const client = serverClient();
  if (!client || !publicKey || !privateKey) {
    return NextResponse.json({ message: "Push is not configured." }, { status: 500 });
  }
  if (!(await isLoggedIn(request, client))) {
    return NextResponse.json({ message: "Login required." }, { status: 401 });
  }

  const body = await request.json() as {
    title?: string;
    detail?: string;
    audience?: "admin" | "driver";
    userId?: string;
    type?: "dispatch" | "pickup_due" | "driver_updates" | "availability";
    url?: string;
  };

  let query = client
    .from("kp_hauling_push_subscriptions")
    .select("endpoint,p256dh,auth,notify_dispatch,notify_pickup_due,notify_driver_updates,notify_availability,kp_hauling_profiles!inner(role)");

  if (body.userId) {
    query = query.eq("user_id", body.userId);
  } else if (body.audience === "admin") {
    query = query.in("kp_hauling_profiles.role", ["owner", "admin"]);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  webpush.setVapidDetails("mailto:admin@kp.local", publicKey, privateKey);

  const type = body.type ?? "driver_updates";
  const rows = (data ?? []).filter((row: any) => {
    if (type === "dispatch") return row.notify_dispatch;
    if (type === "pickup_due") return row.notify_pickup_due;
    if (type === "availability") return row.notify_availability;
    return row.notify_driver_updates;
  });

  await Promise.allSettled(rows.map((row: any) =>
    webpush.sendNotification(
      {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth }
      },
      JSON.stringify({
        title: body.title ?? "KP Hauling",
        body: body.detail ?? "",
        url: body.url ?? "/hauling"
      })
    )
  ));

  return NextResponse.json({ ok: true, sent: rows.length });
}
