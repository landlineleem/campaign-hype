# Feature Research

**Domain:** Gamified interactive campaign report / cinematic data visualization (static, shareable)
**Researched:** 2026-03-20
**Confidence:** HIGH (core animation patterns), MEDIUM (Temu-style UX patterns), HIGH (technical implementation)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Animated stat counters | Every "results" experience counts up numbers — static numbers feel dead | LOW | CountUp.js or vanilla JS with requestAnimationFrame. Numbers rolling up from 0 create visceral impact |
| Mobile-first layout | Candidates open links on phones. A desktop-only experience is dead on arrival | MEDIUM | Touch targets, viewport units, no hover-dependent interactions |
| Fast load (under 3s) | Report is sent via text link — candidates tap it expecting instant gratification | MEDIUM | No framework bloat, lazy-load map tiles, inline critical CSS |
| Shareable URL that opens the exact report | The URL IS the report. If it doesn't encode state, the product doesn't work | LOW | URL params or hash fragment. `?name=Jane&sent=5000&delivered=4800` pattern. Hash fragment keeps data off server logs |
| Map showing the candidate's district | Candidates want to SEE their reach geographically — it's the cinematic hook | HIGH | MapLibre flyTo() from USA view → district coordinates. This is the centerpiece moment |
| Clear delivery statistics display | Messages sent, delivered, failed, delivery % — the core "what did we accomplish" data | LOW | Four key numbers minimum. Must be legible at a glance on mobile |
| Progress-style visual framing | Users expect a "how did I do" score or grade — raw numbers aren't enough | LOW | Delivery % shown as a circular gauge or progress bar gives instant comprehension |
| Celebration moment at end | Every gamified report climaxes with a win moment. No payoff = deflating | MEDIUM | canvas-confetti is the standard library. Fires after counters finish |

### Differentiators (Competitive Advantage)

Features that set this product apart. Not required by convention, but create the memorable experience.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Cinematic USA → district zoom sequence | Nobody else sends a campaign SMS report that opens with a 3D map flyover — it's immediately cinematic and shareable | HIGH | MapLibre `flyTo()` with pitch and bearing creates a 3D "flying in" effect. Matches the VoterPing viz already built. Sequence: world → USA → state → district |
| Cascading dot animation on district | Visualizes thousands of messages being "delivered" across the map — makes abstract numbers visceral | HIGH | GeoJSON points rendered as animated circles appearing across district bounds. Can be simplified to random points within district polygon |
| Industry benchmark comparison popup | "Your 96.2% CRUSHED the 88% industry average!" — reframes raw stats as a competitive win | LOW | Hardcoded benchmark (85-92% range). Triggers after delivery % counter finishes. Modal or toast-style overlay |
| Floating voter reaction bubbles | Social proof illusion — makes the candidate feel like voters loved their message. Temu-style ambient engagement signal | MEDIUM | CSS keyframe animations floating thumbs-up, hearts, "Great message!" text from bottom of screen. Randomized timing and positions |
| Sequenced reveal (not all at once) | Spotify Wrapped model: reveal stats one at a time with choreographed timing. Each stat gets its moment | MEDIUM | JavaScript timeline with setTimeout chains or IntersectionObserver-triggered reveals. Controls the dopamine drip |
| Shake/pulse effect on key numbers | Temu's core pattern: numbers and buttons physically react — they "pop" when they land | LOW | CSS `@keyframes shake` applied after counter finishes. 300ms shake on the delivered number creates a satisfying landing |
| Personalized header with candidate name | "Jane Smith's Campaign Results" — trivial to implement, massive to perceived quality | LOW | Pulled from URL param. Renders candidate name prominently at top |
| Admin form for generating report URLs | Campaign managers need a simple form to build URLs without knowing URL syntax | LOW | Single HTML form that builds the shareable URL from inputs and copies to clipboard. No backend needed |
| "Share this report" button | Candidates will forward this to donors and supporters — social amplification is free marketing for VoterPing | LOW | Web Share API with navigator.share() fallback to clipboard copy. Shares the canonical URL |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem like good ideas but create complexity without proportional value at this stage.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time data sync / live dashboard | "Wouldn't it be cool if it updated automatically?" | Requires backend, WebSocket, authentication — destroys the static site constraint and zero hosting cost goal | Manually updated URL params. Admin regenerates link when stats change |
| User authentication / candidate login | "Each candidate should have an account" | Adds auth system, session management, database — massive scope creep for v1 | Public URL = access token. Anyone with the link sees the report. Simple and sufficient |
| Historical report archive | "Store past campaigns" | Requires database or localStorage hacks — breaks the stateless URL pattern | URL-encoded reports are inherently archivable — bookmark the URL |
| Editable report (candidate modifies their own stats) | "What if the candidate wants to tweak it?" | Confusing UX, data integrity issues, requires state management | Admin controls the data. Candidate is the audience, not the editor |
| Custom branding per candidate | "Can each candidate have their own colors/logo?" | CSS theming per candidate requires either URL-encoded style params (security concern) or a backend | v1: single VoterPing-branded theme. v2: URL param for color scheme if needed |
| Social login (Google/Facebook) | "Make it easy to sign in" | No auth needed at all for v1 — adds OAuth complexity with zero benefit | Skip entirely. URL = identity |
| Animated tutorial / onboarding | "First-time users need guidance" | The experience is a report, not an app. Onboarding implies complexity that shouldn't exist | The sequence IS the onboarding. Cinematic reveal guides the user automatically |
| PDF export | "Candidates want to print this" | Breaks the live animation experience, requires jsPDF or server-side rendering | Screenshots are sufficient. The URL is the shareable artifact |
| Leaderboard of all candidates | "Show how this candidate ranks vs others" | Privacy concerns — candidates may not want their stats compared to competitors | The industry average benchmark popup serves this purpose without exposing others' data |

