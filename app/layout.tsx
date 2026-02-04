import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthInitializer } from "@/app/components/auth/auth-initializer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://consulting-research.valyu.network"
  ),
  title: "Consulting Research Intelligence | AI-Powered Deep Research",
  description:
    "Generate comprehensive research reports for due diligence, market analysis, competitive landscapes, and strategic insights. Built for consultants at top firms.",
  keywords: [
    "consulting",
    "research",
    "due diligence",
    "market analysis",
    "competitive intelligence",
    "AI research",
    "business intelligence",
    "strategy consulting",
  ],
  authors: [{ name: "Consulting Research Intelligence" }],
  creator: "Consulting Research Intelligence",
  publisher: "Consulting Research Intelligence",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "Consulting Research Intelligence",
    description:
      "Generate comprehensive research reports in minutes. AI-powered deep research for due diligence, market analysis, and competitive intelligence. Built for consultants at top firms.",
    type: "website",
    siteName: "Consulting Research Intelligence",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Consulting Research Intelligence",
    description:
      "Generate comprehensive research reports in minutes. AI-powered deep research for due diligence, market analysis, and competitive intelligence.",
    creator: "@valaboratory",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
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
        <AuthInitializer>{children}</AuthInitializer>
      </body>
    </html>
  );
}
