# Campaign Hype

## What This Is

A Temu-style interactive hype report generator for political text messaging campaigns. Campaign managers input candidate data (district, message stats) through an admin interface, which generates unique shareable URLs. When candidates open their link, they experience a cinematic, gamified presentation of their campaign results — complete with map animations, cascading delivery visualizations, stat counters, popups, and confetti.

## Core Value

Make candidates feel excited and confident about their messaging campaign results through an unforgettable, interactive visual experience.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Admin form to input candidate name, district/area, messages sent, delivered, failed
- [ ] Unique shareable URL generation per candidate report
- [ ] Full USA map with cinematic zoom into candidate's specific district
- [ ] Cascading dot animation showing messages being delivered across the district
- [ ] Animated stat counters — messages sent, delivered, failed, deliverability %
- [ ] Temu-style popups and celebrations (confetti, shaking, wow moments)
- [ ] Industry average comparison popup ("Your 96.2% CRUSHED the industry average!")
- [ ] Floating voter reaction bubbles (thumbs up, "Great message!", etc.)
- [ ] Mobile-friendly (candidates are always on their phones)
- [ ] GitHub Pages deployment (no server/database needed initially)

### Out of Scope

- Backend/database — v1 encodes data in URL, upgrade later
- Custom domain — deploy to GitHub Pages first, domain later
- Real-time data integration — stats are manually input
- Candidate login/authentication — public links, no auth needed
- Analytics/tracking on link opens — future enhancement

## Context

- Built for VoterPing (voterping.com), a political peer-to-peer SMS/MMS campaign platform
- Industry average deliverability rate is 85-92% — reports should celebrate when candidates exceed this
- Existing VoterPing visualization tool at `/home/vpliam/voterping-viz/` uses MapLibre GL JS with 3D map animations — proven tech stack to build on
- Target audience is political candidates and campaign managers who may not be technical
- The experience should feel like opening the Temu app — constant dopamine hits, everything feels like winning

## Constraints

- **Hosting**: GitHub Pages (static site, no server-side code)
- **Maps**: MapLibre GL JS (free, no API key required)
- **Data**: Encoded in URL parameters (no database for v1)
- **Budget**: Zero hosting cost

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Static site on GitHub Pages | Free hosting, instant deploy, no server complexity | — Pending |
| URL-encoded data (no database) | Simplest path to working demo, can upgrade later | — Pending |
| MapLibre GL JS for maps | Free, no API key, already proven in VoterPing viz | — Pending |
| Vanilla HTML/CSS/JS stack | Lightweight, fast loading, no build step needed | — Pending |

---
*Last updated: 2026-03-20 after initialization*
