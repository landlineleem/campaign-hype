# Pitfalls Research

**Domain:** Gamified interactive campaign report generator (static site, map animations, URL-encoded data, GitHub Pages)
**Researched:** 2026-03-20
**Confidence:** HIGH

---

## Critical Pitfalls

### Pitfall 1: URL Length Overflow Silently Truncates Data

**What goes wrong:**
Campaign report data (candidate name, district, message counts, deliverability stats) gets encoded into a URL query string. As data grows — longer candidate names, multiple stat fields, district identifiers — the URL grows silently past browser safe limits. The page loads but the URL is truncated, producing missing or corrupt fields. The candidate sees broken stats or a crashed experience. The admin has no idea why their generated link doesn't work.

**Why it happens:**
Developers test with short demo data. "John Smith, 1000 messages" works fine. Real campaigns have "Congressman William P. Hutchinson III" and district names like "North Carolina Senate District 22." Base64 encoding adds 33% overhead on top of that. Chrome's practical limit for reliable operation is around 2000 characters for query strings, and Safari on iOS has even lower thresholds in some contexts.

**How to avoid:**
- Use compact field names in the URL schema (e.g., `n` not `candidate_name`, `s` not `messages_sent`)
- Apply URL-safe Base64 encoding (`+` → `-`, `/` → `_`, strip `=` padding)
- Set a character budget: calculate the max realistic payload size at design time, not after
- Add a URL length warning in the admin form that shows live character count
- For v1, target under 600 characters total URL length (leaves headroom for all realistic inputs)

**Warning signs:**
- Admin tests work; candidate reports broken on longer names
- Parameters decoded as `undefined` or empty string on the report page
- URL in mobile browser address bar appears cut off

**Phase to address:** Foundation phase (URL schema design). Must be designed before the admin form is built — retrofitting a URL schema is painful.

---

### Pitfall 2: MapLibre WebGL Context Loss on iOS Safari Kills the Map

**What goes wrong:**
The map animation is the centerpiece of the experience. On iOS, if the candidate switches apps, takes a phone call, or puts their phone in their pocket while the page loads — Safari aggressively reclaims WebGL contexts. When they return, the map is a blank grey rectangle with no error message. The entire hype experience is dead. No confetti, no animations, nothing — the map never recovers.

**Why it happens:**
iOS Safari limits WebGL contexts per page and kills them when backgrounded. MapLibre has partial handling for `webglcontextlost` and `webglcontextrestored` events, but the recovery is incomplete — especially when context is lost before the map style finishes loading (a confirmed MapLibre bug in v5.12+). Political candidates are on their phones constantly and multitask — this will happen in production.

**How to avoid:**
- Listen for `webglcontextlost` event on the map canvas and show a friendly recovery UI with a "Tap to reload" button
- Set `preserveDrawingBuffer: false` (default) — preserving it increases context loss risk
- Initialize the map only after the page is fully interactive, not on DOM ready
- Test explicitly: on a real iPhone, open the report, switch to Messages, come back — verify recovery
- Implement `map.on('error', ...)` to catch context issues and degrade gracefully

**Warning signs:**
- "WebGL: context lost" errors in browser console during iOS testing
- Blank grey map after backgrounding app
- Map appears on desktop but not on a specific iPhone model

**Phase to address:** Map animation phase. Build the context-loss recovery handler before any other map animation work, not as a last-minute polish.

---

### Pitfall 3: GeoJSON District Boundary Files Are Enormous and Block First Paint

**What goes wrong:**
The cinematic zoom into a specific district requires boundary GeoJSON. US legislative district files from the Census Bureau are notoriously large — a full set of state legislative districts can be 10–90MB uncompressed. If the project loads the entire US districts file to find one district, the candidate on a 4G connection waits 15–30 seconds staring at a loading screen before anything animates. The "wow" opening moment dies.

