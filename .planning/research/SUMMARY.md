# Project Research Summary

**Project:** Campaign Hype — Gamified Interactive Campaign Report Generator
**Domain:** Static cinematic data visualization site with map animations, URL-encoded data, gamification mechanics
**Researched:** 2026-03-20
**Confidence:** HIGH

## Executive Summary

Campaign Hype is a zero-backend, static-site "hype reel" for political SMS campaigns. It takes campaign delivery stats (messages sent, delivered, failed) and a target district, encodes them into a shareable URL, and plays a cinematic sequence for the candidate: a 3D map flyover to their district, animated stat counters, an industry benchmark comparison popup, and a confetti celebration. The pattern is Spotify Wrapped meets Temu dopamine mechanics meets geographic data visualization — and no direct competitor exists for this specific domain. The product lives entirely in the URL: no auth, no database, no server.

The recommended approach is Vite + Vanilla JS + MapLibre GL JS 5.x, directly extending the proven voterping-viz codebase already at `/home/vpliam/voterping-viz/`. Two separate pages (admin form, report player) communicate through a shared URL codec module. A dedicated Promise-chain sequencer controls all animation timing — this is the architectural centerpiece that separates a polished cinematic experience from a flickering mess of overlapping animations. GSAP 3.14 (now fully free) orchestrates multi-step animation timelines; CountUp.js handles stat counters; canvas-confetti fires the payoff moment.

The three highest-impact risks are (1) URL length overflow silently breaking the candidate's experience on long names or districts — mitigate by designing a compact URL schema with URL-safe Base64 before writing any other code; (2) MapLibre WebGL context loss on iOS Safari when candidates background the app — mitigate by building a `webglcontextlost` recovery handler in the very first map PR; and (3) animation sequencing chaos from ad-hoc setTimeout chains — mitigate by building the Promise-chain sequencer as the first report-page component, before adding any animations to it.

## Key Findings

### Recommended Stack

The stack is low-risk and directly grounded in an existing working codebase. Vite 8.x (with Rolldown bundler) replaces Vite 6 from voterping-viz — faster builds, same dev workflow. MapLibre GL JS 5.x is the only viable map library: free, no API key, WebGL-accelerated, proven `flyTo()` support. Vanilla JS ES modules are the right choice because the report experience is an imperative animation sequence — reactive frameworks (React, Vue) fight this pattern rather than helping it. GSAP 3.14 became fully free in 2024 and provides the timeline API needed to sequence map events, DOM counters, and confetti without nesting timeouts.

**Core technologies:**
- **Vite 8.x:** Build tool and dev server — proven baseline from voterping-viz, v8 uses Rolldown for 10-30x faster builds
- **MapLibre GL JS 5.x:** Map rendering and flyTo animations — free, no API key, WebGL-accelerated, confirmed working in existing viz
- **Vanilla JavaScript (ES2022+):** Application logic — imperative animation sequencing fights reactive frameworks; voterping-viz proves vanilla JS handles this complexity
- **GSAP 3.14.x:** Animation orchestration — fully free since Webflow acquisition, timeline API sequences map → counters → popup → confetti
- **CountUp.js 2.10.0:** Stat counter animation — IntersectionObserver-based auto-trigger, handles easing and formatting out of the box
- **canvas-confetti 1.9.4:** Celebration effects — 13KB, dependency-free, `disableForReducedMotion` support, OffscreenCanvas where available
- **URLSearchParams (native):** Data encoding — no library; query params survive SMS link sharing where hash fragments are sometimes stripped

See `.planning/research/STACK.md` for full alternatives considered and version compatibility table.

### Expected Features

The product is novel — no direct competitors — but draws from three reference patterns: Spotify Wrapped (sequenced emotional reveal), Temu (dopamine micro-animations), and gamified sales dashboards (benchmark comparison). The feature dependency tree is well-defined: URL codec must exist before either page works; admin form must be built before report page can be tested end-to-end; map flyover is the first thing a candidate sees and gates all subsequent reveals.

