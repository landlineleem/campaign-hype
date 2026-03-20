# Roadmap: Campaign Hype

## Overview

Campaign Hype is built in four phases driven by a strict dependency graph: the URL codec is the contract everything depends on, so the admin form and project scaffold ship first. The cinematic map flyover is the product's hook and must be hardened before the animation sequencer is layered on top. Stat counters and the benchmark popup complete the reveal. Confetti, voter reactions, share button, and mobile polish are the final enhancement layer — the product is shippable before these are added.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - Vite scaffold, URL codec, admin form, GitHub Pages deployment (completed 2026-03-20)
- [ ] **Phase 2: Map Experience** - MapLibre flyover, WebGL recovery, cascading dot animation
- [x] **Phase 3: Stats and Sequence** - Promise-chain sequencer, animated counters, benchmark popup (completed 2026-03-20)
- [ ] **Phase 4: Celebration and Polish** - Confetti, voter reactions, share button, mobile audit

## Phase Details

### Phase 1: Foundation
**Goal**: Campaign managers can generate shareable report URLs from a working admin form deployed to GitHub Pages
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, FOUN-03, FOUN-04
**Success Criteria** (what must be TRUE):
  1. Admin can fill in candidate name, district, messages sent/delivered/failed and submit the form
  2. Submitting the form produces a valid shareable URL with all data encoded in query params
  3. The generated URL copies to clipboard with one click
  4. Admin can view all previously generated report links without leaving the page
  5. The site is live on GitHub Pages and the report page displays the candidate's name from the URL
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md — Vite scaffold, URL codec module, districts registry, GitHub Pages CI/CD
- [ ] 01-02-PLAN.md — Admin form (validation, URL generation, clipboard, link history) + report page name display

### Phase 2: Map Experience
**Goal**: Opening a report URL shows a cinematic 3D map that flies from the USA into the candidate's district and animates message delivery across it
**Depends on**: Phase 1
**Requirements**: MAP-01, MAP-02, MAP-03, MAP-04
**Success Criteria** (what must be TRUE):
  1. Report page loads and renders a full USA map view before any animation begins
  2. Map performs a smooth 3D flyTo zoom from USA level into the candidate's district
  3. After the flyover completes, cascading dots animate across the district showing message delivery
  4. The map is touch-friendly and displays correctly on a mobile phone screen
  5. If iOS Safari reclaims the WebGL context, a recovery prompt appears instead of a broken map
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — maplibre-gl install, full-screen map shell (HTML/CSS), data.js (synthetic voter GeoJSON), map.js (MapLibre init + WebGL recovery), main.js map init wiring
- [ ] 02-02-PLAN.md — sequencer.js (promise-based flyTo + dot cascade), main.js async/await sequence wiring, human-verify checkpoint

### Phase 3: Stats and Sequence
**Goal**: After the map flyover, animated stat counters roll up and an industry benchmark popup celebrates the candidate's deliverability rate — all in a controlled choreographed sequence
**Depends on**: Phase 3
**Requirements**: STAT-01, STAT-02, STAT-03, STAT-04, CELB-03
**Success Criteria** (what must be TRUE):
  1. Stat counters (sent, delivered, failed, delivery %) roll up from 0 with satisfying easing after the map sequence ends
  2. Delivery percentage is shown as a circular gauge or progress bar
  3. Numbers shake or pulse when each counter finishes
  4. An industry benchmark popup appears and celebrates when deliverability exceeds the 85-92% average
  5. Every reveal element fires in sequence — map then dots then stats then benchmark — with no overlap or timing chaos
**Plans**: 2 plans

Plans:
- [ ] 03-01-PLAN.md — overlay.js (revealStats: counter rollup, SVG gauge, shake/pulse), stat panel HTML + CSS
- [ ] 03-02-PLAN.md — showBenchmarkPopup (benchmark popup HTML/CSS/logic), main.js full sequence wiring

### Phase 4: Celebration and Polish
**Goal**: The complete experience ends with confetti and floating voter reactions, candidates can share their report, and the product performs well on mobile
**Depends on**: Phase 3
**Requirements**: CELB-01, CELB-02, CELB-04, FOUN-01, FOUN-02
**Success Criteria** (what must be TRUE):
  1. Confetti bursts on screen after the stats reveal completes
  2. Floating voter reaction bubbles (thumbs up, hearts, "Great message!") rise from the bottom after confetti
  3. A share button lets candidates forward their report via the Web Share API or clipboard fallback
  4. The full experience loads and plays correctly on a mobile phone with no broken layout
  5. The report page loads in under 3 seconds on a mobile connection
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md — canvas-confetti burst, floating voter reaction bubbles, reduced motion compliance
- [ ] 04-02-PLAN.md — Share button (Web Share API + clipboard fallback), mobile responsiveness audit, performance pass

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 2/2 | Complete   | 2026-03-20 |
| 2. Map Experience | 1/2 | In Progress|  |
| 3. Stats and Sequence | 2/2 | Complete   | 2026-03-20 |
| 4. Celebration and Polish | 1/2 | In Progress|  |
