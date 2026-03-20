# Stack Research

**Domain:** Gamified interactive data visualization report — static site with map animations, confetti, counters, and popups
**Researched:** 2026-03-20
**Confidence:** HIGH (core choices), MEDIUM (version-specific details verified via npm/GitHub releases)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vite | 8.x | Build tool and dev server | Active proven baseline: voterping-viz already runs Vite. v8 uses Rolldown (Rust bundler), 10-30x faster builds. v7 still safe if v8 has rough edges — use latest stable. No framework overhead. |
| MapLibre GL JS | 5.x (5.2+ stable) | Map rendering, flyTo animations, dot layers | Already proven in voterping-viz (was on 4.7.1). v5 is latest stable as of early 2026. Free, no API key, WebGL-accelerated, flyTo + GeoJSON layers support all needed animations. |
| Vanilla JavaScript (ES modules) | ES2022+ | Application logic | No framework lock-in, fastest load time, no virtual DOM overhead. The animation sequencing is imperative by nature (step 1 → step 2 → step 3), which fights reactive frameworks. voterping-viz proves vanilla JS handles this complexity cleanly. |
| canvas-confetti | 1.9.4 | Confetti burst effects at celebration moments | Most widely used confetti library (no dependencies, canvas-based, performant). 1.9.4 is latest stable. Ships as CDN-ready UMD or ES module. Zero setup. |
| CountUp.js | 2.10.0 | Animated stat counters (messages sent, delivered, deliverability %) | Purpose-built for number animation with easing, smart formatting, decimal support. v2.10.0 adds IntersectionObserver-based auto-animation — counters trigger when they scroll into view automatically. Dependency-free. |
| GSAP | 3.14.x | Orchestrating complex multi-step animation sequences, popup entrance/exit, shake effects | As of 2024/2025, GSAP is fully free (Webflow acquisition removed all licensing restrictions). v3.14 is latest stable. Provides the timeline API needed to sequence: map zoom → dot cascade → counter roll → popup → confetti. CSS animations alone cannot reliably sequence these steps. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Animate.css | 4.1.1 | Pre-built CSS classes for bounce, shake, rubberBand, tada effects on popup elements | Use for one-shot entrance animations on DOM elements (popup appears, badge bounces). Do NOT use for sequenced multi-step choreography — use GSAP timelines for that. |
| URLSearchParams (native) | Browser built-in | Encode/decode all candidate data in the URL — no database needed | Use `new URLSearchParams(window.location.search)` to read params. Use `btoa/atob` + `JSON.stringify` to pack complex objects into a single `data` param. Verified native browser API, no library needed. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vite | Dev server with HMR, production build | Configure `base: '/campaign-hype/'` (or repo name) in `vite.config.js` for GitHub Pages subdirectory deployment |
| GitHub Actions | CI/CD to GitHub Pages | Use official `actions/deploy-pages` workflow. Trigger on push to `main`. Build step: `npm run build`. Deploy `dist/` folder. |
| ESLint (optional) | Lint JS | Only add if team grows. For solo build, skip to move faster. |

---

## Installation

```bash
# Core — scaffold new Vite vanilla project
npm create vite@latest campaign-hype -- --template vanilla

# Map
npm install maplibre-gl

# Counter animation
npm install countup.js

# Animation orchestration
npm install gsap

# Confetti — prefer CDN (see below), but npm also works
npm install canvas-confetti

# Dev
npm install -D vite
```

**CDN approach (simpler for static site, no build step for these libs):**

```html
<!-- MapLibre -->
<link href="https://cdn.jsdelivr.net/npm/maplibre-gl@5/dist/maplibre-gl.css" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/maplibre-gl@5/dist/maplibre-gl.js"></script>

<!-- GSAP — fully free as of 2024 -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14/dist/gsap.min.js"></script>

<!-- Confetti -->
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.browser.min.js"></script>

<!-- Animate.css (for CSS class-based entrance effects) -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css" />
```