**Why it happens:**
Developers grab the authoritative Census Bureau shapefile, convert it to GeoJSON, and throw it in the repo. Works locally on a fast connection. Fails on a candidate's hotel WiFi or a campaign event with congested cellular.

**How to avoid:**
- Pre-process district boundaries at admin/build time — extract only the specific district polygon needed and encode it (as simplified GeoJSON) directly into the URL or a small per-report static file
- Simplify polygon geometry to 4–5 decimal places of precision using mapshaper (district boundaries don't need 15-decimal precision)
- Target under 50KB for any GeoJSON loaded at report runtime
- Alternatively: bundle only the districts actually used by VoterPing campaigns, not all 50 states

**Warning signs:**
- Network tab shows GeoJSON request taking over 2 seconds
- Map loads correctly on developer machine but lags on mobile demo
- File size over 200KB for any map data asset

**Phase to address:** Map animation phase, data preparation step. Decide the district data strategy before writing any map animation code.

---

### Pitfall 4: Animation Sequencing Has No State Machine — Everything Races

**What goes wrong:**
The report experience has a precise sequence: map zoom → district boundary highlight → cascade dots appear → dots fade → stat counters animate → popups trigger → confetti fires. When implemented with nested callbacks or ad-hoc `setTimeout` chains, the sequence becomes a tangled web. On slow connections, the map isn't ready when the timeout fires. On fast connections, animations overlap. Skipping ahead or replaying breaks everything. The "cinematic" experience becomes a flickering mess of half-finished animations.

**Why it happens:**
Developers start with `setTimeout(doNextThing, 2000)` because it's simple. Then they add a step. Then another. Then they need to wait for a map event instead of a timer. Then they need to handle the user tapping "replay." By then the code is a rats' nest with no clear control flow, and bugs take hours to reproduce because timing is non-deterministic.

**How to avoid:**
- Design the animation sequence as an explicit ordered list of steps from day one — even a simple array of `{ action, delay, condition }` objects is enough
- Use Promise chains or async/await for sequencing — `await mapZoomComplete()` is far clearer than nested timeouts
- All time-based delays should use `requestAnimationFrame` loops or `Web Animations API`, never raw `setTimeout` for visual timing
- Build a single `runSequence()` function that can be replayed from step 0 — forces clean state management

**Warning signs:**
- `setTimeout` calls nested more than 2 levels deep
- Adding a new animation step requires changing timing values in multiple places
- "Replay" button doesn't fully reset the experience

**Phase to address:** Animation sequencing phase. Define the sequence data structure in the first animation PR — never retrofit it.

---

### Pitfall 5: CSS Stacking Context Traps Popups Under the Map Canvas

**What goes wrong:**
MapLibre renders to a `<canvas>` element inside a container with `transform` properties applied (for zoom/pan). CSS `transform` on a parent creates a new stacking context, which traps all `z-index` values inside that context. Temu-style popups and confetti overlays placed outside the map container appear underneath the map canvas regardless of their `z-index` values. Result: popups are invisible, or confetti fires behind the map.

**Why it happens:**
Developers set `z-index: 9999` on the popup and expect it to float above everything. They don't realize that `transform: translateZ(0)` on any ancestor element creates a stacking context boundary. MapLibre's internal containers use transforms for performance. This is a silent CSS trap with no error messages.

**How to avoid:**
- Mount all popup/confetti overlays at the `<body>` level (or a dedicated top-level overlay div), never inside the map container hierarchy
- Apply `position: fixed` for full-screen overlays rather than `position: absolute`
- Test the stacking order early: add a bright red div with `z-index: 9999` inside the map container vs. outside — verify which one appears on top

**Warning signs:**
- Popup appears in DOM inspector but is not visible on screen
- Setting `z-index: 99999` has no effect
- Confetti fires but is hidden behind other elements

**Phase to address:** UI/animation phase. Define the DOM structure for overlays before implementing any popup or confetti code.

---

### Pitfall 6: The "Wow" Experience Only Fires Once — Repeat Visitors See Nothing

**What goes wrong:**
The cinematic intro — map zoom, cascade, confetti — is triggered on page load. The candidate shares their link with their spouse, their campaign manager, and posts it to Twitter. When others open the link (or the candidate reloads it), the experience plays perfectly. But when the candidate opens it on a different device later, or closes and reopens their tab, the session state is gone and the experience replays from scratch — which is fine. The real problem is the opposite: if any session storage or URL fragment logic accidentally "marks" the experience as seen, the second open is just a static page. Candidates will absolutely open this link again to show people.

**Why it happens:**
Developers add `sessionStorage.setItem('seen', true)` to prevent the intro from re-triggering during development (to avoid sitting through the animation while debugging). That guard accidentally ships to production.

**How to avoid:**
- Never use sessionStorage or localStorage to gate the intro animation
- The URL itself is the identity — same URL always replays the full experience
- If replay-prevention is ever needed, make it opt-in via a `#/report` vs `#/static` URL fragment

**Warning signs:**
- Any `sessionStorage` or `localStorage` write in animation trigger code
- "Skip intro" functionality that doesn't have a guaranteed reset path

**Phase to address:** Animation sequencing phase. Code review check: no session/local storage in animation trigger paths.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Raw `setTimeout` for animation sequencing | Fast to write | Non-deterministic, breaks on slow connections, impossible to replay or cancel | MVP prototype only — replace before first real candidate demo |
| Entire US district GeoJSON loaded client-side | No data prep step | 30-second load on mobile, kills first impression | Never — pre-process districts from day one |
| Hardcoded animation timing values scattered in code | Simple | One timing change requires hunting 10 files | Never — centralize timing in a constants object from the start |
| Raw Base64 (not URL-safe variant) in query params | Simpler encoding | `+` becomes space, `/` triggers path issues, `=` breaks parsers | Never — URL-safe Base64 is one line of code |
| No URL length validation in admin form | Ship faster | Admins generate broken links; candidates have broken experience; no error message | Never — validation takes 10 minutes to add |
| Mount popups inside map container | Simpler DOM structure | Invisible popups due to stacking context | Never — always mount overlays at body level |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| MapLibre GL JS | Calling `map.flyTo()` before `map.on('load')` fires | Always queue map operations inside the `load` event callback or check `map.loaded()` first |
| MapLibre GL JS | Using `setFeatureState()` in a `requestAnimationFrame` loop for dot animations | Use custom layers or `addLayer` with animated paint expressions — `setFeatureState` loop is a known performance killer |
| canvas-confetti | Not accounting for `prefers-reduced-motion` | Check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` before firing; use `disableForReducedMotion` option |
| canvas-confetti | Default particle count (200) on mobile | Detect mobile (`window.innerWidth < 768`) and reduce to 50–75 particles |
| URL params | Using `URLSearchParams` without URL-safe Base64 decode | Standardize on `atob(param.replace(/-/g, '+').replace(/_/g, '/'))` across encode/decode paths |
| GitHub Pages | Expecting `404.html` trick to work for deep link report URLs | Use hash-based routing (`#?n=...&s=...`) — all data after `#` is never sent to the server, GitHub Pages never sees it, no 404 issue |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Large unoptimized GeoJSON loaded at runtime | 10–30s blank screen before map appears | Pre-extract and simplify district polygons; target <50KB per district | Any mobile connection; hotel/event WiFi |
| `setFeatureState()` called every animation frame for dot cascade | Map freezes at 5–10 FPS; phone gets hot | Use a custom WebGL layer or animate dots via a data-driven expression with a time uniform | More than ~100 dots animating simultaneously |
| Confetti at full particle count on mid-range Android | Visible frame drops during stat counter animations | Reduce particles on mobile; use `useWorker: true` in canvas-confetti | Budget Android devices; any device during simultaneous animations |
| All animation assets (map style, fonts, icons) loaded sequentially | Animation sequence starts 5–8s after page load | Preload map style and tiles in parallel with page load; use `<link rel="preload">` | Slow 4G connections common at political events |
| MapLibre renders `preserveDrawingBuffer: true` | 2x GPU memory usage; context loss more frequent | Keep at default `false` unless screenshot export is needed | On iOS with multiple WebGL contexts open |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Treating URL-decoded data as trusted without sanitization | Malicious actor crafts a URL with injected HTML/script in candidate name field — link shared and executed in victim's browser (reflected XSS) | Always sanitize URL-decoded strings before inserting into DOM — use `textContent` not `innerHTML`; if HTML is needed, use DOMPurify |
| Displaying raw URL params as candidate "name" in page title | Stored XSS via social sharing if OG tags are server-generated (not applicable for pure static, but relevant if ever adding SSR) | Keep to `textContent` assignment; audit all DOM insertion points |
| Generating no HMAC/signature on report data | Anyone can hand-craft a URL claiming 99.9% deliverability for a competitor's candidate; fake reports circulate | For v1 (demo tool) this is acceptable; for v2 (production tool), sign the payload with a shared secret so admins generate authoritative reports |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Animation sequence too long (over 45 seconds total) | Candidate loses interest, switches apps mid-animation, triggers WebGL context loss | Keep full sequence under 30 seconds; make stat counters skippable by tap |
| No loading indicator before map appears | Candidate sees blank white screen for 3–5 seconds; thinks link is broken | Show a "Preparing your results..." screen with animated branding immediately on page load, before MapLibre initializes |
| Celebration popups require reading | Political candidates and campaign managers are busy; dense text popups kill dopamine momentum | Keep popup copy to 5 words max; big number, one superlative ("CRUSHED IT!"), done |
| Report designed only for portrait mobile | Candidates will show their campaign manager on a laptop; landscape tablet/desktop must also look great | Design mobile-first but test on 1280px wide screen before every milestone |
| Confetti fires but no sound | Visual-only celebration feels incomplete on mobile | Consider a single short victory sound (optional, muted by default, tap-to-enable) — but never auto-play audio |
| "Share" functionality missing | Candidate can't easily forward their win to their team | Include a copy-link button prominently — the URL IS the report, copy it to clipboard |

---

## "Looks Done But Isn't" Checklist

- [ ] **Map zoom**: District actually zooms to the correct geography, not just a US-wide view — verify with a real district ID, not hardcoded coords
- [ ] **URL decode on report page**: Test with a URL generated by the admin form, not a manually crafted URL — encoding/decoding round-trip must be lossless
- [ ] **Confetti on mobile**: Verify on a real iOS and real Android device — simulator GPU behavior differs from hardware
- [ ] **WebGL context recovery**: Background the app during map load on a real iPhone, return after 30 seconds — map must recover or show a reload prompt
- [ ] **OG meta tags**: Paste the report URL into Twitter/X card validator — title and description must reflect the candidate's data (requires static OG tags since GitHub Pages can't generate dynamic ones — use generic branding)
- [ ] **Animation replay**: Reload the report URL three times in a row — the full experience must play each time with no degradation
- [ ] **Long candidate name**: Test with a 40-character name and a long district name — UI must not overflow or truncate awkwardly
- [ ] **Zero-failure campaigns**: Test `failedMessages: 0` — no divide-by-zero errors, no NaN% displayed
- [ ] **Slow connection**: Chrome DevTools throttled to "Slow 4G" — the loading state must appear immediately; nothing should be invisible/broken
- [ ] **URL tampering**: Manually corrupt a field in the URL — the report page must fail gracefully with a user-friendly error, not a JS exception

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| URL length overflow discovered post-launch | MEDIUM | Redesign URL schema with shorter keys; regenerate all existing links (admins must re-enter data); no backwards compatibility possible without a lookup layer |
| Animation sequence spaghetti requiring rewrite | HIGH | Extract sequence into a data-driven array; rewrite all `setTimeout` chains as promise steps; full regression test of all timing |
| GeoJSON too large discovered at demo time | LOW | Run source file through mapshaper in 30 minutes; replace asset; re-test |
| WebGL context loss shipping to production | MEDIUM | Add `webglcontextlost` listener with reload prompt; deploy hotfix; context may be lost on page reload attempt requiring full reload |
| XSS via unsanitized URL params | HIGH | Audit all DOM insertion points; replace `innerHTML` with `textContent`; add DOMPurify; treat as a security incident if real candidates have shared links |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| URL length overflow | Phase 1 (Foundation / URL schema design) | Generate a URL with maximum realistic field lengths; measure character count; must be under 600 |
| WebGL context loss | Phase 2 (Map animation, first PR) | Manual iOS test: background app during load, return — must show recovery UI |
| GeoJSON file size | Phase 2 (Map animation, data prep step) | Network tab: district GeoJSON request must complete in under 1 second on throttled 4G |
| Animation sequencing chaos | Phase 2 (Animation, architecture decision) | Code review: no nested `setTimeout`, all steps driven from a single sequence array |
| CSS stacking context traps | Phase 3 (UI/popups) | Red-div test: overlay div at body level must appear above map canvas |
| Experience fires once only | Phase 2/3 (animation wiring) | Reload the report URL 5 times; full experience plays every time |
| XSS via URL params | Phase 1 (Foundation, first DOM insertion) | Craft a URL with `<script>alert(1)</script>` as candidate name; must render as literal text |
| Missing loading state | Phase 2 (Map animation) | Throttle to Slow 4G; loading UI must appear within 500ms of page load |
| Confetti mobile performance | Phase 3 (Celebrations) | Run on real budget Android; must maintain 30+ FPS during confetti |
| No graceful error for bad URLs | Phase 1 (Foundation, URL parse logic) | Corrupt a URL param; page must show friendly error, not blank screen or JS exception |

