# Twyn V2 implementation plan

Status: research complete; implementation intentionally not started. This plan preserves every V1 source file, capture, screenshot, and output.

## V2 boundary and proposed structure

V2 will be additive. V1 files stay in place and V1 scripts keep their current behavior.

```text
promo-video/
  src/                         # V1 remains untouched
  v2/
    src/
      RootV2.tsx
      TwynLaunchFilmV2.tsx
      tokens.ts
      components/
        CinematicBrowser.tsx
        CursorPath.tsx
        FocusMask.tsx
        KineticLine.tsx
        ConversationSignal.tsx
        GlassCaption.tsx
        VoiceWave.tsx
        SoundCue.tsx
      scenes/
        HookV2.tsx
        CreateV2.tsx
        IntelligenceV2.tsx
        VisitorV2.tsx
        EndV2.tsx
    capture/
      capture-v2.mjs
      manifest-v2.json
      footage/                 # New files only
      stills/                  # New files only
    public/
      v2/
        footage/
        stills/
        audio/
        brand/                 # Copies, never moves V1 assets
    beat-map-v2.json
    storyboard-v2.md
  out/
    twyn-hackathon-demo-v2.mp4
```

The final root registration will add a V2 composition only; it will not rename, replace, or retime `TwynLaunchFilm` or `TwynLaunchFilmVertical`. V2 gets separate `capture:v2`, `render:v2`, `render:v2:vertical`, `poster:v2`, and `frames:v2` commands.

## Beat map target

30fps, 1,800 frames, 60 seconds, 1920x1080. Portrait is a separately composed V2 layout if it is produced; it is not a crop.

| Time | Frames | Story beat | Product truth | Primary motion / sound cue |
|---|---:|---|---|---|
| 0:00–0:05 | 0–149 | Absence → possibility | Twyn mark; brand proposition | Ink canvas, logo/signal reveal, two strong typography landings, opening impact. |
| 0:05–0:15 | 150–449 | Create your Twyn | Landing claim CTA; handle/name/role | Actual capture, focus push to CTA, physically eased cursor, click tick. |
| 0:15–0:27 | 450–809 | Make it yours | Style, knowledge, voice UI | Shot-specific close-ups, match cuts between fields, real typing cadence. |
| 0:27–0:38 | 810–1139 | Intelligence becomes conversation | Verified RAG, LLM chain, Gnani voice path | Signal passes through short labels—not a provider-logo wall; Gnani gets the resolved voice moment. |
| 0:38–0:53 | 1140–1589 | Public Twyn payoff | `/p/[handle]`, chat, Talk UI, booking | Controlled camera push, message/type/reply cadence, voice UI waveform tied to audio rhythm. |
| 0:53–1:00 | 1590–1799 | Presence, resolved | Actual wordmark and verified URL | Glass depth resolves to ink field, final impact, readable hashtags hold. |

## P0 — essential for cinematic quality

### P0.1 Rebuild V2 as a scene system rather than a monolithic file

- Current issue: V1’s hook, footage treatments, intelligence scene, end card, and cursor live in `src/TwynLaunchFilm.tsx`. This concentrates timing, styling, and behavior in one file.
- Change: create V2-only scene files, a tokenized beat map, scene-relative timings, and reusable motion primitives under `promo-video/v2/src/`.
- Reference: `creativly/src/tokens.ts`, `creativly/src/VideoComposition.tsx`, `marketing-videos/src/example/ExampleVideo.tsx`.
- Affected files: new V2 files only; the existing root gets one additional composition declaration at implementation time.
- Why: every scene gets a distinct pace and camera language while the complete film remains retimeable and reproducible.

### P0.2 Capture a new V2 shot library from the actual product

- Current issue: V1 has five 1440x900/25fps clips; onboarding is a long general take and visual framing is not designed per beat.
- Change: capture named V2 takes at a consistent 1920x1200/30fps viewport with a clean, isolated SQLite backend. Capture landing CTA, handle/name/role, tone, knowledge, VoiceCloner UI, Studio, public Chat, Talk, and Book separately. Capture stills at key action states.
- Reference: `creativly/src/scenes/Scene01_Seg000.tsx`’s documented action-beat approach; `remocn-collections/src/tiktoks/tut-04-fake-a-live-demo/index.tsx`’s single unbroken demo logic.
- Affected files: new `promo-video/v2/capture/capture-v2.mjs`, V2 footage/stills/manifest only.
- Why: short intentional takes prevent loops, let the cut rhythm follow actual action, and protect V1 evidence.