**Must have (table stakes):**
- URL param schema — the data contract; everything depends on this; define it first
- Admin form — lets campaign managers build shareable URLs without knowing URL syntax
- Personalized candidate header — name from URL param; trivial to build, critical for perceived quality
- USA to district map flyover — the cinematic hook; what differentiates this from a PDF
- Animated stat counters — messages sent, delivered, failed, delivery %; rolling up from 0 creates visceral impact
- Industry benchmark popup — "Your 96.2% CRUSHED the 88% industry average!" — reframes numbers as a win
- Confetti celebration — the payoff moment after stats revealed
- Mobile-responsive layout — candidates open this on their phones; non-negotiable

**Should have (differentiators, add after v1 validation):**
- Cascading dot animation across district — visualizes message delivery geographically; highest visual impact, highest complexity
- Floating voter reaction bubbles — ambient social proof (hearts, thumbs-up); Temu-style dopamine layer
- Shake/pulse effect on stat landing — micro-delight; CSS keyframe, low effort
- Share button (Web Share API) — candidates will forward their win to donors and supporters
- Reveal sequence timing refinement — tighten choreography after watching real users

**Defer (v2+):**
- Custom district polygon GeoJSON boundary highlighting — data sourcing is significant effort
- VoterPing platform integration — auto-generate reports from real campaign data; requires backend API work
- Multiple campaign support per candidate
- Dark/light mode — pick one great theme and ship it

See `.planning/research/FEATURES.md` for full prioritization matrix and anti-features list.

### Architecture Approach

Two separate HTML entry points (admin and report) share a single URL codec module — this separation is load-time critical: the report page loads MapLibre, GSAP, and runs heavy animations; the admin page should be a lightweight form. Inside the report page, a Promise-chain sequencer in `report/sequencer.js` is the single source of truth for animation ordering, calling `report/map.js` (MapLibre operations) and `report/overlay.js` (DOM/CSS operations) in sequence. These two modules never call each other — the sequencer coordinates them. This boundary is already proven in voterping-viz (`animation.js`, `map.js`, `ui.js` separation) and is directly portable.

**Major components:**
1. `shared/url-codec.js` — encodes/decodes report payload; the schema contract both pages depend on; must be stable before either page can be completed
2. `shared/districts.js` — district registry with bounding boxes and fly-to parameters; used by admin form dropdown and report data generator
3. `admin/form.js` — validates inputs, serializes payload, copies URL to clipboard; depends only on url-codec
4. `report/sequencer.js` — named-stage Promise chain; owns the state machine; no animation logic directly; calls map.js and overlay.js
5. `report/map.js` — MapLibre GL JS wrapper; camera flyTo, dot cascade, ping rings; returns Promises resolving on `moveend` events
6. `report/overlay.js` — all DOM overlay elements; stat counters, industry comparison popup, confetti, voter bubbles; returns Promises resolving on animation completion
7. `report/data.js` — generates synthetic voter coordinate scatter from district bounding box bounds

See `.planning/research/ARCHITECTURE.md` for full data flow diagrams and anti-patterns.

### Critical Pitfalls

1. **URL length overflow silently truncates data** — design the URL schema with compact field keys (`n` not `candidate_name`) and URL-safe Base64 before writing any other code; add a live character count to the admin form; target under 600 characters total; test with the longest realistic candidate name and district

2. **MapLibre WebGL context loss on iOS Safari** — iOS aggressively reclaims WebGL contexts when candidates background the app; listen for `webglcontextlost` event and show a "Tap to reload" recovery UI; build this in the first map PR, not as a late polish item; test on a real iPhone by switching to Messages and returning during map load

3. **Animation sequencing chaos from setTimeout chains** — never use nested setTimeout for sequencing; use Promise chains where each stage self-reports completion (`map.once('moveend', ...)`, CSS `animationend`); build the sequencer as the first report-page module so all animation code is written into a clean architecture from day one

