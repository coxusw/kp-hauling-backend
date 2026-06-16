"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Download, Home } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { canManageOperations } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PushPreferences = {
  notify_dispatch: boolean;
  notify_pickup_due: boolean;
  notify_driver_updates: boolean;
  notify_availability: boolean;
  daily_reminder_time: string;
  reminder_timezone: string;
};
type BooleanPushPreference = "notify_dispatch" | "notify_pickup_due" | "notify_driver_updates" | "notify_availability";

const defaultPreferences: PushPreferences = {
  notify_dispatch: true,
  notify_pickup_due: true,
  notify_driver_updates: true,
  notify_availability: true,
  daily_reminder_time: "07:00",
  reminder_timezone: "America/Chicago"
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

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(Array.from(rawData).map((char) => char.charCodeAt(0)));
}

async function authHeaders() {
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.session?.access_token ?? ""}`
  };
}

export default function SettingsPage() {
  const auth = useAuth();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const isAdmin = auth.currentUser ? canManageOperations(auth.currentUser.role) : false;
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installMessage, setInstallMessage] = useState("");
  const [pushMessage, setPushMessage] = useState("");
  const [preferences, setPreferences] = useState<PushPreferences>(defaultPreferences);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const isIos = useMemo(() => isIosDevice(), []);

  useEffect(() => {
    setInstalled(isStandalone());
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    authHeaders()
      .then((headers) => fetch(`${basePath}/api/push/subscribe`, { headers }))
      .then((response) => response.ok ? response.json() : undefined)
      .then((data) => {
        if (data?.preferences) {
          setPreferences(data.preferences);
        }
      })
      .catch(() => undefined);

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
  }, [basePath]);

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

  async function enableNotifications() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushMessage("Push notifications are not available on this browser yet.");
      return;
    }

    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);
    if (nextPermission !== "granted") {
      setPushMessage("Notifications were not allowed on this device.");
      return;
    }

    const registration = await navigator.serviceWorker.register(`${basePath}/sw.js`);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    const response = await fetch(`${basePath}/api/push/subscribe`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ subscription: subscription.toJSON(), preferences })
    });

    setPushMessage(response.ok ? "Notifications enabled for this device." : "Unable to save notification settings.");
  }

  async function savePreferences(next: PushPreferences) {
    await fetch(`${basePath}/api/push/subscribe`, {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify(next)
    }).catch(() => undefined);
  }

  async function updatePreference(key: BooleanPushPreference, value: boolean) {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    await savePreferences(next);
  }

  async function updateReminderTime(value: string) {
    const next = { ...preferences, daily_reminder_time: value || "07:00" };
    setPreferences(next);
    await savePreferences(next);
  }

  const adminOptions: Array<[BooleanPushPreference, string]> = [
    ["notify_availability", "Driver availability changes"],
    ["notify_pickup_due", "Drop-off and pickup reminders"],
    ["notify_driver_updates", "Driver completed drop-off/pickup"],
    ["notify_dispatch", "Dispatch assignment changes"]
  ];
  const driverOptions: Array<[BooleanPushPreference, string]> = [
    ["notify_dispatch", "Jobs dispatched to me"],
    ["notify_pickup_due", "Drop-off and pickup reminders"],
    ["notify_driver_updates", "Route completion updates"]
  ];
  const options = isAdmin ? adminOptions : driverOptions;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded border border-kp-line bg-white p-4 shadow-panel">
        {!isIos ? (
          <>
            <h2 className="flex items-center gap-2 text-lg font-bold text-kp-ink">
              <Download aria-hidden className="h-5 w-5 text-kp-green" />
              Install App
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Tap install below. If the button is not available, open the browser menu and choose Install app or Add to Home screen.
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
          </>
        ) : (
          <>
            <h2 className="flex items-center gap-2 text-lg font-bold text-kp-ink">
              <Home aria-hidden className="h-5 w-5 text-kp-green" />
              Add To Home Screen
            </h2>
            <div className="mt-3 space-y-3 text-sm leading-6 text-stone-700">
              <p className="rounded bg-kp-paper p-3">Open this page in Safari.</p>
              <p className="rounded bg-kp-paper p-3">Tap Share, then choose Add to Home Screen.</p>
              <p className="rounded bg-kp-paper p-3">Tap Add, then open KP Hauling from the new icon.</p>
            </div>
          </>
        )}
      </section>

      <section className="rounded border border-kp-line bg-white p-4 shadow-panel">
        <h2 className="flex items-center gap-2 text-lg font-bold text-kp-ink">
          <Bell aria-hidden className="h-5 w-5 text-kp-green" />
          Notifications
        </h2>
        <button
          type="button"
          onClick={enableNotifications}
          className="mt-3 flex min-h-10 w-full items-center justify-center rounded bg-kp-green px-3 text-sm font-bold text-white sm:w-auto"
        >
          {permission === "granted" ? "Refresh Notification Access" : "Allow Notifications"}
        </button>
        {pushMessage ? <p className="mt-2 text-sm font-semibold text-stone-700">{pushMessage}</p> : null}

        <div className="mt-4 rounded border border-kp-line bg-kp-paper p-3">
          <label className="grid gap-2 text-sm font-bold text-kp-ink sm:grid-cols-[1fr_auto] sm:items-center">
            <span>Daily due reminder time</span>
            <input
              type="time"
              step={900}
              value={preferences.daily_reminder_time}
              onChange={(event) => updateReminderTime(event.target.value)}
              className="min-h-10 rounded border border-kp-line bg-white px-3 text-sm font-bold text-kp-ink"
            />
          </label>
          <p className="mt-2 text-xs font-semibold text-stone-500">Used for drop-offs due today, pickups due today, and overdue pickups.</p>
        </div>

        <div className="mt-3 space-y-2">
          {options.map(([key, label]) => (
            <label key={key} className="flex min-h-11 items-center justify-between gap-3 rounded border border-kp-line bg-kp-paper px-3 text-sm font-bold text-kp-ink">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={preferences[key]}
                onChange={(event) => updatePreference(key, event.target.checked)}
                className="h-5 w-5 accent-kp-green"
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
