import Link from "next/link";
import { Backdrop, Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="relative grid min-h-screen place-items-center px-6 text-center">
      <Backdrop />
      <div className="relative">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <p className="font-mono text-xs tracking-[0.16em] text-ink-mute">404</p>
        <h1 className="display mt-3 text-4xl">This link has wandered off.</h1>
        <p className="mt-3 text-sm text-ink-soft">Try the Twyn home page to start again.</p>
        <Link href="/" className="mt-7 inline-flex rounded-full bg-ink px-4 py-2 text-sm font-medium text-canvas">Go home</Link>
      </div>
    </main>
  );
}
