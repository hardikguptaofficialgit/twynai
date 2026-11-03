import type { Metadata } from "next";
import localFont from "next/font/local";
const tamil = localFont({
  src: [
    { path: "./fonts/NotoSansTamil-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/NotoSansTamil-Medium.ttf", weight: "500", style: "normal" },
  ],
  variable: "--font-tamil",
  display: "swap",
});
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import BackendStatus from "@/components/BackendStatus";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100"),
  title: { default: "Twyn AI, an AI you at a link", template: "%s | Twyn AI" },
  description: "Share a link. Anyone can chat or talk to your AI self, in your voice, in their language.",
  applicationName: "Twyn AI",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/brand/icon.svg", type: "image/svg+xml", sizes: "any" }],
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
    <html lang="en" className={tamil.variable} suppressHydrationWarning>
      <body
        className={`antialiased`}
        suppressHydrationWarning
      ><BackendStatus /><SmoothScroll>
        {children}
      </SmoothScroll></body>
    </html>
  );
}
