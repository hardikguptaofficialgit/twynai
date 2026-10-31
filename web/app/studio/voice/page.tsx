"use client";
import { Card, Pill } from "@/components/ui";
import { VoiceCloner } from "@/components/VoiceCloner";
import { useStudio, Page } from "../ctx";

export default function VoicePage() {
  const { persona: p, reload } = useStudio();
  return (
    <Page title="Voice" sub="Record or upload 15 to 30 seconds of clean speech. Gnani clones your voice for the Talk tab. You can re-clone any time.">
      <Card className="p-5">
        <div className="mb-4">{p.has_voice ? <Pill tone="mint">Voice clone active</Pill> : <Pill tone="white">Using a stock voice</Pill>}</div>
        <VoiceCloner d={p} set={() => { reload(); }} />
      </Card>
    </Page>
  );
}
