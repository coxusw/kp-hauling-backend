import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function serverClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function getUserId(request: NextRequest) {
  const client = serverClient();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!client || !token) {
    return { client, userId: null };
  }

  const { data, error } = await client.auth.getUser(token);
  return { client, userId: error ? null : data.user?.id ?? null };
}

export async function GET(request: NextRequest) {
  const { client, userId } = await getUserId(request);
  if (!client || !userId) {
    return NextResponse.json({ message: "Login required." }, { status: 401 });
  }

  const { data } = await client
    .from("kp_hauling_push_subscriptions")
    .select("notify_dispatch,notify_pickup_due,notify_driver_updates,notify_availability")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    preferences: data ?? {
      notify_dispatch: true,
      notify_pickup_due: true,
      notify_driver_updates: true,
      notify_availability: true
    }
  });
}

export async function POST(request: NextRequest) {
  const { client, userId } = await getUserId(request);
  if (!client || !userId) {
    return NextResponse.json({ message: "Login required." }, { status: 401 });
  }

  const body = await request.json();
  const subscription = body.subscription;
  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return NextResponse.json({ message: "Subscription is required." }, { status: 400 });
  }

  const { error } = await client.from("kp_hauling_push_subscriptions").upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    user_agent: request.headers.get("user-agent") ?? "",
    notify_dispatch: body.preferences?.notify_dispatch ?? true,
    notify_pickup_due: body.preferences?.notify_pickup_due ?? true,
    notify_driver_updates: body.preferences?.notify_driver_updates ?? true,
    notify_availability: body.preferences?.notify_availability ?? true,
    updated_at: new Date().toISOString()
  }, { onConflict: "endpoint" });

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest) {
  const { client, userId } = await getUserId(request);
  if (!client || !userId) {
    return NextResponse.json({ message: "Login required." }, { status: 401 });
  }

  const preferences = await request.json();
  const { error } = await client
    .from("kp_hauling_push_subscriptions")
    .update({
      notify_dispatch: preferences.notify_dispatch,
      notify_pickup_due: preferences.notify_pickup_due,
      notify_driver_updates: preferences.notify_driver_updates,
      notify_availability: preferences.notify_availability,
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
