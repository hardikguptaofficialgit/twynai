# Twyn V2 launch-film research and technical audit

Research date: 2026-11-03. This is a read-only audit of the current Twyn application, V1 film, and four reference implementations. V1 is not altered by this document.

## Executive audit

Twyn is a Next.js 15 frontend in `web/` backed by the FastAPI application in `api/`. The existing video project is isolated in `promo-video/`; its V1 output is a 60.053-second, 1920x1080, 30fps H.264/AAC film at `out/twyn-hackathon-demo.mp4` plus a separately composed 1080x1920 version.

V1 proves the core workflow: it uses actual local Twyn UI footage, synthetic demo data in an isolated SQLite API, the actual Twyn SVG marks, and a truthful technology section. It should remain exactly as it is. V2 should improve authored pacing, shot variety, cursor choreography, texture, depth, transitions, and audio direction—not substitute product screens with mockups.

## Workspace and V1 inventory

### Twyn application

- `web/app/page.tsx` is the real landing page. Its hero already supplies the best V2 value proposition: “You, on call. Even when you’re not.” It also contains the real claim-handle CTA and a product-native call-card demonstration.
- `web/app/onboarding/page.tsx` is a real 11-step creation flow: Handle, Name, Role, About, Languages, Style, Knowledge, Voice, Calendar, Availability, and Publish. It uses `AnimatePresence` with directional x transitions for each step.
- `web/app/p/[handle]/page.tsx` is the visitor surface with Chat, Talk, and Book modes. This must be V2’s primary payoff footage.
- `web/app/studio/*` provides the owner-facing Studio, including persona, voice, conversations, availability, bookings, leads, and settings.
- `web/app/globals.css` defines the brand rules: warm canvas/paper surfaces; ink, lilac, mint, peach, sky, and butter; clay and glass surfaces; hairline rules; restrained shadows. Its own comment explicitly says “no glow, no gradients, no emojis.” V2 must honor that rule. Selective translucent glass is valid because it is already native to Twyn.
- `web/app/layout.tsx` establishes the actual type stack: Gloock display, Hanken Grotesk body, JetBrains Mono metadata, plus Indian-language fallbacks.

### Verified product and technology truth

- `api/app/voice.py` implements Gnani Vachana Prisma v3 STT at `/stt/v3` with `prisma-v3.0`, `indic-auto`, and `codemix`.
- The same file implements Gnani Timbre inference at `/api/v1/tts/inference`, streaming TTS at `/api/v1/tts/sse`, and voice-clone embeddings at `/api/v1/tts/voice-clone/embeddings`. When a stored embedding is present, synthesis selects `vachana-vc-v1`.
- `api/app/llm.py` implements the ordered provider chain Meta → NVIDIA → Groq → OpenRouter → deterministic mock fallback. Verified model values are Meta `muse-spark-1.3`, NVIDIA `openai/gpt-oss-20b`, Groq `openai/gpt-oss-120b`, and OpenRouter `openai/gpt-4o-mini`.
- `api/app/rag.py` uses FastEmbed’s `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` through an ONNX-backed runtime, with a hashing fallback. It also contains Hinglish glossing.
- The product has real `check_availability`, `book_meeting`, and `capture_lead` tool schemas. V2 may show outcomes that correspond to these routes, but must not invent agent actions or claim a live provider call when capture uses the local fallback.

### V1 composition and capture architecture

- `promo-video/src/index.tsx` registers only `TwynLaunchFilm` and `TwynLaunchFilmVertical`, both at 1,800 frames / 30fps.
- `promo-video/src/TwynLaunchFilm.tsx` is a single 136-line composition with six sequential beats: 0–4s hook, 4–10s landing, 10–25s onboarding, 25–38s technology, 38–52s visitor experience, and 52–60s end card.
- `BrowserShot` uses the same desktop browser shell for every product scene. `Cursor` is a fixed-position CSS triangle with a fixed click ring. `Intelligence` is a three-card architecture layout. There is one global synthetic WAV mounted at 42% volume.
- `promo-video/capture/capture.mjs` uses Playwright with a 1440x900 viewport, records genuine browser interactions, creates deterministic `*.demo.invalid` owners/personas via the isolated local API, and writes a capture manifest. It captures landing, onboarding, public chat/book, Studio, and Talk UI.
- Normalized V1 footage exists under `promo-video/public/footage/`: five 1440x900 / 25fps VP8 clips, 4.48–11.8 seconds each. The original Playwright artifacts remain under `promo-video/capture/footage/` and must not be deleted or overwritten.
- `promo-video/audio/make-audio.py` generates V1’s 60-second 48kHz stereo WAV from synthesized pad, kick, and cue tones. There are no discrete UI SFX stems, no music/voice ducking envelope, and no beat-map document.
- `promo-video/package.json` renders directly with Remotion H.264/JPEG frames/AAC at concurrency 2. Its `frames` command uses FFmpeg’s obsolete `-vsync` option on the installed FFmpeg 9 build; this is a V1 maintenance issue, not something V2 should modify.

