"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, SignOut, Trash, CircleNotch } from "@phosphor-icons/react";
import { api, API } from "@/lib/api";
import { Card, Pill } from "@/components/ui";
import { useStudio, Page } from "../ctx";

const STATUS: Record<string, [string, string, string]> = {
  connected: ["mint", "Connected", "Slots skip your busy times. Bookings go on your primary calendar with a Google Meet link and an invite to the visitor."],
  not_connected: ["white", "Not connected", "Your Twyn uses a demo calendar. Connect Google to use your real availability."],
  disconnected: ["white", "Disconnected", "You disconnected Google. Your Twyn is using a demo calendar."],
  needs_reconnect: ["butter", "Needs permission", "Calendar access was not granted. Reconnect and tick the calendar boxes."],
  revoked: ["peach", "Access expired", "Google access was revoked or expired. Reconnect to resume real bookings."],
  api_disabled: ["peach", "Calendar API disabled", "The Google Calendar API is turned off for this app's Cloud project. Enable it in Google Cloud Console, then reconnect."],
  error: ["peach", "Error", "Google Calendar returned an error. Your Twyn fell back to the demo calendar."],
};

export default function Settings() {
  const { me, persona: p, reloadMe, toast } = useStudio();
  const r = useRouter();
  const [busy, setBusy] = useState("");
  const [confirmTxt, setConfirmTxt] = useState("");
  const st = STATUS[me.calendar_status] || STATUS.not_connected;
  const link = typeof window !== "undefined" ? `${location.origin}/p/${p.handle}` : "";
  const connect = () => { window.location.href = `${API}/api/auth/google/login`; };
  async function disconnect() { if (!confirm("Disconnect Google Calendar? Your Twyn will switch to a demo calendar.")) return; setBusy("dc"); try { await api("/api/me/google/disconnect", { method: "POST" }); await reloadMe(); toast("Google Calendar disconnected"); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(""); } }
  async function logout() { await api("/api/auth/logout", { method: "POST" }).catch(() => {}); localStorage.removeItem("proxy_token"); r.replace("/login"); }
  async function del() { setBusy("del"); try { await api("/api/me", { method: "DELETE" }); localStorage.removeItem("proxy_token"); r.replace("/"); } catch (e: any) { toast(e.message, "err"); setBusy(""); } }
  return (
    <Page title="Settings" sub="Account, connections and your public handle.">
      <div className="max-w-2xl space-y-3">
        <Card className="p-4">
          <h2 className="text-[14px] font-medium">Account</h2>
          <div className="mt-3 flex items-center gap-3">
            {me.picture ? <img src={me.picture} alt="" className="h-10 w-10 rounded-full" referrerPolicy="no-referrer" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-lilac font-medium">{(me.name || me.email)[0]?.toUpperCase()}</span>}
            <div className="min-w-0 flex-1"><div className="text-[13.5px] font-medium">{me.name}</div><div className="text-[12.5px] text-ink-soft">{me.email}</div></div>
            <button onClick={logout} className="clay-sm inline-flex h-8 items-center gap-1.5 bg-white px-3 text-[13px] font-medium"><SignOut size={14} />Sign out</button>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2"><Image src="/brands/google-calendar.svg" alt="" width={18} height={18} /><h2 className="text-[14px] font-medium">Google Calendar</h2><Pill tone={st[0]}>{st[1]}</Pill></div>
          <p className="mt-2 text-[12.5px] text-ink-soft">{st[2]}</p>
          <div className="mt-3 flex gap-2">
            {me.calendar_status === "connected" ? <button onClick={disconnect} disabled={!!busy} className="clay-sm inline-flex h-8 items-center gap-1.5 bg-white px-3 text-[13px] font-medium">{busy === "dc" && <CircleNotch size={13} className="animate-spin" />}Disconnect</button>
              : <button onClick={connect} className="inline-flex h-8 items-center gap-2 rounded-full bg-ink px-3.5 text-[13px] font-medium text-canvas"><Image src="/brands/google.svg" alt="" width={14} height={14} />{me.calendar_status === "not_connected" ? "Connect Google" : "Reconnect Google"}</button>}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="text-[14px] font-medium">Handle</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">Your public page address. Handles can't be changed after publishing so shared links keep working.</p>
          <div className="clay-pressed mt-3 flex h-9 items-center gap-2 px-3"><span className="flex-1 truncate font-mono text-[12.5px]">{link}</span>
            <button onClick={() => { navigator.clipboard.writeText(link); toast("Link copied"); }} aria-label="Copy" className="text-ink-mute hover:text-ink"><Copy size={14} /></button></div>
        </Card>
        <Card className="border border-peach-deep/30 p-4">
          <h2 className="text-[14px] font-medium text-peach-deep">Danger zone</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">Deletes your account, persona, knowledge, voice, conversations, leads and bookings. Google access is revoked. This can't be undone.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input value={confirmTxt} onChange={(e) => setConfirmTxt(e.target.value)} placeholder={`Type ${p.handle} to confirm`} className="field clay-pressed h-8 w-56 text-[13px]" />
            <button onClick={del} disabled={confirmTxt !== p.handle || !!busy} className="inline-flex h-8 items-center gap-1.5 rounded-full bg-peach-deep px-3.5 text-[13px] font-medium text-white disabled:opacity-40">{busy === "del" ? <CircleNotch size={13} className="animate-spin" /> : <Trash size={14} />}Delete account</button>
          </div>
        </Card>
      </div>
    </Page>
  );
}
