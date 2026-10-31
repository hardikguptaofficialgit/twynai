import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy" };

const updated = "November 1, 2026";

export default function PrivacyPolicy() {
  return <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
    <nav className="mb-12 flex items-center justify-between text-sm"><Link href="/" className="font-display text-2xl">Twyn</Link><Link href="/tos" className="text-ink-soft hover:text-ink">Terms</Link></nav>
    <article className="space-y-8 text-[15px] leading-7 text-ink-soft">
      <header><p className="font-mono text-xs uppercase tracking-[0.16em] text-ink-mute">Legal</p><h1 className="mt-3 text-4xl text-ink sm:text-5xl">Privacy Policy</h1><p className="mt-3">Last updated {updated}</p></header>
      <section><h2 className="text-2xl text-ink">What Twyn collects</h2><p>Twyn stores the information needed to provide your AI persona: your account email and name, persona details, knowledge you add, voice samples you choose to upload, messages and booking details from your published link, and account settings.</p></section>
      <section><h2 className="text-2xl text-ink">Google Calendar connection</h2><p>When you connect Google Calendar, Twyn requests access to read calendar availability and create calendar events for bookings. Calendar credentials are stored server-side and are never sent to visitors of your Twyn link. You can disconnect Google Calendar from Twyn settings at any time.</p></section>
      <section><h2 className="text-2xl text-ink">How information is used</h2><p>We use this information to authenticate your account, answer conversations through your persona, generate voice responses when enabled, manage bookings, improve reliability, and protect the service from abuse.</p></section>
      <section><h2 className="text-2xl text-ink">Service providers</h2><p>Twyn may send the content required for a requested feature to its infrastructure, language-model, voice, database, and calendar providers. Google data is used only to provide the calendar features you enable. Twyn does not sell personal information.</p></section>
      <section><h2 className="text-2xl text-ink">Your choices</h2><p>You can update your persona, disconnect Google Calendar, or delete your account from settings. Account deletion removes your account and associated persona data from Twyn&apos;s active database, subject to limited retention needed for security and legal obligations.</p></section>
      <section><h2 className="text-2xl text-ink">Changes and contact</h2><p>We may update this policy as Twyn evolves. Material updates will appear on this page with a revised date. For privacy questions or requests, contact the developer using the contact address listed on Twyn&apos;s Google consent screen.</p></section>
    </article>
  </main>;
}
