import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of Service" };

const updated = "November 1, 2026";

export default function TermsOfService() {
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
    <nav className="mb-12 flex items-center justify-between text-sm"><Link href="/" className="font-display text-2xl">Twyn</Link><Link href="/policy" className="text-ink-soft hover:text-ink">Privacy</Link></nav>
    <article className="space-y-8 text-[15px] leading-7 text-ink-soft">
      <header><p className="font-mono text-xs uppercase tracking-[0.16em] text-ink-mute">Legal</p><h1 className="mt-3 text-4xl text-ink sm:text-5xl">Terms of Service</h1><p className="mt-3">Last updated {updated}</p></header>
      <section><h2 className="text-2xl text-ink">Using Twyn</h2><p>Twyn lets you create and share an AI persona that can answer questions, speak in an enabled voice, and help coordinate bookings. By using Twyn, you agree to these terms and to the Privacy Policy.</p></section>
      <section><h2 className="text-2xl text-ink">Your account and content</h2><p>You are responsible for your account, the content you provide, and the links you publish. Only upload voice samples, documents, and personal information that you have the right to use. Do not use Twyn to impersonate someone without their clear permission.</p></section>
      <section><h2 className="text-2xl text-ink">Acceptable use</h2><p>Do not use Twyn for unlawful activity, abuse, fraud, harassment, harmful deception, attempts to bypass security, or content that violates the rights of others. We may restrict access when needed to protect people or the service.</p></section>
      <section><h2 className="text-2xl text-ink">AI responses and bookings</h2><p>Twyn responses are generated from your supplied information and may be incomplete or incorrect. Review important information before relying on it. You remain responsible for the availability you publish and any bookings created through your calendar connection.</p></section>
      <section><h2 className="text-2xl text-ink">Service availability</h2><p>Twyn is provided as available. Features may change or be interrupted while the service is improved, maintained, or protected.</p></section>
      <section><h2 className="text-2xl text-ink">Changes and contact</h2><p>We may update these terms as Twyn evolves. Material updates will appear on this page with a revised date. For questions, contact the developer using the contact address listed on Twyn&apos;s Google consent screen.</p></section>
    </article>
  </main>;
}