### P0.3 Replace the V1 fixed cursor with a choreographed vector cursor

- Current issue: V1 `Cursor` is a CSS triangle placed once per scene. It is not tied to product elements, has no settled hover state, and has only one click ring.
- Change: build `CursorPath` from timed keyframes per action. It will use a custom inline SVG arrow at true pointer scale, cubic-bezier travel, tiny positional overshoot, a brief hover settle, an 8–12 frame press, and one restrained ripple. Exact target rectangles will be captured by Playwright and recorded in the V2 manifest.
- Reference: the interaction timeline discipline in `creativly/src/scenes/Scene10_Seg009.tsx`; click/label separation in `remocn-collections/src/tiktoks/tut-04-fake-a-live-demo/index.tsx`.
- Affected files: new V2 cursor component, capture script, V2 scene files.
- Why: this is the difference between footage with an overlay and a deliberately directed product film.

### P0.4 Replace the technology cards with a cinematic, truthful flow

- Current issue: V1’s `Intelligence` presents three equal cards. It reads as an architecture slide and gives Gnani insufficient narrative priority.
- Change: create one continuous editorial sequence: creator knowledge → Twyn intelligence → Gnani Prisma/Timbre voice → visitor conversation. Include provider/model labels only once, as small support detail. Voice cloning is shown only as “available when a creator supplies a sample,” not as a live cloned demo unless separately verified.
- Reference: continuity principle in `marketing-videos/src/lib/GeometryWords.tsx`; semantic focus pull in `remocn-collections/src/components/remocn/focus-pull.tsx`.
- Affected files: new `IntelligenceV2.tsx`, `ConversationSignal.tsx`, V2 research/credits.
- Why: it makes Gnani’s role clear and memorable without pretending the film is a systems diagram or implying provider sponsorship.

### P0.5 Design a V2 sound plan before animating

- Current issue: V1 has one generated bed and no separate effects/beat map/mix curve.
- Change: create a V2 beat map with original music stem, opening impact, three UI clicks, one short focus whoosh, one Gnani reveal tone, and final impact. Add a `MusicBed`-style volume envelope plus reusable one-shot SFX placement. Any external sample requires documented source/license before use.
- Reference: `marketing-videos/src/lib/MusicBed.tsx` and `src/lib/SfxCue.tsx`.
- Affected files: new `promo-video/v2/beat-map-v2.json`, V2 audio generator/stems, `SoundCue.tsx`, credits.
- Why: audio provides hierarchy and makes a 60-second cut feel authored rather than like silent UI footage with a loop below it.

### P0.6 Give the product footage cinematic framing without recreating UI

- Current issue: V1 frames every product shot inside a nearly identical browser window at a nearly identical scale.
- Change: use three truthful camera modes: full browser context for discovery, close detail for real onboarding decisions, and immersive public profile push for the payoff. Use only the actual capture; Remotion may crop, mask, scale, and layer that capture but may not replace it with hand-built screens.
- Reference: source-rate/shot beat approach in `creativly`; focus pulls in Remocn.
- Affected files: new `CinematicBrowser.tsx`, `FocusMask.tsx`, V2 scenes.
- Why: it retains recognizability while creating editorial hierarchy.

## P1 — important visual improvements

### P1.1 Brand-native depth layer

- Current issue: V1 has warm colors but little depth outside browser shadows.
- Change: add sparse Twyn-native glass sheets, hairline rules, soft paper parallax, and a very quiet vignette. No neon, generic gradients, star fields, or perpetual particles.
- Reference: persistent continuity from `marketing-videos/src/example/components/Backdrop.tsx`, adapted to Twyn’s `globals.css` clay/glass tokens.
- Affected files: `tokens.ts`, `FocusMask.tsx`, scene backdrops.
- Why: creates premium spatial depth without contradicting the product design system.

### P1.2 Kinetic editorial typography

