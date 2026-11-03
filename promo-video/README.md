# Twyn AI hackathon demo film

This folder contains the isolated, code-driven product-film project. It does not change the Twyn production frontend or backend.

## Current capture policy

Use an isolated SQLite demo API and the real Next.js UI. Never load `api/.env` secrets into the capture process. Never point the capture backend at Neon. Keep all captured data synthetic.

## Planned commands

```powershell
# from the repository root
cd promo-video
npm install
npm run capture
npm run render
npm run render:vertical
```

The final deliverables are:

- `out/twyn-hackathon-demo.mp4`
- `out/twyn-hackathon-demo-vertical.mp4`
- `out/twyn-hackathon-demo-poster.png`

## V2 launch film

V2 is additive: it does not overwrite the V1 composition, footage, or exports. Its research, plan, source, capture library, and asset policy are in `TWYN-V2-*.md`, `v2/`, and `ASSET-CREDITS-V2.md`.

```powershell
# Start an isolated SQLite API on 8101 and the frontend on 3101 first.
npm run capture:v2
npm run audio:v2
npm run render:v2
npm run poster:v2
npm run frames:v2
```

V2 capture must never use Neon or production credentials. Its output is `out/twyn-hackathon-demo-v2.mp4`. The timed visual storyboard is `v2/STORYBOARD-V2.md`; ready-to-post copy is `V2-CAPTION.md`.

## Quality gates

- 1920x1080, 30 fps, H.264 MP4 with AAC audio.
- No secrets, tokens, production data, or private user information in frames, source assets, or logs.
- Every provider/model/Gnani claim must match `RESEARCH.md` and the application code.
- Capture, render, frame extraction, and visual inspection must all pass before publication.
