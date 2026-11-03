"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, SignOut, Trash, CircleNotch, Camera } from "@phosphor-icons/react";
import { api, API } from "@/lib/api";
import { Card, Pill } from "@/components/ui";
import { ProfileAvatar, type AvatarStyle } from "@/components/ProfileAvatar";
import { AvatarStylePicker } from "@/components/AvatarPicker";
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
  const { me, persona: p, reloadMe, reload, toast } = useStudio();
  const r = useRouter();
  const [busy, setBusy] = useState("");
  const [confirmTxt, setConfirmTxt] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>("notionists-neutral");
  const st = STATUS[me.calendar_status] || STATUS.not_connected;
  const link = typeof window !== "undefined" ? `${location.origin}/p/${p.handle}` : "";
  useEffect(() => { const saved = localStorage.getItem(`twyn-avatar-style-${p.id}`) as AvatarStyle | null; if (saved) setAvatarStyle(saved); }, [p.id]);
  const connect = () => { window.location.href = `${API}/api/auth/google/login?next=${encodeURIComponent("/studio/settings")}&calendar=1`; };
  async function disconnect() { if (!confirm("Disconnect Google Calendar? Your Twyn will switch to a demo calendar.")) return; setBusy("dc"); try { await api("/api/me/google/disconnect", { method: "POST" }); await reloadMe(); toast("Google Calendar disconnected"); } catch (e: any) { toast(e.message, "err"); } finally { setBusy(""); } }
  async function logout() { await api("/api/auth/logout", { method: "POST" }).catch(() => {}); localStorage.removeItem("proxy_token"); r.replace("/login"); }
  async function del() { setBusy("del"); try { await api("/api/me", { method: "DELETE" }); localStorage.removeItem("proxy_token"); r.replace("/"); } catch (e: any) { toast(e.message, "err"); setBusy(""); } }
  async function uploadAvatar(file: File) {
    setAvatarError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setAvatarError("Use a JPG, PNG, or WebP image."); return; }
    if (file.size > 3 * 1024 * 1024) { setAvatarError("Keep the photo under 3 MB."); return; }
    setBusy("avatar");
    try { const body = new FormData(); body.append("file", file); await api(`/api/personas/${p.id}/avatar`, { method: "POST", body }); await reload(); toast("Avatar updated"); }
    catch (e: any) { setAvatarError(e.message || "Could not update the avatar."); toast(e.message || "Could not update the avatar.", "err"); }
    finally { setBusy(""); }
  }
  return (
    <Page title="Settings" sub="Account, connections and your public handle.">
      <div className="max-w-2xl space-y-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-medium">Google Account</h2>
            <Pill tone="mint">Signed in</Pill>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <ProfileAvatar seed={me.name || me.email} image={me.picture} size={40} className="ring-2 ring-white/60" />
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-medium">{me.name || "Creator"}</div>
              <div className="text-[12.5px] text-ink-soft">{me.email}</div>
            </div>
            <button onClick={logout} className="clay-sm inline-flex h-8 items-center gap-1.5 bg-white px-3 text-[13px] font-medium hover:bg-canvas transition-colors"><SignOut size={14} />Sign out</button>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <ProfileAvatar seed={p.name || me.name || me.email} image={p.avatar_url ? `${API}${p.avatar_url}` : undefined} style={avatarStyle} size={64} className="ring-4 ring-white/70" />
            <div className="min-w-0 flex-1"><h2 className="text-[14px] font-medium">Profile avatar</h2><p className="mt-0.5 text-[12.5px] text-ink-soft">Upload a photo for your public Twyn. A DiceBear avatar is used automatically until you add one.</p></div>
            <label className="clay-sm inline-flex h-8 cursor-pointer items-center gap-1.5 bg-white px-3 text-[13px] font-medium hover:bg-canvas">{busy === "avatar" ? <CircleNotch size={14} className="animate-spin" /> : <Camera size={14} />}Change avatar<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!!busy} onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadAvatar(file); e.currentTarget.value = ""; }} /></label>
          </div>
          {!p.avatar_url && <div className="mt-4 border-t border-rule pt-3"><p className="mb-2 text-[11px] text-ink-mute">Or choose a DiceBear avatar style</p><AvatarStylePicker seed={p.name || me.name || me.email} value={avatarStyle} onChange={(style) => { setAvatarStyle(style); localStorage.setItem(`twyn-avatar-style-${p.id}`, style); }} /></div>}
          {avatarError && <p role="alert" className="mt-2 text-[12px] text-peach-deep">{avatarError}</p>}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2"><Image src="/brands/google-calendar.svg" alt="" width={18} height={18} /><h2 className="text-[14px] font-medium">Google Calendar</h2><Pill tone={st[0]}>{st[1]}</Pill></div>
          <p className="mt-2 text-[12.5px] text-ink-soft">{st[2]}</p>
          <div className="mt-3 flex gap-2">
            {me.calendar_status === "connected" ? <button onClick={disconnect} disabled={!!busy} className="clay-sm inline-flex h-8 items-center gap-1.5 bg-white px-3 text-[13px] font-medium hover:bg-canvas transition-colors">{busy === "dc" && <CircleNotch size={13} className="animate-spin" />}Disconnect Calendar</button>
              : <button onClick={connect} className="inline-flex h-8 items-center gap-2 rounded-full bg-ink px-3.5 text-[13px] font-medium text-canvas hover:bg-ink-soft transition-colors"><Image src="/brands/google.svg" alt="" width={14} height={14} />{me.calendar_status === "not_connected" || me.calendar_status === "disconnected" ? "Connect Google Calendar" : "Reconnect Google Calendar"}</button>}
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
