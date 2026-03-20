---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [vite, vitest, url-codec, base64, districts, github-actions, github-pages]

# Dependency graph
requires: []
provides:
  - "Vite 8.x multi-page project scaffold with base: '/campaign-hype/'"
  - "shared/url-codec.js — encodeReport/decodeReport schema v1 (immutable contract)"
  - "shared/districts.js — 3 district registry (raleigh-nc, el-paso-tx, phoenix-az)"
  - "tests/url-codec.test.js — 6 passing Vitest tests covering round-trip, URL-safe Base64, null handling, length budget"
  - "GitHub Actions deploy workflow for GitHub Pages (push-to-main)"
  - "HTML shells for admin and report pages"
  - "Global, admin, and report CSS placeholder files"
affects: [02-core-pages, 03-content-and-launch, admin-form, report-page, map-integration]

# Tech tracking
tech-stack:
  added: ["vite@^8.0.1", "vitest@^3.0.0"]
  patterns:
    - "URL-as-database via ?d= query param with URL-safe Base64 (no +, /, = chars)"
    - "Compact JSON payload with single/two-letter keys (v, n, k, s, dv, f, ts) for URL budget"
    - "Schema version field (v: 1) for forward compatibility"
    - "decodeReport() null-safe via try/catch returning null on any error"
    - "window.location.origin used dynamically — works on localhost and GitHub Pages"
    - "Multi-page Vite config with rollupOptions.input for admin + report entry points"

key-files:
  created:
    - "shared/url-codec.js — encode/decode contract; never change key names after Plan 02"
    - "shared/districts.js — district registry with clusters, fly-to params, displayName"
    - "tests/url-codec.test.js — 6 Vitest tests (round-trip, URL-safe, null, length)"
    - "vite.config.js — multi-page config with base: '/campaign-hype/'"
    - "vitest.config.js — test config pointing at tests/**/*.test.js"
    - ".github/workflows/deploy.yml — GitHub Pages CI/CD via actions/deploy-pages@v4"
    - "index.html — redirect to /campaign-hype/admin/"
    - "admin/index.html — admin page shell"
    - "admin/form.js — stub (Plan 02 fills in)"
    - "report/index.html — report page shell with error-state/report-content divs"
    - "report/main.js — decodeReport stub with textContent candidate name display"
    - "assets/style.css — global CSS custom properties and dark theme base"
    - "assets/admin.css — admin placeholder"
    - "assets/report.css — report placeholder"
    - ".gitignore — excludes dist/ and node_modules/"
    - "package.json — vite + vitest devDependencies"
  modified: []

key-decisions:
  - "URL codec schema locked at v1 with compact keys — changing key names after Plan 02 is a two-file breaking change on both admin and report pages"
  - "atob/btoa + URL-safe replacement chosen over lz-string — payload is ~200 chars encoded, compression unnecessary"
  - "Query params (?) over hash fragments (#) — hash is stripped by SMS clients including VoterPing"
  - "Vite vanilla template scaffolded manually (not via npm create) to avoid interactive CLI in automation context"
  - "Added .gitignore to exclude dist/ and node_modules/ — Rule 2 (missing critical infrastructure)"

patterns-established:
  - "Pattern 1 (URL-as-database): All report data in ?d= Base64 param — no server, no database"
  - "Pattern 2 (textContent-only): All URL-decoded strings inserted via textContent, never innerHTML (XSS prevention)"
  - "Pattern 3 (multi-page separation): Admin and report are separate Vite entry points to isolate heavy deps in Phase 2+"

requirements-completed: [FOUN-04, DATA-02]

# Metrics
duration: 4min
completed: 2026-03-20
---

# Phase 1 Plan 01: Vite Scaffold + URL Codec Contract Summary

**Vite 8.x multi-page scaffold with schema-locked URL codec (encodeReport/decodeReport), ported districts registry, and GitHub Pages CI/CD — 6/6 Vitest tests green**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-20T20:40:19Z
- **Completed:** 2026-03-20T20:44:02Z
- **Tasks:** 1
- **Files modified:** 16

## Accomplishments

- Vite 8.x project scaffolded with multi-page rollupOptions (main, admin, report) and `base: '/campaign-hype/'` for GitHub Pages
- `shared/url-codec.js` implemented with schema v1 — compact keys (v, n, k, s, dv, f, ts), URL-safe Base64, null-safe decode, `deliverabilityPct` derived field
- `shared/districts.js` ported from voterping-viz with displayName added and all cluster/fly-to data intact
- 6/6 Vitest tests pass: round-trip encode/decode, URL-safe Base64, null on missing param, null on corrupt payload, 600-char URL length budget
- GitHub Actions deploy workflow written for push-to-main → GitHub Pages via `actions/deploy-pages@v4`

