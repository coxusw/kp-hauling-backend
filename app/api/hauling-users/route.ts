import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { UserRole } from "@/lib/auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function serverClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
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

  const { data, error } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: body.name.trim(),
      role,
      phone: body.phone?.trim() ?? ""
    }
  });

  if (error || !data.user) {
    return NextResponse.json({ message: error?.message ?? "Unable to create login." }, { status: 400 });
  }

  const { error: profileError } = await client.from("kp_hauling_profiles").upsert({
    id: data.user.id,
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

  const { error } = await client.auth.admin.deleteUser(body.userId);
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
