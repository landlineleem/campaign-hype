# Requirements: Campaign Hype

**Defined:** 2026-03-20
**Core Value:** Make candidates feel excited and confident about their messaging campaign results through an unforgettable, interactive visual experience.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data & URL

- [x] **DATA-01**: Admin can input candidate name, district/location, messages sent, delivered, and failed
- [x] **DATA-02**: Admin form generates a unique shareable URL with all campaign data encoded
- [x] **DATA-03**: Generated URL is copied to clipboard with one click
- [x] **DATA-04**: Admin can view history of all generated report links

### Map

- [x] **MAP-01**: Report opens with full USA map view
- [x] **MAP-02**: Map performs cinematic flyTo zoom from USA to candidate's district with 3D pitch/bearing
- [x] **MAP-03**: Cascading dot animation shows messages being delivered across the district after zoom completes
- [x] **MAP-04**: Map is mobile-responsive and touch-friendly

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
- [x] **FOUN-03**: Report displays candidate's name prominently throughout
- [x] **FOUN-04**: Deployed to GitHub Pages with zero hosting cost

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
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |
| MAP-01 | Phase 2 | Complete |
| MAP-02 | Phase 2 | Complete |
| MAP-03 | Phase 2 | Complete |
| MAP-04 | Phase 2 | Complete |
| STAT-01 | Phase 3 | Pending |
| STAT-02 | Phase 3 | Pending |
| STAT-03 | Phase 3 | Pending |
| STAT-04 | Phase 3 | Pending |
| CELB-01 | Phase 4 | Pending |
| CELB-02 | Phase 4 | Pending |
| CELB-03 | Phase 3 | Pending |
| CELB-04 | Phase 4 | Pending |
| FOUN-01 | Phase 4 | Pending |
| FOUN-02 | Phase 4 | Pending |
| FOUN-03 | Phase 1 | Complete |
| FOUN-04 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-20*
*Last updated: 2026-03-20 after roadmap creation*