---

## Feature Dependencies

```
[Admin Form]
    └──generates──> [Shareable URL]
                        └──powers──> [Report Page]
                                         ├──requires──> [URL Parser / Data Decoder]
                                         ├──requires──> [MapLibre Map Instance]
                                         │                  └──enables──> [USA → District Flyover]
                                         │                                    └──enables──> [Cascading Dot Animation]
                                         └──requires──> [Reveal Sequence Controller]
                                                             ├──triggers──> [Animated Stat Counters]
                                                             │                   └──triggers──> [Shake Effect]
                                                             ├──triggers──> [Industry Benchmark Popup]
                                                             ├──triggers──> [Confetti]
                                                             └──triggers──> [Floating Voter Reactions]

[Share Button] ──requires──> [Shareable URL]
[Personalized Header] ──requires──> [URL Parser / Data Decoder]
```

### Dependency Notes

- **Report Page requires URL Parser first:** All personalization and stat display depends on successfully decoding URL params before anything renders. This must be the first operation.
- **Flyover requires MapLibre Map Instance:** Map must be initialized and tiles loaded before flyTo() can be called. Add a loading state.
- **Cascading Dot Animation enhances Flyover:** Dots appear after the district zoom completes — sequential dependency, not parallel.
- **Reveal Sequence Controller gates everything:** The setTimeout/choreography layer decides when each feature fires. Build this as the orchestration layer, not as ad-hoc timeouts scattered in each component.
- **Confetti and Floating Reactions are independent:** They don't depend on each other, but both should fire only after stats have been revealed (emotional payoff requires knowing the numbers first).
- **Industry Benchmark Popup requires hardcoded benchmark data:** No external API needed — the 85-92% industry average is a known constant, encode it directly.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed for the first candidate demo to land.

