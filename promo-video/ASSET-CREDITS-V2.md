# Twyn V2 asset-credit policy

Status: V2 implementation. No third-party visual or audio asset has been added.

## Twyn-owned assets approved for V2 copies

- `web/public/brand/mark.svg`
- `web/public/brand/wordmark-dark.svg`
- `web/public/brand/wordmark-light.svg`
- `web/public/brand/icon.svg`
- Existing application typography loaded through `web/app/layout.tsx`: Gloock, Hanken Grotesk, JetBrains Mono, Noto Sans Devanagari, and Noto Sans Tamil.

V2 references the Twyn mark in the Remotion composition and uses actual isolated local captures of the existing Twyn interface. Original proportions and SVG paths remain intact. The V1 asset set is untouched.

## External reference repositories

- `sub-level/marketing-videos` — MIT; techniques referenced, no code/assets copied.
- `naveen-annam/creativly.ai-higgsfield-video-remotion` — MIT; techniques referenced, no code/assets copied.
- `Remocn/remocn-collections` — no root license file found in the audited clone; inspiration only, no code/assets copied.
- `locomotion-pro/locomotion` — no root license file found in the audited clone; inspiration only, no code/assets copied.

## Third-party logos and cursor assets

No Gnani, Meta, NVIDIA, Groq, OpenRouter, SVG Repo, Iconoir, Lucide, or other third-party visual asset has been downloaded or included yet.

Before including any third-party mark in V2, the production will record:

1. The exact official source URL.
2. Applicable brand/usage guidance or license.
3. Whether the mark is necessary to explain a verified integration.
4. The file hash and destination path.

If this cannot be verified, V2 will use a text label. Provider marks will never imply sponsorship, partnership, or endorsement.

## Audio

The V2 score and effects are original procedural audio produced by `v2/audio/make_v2_audio.py` and rendered to:

- `public/v2/audio/twyn-v2-bed.wav`
- `public/v2/audio/twyn-v2-fx.wav`

They contain no sampled or commercial music. No external audio asset is used.

## Product footage

The V2 footage was captured locally from the existing Twyn UI using `v2/capture/capture-v2.mjs`, against an isolated temporary SQLite database and synthetic `*.demo.invalid` persona data. The named capture source clips remain preserved under `v2/public/v2/footage`; 30 FPS H.264 render copies live under `public/v2/footage`. No production user data, credentials, or hosted API response is included.
