# Competitive Gap Analysis (2026-05-25)

## Objective
Identify feature gaps between current AudioSync and leading audiobook apps in 2026, then rank what closes the gap fastest.

## Reference set
- Prologue (official): https://prologue.audio/
- Prologue iOS listing/changelog: https://apps.apple.com/us/app/prologue-audiobook-player/id1459223267
- BookPlayer vs Bound comparison snapshot: https://www.bookrunch.org/comparison/BookPlayer_vs_Bound/
- Audiobook player roundup snapshot: https://www.bookrunch.org/top/audiobook-players/
- Community signals (2026):
  - https://www.reddit.com/r/audiobooks/comments/1rpmuiv/good_local_audiobook_player/
  - https://www.reddit.com/r/audible/comments/1qtll3s/anyone_here_buy_books_from_audible_but_listen_on/

## Current AudioSync strengths
- Local-first import and playback with modern PWA delivery.
- Worker-based waveform and chapter/bookmark playback UX.
- AI chapter fallback and AI helper surface.
- Search + smart collections + export baseline.

## Gap clusters vs leading apps

### 1) Sync reliability and ecosystem parity (High impact)
What leaders do well:
- Seamless cross-device state continuity (progress/bookmarks/queue/settings)
- Robust offline/online reconciliation

Current gap:
- Connector exists, but conflict-aware sync engine + durable retry behavior is shallow.

### 2) Playback depth (High impact)
What leaders do well:
- Per-book settings (speed/EQ/boost/rewind behavior)
- Interruption-aware rewind behavior and reliable long-session handling

Current gap:
- Baseline speed/rewind exists, but per-book persistent playback profiles and deeper DSP options are limited.

### 3) Queue and collection workflows (High impact)
What leaders do well:
- Queue editing, play-next, queue from collections, unfinished-first logic

Current gap:
- Library/collection structure is strong, queue management is minimal.

### 4) Platform shell polish (Medium-high impact)
What leaders do well:
- High-trust startup/loading UX, cover-heavy browsing polish, media surfaces (widgets/car/watch)

Current gap:
- Loading/branding improved, but external platform surfaces are limited.

### 5) Metadata and long-tail library quality (Medium impact)
What leaders do well:
- Better narrator/series normalization, chapter edge-case handling, artwork consistency

Current gap:
- Metadata editing exists, advanced normalization pipelines remain limited.

## Priority ranking (bridge plan)
1. Reliable sync engine (progress/bookmarks/queue/settings + conflict log)
2. Queue system + collection playback rules
3. Per-book playback profiles (+ interruption-aware rewind)
4. Offline download manager with retry/resume and storage controls
5. Metadata normalization pipeline (series/narrator/chapter edge cases)
6. Platform expansion (CarPlay/Android Auto/watch/widgets)

## Definition of "gap closed"
A gap is closed only when:
- feature exists,
- persisted state is reliable across refresh/reopen,
- automated tests cover the critical path,
- docs and roadmap status are updated with evidence.
