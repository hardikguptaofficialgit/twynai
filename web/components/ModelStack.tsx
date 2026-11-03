const models = [["Groq", "/brands/groq.svg"], ["Meta", "https://cdn.simpleicons.org/meta"], ["Mistral", "https://cdn.simpleicons.org/mistralai"], ["NVIDIA", "https://cdn.simpleicons.org/nvidia"], ["Muse", "https://commons.wikimedia.org/wiki/Special:FilePath/Muse%20icon.svg"]] as const;

export function ModelStack({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center ${compact ? "justify-center gap-x-2 gap-y-1" : "gap-x-2.5 gap-y-1.5"}`}>
      <span className="text-ink-mute">LLM stack</span>
      {models.map(([model, logo], i) => (
        <span key={model} className="inline-flex items-center gap-1.5 text-ink-soft">
          {i > 0 && <span aria-hidden className="text-ink-mute/60">·</span>}
          <img src={logo} alt="" aria-hidden width={14} height={14} className="h-3.5 w-3.5 object-contain opacity-75" />
          <span>{model}</span>
        </span>
      ))}
    </div>
  );
}
