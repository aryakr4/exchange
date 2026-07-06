import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, IBM_Plex_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

// Quiet, legible body face — lets the display and the board figures carry it.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Display: a contemporary grotesque with real character, used with restraint.
const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

// The rates-board figures and all data/labels — engineered, tabular.
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "RateWatch — Exchange Rate Alerts by Email",
    template: "%s · RateWatch",
  },
  description:
    "Set a target exchange rate for any major currency pair and get one email the moment it's reached. Checked daily. No spam, no charts to refresh.",
  applicationName: "RateWatch",
  keywords: [
    "exchange rate alerts",
    "currency alerts",
    "forex rate notification",
    "exchange rate tracker",
    "currency pair monitoring",
    "rate alert email",
  ],
  authors: [{ name: "RateWatch" }],
  category: "finance",
  openGraph: {
    type: "website",
    siteName: "RateWatch",
    locale: "en_US",
    url: "/",
    title: "RateWatch — Exchange Rate Alerts by Email",
    description:
      "Set a target exchange rate and get one email the moment it's reached. Checked daily.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RateWatch — Exchange Rate Alerts by Email",
    description:
      "Set a target exchange rate and get one email the moment it's reached.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${bricolage.variable} ${plexMono.variable} antialiased`}
      >
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
