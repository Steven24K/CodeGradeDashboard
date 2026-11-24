import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ApiTokenProvider } from "@/spa/ApiTokenContext";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import "./globals.scss";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gradeboard | CodeGrade progress",
  description: "A private, at-a-glance view of CodeGrade student progress.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <Analytics />
        <SpeedInsights />
        <ApiTokenProvider>{children}</ApiTokenProvider>
      </body>
    </html>
  );
}
