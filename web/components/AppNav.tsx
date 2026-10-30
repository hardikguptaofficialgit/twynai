"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Nav } from "./ui";
export function AppNav({ handle }: { handle?: string }) {
  const path = usePathname();
  const L = (href: string, t: string) => <Link href={href} className={`rounded-xl px-3 py-2 ${path === href ? "clay-sm bg-white text-ink" : "text-ink-soft hover:text-ink"}`}>{t}</Link>;
  return <Nav right={<>{L("/studio", "Studio")}{L("/dashboard", "Dashboard")}{handle && <Link href={`/p/${handle}`} target="_blank" className="ml-2 rounded-xl bg-ink px-4 py-2 text-white">Open public page</Link>}</>} />;
}
