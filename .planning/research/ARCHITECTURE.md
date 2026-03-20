# Architecture Research

**Domain:** Gamified interactive report generator — static site, URL-encoded data, cinematic map animation
**Researched:** 2026-03-20
**Confidence:** HIGH (based on existing VoterPing viz codebase + MapLibre docs + established static-site patterns)

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         ENTRY POINTS                             │
│                                                                  │
│  ┌───────────────────────┐      ┌───────────────────────────┐   │
│  │    admin/index.html   │      │    report/index.html      │   │
│  │    (Form UI)          │      │    (Cinematic player)     │   │
│  └──────────┬────────────┘      └──────────────┬────────────┘   │
│             │ generates URL                     │ reads URL      │
└─────────────┼───────────────────────────────────┼────────────────┘
              │                                   │
              ▼                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                       URL DATA LAYER                             │
│                                                                  │
│   encodeReportData(formValues) → base64/query string            │
│   decodeReportData(urlParams)  → reportPayload object           │
│                                                                  │
│   Schema: { candidate, district, sent, delivered, failed,       │
│             deliverabilityPct, districtCoords, generatedAt }    │
└─────────────────────────────────────────────────────────────────-┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────┐
│                  ANIMATION SEQUENCER (report page)               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                     Sequence Engine                        │  │
│  │   idle → camera-fly → dot-cascade → stats-reveal →        │  │
│  │   comparison-popup → celebration → idle                    │  │
│  └───────────┬─────────────────────┬──────────────────────────┘  │
│              │                     │                             │
│   ┌──────────▼──────────┐  ┌───────▼──────────────────────┐    │
│   │   Map Controller    │  │   Overlay Controller          │    │
│   │   (MapLibre GL JS)  │  │   (DOM / CSS animations)      │    │
│   │                     │  │                               │    │
│   │  - camera flyTo     │  │  - stat counters              │    │
│   │  - dot cascade      │  │  - industry compare popup     │    │
│   │  - ping rings       │  │  - voter reaction bubbles     │    │
│   │  - heatmap reveal   │  │  - confetti burst             │    │
│   │  - completion pulse │  │  - celebration flashes        │    │
│   └─────────────────────┘  └───────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| `admin/index.html` | Form UI — collects campaign data, generates shareable URL | URL Data Layer |
| `admin/form.js` | Validates inputs, serializes report payload, copies URL to clipboard | url-codec.js |
| `url-codec.js` (shared) | Encodes/decodes report payload to/from URL params | admin/form.js, report/main.js |
| `report/main.js` | Orchestrates the full cinematic sequence; owns the state machine | Sequence Engine, Map Controller, Overlay Controller |
| `report/sequencer.js` | Named-stage promise chain; fires callbacks at each stage boundary | map.js, overlay.js |
| `report/map.js` | MapLibre GL JS wrapper — camera choreography, dot cascade, ping rings, heatmap | MapLibre GL JS library |
| `report/overlay.js` | Manages all DOM overlay elements — counters, popups, confetti, bubbles | canvas-confetti library, DOM |
| `report/data.js` | Generates synthetic voter coordinate scatter from district bounds | report/map.js |
| `shared/districts.js` | District registry — bounding boxes, fly-to params per region | admin/form.js, report/data.js |

---

## Recommended Project Structure

```
campaign-hype/
├── index.html              # Redirects to admin, or is the admin page
├── admin/
│   ├── index.html          # Admin form page
│   └── form.js             # Form logic, URL generation, clipboard copy
├── report/
│   ├── index.html          # Report/player page (reads URL params)
│   ├── main.js             # Sequence orchestrator — entry point
│   ├── sequencer.js        # Stage-by-stage promise chain / state machine
│   ├── map.js              # MapLibre GL JS setup, camera, layers
│   ├── overlay.js          # DOM overlay: counters, popups, confetti
│   └── data.js             # Voter coordinate generation from district bounds
├── shared/
│   ├── url-codec.js        # encode/decode report payload
│   └── districts.js        # District registry (coords, fly params)
├── assets/
│   ├── style.css           # Global styles
│   ├── admin.css           # Admin page styles
│   └── report.css          # Report page cinematic styles
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Pages deploy action
```