4. **CSS stacking context traps popups under the map canvas** — MapLibre's internal transforms create stacking context boundaries; mount all popups and confetti overlays at `<body>` level with `position: fixed`, never inside the map container; test with a bright red div early

5. **GeoJSON district files blocking first paint** — US legislative district files can be 10-90MB; pre-process to extract only needed district polygon simplified to 4-5 decimal places; target under 50KB per district file; decide the data strategy before writing any map animation code

See `.planning/research/PITFALLS.md` for full pitfall-to-phase mapping, performance traps, and security notes.

## Implications for Roadmap

Based on the research, the build order is architecturally constrained: the URL codec is the foundation everything else depends on; admin form proves the codec round-trip; map flyover is the cinematic centerpiece that must work before the reveal sequence is wired; celebration effects are the final polish layer. Four phases maps cleanly onto this dependency graph.

### Phase 1: Foundation — URL Schema, Admin Form, Project Scaffold

**Rationale:** The URL codec is the data contract for the entire product. Both pages depend on it. Building and validating it first, before any animation code exists, prevents costly schema refactors later. The admin form is low-complexity and proves the encode/decode round-trip works end-to-end before any animation investment. This is also when security (XSS prevention via textContent) and URL length validation must be locked in — retrofitting these is painful.

**Delivers:** Working admin form that generates a valid report URL; URL codec module with encode/decode; district registry; Vite project scaffold with GitHub Pages CI/CD; input validation including URL length warning

**Addresses (from FEATURES.md):** URL param schema (P1), admin form (P1), personalized header foundation (URL decoder exists)

**Avoids (from PITFALLS.md):** URL length overflow (Pitfall 1), XSS via unsanitized URL params, no graceful error for bad URLs

**Research flag:** Standard patterns — no deeper research needed. This is straightforward form + URL encoding work with well-documented APIs.

### Phase 2: Map Experience — Flyover, Context Loss Recovery, District Data

**Rationale:** The map flyover is the product's cinematic hook and the first thing a candidate sees. It must be built and hardened before the overlay sequence is layered on top — if map initialization is fragile, all downstream animation timing is unpredictable. District data strategy (pre-processed GeoJSON vs. synthetic coordinate scatter) must be decided here to avoid the file-size pitfall. WebGL context loss recovery must be built in this phase, not retrofitted.

**Delivers:** MapLibre map initialized and styled; USA to district flyTo animation with pitch and bearing; WebGL context loss recovery UI; synthetic voter coordinate generator (data.js); loading state before map appears; district GeoJSON under 50KB

**Addresses (from FEATURES.md):** USA to district map flyover (P1, the cinematic hook)

**Avoids (from PITFALLS.md):** WebGL context loss on iOS (Pitfall 2), GeoJSON file size blocking first paint (Pitfall 3), missing loading indicator

**Uses (from STACK.md):** MapLibre GL JS 5.x, shared/districts.js, Vite build pipeline

**Research flag:** May benefit from a brief research spike on MapLibre v5 migration from v4.7.1 (API breaking changes noted in STACK.md) and on the specific `webglcontextlost` handling behavior in v5.12+.

### Phase 3: Animation Sequencer and Stat Reveals

**Rationale:** With a stable map layer, the sequencer and overlay can be built with confidence. The sequencer is the most architecturally sensitive component — every animation decision flows through it. Building it before adding celebration effects ensures a clean, auditable control flow. Stat counters and the industry benchmark popup are high-value, low-complexity additions once the sequencer scaffold exists.

**Delivers:** report/sequencer.js Promise chain with named stages; animated stat counters (sent, delivered, failed, delivery %); industry benchmark comparison popup; shake/pulse on stat landing; reveal sequence choreography with configurable timing constants

**Addresses (from FEATURES.md):** Animated stat counters (P1), industry benchmark popup (P1), personalized candidate header (P1), shake/pulse (P2)