- [ ] **URL param schema** — define the data contract (`?name=&sent=&delivered=&failed=&district=&lat=&lng=&zoom=`). Everything depends on this.
- [ ] **Admin form** — single-page form that builds and copies the shareable URL. Zero backend.
- [ ] **Personalized header** — candidate name from URL. Makes it feel bespoke.
- [ ] **USA → district map flyover** — the cinematic hook. This is what makes the product different from a PDF.
- [ ] **Animated stat counters** — messages sent, delivered, failed, delivery %. Count up from 0.
- [ ] **Industry benchmark popup** — "You CRUSHED the industry average!" fires after delivery % lands.
- [ ] **Confetti** — fires after benchmark popup. The payoff moment.
- [ ] **Mobile-responsive layout** — candidates use phones. Non-negotiable.

### Add After Validation (v1.x)

Features to add once the core demo has been used with real candidates and feedback exists.

- [ ] **Floating voter reaction bubbles** — adds ambient delight. Add when core sequence feels solid. Trigger: first candidate says "I want to share this with voters."
- [ ] **Shake/pulse effect on key numbers** — micro-delight layer. Low effort, high polish. Trigger: after v1 animations feel boring on second watch.
- [ ] **Cascading dot animation on district** — computationally heavier, highest visual impact. Trigger: when the map flyover alone isn't wowing people enough.
- [ ] **Share button** — Web Share API. Trigger: when candidates start asking "how do I send this to my team?"
- [ ] **Reveal sequence refinement** — tighten timing after watching real users experience the flow.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Custom district polygon highlighting** — draw actual district boundary on map vs just flying to coordinates. Requires GeoJSON district data. Defer: data sourcing is significant effort.
- [ ] **Multiple message campaign support** — one URL per candidate per campaign. Defer: URL schema becomes complex, admin form needs versioning.
- [ ] **VoterPing platform integration** — auto-generate report URLs from real campaign data. Defer: requires backend API work and coordination with VoterPing platform team.
- [ ] **A/B testing different celebration sequences** — Defer: no usage data to optimize against yet.
- [ ] **Dark/light mode** — Defer: pick one great-looking theme and ship it.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| URL param schema | HIGH | LOW | P1 |
| Admin form | HIGH | LOW | P1 |
| Personalized candidate header | HIGH | LOW | P1 |
| USA → district map flyover | HIGH | MEDIUM | P1 |
| Animated stat counters | HIGH | LOW | P1 |
| Industry benchmark popup | HIGH | LOW | P1 |
| Confetti celebration | HIGH | LOW | P1 |
| Mobile-responsive layout | HIGH | MEDIUM | P1 |
| Floating voter reaction bubbles | MEDIUM | MEDIUM | P2 |
| Shake/pulse on stat landing | MEDIUM | LOW | P2 |
| Cascading dot animation on map | HIGH | HIGH | P2 |
| Share button (Web Share API) | MEDIUM | LOW | P2 |
| Reveal sequence choreography (timing refinement) | MEDIUM | LOW | P2 |
| Custom district polygon / GeoJSON boundary | MEDIUM | HIGH | P3 |
| VoterPing platform integration | HIGH | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

No direct competitors exist for "gamified political SMS campaign report generators." The product is novel. Closest reference points:

| Feature | Spotify Wrapped | Temu App | Gamified Sales Dashboards (Plecto/Outfield) | Our Approach |
|---------|-----------------|----------|---------------------------------------------|--------------|
| Sequenced stat reveal | Yes — horizontal swipe cards | No | No | Yes — auto-timed vertical sequence with map first |
| Celebration animation (confetti) | Yes — at end of Wrapped | Constant — every interaction | Yes — on achieving targets | Yes — after stats revealed |
| Personalization | Yes — your name, your data | Limited | Yes — agent name on leaderboard | Yes — candidate name prominent throughout |
| Geographic visualization | No | No | No | Yes — this is the differentiator |
| Benchmark comparison | No | No | Yes — leaderboards | Yes — industry average popup |
| Floating reactions | No | Yes — social proof badges | No | Yes — voter bubbles |
| Shareable URL | Yes | No (app required) | No | Yes — the distribution mechanism |
| Mobile-first | Yes | Yes | Partial | Yes — primary surface |
| No login required | No (Spotify account) | No (account required) | No | Yes — URL = access token |

