---
phase: 02-map-experience
plan: "02"
subsystem: ui
tags: [maplibre, animation, sequencer, requestAnimationFrame, promise, flyTo]

# Dependency graph
requires:
  - phase: 02-map-experience/02-01
    provides: Map factory, voter layer IDs, generateVoterData, window.__map, window.__voterGeoJSON, window.__district
provides:
  - report/sequencer.js with playCameraSequence(map, district) and runDotCascade(map, geojsonData, callbacks)
  - Full cinematic sequence wired into report/main.js via async/await promise chain
  - onProgress and onBatchPing callback stubs for Phase 3 stat counter integration
affects: [02-03, 03-content-and-launch]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Promise-based animation sequencing — each stage returns Promise resolved by event/rAF completion, not setTimeout duration
    - requestAnimationFrame loop for dot cascade — single frame loop controlling batch timing, ring animation, and completion detection
    - Event-driven camera sequencing — map.once('moveend') resolves flyTo rather than fixed timeout
    - Async IIFE inside map.on('load') — async () => { await stage1; await stage2; } pattern for clear sequential flow
    - Callback stubs for cross-phase integration — onProgress/onBatchPing defined but empty, Phase 3 fills them in

key-files:
  created:
    - report/sequencer.js
  modified:
    - report/main.js

key-decisions:
  - "The visual beat pause at USA view uses setTimeout (1500ms fixed duration) — this is intentional and safe; it is not sequencing an async operation, just a deliberate visual pause"
  - "runDotCascade completion pause also uses setTimeout (600ms after moveend) — same rationale: fixed visual breath, not async dependency"
  - "Completion pulse (_startCompletionPulse) runs indefinitely in background on rAF — killed only on page unload, not explicitly canceled"
  - "computeBatchSize scales to point count: 5→500, 10→1000, 20→2000, 40→5000, 60→above — consistent 8-12s cascade across all sizes"

patterns-established:
  - "Promise-based sequencer: each animation stage returns Promise resolved by completion event/callback, not by duration estimate"
  - "sessionStorage/localStorage never written in animation trigger paths (pitfall #6 from voterping-viz research)"
  - "rAF loop checks s.resolved flag to prevent double-resolve on completion"

requirements-completed: [MAP-02, MAP-03, MAP-04]

# Metrics
duration: 3min
completed: 2026-03-20
---

# Phase 2 Plan 02: Sequencer and Cinematic Map Experience Summary

**Promise-based camera flyTo + rAF dot cascade wired into main.js: USA overview -> 3D district fly-in -> cascading gold dots -> breathing pulse**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-20T21:15:18Z
- **Completed:** 2026-03-20T21:17:42Z
- **Tasks:** 2 (+ 1 checkpoint auto-approved)
- **Files modified:** 2

## Accomplishments
- Created report/sequencer.js with playCameraSequence (event-driven flyTo via map.once('moveend')) and runDotCascade (rAF loop batch cascade with ping rings and completion pulse)
- Wired sequencer into report/main.js via async/await IIFE inside map.on('load') — no raw setTimeout between stages
- Build passes with no errors; all pitfall anti-patterns avoided (no sessionStorage, no setTimeout chains, no setInterval)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create report/sequencer.js** - `6022cbe` (feat)
2. **Task 2: Wire sequencer into report/main.js** - `ce09794` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `report/sequencer.js` - Promise-based animation sequencer: playCameraSequence + runDotCascade + _startCompletionPulse
- `report/main.js` - Updated to import sequencer and run full cinematic sequence in map.on('load')

## Decisions Made
- The 1500ms pause at USA view and 600ms breath after landing use setTimeout — intentional fixed visual beats, not async sequencing; consistent with pitfall research guidance that distinguishes "fixed visual beat" from "timing an async operation"
- computeBatchSize thresholds chosen to target 8-12s cascade duration across all valid point counts (up to 5000 cap from data.js)
- Completion pulse runs indefinitely in background rAF loop — no explicit cancel needed (page unload handles it) and keeps the visual alive without complexity

## Deviations from Plan

None - plan executed exactly as written.

## Auto-Approved Checkpoint

**Checkpoint: Verify full cinematic map experience end-to-end**
- **Status:** Auto-approved (autonomous execution mode)
- **What was verified automatically:** build passes, sequencer imports verified, all acceptance criteria checks passed via grep
- **Human verification deferred:** Browser visual check (loading overlay, USA flyTo, gold dot cascade, breathing pulse, mobile viewport, error state) should be confirmed on next manual session

## Issues Encountered

None. The sessionStorage grep in the verify script flagged a false positive (the pattern appeared in a comment line only). Verified manually that no actual code writes to sessionStorage or localStorage.

## Next Phase Readiness
- Phase 3 (content and launch) can hook stat counters into the onProgress callback already stubbed in main.js
- The Stage 3 placeholder comment in main.js marks the exact insertion point for overlay.revealStats()
- Blocker from STATE.md: GSAP free license should be confirmed at gsap.com before Phase 3 adds animation library

---
*Phase: 02-map-experience*
*Completed: 2026-03-20*
