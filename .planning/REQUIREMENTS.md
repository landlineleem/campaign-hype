# Requirements: Campaign Hype

**Defined:** 2026-03-20
**Core Value:** Make candidates feel excited and confident about their messaging campaign results through an unforgettable, interactive visual experience.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data & URL

- [ ] **DATA-01**: Admin can input candidate name, district/location, messages sent, delivered, and failed
- [ ] **DATA-02**: Admin form generates a unique shareable URL with all campaign data encoded
- [ ] **DATA-03**: Generated URL is copied to clipboard with one click
- [ ] **DATA-04**: Admin can view history of all generated report links

### Map

- [ ] **MAP-01**: Report opens with full USA map view
- [ ] **MAP-02**: Map performs cinematic flyTo zoom from USA to candidate's district with 3D pitch/bearing
- [ ] **MAP-03**: Cascading dot animation shows messages being delivered across the district after zoom completes
- [ ] **MAP-04**: Map is mobile-responsive and touch-friendly

### Stats

- [ ] **STAT-01**: Animated counters roll up from 0 for messages sent, delivered, failed, and deliverability %
- [ ] **STAT-02**: Delivery percentage displayed as circular gauge or progress bar
- [ ] **STAT-03**: Industry benchmark popup celebrates when deliverability exceeds 85-92% average
- [ ] **STAT-04**: Numbers shake/pulse with satisfying effect when counters finish

### Celebration

- [ ] **CELB-01**: Confetti burst fires after stats reveal completes
- [ ] **CELB-02**: Floating voter reaction bubbles (thumbs up, hearts, "Great message!") rise from bottom of screen
- [ ] **CELB-03**: All elements revealed in choreographed sequence (map → dots → stats → benchmark → confetti → reactions)
- [ ] **CELB-04**: Share button lets candidates forward report via Web Share API with clipboard fallback

### Foundation

- [ ] **FOUN-01**: Report page renders correctly on mobile phones (primary device)
- [ ] **FOUN-02**: Page loads in under 3 seconds on mobile connection
- [ ] **FOUN-03**: Report displays candidate's name prominently throughout
- [ ] **FOUN-04**: Deployed to GitHub Pages with zero hosting cost

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Map Enhancements

- **MAP-05**: Custom district polygon highlighting with real GeoJSON boundaries
- **MAP-06**: Multiple preset districts with auto-detection

### Platform Integration

- **PLAT-01**: Auto-generate report URLs from VoterPing campaign data
- **PLAT-02**: Custom branding per candidate (colors, logos)

### Analytics

- **ANLYT-01**: Track whether candidates opened their report link
- **ANLYT-02**: A/B test different celebration sequences

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time data sync / live dashboard | Requires backend, destroys zero-cost static hosting |
| User authentication / candidate login | URL = access. No accounts needed |
| Candidate can edit their own stats | Admin controls data integrity |
| PDF export | Breaks the live animation experience |
| Leaderboard comparing candidates | Privacy concerns — candidates shouldn't see each other's stats |
| Dark/light mode toggle | Pick one great theme and ship it |
| Mobile native app | Web-first, URL-shareable |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | — | Pending |
| DATA-02 | — | Pending |
| DATA-03 | — | Pending |
| DATA-04 | — | Pending |
| MAP-01 | — | Pending |
| MAP-02 | — | Pending |
| MAP-03 | — | Pending |
| MAP-04 | — | Pending |
| STAT-01 | — | Pending |
| STAT-02 | — | Pending |
| STAT-03 | — | Pending |
| STAT-04 | — | Pending |
| CELB-01 | — | Pending |
| CELB-02 | — | Pending |
| CELB-03 | — | Pending |
| CELB-04 | — | Pending |
| FOUN-01 | — | Pending |
| FOUN-02 | — | Pending |
| FOUN-03 | — | Pending |
| FOUN-04 | — | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 0
- Unmapped: 20 ⚠️

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after initial definition*
