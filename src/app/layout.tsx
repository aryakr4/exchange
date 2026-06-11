import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    card: "summary",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
