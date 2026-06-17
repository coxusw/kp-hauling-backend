import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isValidSupabaseUrl(value?: string) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function serverClient() {
  if (!isValidSupabaseUrl(supabaseUrl) || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl!, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function requireAdmin(request: NextRequest) {
  const client = serverClient();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!client || !token) {
    return { client, ok: false };
  }

  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) {
    return { client, ok: false };
  }

  const { data: profile } = await client
    .from("kp_hauling_profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  return {
    client,
    ok: profile?.role === "owner" || profile?.role === "admin",
    currentUserId: userData.user.id
  };
}

async function findAuthUserByEmail(client: NonNullable<ReturnType<typeof serverClient>>, email: string) {
  let page = 1;

  while (page < 20) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      return null;
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) {
      return match;
    }
    if (data.users.length < 1000) {
      return null;
    }
    page += 1;
  }

  return null;
}

async function clearKpUserReferences(client: NonNullable<ReturnType<typeof serverClient>>, userId: string) {
  await Promise.all([
    client.from("kp_hauling_driver_availability_windows").delete().eq("driver_id", userId),
    client.from("kp_hauling_push_subscriptions").delete().eq("user_id", userId),
    client.from("kp_hauling_due_reminder_sends").delete().eq("user_id", userId),
    client.from("kp_hauling_job_payments").update({ driver_id: null, driver_name: null }).eq("driver_id", userId),
    client.from("kp_hauling_driver_cash_handoffs").update({ driver_id: null }).eq("driver_id", userId),
    client.from("kp_hauling_jobs").update({
      delivery_driver_id: null,
      delivery_driver_name: null,
      delivery_dispatch_date: null,
      delivery_dispatch_notes: null
    }).eq("delivery_driver_id", userId),
    client.from("kp_hauling_jobs").update({
      pickup_driver_id: null,
      pickup_driver_name: null,
      pickup_dispatch_date: null,
      pickup_dispatch_notes: null
    }).eq("pickup_driver_id", userId)
  ]);
}

export async function POST(request: NextRequest) {
  const { client, ok } = await requireAdmin(request);
  if (!client) {
    return NextResponse.json({ message: "SUPABASE_SERVICE_ROLE_KEY is not configured in Vercel." }, { status: 500 });
  }
  if (!ok) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const body = await request.json() as {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
    phone?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const role = body.role === "admin" ? "admin" : "driver";

  if (!body.name?.trim() || !email || !password) {
    return NextResponse.json({ message: "Name, email, and password are required." }, { status: 400 });
  }

  const authUserPayload = {
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: body.name.trim(),
      role,
      phone: body.phone?.trim() ?? ""
    }
  };

  const { data, error } = await client.auth.admin.createUser(authUserPayload);
  let authUser = data.user;

  if (error || !authUser) {
    const existingUser = await findAuthUserByEmail(client, email);
    if (!existingUser) {
      return NextResponse.json({ message: error?.message ?? "Unable to create login." }, { status: 400 });
    }

    const { data: updatedUser, error: updateError } = await client.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: authUserPayload.user_metadata
    });
    if (updateError || !updatedUser.user) {
      return NextResponse.json({ message: updateError?.message ?? error?.message ?? "Unable to restore login." }, { status: 400 });
    }
    authUser = updatedUser.user;
  }

  const { error: profileError } = await client.from("kp_hauling_profiles").upsert({
    id: authUser.id,
    name: body.name.trim(),
    email,
    role,
    phone: body.phone?.trim() || null,
    availability_status: role === "driver" ? "Unavailable" : "Available",
    availability_updated_at: new Date().toISOString()
  });

  if (profileError) {
    return NextResponse.json({ message: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { client, ok, currentUserId } = await requireAdmin(request);
  if (!client) {
    return NextResponse.json({ message: "SUPABASE_SERVICE_ROLE_KEY is not configured in Vercel." }, { status: 500 });
  }
  if (!ok) {
    return NextResponse.json({ message: "Admin access required." }, { status: 403 });
  }

  const body = await request.json() as { userId?: string };
  if (!body.userId) {
    return NextResponse.json({ message: "User ID is required." }, { status: 400 });
  }
  if (body.userId === currentUserId) {
    return NextResponse.json({ message: "You cannot remove the login you are currently using." }, { status: 400 });
  }

  await clearKpUserReferences(client, body.userId);

  const { error: profileError } = await client.from("kp_hauling_profiles").delete().eq("id", body.userId);
  if (profileError) {
    return NextResponse.json({ message: profileError.message }, { status: 400 });
  }

  const { error: authError } = await client.auth.admin.deleteUser(body.userId);
  if (authError && !/not found/i.test(authError.message)) {
    return NextResponse.json({ message: authError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
