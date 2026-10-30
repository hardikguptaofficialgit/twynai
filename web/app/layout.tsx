import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Tamil, Noto_Sans_Devanagari } from "next/font/google";
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-tamil", weight: ["400", "500"] });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-deva", weight: ["400", "500"] });
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Proxy - your AI persona that talks like you",
  description: "Share a link. Anyone can chat or talk to your AI self, in your voice, in their language.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${tamil.variable} ${deva.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
