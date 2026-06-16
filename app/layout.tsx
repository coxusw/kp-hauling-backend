import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KP Hauling Backend",
  description: "Local operations tracker for KP Hauling & Dumpster Services",
  manifest: "/hauling/manifest.webmanifest",
  icons: {
    icon: "/hauling/icon.jpg",
    shortcut: "/hauling/icon.jpg",
    apple: "/hauling/icon.jpg"
  }
};

export const viewport: Viewport = {
  themeColor: "#22623f"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
