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

## Quality gates

- 1920x1080, 30 fps, H.264 MP4 with AAC audio.
- No secrets, tokens, production data, or private user information in frames, source assets, or logs.
- Every provider/model/Gnani claim must match `RESEARCH.md` and the application code.
- Capture, render, frame extraction, and visual inspection must all pass before publication.
