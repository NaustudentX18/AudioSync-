# AudioSync — Live Task Board

**Last Updated**: 2026-05-25
**Status**: Phase 4 — Testing & Release (In Progress)

## Phase 0 — Foundation ✅ COMPLETE
- [x] AGENTS.md + TODO.md
- [x] .github templates (bug_report, feature_request, PR template)
- [x] LICENSE (MIT)
- [x] docs/architecture.md
- [x] src/lib/library.ts
- [x] src/lib/tts.ts
- [x] src/lib/gemini.ts
- [x] src/App.tsx + Player component

## Phase 1 — Core Playback ✅ COMPLETE
- [x] Basic audio player with Kokoro TTS playback
- [x] Library management + file import
- [x] Real audio playback (Web Audio API + streaming)
- [x] Chapter navigation
- [x] Playback speed / sleep timer
- [x] State management (Zustand)

## Phase 2 — Intelligence Layer ✅ COMPLETE
- [x] Chapter detection (Gemini)
- [x] Book summarization UI
- [x] Smart bookmarks

## Phase 3 — Polish & Visuals ✅ COMPLETE
- [x] PWA + offline support (vite-plugin-pwa, workbox, service worker)
- [x] Theme system (dark / light / system)
- [x] Banner (assets/banner.png, 376 KB)
- [x] Demo video (assets/demo.mp4, 508 KB; demo-small.gif, 686 KB)
- [x] Logo (assets/logo.png, assets/logo.svg)
- [x] Screenshots: library, player, voices, intelligence, settings (×5)
- [x] Workbox cache increased to 5 MB for ort-wasm-simd-threaded.jsep (21 MB)
- [x] vite.config.ts patched for PWA workbox

## Phase 4 — Testing & Release 🔄 IN PROGRESS
- [x] TypeScript build: `npm run build` passes ✅
- [x] Production PWA build: v1.3.0, service worker registered
- [x] README.md rewritten with hero, badges, feature grid, screenshots, roadmap
- [x] assets/README.md with asset descriptions
- [ ] Test suite (`npm run test`) — TODO: add vitest + @testing-library/react
- [ ] E2E tests (playwright or cypress) — TODO
- [ ] CI/CD pipeline (.github/workflows/ci.yml) — TODO
- [ ] Release v1.0.0 — tag + GitHub release

## Known Issues / Technical Debt
- `__tests__/*.test.ts` — test deps missing (vitest, @testing-library/react, zustand). Not blocking build.
- `dist/index-*.js` — 2.5 MB chunk (over vite 500 kB limit). Acceptable for PWA; consider code-splitting.
- `src/App.tsx` — 1,178 lines in full version; consider splitting into tab components.
- TTS audio buffer management — verify large file handling on low-RAM devices.