- Current issue: V1 typography mainly fades/rises as blocks.
- Change: use two short statement systems: tightly choreographed uppercase Hanken Grotesk for “YOU CAN’T BE EVERYWHERE.” / “YOUR TWYN CAN.” and Gloock for the emotional line. Use word-level timing only on key phrases, never over live product text.
- Reference: `marketing-videos/src/lib/KineticCaption.tsx` and `src/example/scenes/HookScene.tsx`.
- Affected files: `KineticLine.tsx`, Hook/End V2 scenes.
- Why: creates immediate authorship while preserving product readability.

### P1.3 Semantic, sparse transitions

- Current issue: V1 favors generic fade/scale transitions.
- Change: use a focus pull from landing CTA to onboarding, match cuts between identity/knowledge/voice controls, a signal wipe to technology, and one short directional transition into the visitor page. Each transition has a narrative reason.
- Reference: `remocn-collections/src/tiktoks/tut-01-five-transitions/index.tsx`.
- Affected files: `FocusMask.tsx`, scene handoffs.
- Why: motion becomes meaning, not decoration.

### P1.4 Proper browser/source compositing

- Current issue: V1 scales 16:10 source footage inside the same 16:9 browser shell and loops it.
- Change: capture at high resolution, crop/scale by target zone, hold only settled states, and build browser chrome as a subtle optional framing device. No visible devtools, loading, browser scrollbar, or duplicated labels.
- Reference: delivery care in `marketing-videos/scripts/render-supersampled.sh`.
- Affected files: V2 capture script, `CinematicBrowser.tsx`.
- Why: source footage looks designed for film rather than merely placed on a canvas.

### P1.5 V2 verification pipeline

- Current issue: V1 had manual frame checks but no separate V2 cue sheet or audio review evidence.
- Change: render V2 frames every five seconds, make a contact sheet, run FFprobe validation, preserve the capture manifest, and include manual full-watch and full-listen checkboxes in `storyboard-v2.md`.
- Reference: `locomotion/remotion/render.mjs` targeted programmatic rendering and Marketing Videos’ delivery script.
- Affected files: V2 scripts and docs.
- Why: ensures quality review is part of the production, not a claim after render.

## P2 — optional polish

### P2.1 Separate portrait composition

- Current issue: V1 has a portrait layout but reuses its general scene design.
- Change: after landscape is approved, author a V2 portrait layout with independently positioned type/crops and a shorter public-profile focal path.
- Reference: `marketing-videos/src/grammar/GrammarVideo.tsx` vertical context pattern.
- Why: improves social delivery without compromising the master.

### P2.2 Licensed provider marks

- Current issue: V1 wisely uses text labels for external providers.
- Change: only after a source/license/brand-usage audit, add official unmodified SVG marks at modest size to the technology sequence. If any provider’s permitted source is unclear, retain clean text labels.
- Affected files: new V2 asset credits and V2 public assets only.
- Why: credibility without accidental endorsement claims.

### P2.3 Supersampled delivery master

- Current issue: V1 renders JPEG image frames at normal scale.
- Change: add an optional V2-only `render:v2:master` script that renders 2× PNG frames and downscales with Lanczos to a distribution H.264 master, only after the creative cut is locked.
- Reference: `marketing-videos/scripts/render-supersampled.sh`.
- Affected files: V2-only render script.
- Why: improves fine typography, vectors, and diagonal edges, at the cost of time and disk space.

## Planned quality gates

Implementation cannot be called complete until all of the following are recorded:

1. V2 capture manifest has no page errors and uses only synthetic local data.
2. Each V2 product shot is visually inspected before editorial use.
3. Product claims, Gnani labels, provider names, and model IDs are checked again against `api/app/voice.py`, `api/app/llm.py`, and `api/app/rag.py`.
4. Full landscape export is watched from start to finish.
5. Final audio is listened to from start to finish on the rendered MP4; timing and mix notes are recorded.
6. Contact-sheet frames are visually reviewed for typography, clipping, cursor alignment, blank frames, crop quality, and glass readability.
7. FFprobe verifies H.264, AAC, 1920x1080, 30fps, and roughly 60 seconds.
8. V1 files, existing captures, and production application files remain unchanged.
