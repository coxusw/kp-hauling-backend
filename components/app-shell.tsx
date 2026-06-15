"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CalendarPlus, History, LayoutDashboard, LogOut, PackagePlus, Route, Truck, UserCog, Users } from "lucide-react";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { BrandLogo } from "@/components/brand-logo";
import { canManageOperations, canManageUsers } from "@/lib/auth";

const adminNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: PackagePlus },
  { href: "/schedule", label: "Schedule Job", icon: CalendarPlus },
  { href: "/dispatch", label: "Dispatch", icon: Route },
  { href: "/driver-availability", label: "Driver Availability", icon: Users },
  { href: "/log", label: "Log", icon: History },
  { href: "/drivers", label: "Drivers", icon: UserCog },
  { href: "/driver", label: "Driver", icon: Truck }
];

const driverNavItems = [
  { href: "/driver", label: "Driver", icon: Truck },
  { href: "/driver-availability", label: "Availability", icon: Users }
];

function ShellContent({ children }: { children: React.ReactNode }) {
  const rawPathname = usePathname();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const pathname = basePath && rawPathname.startsWith(basePath) ? rawPathname.slice(basePath.length) || "/" : rawPathname;
  const router = useRouter();
  const auth = useAuth();
  const isLogin = pathname === "/login";
  const canUseOperations = auth.currentUser ? canManageOperations(auth.currentUser.role) : false;
  const navItems = canUseOperations ? adminNavItems : driverNavItems;

  useEffect(() => {
    if (!auth.loaded) {
      return;
    }
    if (!auth.currentUser && !isLogin) {
      router.replace("/login");
      return;
    }
    if (auth.currentUser && isLogin) {
      router.replace(auth.currentUser.role === "driver" ? "/driver" : "/");
      return;
    }
    if (auth.currentUser?.role === "driver" && !["/driver", "/driver-availability"].includes(pathname)) {
      router.replace("/driver");
    }
    if (auth.currentUser && (pathname === "/users" || pathname === "/drivers") && !canManageUsers(auth.currentUser.role)) {
      router.replace("/driver");
    }
  }, [auth.currentUser, auth.loaded, isLogin, pathname, router]);

  if (!auth.loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kp-paper px-4">
        <div className="rounded border border-kp-line bg-white p-5 text-sm font-semibold text-stone-600 shadow-panel">Loading workspace...</div>
      </div>
    );
  }

  if (isLogin || !auth.currentUser) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-kp-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href={auth.currentUser.role === "driver" ? "/driver" : "/"} className="flex items-center gap-3">
              <BrandLogo />
              <div>
                <p className="text-lg font-bold leading-tight">KP Hauling & Dumpster Services</p>
                <p className="text-sm text-stone-600">Local operations backend</p>
              </div>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded border border-kp-line px-3 py-2 text-sm font-medium text-stone-700">
                {auth.currentUser.name} - {auth.currentUser.role}
              </div>
              <button
                type="button"
                onClick={auth.logout}
                className="flex min-h-10 items-center gap-2 rounded border border-kp-line bg-kp-paper px-3 text-sm font-bold text-kp-ink transition hover:border-kp-green hover:bg-white"
              >
                <LogOut aria-hidden className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-10 shrink-0 items-center gap-2 rounded border px-3 text-sm font-semibold transition ${
                    pathname === item.href
                      ? "border-kp-green bg-white text-kp-green"
                      : "border-kp-line bg-kp-paper text-kp-ink hover:border-kp-green hover:bg-white"
                  }`}
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ShellContent>{children}</ShellContent>
    </AuthProvider>
  );
}
