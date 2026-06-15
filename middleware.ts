import { NextRequest, NextResponse } from "next/server";
import { SESSION_ROLE_COOKIE, type UserRole } from "@/lib/auth";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/hauling";
const publicPaths = ["/login"];
const driverPaths = ["/driver", "/driver-availability"];
const adminRoles: UserRole[] = ["owner", "admin"];

function stripBasePath(pathname: string) {
  return pathname.startsWith(basePath) ? pathname.slice(basePath.length) || "/" : pathname;
}

function isAsset(pathname: string) {
  return pathname.includes("/_next/") || pathname.endsWith(".ico") || pathname.endsWith(".png") || pathname.endsWith(".svg");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAsset(pathname)) {
    return NextResponse.next();
  }

  const appPath = stripBasePath(pathname);
  const role = request.cookies.get(SESSION_ROLE_COOKIE)?.value as UserRole | undefined;
  const loginUrl = new URL(`${basePath}/login`, request.url);

  if (publicPaths.includes(appPath)) {
    return NextResponse.next();
  }

  if (!role) {
    return NextResponse.redirect(loginUrl);
  }

  if (role === "driver" && !driverPaths.includes(appPath)) {
    return NextResponse.redirect(new URL(`${basePath}/driver`, request.url));
  }

  if (!adminRoles.includes(role) && !driverPaths.includes(appPath)) {
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"]
};