### Structure Rationale

- **admin/ and report/:** Strict page-level separation — admin generates, report consumes. They share nothing at runtime except the URL codec. This means both pages can be opened independently and load fast.
- **shared/:** Only genuinely shared modules live here. `url-codec.js` is the contract both pages depend on; changing its schema is a breaking change requiring both sides to update together.
- **report/sequencer.js:** Isolating the sequence engine from `main.js` is critical. Campaign Hype's complexity lives in the precise ordering of effects — a dedicated sequencer keeps that logic auditable and testable without touching map or DOM code.
- **assets/:** Flat CSS files — no build step needed for GitHub Pages deploy.

---

## Architectural Patterns

### Pattern 1: Linear Stage Sequencer (Promise Chain)

**What:** The report experience is a one-way, non-interactive playback of discrete named stages. Each stage returns a Promise that resolves when it is complete, triggering the next stage. Stages cannot go backwards.

**When to use:** Any time the user experience is a linear narrative with a defined end — cinematic reveals, onboarding flows, celebration screens. This project's entire report page is this pattern.

**Trade-offs:** Simple to reason about and debug (log stage names). Adding a new stage means inserting one `.then()`. No branching logic needed for v1.

**Example:**
```javascript
// report/sequencer.js
export async function playSequence(payload, map, overlay) {
  await overlay.showCandidateName(payload.candidate);   // "For Jane Smith..."
  await map.flyToDistrict(payload.districtCoords);      // camera flies in
  await map.runDotCascade(payload.delivered);           // dots light up
  await overlay.revealStats(payload);                   // counters tick up
  await overlay.showComparisonPopup(payload);           // "CRUSHED industry avg!"
  await overlay.celebrate();                            // confetti
  overlay.showSharePrompt();                            // final state
}
```

### Pattern 2: URL as Database (Encoded Payload)

**What:** All report data is stored in the URL — either as query parameters or a single base64-encoded JSON blob in the hash. No server, no database. The admin page encodes; the report page decodes.

**When to use:** Static sites on GitHub Pages where zero backend is acceptable. Works well when the payload is small (under ~2KB encoded, well within URL limits).

**Trade-offs:** Simple, zero-cost, instantly shareable. Limitation: URL length caps around 2,000 characters for safe cross-browser use. For this project's payload (10–15 fields of campaign data), this is ample — estimated encoded size under 300 bytes.

**Use `?` query params over `#` hash:** Query params survive link shares on SMS and most email clients. Hash fragments are sometimes stripped by messaging apps. For a political texting product, this matters.

**Example:**
```javascript
// shared/url-codec.js
export function encodeReport(data) {
  const json = JSON.stringify(data);
  const b64 = btoa(json);
  return `${window.location.origin}/report/?d=${encodeURIComponent(b64)}`;
}

export function decodeReport() {
  const params = new URLSearchParams(window.location.search);
  const b64 = params.get('d');
  if (!b64) return null;
  return JSON.parse(atob(decodeURIComponent(b64)));
}
```

### Pattern 3: Map Controller / DOM Overlay Separation

**What:** Keep MapLibre GL JS operations entirely inside `map.js`. Keep all DOM element manipulation (popups, counters, confetti, bubbles) entirely inside `overlay.js`. The sequencer calls both but they never call each other.

**When to use:** Always, when combining WebGL rendering (MapLibre canvas) with DOM animations. The two rendering surfaces are independent — conflating them makes both harder to debug.

**Trade-offs:** Slightly more files. Pays for itself immediately: MapLibre's async `moveend` events and `requestAnimationFrame` loops in `map.js` are completely isolated from CSS animation timings in `overlay.js`.

This pattern is already proven in the existing VoterPing viz (`map.js`, `animation.js`, `ui.js` are separate). Extend that same boundary here.

---

## Data Flow