**Avoids (from PITFALLS.md):** Animation sequencing chaos (Pitfall 4), CSS stacking context traps (Pitfall 5), experience fires once only (Pitfall 6 — no sessionStorage in animation paths)

**Uses (from STACK.md):** GSAP 3.14.x for timeline orchestration, CountUp.js 2.10.0 for counter animation, Animate.css 4.1.1 for entrance animations

**Research flag:** Standard patterns — GSAP timelines and CountUp.js are well-documented. No deeper research needed.

### Phase 4: Celebration Layer and Polish

**Rationale:** Celebration effects (confetti, floating voter reactions) depend on the overlay scaffold being stable. They are pure enhancement — no other component depends on them. Building them last means the core experience is shippable before these are added, and mobile performance tuning (particle counts, reduced motion) can be validated on a complete sequence rather than in isolation.

**Delivers:** canvas-confetti burst with mobile particle count scaling; floating voter reaction bubbles with randomized timing; share button (Web Share API with clipboard fallback); mobile responsiveness audit; `prefers-reduced-motion` compliance; "Looks Done But Isn't" checklist verification (from PITFALLS.md)

**Addresses (from FEATURES.md):** Confetti celebration (P1), mobile-responsive layout (P1), floating voter reactions (P2), share button (P2)

**Avoids (from PITFALLS.md):** Confetti mobile performance (full particle count on budget Android), missing loading state, animation replay degradation

**Uses (from STACK.md):** canvas-confetti 1.9.4, Web Share API (native), CSS custom properties for responsive layout

**Research flag:** Standard patterns for confetti and Web Share API. Mobile performance testing on real devices is the verification — not research.

### Phase Ordering Rationale

- URL codec first because both admin and report pages depend on a stable schema; changing it after pages are built is a breaking change requiring both sides to update
- Admin form before report page because it proves the encode/decode round-trip works with realistic data before any animation investment
- Map flyover before sequencer because the sequencer awaits map Promise resolution — if flyTo timing is unstable, sequencer testing is non-deterministic
- Celebration last because it is the only layer with no downstream dependencies; the product is shippable without it if pressed for time

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Map):** MapLibre v5 migration from v4.7.1 — STACK.md flags breaking API changes; worth a 30-minute spike comparing the existing voterping-viz v4.7.1 API calls against the v5 migration guide before writing any map code

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** URLSearchParams, form validation, Vite scaffold — all well-documented, direct implementation
- **Phase 3 (Sequencer):** GSAP timelines, CountUp.js, Promise chains — established patterns with rich documentation
- **Phase 4 (Celebration):** canvas-confetti, Web Share API — simple integration with clear docs

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core choices verified via npm/GitHub releases; voterping-viz baseline proves Vite + MapLibre + vanilla JS combination works; one MEDIUM item: GSAP free announcement sourced from a Medium article (secondary), not directly from Webflow/GSAP official — verify before billing a client |
| Features | HIGH (technical) / MEDIUM (UX patterns) | Technical implementation patterns are HIGH — CountUp.js, canvas-confetti, MapLibre flyTo all verified. Temu-style UX patterns (floating bubbles, shake effects) are MEDIUM — based on behavioral analysis articles, not A/B test data |
| Architecture | HIGH | Module boundaries directly ported from existing voterping-viz (`animation.js`, `map.js`, `ui.js` separation). Promise-chain sequencer is a well-documented pattern. URL-as-database pattern is proven for static sites |
| Pitfalls | HIGH | All critical pitfalls backed by specific MapLibre issue numbers, OWASP references, browser behavior documentation. WebGL context loss issue referenced to a specific MapLibre v5.12+ bug report |

**Overall confidence:** HIGH

### Gaps to Address

- **MapLibre v4 to v5 API diff:** STACK.md notes breaking changes between v4.7.1 (current voterping-viz) and v5.x. The exact API surface that changes is not enumerated in the research. Before Phase 2, compare the voterping-viz `map.js` API calls against the MapLibre v5 migration guide at maplibre.org. Cost: 30 minutes. Risk of skipping: map code written in Phase 2 may need rewriting if wrong API surface assumed.