### What V1 can safely donate to V2

- Actual Twyn SVG mark and wordmark copies in `promo-video/public/brand/`.
- The safe isolated capture approach, the deterministic persona seed, and the established local route coverage.
- The verified product/technology claims in `RESEARCH.md`.
- The raw footage as reference only. V2 should create a new `capture/v2/` session with clean, shot-specific takes rather than editing or replacing V1 files.

### What V2 must replace

1. A one-file timeline with only generic `Sequence`s.
2. One browser treatment for every product shot.
3. Fixed coordinates and a triangle cursor that does not follow real click paths.
4. A static three-card “architecture slide.”
5. Repeated fade/scale movement and looping footage.
6. The single undifferentiated synthesized sound bed.
7. A 16:10 product source scaled into a 16:9 browser treatment without per-shot framing decisions.

## Reference repository study

The repositories were cloned read-only to `C:\Users\hardi\twyn-v2-references` at the commits listed below. Their source code was inspected directly.

### 1. sub-level/marketing-videos — `696073f596079c137cb8dffa00c4bb56dc508308`

Interesting implementation:

- `src/Root.tsx` treats compositions as editions, loads only required font weights once, and keeps portrait as a deliberate layout variant.
- `src/example/ExampleVideo.tsx` uses a persistent `Backdrop` and `GlobalChrome` outside the `Series`, which makes separate scenes feel like one continuous film.
- `src/lib/KineticCaption.tsx` adds per-word rise/blur/reveal while keeping a local legibility scrim only during active text.
- `src/lib/MusicBed.tsx` uses explicit frame-keyed volume curves; `src/lib/SfxCue.tsx` places one-shot effects as timeline events.
- `src/lib/GeometryWords.tsx` maintains one continuous piece of geometry across several word changes. Its comments correctly identify why recreating graphics per scene reads as a slide deck.
- `scripts/render-supersampled.sh` renders a 2× PNG master, downscales with Lanczos, and explicitly sets BT.709/yuv420p/faststart for delivery.

Adopt for Twyn:

- One continuous Twyn “signal” motif that starts at the opening and changes state through creator → intelligence → voice → visitor, rather than introducing unrelated cards in each scene.
- Shared scene tokens, a beat map, local scene-relative clocks, per-shot typography, and audio cue components.
- A dedicated high-quality delivery command with V2-specific output names.

Do not adopt:

- The dark generic glow/backdrop language, dust fields, or gradients. They conflict with Twyn’s warm paper/clay/glass identity.
- A persistent progress bar or “made with code” chrome. It is useful for a tutorial series but would weaken a premium product launch.

License: MIT. The implementation ideas may inform original Twyn code; no source is to be copied wholesale.

### 2. Remocn/remocn-collections — `bcccd3d3350320f12056fdb6e0f0d005f80fbd84`

Interesting implementation:

- `src/tiktoks/tut-01-five-transitions/index.tsx` makes transition choice semantic: `zoomBlur` for an energy jump, `focusPull` for attention moving, `pushThrough` for going deeper, and `whipPan` for a subject change.
- `src/components/remocn/zoom-blur.tsx` applies a simple scale + limited blur rather than a generic explosion effect.
- `src/components/remocn/focus-pull.tsx` stages exit and entry at different points in progress, with brightness/blur resolving late; this sells a focal shift.
- `src/tiktoks/tut-04-fake-a-live-demo/index.tsx` uses `Freeze` and a negative inner `Sequence` to resume exactly from the frozen opening state. Its labels intentionally land away from clicks.
- `src/lib/remocn-ui/motion.ts` centralizes named motion personalities; `src/lib/remocn-ui/timeline.ts` separates text/state timelines from component presentation.

Adopt for Twyn:

- Use a focus-pull/controlled push when attention moves from the landing CTA into onboarding, then a short directional blur wipe only where one actual UI surface becomes another.
- Freeze a clean actual UI state to introduce a line of editorial copy, then resume the same capture underneath. This improves legibility without replacing the product.
- Define a small V2 motion vocabulary: `settle`, `press`, `focus`, `handoff`, and `resolve`; do not apply the same spring everywhere.

