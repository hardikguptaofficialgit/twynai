"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Nav } from "./ui";
export function AppNav({ handle }: { handle?: string }) {
  const path = usePathname();
  const L = (href: string, t: string) => <Link href={href} className={`rounded-full px-3.5 py-2 ${path === href ? "bg-ink/[0.06] text-ink" : "text-ink-soft hover:text-ink"}`}>{t}</Link>;
  return <Nav right={<>{L("/studio", "Studio")}{L("/dashboard", "Dashboard")}{handle && <Link href={`/p/${handle}`} target="_blank" className="ml-2 rounded-full bg-ink px-4 py-2 text-canvas">Open public page</Link>}</>} />;
}