- **District data sourcing:** Research identified two approaches (pre-processed Census GeoJSON vs. synthetic coordinate scatter within district bounding box) but did not resolve which to use for v1. Decision factors: do actual district polygon boundaries need to be drawn on the map (requires real GeoJSON), or does flying to district coordinates with a zoom level suffice (synthetic scatter works)? This decision gates Phase 2 data preparation. Recommend: for v1 demo, synthetic scatter within a bounding box is sufficient and avoids the GeoJSON size pitfall entirely. Revisit for v2 if candidates want to see their exact district boundary drawn.

- **GSAP free license confirmation:** STACK.md sourced GSAP's free status from a Medium article. Before adding GSAP to the project, verify directly at gsap.com that no license or attribution is required for commercial use. If GSAP licensing is a concern, Anime.js is the fallback (STACK.md documents this tradeoff).

- **URL sharing behavior across SMS platforms:** PITFALLS.md recommends query params over hash fragments for SMS shareability, but notes some edge cases with specific messaging apps. For a political texting platform, validate that the `?d=<base64>` URL format renders correctly in VoterPing's own SMS delivery previews before building the admin form URL generation around it.

## Sources

### Primary (HIGH confidence)
- `/home/vpliam/voterping-viz/` codebase — existing Vite + MapLibre 4.7.1 + vanilla JS implementation; direct code reference
- [MapLibre GL JS docs](https://maplibre.org/maplibre-gl-js/docs/API/) — flyTo, CameraOptions, AnimationOptions, Large GeoJSON guide
- [MapLibre Issue #7022](https://github.com/maplibre/maplibre-gl-js/issues/7022) — WebGL context loss before style loads (v5.12+)
- [canvas-confetti GitHub](https://github.com/catdad/canvas-confetti) — confirmed 1.9.4 latest stable, useWorker, disableForReducedMotion options
- [CountUp.js GitHub](https://github.com/inorganik/countUp.js/releases) — v2.10.0 confirmed latest (March 2026)
- [Vite 8 announcement](https://vite.dev/blog/announcing-vite8) — v8.0.1 confirmed latest
- [MDN URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) — native API confirmed
- [OWASP Web Parameter Tampering](https://owasp.org/www-community/attacks/Web_Parameter_Tampering) — XSS via URL params
- [MapLibre npm page](https://www.npmjs.com/package/maplibre-gl) — 5.21.0 confirmed latest as of March 2026

### Secondary (MEDIUM confidence)
- [GSAP homepage](https://gsap.com/) — v3.14.2 confirmed latest
- [GSAP free announcement](https://trendzhub.medium.com/gsap-just-went-free-6cfd628d9889) — Medium article; secondary source for free license claim
- [canvas-confetti mobile issues #230](https://github.com/catdad/canvas-confetti/issues/230) — community issue thread
- [URL Length Limits — DevGex](https://devgex.com/en/article/00000739) — community guide, consistent with browser documentation
- [CSS Stacking Contexts — Playful Programming](https://playfulprogramming.com/posts/css-stacking-context/) — well-explained community resource
- [Spotify Wrapped animation engineering](https://engineering.atspotify.com/2024/01/exploring-the-animation-landscape-of-2023-wrapped) — official Spotify Engineering blog
- [Psychology of Gamification — Claspo](https://claspo.io/blog/psychology-of-gamification-in-marketing/) — Temu UX pattern analysis

### Tertiary (LOW confidence)
- [Gamification Benchmarks 2026 — Xtremepush](https://www.xtremepush.com/blog/gamification-benchmarks-2026-whats-a-good-retention-rate-engagement-score-and-tier-progression) — industry benchmark figures used for "industry average" popup copy

---
*Research completed: 2026-03-20*
*Ready for roadmap: yes*
