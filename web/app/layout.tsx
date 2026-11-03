import type { Metadata } from "next";
import { Gloock, Hanken_Grotesk, JetBrains_Mono, Noto_Sans_Tamil, Noto_Sans_Devanagari } from "next/font/google";
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-tamil", weight: ["400", "500"] });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-deva", weight: ["400", "500"] });
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import BackendStatus from "@/components/BackendStatus";

const disp = Gloock({ subsets: ["latin"], weight: "400", variable: "--font-disp", display: "swap" });
const body = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-body", display: "swap" });
const jb = JetBrains_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-jb", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100"),
  title: { default: "Twyn AI, an AI you at a link", template: "%s | Twyn AI" },
  description: "Share a link. Anyone can chat or talk to your AI self, in your voice, in their language.",
  applicationName: "Twyn AI",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/brand/favicon.ico", sizes: "any" }, { url: "/brand/icon.svg", type: "image/svg+xml" }, { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: { title: "Twyn AI, an AI you at a link", description: "Chats, calls and bookings in your voice, in Indian languages.", images: [{ url: "/brand/og.png", width: 1200, height: 630, alt: "Twyn AI" }], siteName: "Twyn AI", type: "website" },
  twitter: { card: "summary_large_image", title: "Twyn AI, an AI you at a link", images: ["/brand/og.png"] },
};
export const viewport = { themeColor: "#F5F1EA" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${disp.variable} ${body.variable} ${jb.variable} ${tamil.variable} ${deva.variable}`}>
      <body
        className={`antialiased`}
        suppressHydrationWarning
      ><BackendStatus /><SmoothScroll>
        {children}
      </SmoothScroll></body>
    </html>
  );
}