**Key insight:** Campaign Hype combines the emotional sequencing of Spotify Wrapped, the dopamine mechanics of Temu, and the benchmark gamification of sales dashboards — while adding geographic visualization none of them have, and requiring zero account creation.

---

## Implementation Notes (Technical)

### URL Data Contract

The URL schema is the foundation. Recommend URL search params (not hash fragment) for shareability and readability. Hash fragments are private from servers but also not shareable via some link preview systems.

Proposed schema:
```
/report/?n=Jane+Smith&s=5000&d=4800&f=200&loc=Raleigh+NC&lat=35.78&lng=-78.64&z=10
```

Fields: `n` (name), `s` (sent), `d` (delivered), `f` (failed), `loc` (location label), `lat`/`lng` (map target), `z` (zoom level). Keep keys short — URL must be SMS-safe.

### Reveal Sequence Architecture

Build a single `ReportSequence` controller with named stages and configurable delays. Don't scatter `setTimeout` calls. Example stages:

1. `INIT` — parse URL, validate data (0ms)
2. `MAP_LOAD` — render MapLibre, show USA (500ms)
3. `FLY_TO` — flyTo district with pitch+bearing (1500ms)
4. `COUNTERS` — trigger stat counter rollups (after flyTo completes)
5. `BENCHMARK` — show industry comparison popup (after counters finish)
6. `CELEBRATE` — confetti + floating reactions (500ms after benchmark)
7. `SHARE` — reveal share button (2s after celebrate)

### Map Animation Confidence

MapLibre `map.flyTo({ center, zoom, pitch, bearing, speed, curve })` is confirmed available and matches the VoterPing viz stack. HIGH confidence this works. The existing `/home/vpliam/voterping-viz/` implementation proves the approach.

### Confetti Library

`canvas-confetti` (catdad/canvas-confetti on GitHub) is the standard — under 10KB gzipped, well-maintained, supports `disableForReducedMotion`. No alternative needed.

---

## Sources

- [Psychology of Gamification: Why Temu's Strategy Works (Claspo)](https://claspo.io/blog/psychology-of-gamification-in-marketing/)
- [How Shein and Temu Leverage Mobile Apps to Keep Users Hooked (MobiLoud)](https://www.mobiloud.com/blog/shein-and-temu-mobile-apps)
- [When Fun Turns Predatory: Inside Temu's AI-Driven UX (Substack)](https://karozieminski.substack.com/p/when-fun-turns-predatory-inside-temus)
- [canvas-confetti library (GitHub)](https://github.com/catdad/canvas-confetti)
- [The Over-Confetti-ing of Digital Experiences — UX Collective (uxdesign.cc)](https://uxdesign.cc/the-over-confetti-ing-of-digital-experiences-af523745db19)
- [CountUp.js](https://inorganik.github.io/countUp.js/)
- [Animating Number Counters — CSS-Tricks](https://css-tricks.com/animating-number-counters/)
- [MapLibre GL JS FlyToOptions](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/FlyToOptions/)
- [Exploring the Animation Landscape of 2023 Wrapped — Spotify Engineering](https://engineering.atspotify.com/2024/01/exploring-the-animation-landscape-of-2023-wrapped)
- [Emoji Reaction SDKs for Web Apps — Velt (2025)](https://velt.dev/blog/emoji-reaction-sdks-web-apps)
- [Boosting Team Engagement with Gamified Performance Dashboards — Plecto](https://www.plecto.com/blog/gamification/gamification-dashboards/)
- [Gamification Benchmarks 2026 — Xtremepush](https://www.xtremepush.com/blog/gamification-benchmarks-2026-whats-a-good-retention-rate-engagement-score-and-tier-progression)

---
*Feature research for: Campaign Hype — gamified political campaign texting report generator*
*Researched: 2026-03-20*