Do not adopt:

- Smoke rings, shaders, metaballs, holograms, or generic grain as a default surface.
- Whip-pans as repeated scene transitions. At most one short directional handoff should be used, and only between visually compatible actual browser shots.
- Any fake application UI; its templates are examples, not product footage.

License status: no root license file was found in the checked clone. Treat its source as inspiration only; do not copy code or visual assets.

### 3. naveen-annam/creativly.ai-higgsfield-video-remotion — `409a4893c5b597ae456eb54f31994e5e9fe32d98`

Interesting implementation:

- `src/tokens.ts` is a timing ledger: scenes, source frame ranges, palette, motion configs, beat starts, and total duration are all data.
- `src/VideoComposition.tsx` maps scene metadata to `Sequence`s and premounts each scene for 20 frames to avoid late asset state during cuts.
- `src/helpers.ts` centralizes spring progress, fade windows, reveal styles, hero entrances, seeded randomness, and easing aliases.
- `src/scenes/Scene01_Seg000.tsx` models a source video as exact interaction beats—panel state, direction, variable-rate type, cursor morph, toggle resolve—not vague “animate in” instructions.
- `src/scenes/Scene10_Seg009.tsx` gives every element a specific beat: masonry/hero entry, dim, input rise, type-on, cursor approach, press, wash, logo resolve.

Adopt for Twyn:

- Write V2 as a timed shot ledger before coding, with a record of every cue, subtitle, camera target, click coordinate, SFX, and state change.
- Use per-shot alpha/position/scale curves rather than a global fade. Give type a natural cadence and punctuation pauses.
- Use deterministic seeded secondary motion only for restrained ambient depth, not decorative particles.

Do not adopt:

- Its AI-generated lifestyle/product imagery. Twyn V2 must be led by actual product footage.
- A frame-for-frame recreation approach. The engineering discipline is useful; the aesthetic must stay distinct.

License: MIT. Techniques only; no scene visuals, imagery, or source copied.

### 4. locomotion-pro/locomotion — `d42711f950c2c6776056df4d9c7c729d4490ba50`

Interesting implementation:

- `remotion/Root.tsx` registers a data-driven composition catalog, including style variants rather than branching individual templates.
- `remotion/render.mjs` bundles once, selects compositions programmatically, renders H.264 media, supports targeted output selection, and reports failures per composition.
- `src/templates/ui-walkthrough/Composition.tsx` and `src/templates/onboarding-flow/Composition.tsx` show useful state sequencing concepts: one action at a time, spring-settled screen, staggered progress, cursor movement, and tooltip separation.
- `src/templates/screen-showcase/Composition.tsx` demonstrates a reusable framed-screen/callout layout.

Adopt for Twyn:

- A V2-only render entry point and scripts that keep V1 render commands unchanged.
- Typed scene metadata and reusable primitives for browser frames, focus masks, physical cursor paths, glass captions, waveform, and sound cues.

Do not adopt:

- The generic fake dashboard/browser templates. V2 will use actual Twyn recordings and stills only.
- Global style filters such as CSS inversion; V2’s color direction must be designed from Twyn’s actual tokens.

License status: no root license file was found in the checked clone. Treat its code as inspiration only.

## V2 visual thesis

The film should behave like a product made of one living presence—not a tour of six slides. The key visual thread is a restrained lilac “conversation signal”: a thin line/pulse born beside the Twyn mark, traveling into the creator’s setup, resolving into the public Twyn, and finally becoming the voice waveform. It is not an “AI brain,” particle field, or generic neon effect. It is a brand-native way to connect product truth across scenes.

The film opens on ink, then reveals warm Twyn paper. It moves from an unavailable creator to a configured Twyn, then to a visitor’s real conversation. All technical explanation is embedded into the journey, using short, verifiable labels and actual captured interfaces.

## V2 facts and limitations that control the edit

- Capture must use a new isolated SQLite database and synthetic `demo.invalid` identities only.
- Calls to real paid AI/voice providers remain disabled by default. A deterministic local conversation can be shown as the product’s local demo path; V2 must not label that response as a live Gnani-generated voice.
- Gnani’s UI and data flow can be shown because they are verified in source. A filmed live clone/audio response requires a separately captured successful local Gnani session and explicit verification.
- Current local recordings are 25fps, so V2 should capture at 30fps to prevent cadence conversion artifacts.
- Existing V1 assets, clips, screenshots, and output remain immutable. V2 will be additive under separate `v2` folders.
