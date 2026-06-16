"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarPlus, ChevronDown, History, LayoutDashboard, LogOut, PackagePlus, Route, Settings, Truck, UserCog, Users } from "lucide-react";
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
  { href: "/driver", label: "Driver", icon: Truck },
  { href: "/settings", label: "Settings", icon: Settings }
];

const driverNavItems = [
  { href: "/driver", label: "Driver", icon: Truck },
  { href: "/driver-availability", label: "Availability", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings }
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
  const [menuOpen, setMenuOpen] = useState(false);
  const currentNavItem = navItems.find((item) => item.href === pathname) ?? navItems[0];

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
    if (auth.currentUser?.role === "driver" && !["/driver", "/driver-availability", "/settings"].includes(pathname)) {
      router.replace("/driver");
    }
    if (auth.currentUser && (pathname === "/users" || pathname === "/drivers") && !canManageUsers(auth.currentUser.role)) {
      router.replace("/driver");
    }
  }, [auth.currentUser, auth.loaded, isLogin, pathname, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
      <header className="sticky top-0 z-30 border-b border-kp-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link href={auth.currentUser.role === "driver" ? "/driver" : "/"} className="flex min-w-0 items-center gap-2 sm:gap-3">
              <BrandLogo />
              <div className="min-w-0">
                <p className="truncate text-base font-bold leading-tight text-kp-ink sm:text-lg">KP Hauling</p>
                <p className="hidden text-sm text-stone-600 sm:block">Operations backend</p>
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden rounded border border-kp-line px-3 py-2 text-sm font-medium capitalize text-stone-700 sm:block">
                {auth.currentUser.name} - {auth.currentUser.role}
              </div>
              <button
                type="button"
                onClick={auth.logout}
                className="flex min-h-10 items-center justify-center gap-2 rounded border border-kp-line bg-kp-paper px-3 text-sm font-bold text-kp-ink transition hover:border-kp-green hover:bg-white"
              >
                <LogOut aria-hidden className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
          <div className="relative sm:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="flex min-h-11 w-full items-center justify-between rounded border border-kp-line bg-kp-paper px-3 text-sm font-bold text-kp-ink"
              aria-expanded={menuOpen}
            >
              <span className="flex items-center gap-2">
                {currentNavItem ? <currentNavItem.icon aria-hidden className="h-4 w-4 text-kp-green" /> : null}
                {currentNavItem?.label ?? "Menu"}
              </span>
              <ChevronDown aria-hidden className={`h-4 w-4 transition ${menuOpen ? "rotate-180" : ""}`} />
            </button>
            {menuOpen ? (
              <nav className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded border border-kp-line bg-white shadow-panel">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex min-h-11 items-center gap-2 border-b border-kp-line px-3 text-sm font-bold last:border-b-0 ${
                        pathname === item.href ? "bg-kp-paper text-kp-green" : "text-kp-ink"
                      }`}
                    >
                      <Icon aria-hidden className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
          </div>
          <nav className="hidden gap-2 sm:flex sm:flex-wrap">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-10 shrink-0 items-center justify-center gap-2 rounded border px-3 text-sm font-semibold transition ${
                    pathname === item.href
                      ? "border-kp-green bg-white text-kp-green"
                      : "border-kp-line bg-kp-paper text-kp-ink hover:border-kp-green hover:bg-white"
                  }`}
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6 lg:px-8">{children}</main>
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