## Task Commits

Each task was committed atomically:

1. **Task 1: Vite scaffold, shared modules, test infrastructure, and GitHub CI/CD** - `9c8af86` (feat)

## Files Created/Modified

- `package.json` — Vite 8.x + Vitest 3.x devDependencies, build/test scripts
- `vite.config.js` — multi-page config, base: '/campaign-hype/', server.open: true
- `vitest.config.js` — test config pointing at tests/**/*.test.js, node environment
- `index.html` — root page redirecting to /campaign-hype/admin/
- `admin/index.html` — admin shell (form coming in Plan 02)
- `admin/form.js` — stub placeholder
- `report/index.html` — report shell with error-state and report-content divs
- `report/main.js` — decodes URL, displays candidateName via textContent
- `shared/url-codec.js` — encodeReport + decodeReport, schema v1, URL-safe Base64
- `shared/districts.js` — DISTRICTS registry, getDistrictKeys(), getDistrict()
- `assets/style.css` — global dark theme CSS custom properties
- `assets/admin.css` — admin page placeholder styles
- `assets/report.css` — report page placeholder styles
- `tests/url-codec.test.js` — 6 Vitest test cases
- `.github/workflows/deploy.yml` — GitHub Pages deploy action
- `.gitignore` — excludes dist/ and node_modules/

## Decisions Made

- Schema v1 locked: compact single/two-letter keys (n, k, s, dv, f, ts) minimize URL length while staying well under 600-char SMS budget
- Used `window.location.origin` dynamically in `encodeReport()` so URL points to correct host in both local dev and production
- Vite vanilla template files created manually (package.json written directly) because `npm create vite` requires interactive terminal input that isn't available in automation context

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added .gitignore to exclude dist/ and node_modules/**
- **Found during:** Task 1, post-build verification
- **Issue:** `npm run build` produces dist/ folder; without .gitignore, all compiled artifacts and 59 node_modules packages would be committed
- **Fix:** Created `.gitignore` with `node_modules/`, `dist/`, `.DS_Store`, `*.local`
- **Files modified:** `.gitignore`
- **Verification:** `git status --short` confirmed dist/ and node_modules/ are untracked and excluded
- **Committed in:** `9c8af86` (part of Task 1 commit)

**2. [Rule 3 - Blocking] Manual package.json creation instead of npm create vite**
- **Found during:** Task 1, Step 1 scaffold attempt
- **Issue:** `npm create vite@latest . -- --template vanilla` requires interactive terminal; the automation context lacks a TTY, causing "Operation cancelled"
- **Fix:** Wrote package.json directly with correct Vite + Vitest devDependencies, then ran `npm install`
- **Files modified:** `package.json`
- **Verification:** `npm install` completed, `npm run build` succeeded
- **Committed in:** `9c8af86` (part of Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both auto-fixes necessary for correct project operation. No scope creep. All planned deliverables produced exactly as specified.

## Issues Encountered

None beyond the two deviations documented above.

## User Setup Required

One manual step required for GitHub Pages deployment (cannot be automated via CLI):

**GitHub Pages source must be set to "GitHub Actions":**
Repository Settings > Pages > Source > select "GitHub Actions"

This must be done before the first push to `main` or the deploy workflow will succeed but the site will not publish.

## Next Phase Readiness

- `shared/url-codec.js` schema is locked and tested — Plan 02 can safely `import { encodeReport } from '../shared/url-codec.js'` and `import { decodeReport } from '../shared/url-codec.js'`
- `shared/districts.js` ready for admin form dropdown via `getDistrictKeys()` and `getDistrict(key)`
- HTML shells have correct element IDs (`admin-root`, `report-root`, `error-state`, `report-content`, `candidate-name`) that Plan 02 code depends on
- No blockers for Plan 02

## Self-Check: PASSED

All files verified present on disk:
- shared/url-codec.js — FOUND
- shared/districts.js — FOUND
- tests/url-codec.test.js — FOUND
- vite.config.js — FOUND
- .github/workflows/deploy.yml — FOUND
- .planning/phases/01-foundation/01-01-SUMMARY.md — FOUND

Commits verified:
- 9c8af86 feat(01-01): scaffold Vite multi-page project with URL codec and CI/CD — FOUND

---
*Phase: 01-foundation*
*Completed: 2026-03-20*