### Admin Page: Form to URL

```
User fills form
    ↓
form.js validates inputs (candidate name, district, sent, delivered, failed)
    ↓
form.js computes derived fields (deliverabilityPct, industryDelta)
    ↓
url-codec.encodeReport(payload) → base64 query param URL
    ↓
User copies URL → sends to candidate via text/email
```

### Report Page: URL to Experience

```
Candidate opens URL
    ↓
report/main.js → url-codec.decodeReport() → payload object
    ↓ (if null payload → show error / redirect to admin)
    ↓
data.js generates synthetic voter coordinates from district bounds
    ↓
sequencer.playSequence(payload, map, overlay)
    ↓ Stage: camera fly
map.flyToDistrict() → MapLibre flyTo() → resolves on 'moveend' event
    ↓ Stage: dot cascade
map.runDotCascade() → requestAnimationFrame loop, filter progression
    ↓ (fires onProgress callbacks → overlay counter ticks)
    ↓ Stage: stats reveal
overlay.revealStats() → animated count-up per stat field
    ↓ Stage: comparison popup
overlay.showComparisonPopup() → DOM popup with industry delta
    ↓ Stage: celebration
overlay.celebrate() → canvas-confetti burst + voter reaction bubbles
    ↓
overlay.showSharePrompt() → final idle state
```

### Callback Contract Between Map and Overlay

```
map.runDotCascade(count, { onProgress, onBatchPing, onComplete })
    onProgress(delivered, total) → overlay updates counter
    onBatchPing(progress)        → overlay plays pulse effect
    onComplete()                 → sequencer advances to next stage
```

This is the same callback pattern used in the existing VoterPing viz (`makeCallbacks()` in `main.js`) — proven and directly portable.

---

## Scaling Considerations

This is a static site with no backend. "Scaling" means URL length limits and animation performance.

| Concern | Threshold | Approach |
|---------|-----------|----------|
| URL length | Payload > 2KB encoded | Switch from raw JSON to compressed (pako/lz-string). For v1 payload (15 fields), not needed. |
| Dot cascade performance | > 50,000 synthetic points on mobile | Cap synthetic point count at 5,000–10,000. Visual impact doesn't improve above that. Existing VoterPing viz handles 100K but that's desktop demo use. |
| Confetti on low-end phones | Canvas layer + MapLibre canvas | canvas-confetti uses its own canvas element; no conflict with MapLibre. Limit particle count to 150 on mobile (detect via `navigator.hardwareConcurrency`). |
| Concurrent report opens | Unlimited | No server — GitHub Pages CDN handles it. No scaling concern. |

---

## Anti-Patterns

### Anti-Pattern 1: Merging Admin and Report into One Page

**What people do:** Put the form and the report on the same `index.html`, show/hide sections with JavaScript.

**Why it's wrong:** The report page loads MapLibre GL JS, canvas-confetti, and runs heavy animations. None of that should load when a campaign manager is filling out a form. Page weight penalty is immediate; mobile load time suffers.

**Do this instead:** Two separate HTML files, two separate JS entry points. Admin page is lightweight (form + url-codec only). Report page loads all animation dependencies.

### Anti-Pattern 2: Using `#` Hash for the Payload

**What people do:** Encode the report data in `window.location.hash` because it doesn't get sent to the server.

**Why it's wrong:** SMS clients (iMessage, Android Messages) and many email clients strip or truncate hash fragments when rendering link previews. For a political texting platform where the report is shared via SMS, this silently breaks the share flow.

**Do this instead:** Use a query parameter (`?d=...`). The server (GitHub Pages) sees it but ignores it. The report page reads it from `window.location.search`. Survives all link-sharing contexts.

### Anti-Pattern 3: Controlling Animation Timing with `setTimeout` Chains

**What people do:** Chain `setTimeout(nextStage, 4000)` calls to sequence stages.

**Why it's wrong:** MapLibre's `flyTo` duration varies based on distance traveled. A `setTimeout` hardcoded to 4000ms will desync if the camera finishes early or runs long. The cascade dot animation completion time depends on voter count, which varies per report.

