"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Download, ExternalLink, Home, Info, Smartphone } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/components/auth-provider";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIosDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export default function SettingsPage() {
  const auth = useAuth();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installMessage, setInstallMessage] = useState("");
  const isIos = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    setInstalled(isStandalone());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
      setInstallMessage("App installed.");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) {
      setInstallMessage("Use your browser menu to install this app on this device.");
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallMessage(choice.outcome === "accepted" ? "App installed." : "Install dismissed.");
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Install the KP Hauling app on a phone, confirm account access, and prepare this workspace for mobile dispatch."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="rounded border border-kp-line bg-white p-4 shadow-panel">
          <div className="flex items-center gap-3">
            <BrandLogo size="lg" />
            <div>
              <h2 className="text-lg font-bold text-kp-ink">KP Hauling App</h2>
              <p className="text-sm text-stone-600">Installed app icon uses the KP logo.</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded border border-kp-line bg-kp-paper p-3">
              <p className="flex items-center gap-2 text-sm font-bold text-kp-ink">
                <Smartphone aria-hidden className="h-4 w-4 text-kp-green" />
                Mobile Status
              </p>
              <p className="mt-2 text-sm text-stone-600">{installed ? "Running as an installed app." : "Open in browser or install to home screen."}</p>
            </div>
            <div className="rounded border border-kp-line bg-kp-paper p-3">
              <p className="flex items-center gap-2 text-sm font-bold text-kp-ink">
                <Bell aria-hidden className="h-4 w-4 text-kp-green" />
                Push Notifications
              </p>
              <p className="mt-2 text-sm text-stone-600">Push wiring is staged for the next notification phase.</p>
            </div>
          </div>

          {!isIos ? (
            <div className="mt-4 rounded border border-kp-line bg-kp-paper p-3">
              <h3 className="flex items-center gap-2 font-bold text-kp-ink">
                <Download aria-hidden className="h-4 w-4 text-kp-green" />
                Android / Chrome Install
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Tap install below when available. If the button is not ready, open the browser menu and choose Install app or Add to Home screen.
              </p>
              <button
                type="button"
                onClick={installApp}
                disabled={installed}
                className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded bg-kp-green px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-400 sm:w-auto"
              >
                <Download aria-hidden className="h-4 w-4" />
                {installed ? "Installed" : "Install App"}
              </button>
              {installMessage ? <p className="mt-2 text-sm font-semibold text-stone-700">{installMessage}</p> : null}
            </div>
          ) : null}
        </section>

        <section className="rounded border border-kp-line bg-white p-4 shadow-panel">
          <h2 className="flex items-center gap-2 text-lg font-bold text-kp-ink">
            <Home aria-hidden className="h-5 w-5 text-kp-green" />
            iPhone / iPad Home Screen
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-stone-700">
            <p className="rounded bg-kp-paper p-3">
              Open this page in Safari, tap the Share button, then choose Add to Home Screen.
            </p>
            <p className="rounded bg-kp-paper p-3">
              Keep the name as KP Hauling, then tap Add. The KP logo will show as the home screen icon.
            </p>
            <p className="rounded bg-kp-paper p-3">
              Open the app from the new icon before allowing future push notifications.
            </p>
          </div>
        </section>

        <section className="rounded border border-kp-line bg-white p-4 shadow-panel lg:col-span-2">
          <h2 className="flex items-center gap-2 text-lg font-bold text-kp-ink">
            <Info aria-hidden className="h-5 w-5 text-kp-green" />
            Account
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded border border-kp-line bg-kp-paper p-3">
              <p className="text-xs font-bold uppercase tracking-normal text-stone-500">Name</p>
              <p className="mt-1 font-bold text-kp-ink">{auth.currentUser?.name ?? "Not signed in"}</p>
            </div>
            <div className="rounded border border-kp-line bg-kp-paper p-3">
              <p className="text-xs font-bold uppercase tracking-normal text-stone-500">Role</p>
              <p className="mt-1 font-bold capitalize text-kp-ink">{auth.currentUser?.role ?? "None"}</p>
            </div>
            <a
              href={basePath || "/"}
              className="flex min-h-16 items-center justify-center gap-2 rounded border border-kp-line bg-kp-paper p-3 text-center text-sm font-bold text-kp-green"
            >
              <ExternalLink aria-hidden className="h-4 w-4" />
              Open App Start
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
