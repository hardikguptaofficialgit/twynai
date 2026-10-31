import type { Metadata } from "next";
import { Gloock, Hanken_Grotesk, JetBrains_Mono, Noto_Sans_Tamil, Noto_Sans_Devanagari } from "next/font/google";
const tamil = Noto_Sans_Tamil({ subsets: ["tamil"], variable: "--font-tamil", weight: ["400", "500"] });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-deva", weight: ["400", "500"] });
import "./globals.css";

const disp = Gloock({ subsets: ["latin"], weight: "400", variable: "--font-disp", display: "swap" });
const body = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-body", display: "swap" });
const jb = JetBrains_Mono({ subsets: ["latin"], weight: ["400"], variable: "--font-jb", display: "swap" });

export const metadata: Metadata = {
  title: "Proxy, an AI you that takes your calls",
  description: "Share a link. Anyone can chat or talk to your AI self, in your voice, in their language.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${disp.variable} ${body.variable} ${jb.variable} ${tamil.variable} ${deva.variable}`}>
      <body
        className={`antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