**Recommendation:** Use npm + Vite for MapLibre and CountUp.js (they have CSS/ESM dependencies that benefit from bundling). Use CDN for GSAP and canvas-confetti (simpler, no tree-shaking needed for their size).

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vanilla JS + Vite | React + Vite | Only if team already knows React deeply. React's reconciler fights the imperative animation sequencing this project requires. |
| Vanilla JS + Vite | Vue 3 + Vite | Same reason as React. Adds framework overhead for no benefit on a single-page cinematic experience. |
| GSAP | Web Animations API (native) | If bundle size is critical and animations are simple. GSAP's timeline API is worth the 60KB for complex multi-step sequences like this. |
| GSAP | Anime.js | Anime.js is solid but has fewer maintainers, smaller community, and less documentation than GSAP. GSAP is now free so the cost argument for Anime.js is gone. |
| canvas-confetti | party.js | party.js adds emoji confetti and particles but is 3x larger. canvas-confetti does everything needed here at 13KB. |
| CountUp.js | Manual `requestAnimationFrame` loop | CountUp.js handles easing, formatting, decimals, and auto-animation out of the box. Rolling your own wastes a phase of work. |
| MapLibre GL JS | Leaflet | Leaflet cannot do 3D pitch, bearing, or WebGL-accelerated dot cascades at scale. MapLibre is required for the cinematic camera sequence. |
| MapLibre GL JS | Google Maps / Mapbox | Both require paid API keys. MapLibre is free, matches voterping-viz's existing code, and has all needed features. |
| URLSearchParams (native) | localStorage | localStorage requires the same device/browser. URL encoding works across devices — candidates open the link on their phone, which is the entire point. |
| URLSearchParams (native) | Firebase / Supabase | Backend out of scope for v1. URL encoding eliminates all infrastructure cost and complexity for the demo. |
| Vite | Webpack | Vite is faster in dev (native ESM), simpler config, and the voterping-viz baseline already uses it. No reason to switch. |
| Vite | No build tool (raw HTML) | Feasible for very simple pages. But MapLibre's CSS import and module splitting benefit significantly from Vite's bundling. voterping-viz proved this is the right call. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| React / Next.js / Vue | Overkill for a single cinematic page. Framework boot time adds 100-200ms. React's declarative model fights GSAP's imperative timeline. The project is explicitly a "presentation" not a "UI". | Vanilla JS |
| Mapbox GL JS | Requires a paid API key after free tier. Campaign managers will share URLs widely — billing risk with no auth. | MapLibre GL JS |
| Three.js | Massive (600KB+), complex API for 3D WebGL. MapLibre already handles all the 3D map work needed. | MapLibre GL JS |
| Tailwind CSS | No value here — the UI is a full-screen animated canvas, not a component-heavy layout. CSS custom properties + BEM is sufficient. | Vanilla CSS with custom properties |
| Framer Motion | React-only. Not applicable. | GSAP |
| ScrollMagic | Deprecated, unmaintained since 2020. GSAP ScrollTrigger replaced it (and is now free). | GSAP (no ScrollTrigger needed here — the experience is linear, not scroll-driven) |
| jQuery | No modern justification. ES2022 native DOM APIs cover everything jQuery does, and it conflicts with ES module patterns. | Vanilla JS DOM APIs |

---

## Stack Patterns by Variant

**If this stays v1 (URL-only, no backend):**
- Encode all data as `?data=<base64-encoded-JSON>` in the URL
- Use `URLSearchParams` + `atob(decodeURIComponent(...))` to read
- Keep total URL under 2000 characters (enough for: name, district, sent, delivered, failed, date)
- No server-side code needed at all

**If v2 adds a database:**
- Add Supabase (Postgres + REST API + auth) as the backend
- Admin form posts to Supabase, returns a short UUID
- Report URL becomes `/report/abc123` — resolved at load via Supabase query
- GitHub Pages cannot do server-side routing — switch to Netlify or Vercel at that point

**If the map needs real congressional/county boundary polygons:**
- Use US Census Bureau GeoJSON (free, public domain): `https://www2.census.gov/geo/tiger/`
- Or use `us-atlas` npm package (topojson → geojson conversion) for simpler integration
- Do NOT use Mapbox's tileset APIs (requires API key)

**If mobile performance becomes an issue:**
- Reduce dot count for the cascading animation on small screens (detect via `window.innerWidth`)
- Disable pitch/3D on mobile (`map.setPitch(0)`) — WebGL 3D is heavier on mobile GPUs
- canvas-confetti has a `disableForReducedMotion` option — enable it

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| maplibre-gl@5.x | Vite@8.x | No known issues. ES module import works cleanly. |
| maplibre-gl@5.x | maplibre-gl@4.x API | Breaking changes in v5: check migration guide at maplibre.org. voterping-viz uses 4.7.1 — some API differences exist. |
| gsap@3.14.x | Vite@8.x | Works via npm import or CDN. No issues with ES modules. |
| canvas-confetti@1.9.4 | All modern browsers | Uses OffscreenCanvas where available; gracefully degrades. |
| countup.js@2.10.0 | Vite@8.x | ES module import: `import { CountUp } from 'countup.js'` |
| animate.css@4.1.1 | Any CSS pipeline | Pure CSS, no JS dependency. Works alongside GSAP without conflict. |

---

## Sources

- [MapLibre GL JS npm page](https://www.npmjs.com/package/maplibre-gl) — version 5.x confirmed latest (search result: 5.21.0 as of March 2026)
- [MapLibre releases](https://github.com/maplibre/maplibre-gl-js/releases) — active release cadence confirmed
- [canvas-confetti GitHub releases](https://github.com/catdad/canvas-confetti/releases) — v1.9.4 confirmed latest stable
- [CountUp.js GitHub releases](https://github.com/inorganik/countUp.js/releases) — v2.10.0 confirmed latest (released March 2026)
- [GSAP homepage](https://gsap.com/) — v3.14.2 confirmed latest, fully free since Webflow acquisition
- [GSAP free announcement](https://trendzhub.medium.com/gsap-just-went-free-6cfd628d9889) — MEDIUM confidence (secondary source)
- [Animate.css releases](https://github.com/animate-css/animate.css/releases/tag/v4.1.1) — v4.1.1 confirmed latest stable
- [Vite blog — Vite 8 announcement](https://vite.dev/blog/announcing-vite8) — v8.0.1 confirmed latest
- [Vite static deploy guide](https://vite.dev/guide/static-deploy) — GitHub Pages workflow pattern confirmed
- [MDN URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) — native API confirmed, no library needed
- voterping-viz `package.json` at `/home/vpliam/voterping-viz/package.json` — confirmed existing baseline: Vite 6 + MapLibre 4.7.1 + vanilla JS

---

*Stack research for: Campaign Hype — gamified interactive campaign report generator*
*Researched: 2026-03-20*
