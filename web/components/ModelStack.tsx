const models = ["Groq", "Meta", "Mistral", "NVIDIA", "Muse"];

export function ModelStack({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center ${compact ? "justify-center gap-x-2 gap-y-1" : "gap-x-2.5 gap-y-1.5"}`}>
      <span className="text-ink-mute">LLM stack</span>
      {models.map((model, i) => (
        <span key={model} className="inline-flex items-center gap-2 text-ink-soft">
          {i > 0 && <span aria-hidden className="text-ink-mute/60">·</span>}
          {model}
        </span>
      ))}
    </div>
  );
}