**Do this instead:** Use event-driven completion: resolve Promises on `map.once('moveend', ...)`, on `onComplete` callbacks from the animation loop, on CSS `animationend` events. Each stage self-reports when done. Timing adapts automatically.

### Anti-Pattern 4: Monolithic `main.js`

**What people do:** Put map setup, animation loop, DOM manipulation, and URL decoding all in one file.

**Why it's wrong:** The report page has five distinct concerns (data decoding, map control, overlay control, sequence logic, celebration FX). A monolithic file makes it impossible to isolate bugs or reuse modules.

**Do this instead:** The module boundaries above (map.js, overlay.js, sequencer.js, data.js, url-codec.js). Each file has one job. The existing VoterPing viz (`animation.js`, `map.js`, `ui.js`, `sound.js`) already demonstrates this pays off.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| MapLibre GL JS | npm package or CDN script tag | No API key required. Existing VoterPing viz uses Vite + npm. For GitHub Pages no-build, use CDN (jsDelivr). |
| CartoCDN tile server | Raster tile URL in map style config | Free, no API key, already proven in VoterPing viz. |
| canvas-confetti | CDN script tag or npm | ~30KB, no dependencies. CDN preferred for no-build deploy. |
| GitHub Pages | Push to `gh-pages` branch or deploy from `main` via Actions | No server config needed. Static files only. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| admin/form.js ↔ shared/url-codec.js | Direct function call | url-codec is the schema contract. Any field added to the form must also be added to the codec schema. |
| report/sequencer.js ↔ report/map.js | Promise + callback | map.js functions return Promises; sequencer awaits them. The `onProgress`/`onComplete` callbacks from map are passed in at call time. |
| report/sequencer.js ↔ report/overlay.js | Promise | overlay.js functions return Promises resolving on animation completion. |
| report/map.js ↔ report/overlay.js | None (they never call each other) | Sequencer coordinates them. This boundary must not be crossed. |
| report/data.js ↔ shared/districts.js | Direct import | data.js reads district bounding box coords to scatter synthetic voter points. |

---

## Build Order Implications

Dependencies between components determine which phases must ship first:

1. **`shared/url-codec.js` and `shared/districts.js`** — Foundation. Both pages depend on these. Must be stable before either admin or report page can be completed.

2. **`admin/` page** — Depends only on url-codec. Simple form with no animation. Ship early to prove the URL round-trip works before building the expensive report page.

3. **`report/map.js`** — Depends on districts.js and MapLibre. The map fly-in is the first thing the viewer sees; getting camera choreography right before building the overlay sequence reduces rework.

4. **`report/data.js`** — Depends on districts.js. Must exist before dot cascade can run.

5. **`report/sequencer.js` and `report/overlay.js`** — Depend on map.js being stable. Build these together; they are tightly coupled to stage timing.

6. **Celebration effects (confetti, bubbles)** — Depend on overlay.js scaffold. Add last once the core sequence is solid — pure enhancement, no other component depends on them.

---

## Sources

- MapLibre GL JS official docs — flyTo, AnimationOptions, CameraOptions: https://maplibre.org/maplibre-gl-js/docs/API/
- MapLibre animation sequencing pattern (iterate flyTo over array of places): https://maplibre.org/maplibre-gl-js/docs/examples/
- Existing VoterPing viz codebase (`/home/vpliam/voterping-viz/src/`) — HIGH confidence, proven patterns directly portable
- W3C: Client-side URL hash parameters usage patterns: https://www.w3.org/2001/tag/doc/hash-in-url
- MDN: encodeURIComponent / decodeURIComponent: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
- MDN: Sequencing animations with Promises: https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS/Sequencing_animations
- canvas-confetti: https://github.com/catdad/canvas-confetti
- Game Programming Patterns — State pattern: https://gameprogrammingpatterns.com/state.html

---

*Architecture research for: Campaign Hype — gamified interactive campaign report generator*
*Researched: 2026-03-20*
