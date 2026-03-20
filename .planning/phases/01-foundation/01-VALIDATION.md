---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-20
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (bundled with Vite 8.x) |
| **Config file** | vitest.config.js (Wave 0 creates) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~3 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 1 | FOUN-04 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 1 | DATA-02 | unit | `npx vitest run src/shared/__tests__/url-codec.test.js` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | DATA-01 | manual | Browser form test | N/A | ⬜ pending |
| 1-02-02 | 02 | 1 | DATA-02, DATA-03 | unit | `npx vitest run src/shared/__tests__/url-codec.test.js` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 1 | DATA-04 | unit | `npx vitest run src/admin/__tests__/history.test.js` | ❌ W0 | ⬜ pending |
| 1-02-04 | 02 | 1 | FOUN-03 | manual | Browser render test | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` dev dependency installed
- [ ] `vitest.config.js` created
- [ ] `src/shared/__tests__/url-codec.test.js` — stubs for DATA-02 (encode/decode round-trip)
- [ ] `src/admin/__tests__/history.test.js` — stubs for DATA-04 (localStorage history)

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin form renders all input fields | DATA-01 | DOM rendering requires browser | Open admin page, verify name/district/sent/delivered/failed fields exist |
| Candidate name displays on report page | FOUN-03 | DOM rendering requires browser | Open generated report URL, verify candidate name shows |
| GitHub Pages deployment works | FOUN-04 | Requires CI/CD pipeline | Push to main, verify site loads at GitHub Pages URL |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