---

## Sources

- [MapLibre GL JS Performance Guide — Large GeoJSON](https://maplibre.org/maplibre-gl-js/docs/guides/large-data/)
- [MapLibre Issue #7022 — WebGL context lost before style loads](https://github.com/maplibre/maplibre-gl-js/issues/7022)
- [MapLibre Issue #96 — Map repaint CPU/GPU intensive](https://github.com/maplibre/maplibre-gl-js/issues/96)
- [canvas-confetti GitHub — Mobile issues #230](https://github.com/catdad/canvas-confetti/issues/230)
- [canvas-confetti npm — useWorker, disableForReducedMotion options](https://www.npmjs.com/package/canvas-confetti)
- [URL Length Limits — DevGex comprehensive guide](https://devgex.com/en/article/00000739)
- [Base64 in URLs — codegenes.net safe encoding](https://www.codegenes.net/blog/passing-base64-encoded-strings-in-url/)
- [GitHub Pages SPA routing — community discussion](https://github.com/orgs/community/discussions/64096)
- [OWASP Web Parameter Tampering](https://owasp.org/www-community/attacks/Web_Parameter_Tampering)
- [CSS Stacking Contexts — Playful Programming](https://playfulprogramming.com/posts/css-stacking-context/)
- [Apple Developer Forums — Safari WebGL context lost on backgrounding](https://developer.apple.com/forums/thread/737042)
- [Mapshaper GeoJSON optimization tips](https://open-innovations.org/blog/2023-07-25-tips-for-optimising-geojson-files)
- [Scroll animations 2025 — MROY CLUB](https://mroy.club/articles/scroll-animations-techniques-and-considerations-for-2025)
- [Debug DebugBear — Base64 data URLs performance](https://www.debugbear.com/blog/base64-data-urls-html-css)

---
*Pitfalls research for: Gamified interactive campaign report generator (Campaign Hype)*
*Researched: 2026-03-20*
