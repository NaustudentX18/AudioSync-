# AudioSync

Local-first audiobook web app with import, playback, bookmarks, AI helpers, and PWA support.

## Current status (as of 2026-05-25)
- Core roadmap phases 1–5 are implemented and verified in this repo.
- Bridge-to-market phase (feature parity with top audiobook apps) is now planned in:
  - `docs/competitive-gap-analysis-2026-05-25.md`
  - `docs/feature-parity-roadmap-2026-05-25.md`

## Demo and screenshots (real project assets)
- Demo video: `assets/demo.mp4`
- Demo animation: `assets/demo.gif`
- Screenshots:
  - `assets/library.png`
  - `assets/player.png`
  - `assets/voices.png`
  - `assets/intelligence.png`
  - `assets/settings.png`
- Branding assets:
  - `assets/logo.svg` / `public/logo.svg`
  - `assets/banner.png`

## Implemented capabilities
### Library
- Import: TXT, EPUB, PDF, FB2, MOBI
- Drag/drop and batch import
- Metadata edit + cover upload
- Search (Fuse + FlexSearch)
- Smart collections

### Player
- Waveform canvas rendering (worker)
- Chapters + chapter jump
- Resume position persistence
- Speed + smart rewind
- Sleep timer (duration/chapter modes)
- Media Session integration
- Bookmarks (note/quote)

### Platform
- PWA + offline runtime caching + background sync queue
- IndexedDB/Dexie persistence
- Web vitals + global error monitoring hooks
- i18n baseline + RTL toggle
- CI (lint/test/build) + Playwright smoke test

## Important implementation notes
- MOBI support includes a local heuristic fallback parser when Calibre is unavailable.
- Audiobookshelf sync is implemented as a baseline connector path and requires server env configuration for full push behavior.
- Large AI/PDF chunks are lazy-loaded; initial app load remains optimized.

## Development
```bash
npm install
npm run dev
```

## Verify
```bash
npm run lint
npm run test
npm run build
npm run test:e2e
```

## Roadmap + execution tracking
- Detailed roadmap: `docs/roadmap-detailed.md`
- Live task board: `TODO.md`
- Optimization audit: `docs/optimization-audit-2026-05-25.md`
- Feature parity bridge plan: `docs/feature-parity-roadmap-2026-05-25.md`

## License
MIT
