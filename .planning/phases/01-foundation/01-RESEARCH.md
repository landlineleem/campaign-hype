# Phase 1: Foundation — Research

**Researched:** 2026-03-20
**Domain:** Vite scaffold, URL codec, districts registry, GitHub Pages CI/CD, admin form
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | Admin can input candidate name, district/location, messages sent, delivered, and failed | Admin form validation patterns; Vite multi-page entry point setup |
| DATA-02 | Admin form generates a unique shareable URL with all campaign data encoded | URL-safe Base64 codec; URLSearchParams; compact field key schema documented below |
| DATA-03 | Generated URL is copied to clipboard with one click | navigator.clipboard.writeText() native API; fallback via document.execCommand |
| DATA-04 | Admin can view history of all generated report links | localStorage-backed link history; rendered via vanilla JS DOM; no state library needed |
| FOUN-03 | Report displays candidate's name prominently throughout | decodeReport() in shared/url-codec.js feeds the report page; textContent assignment prevents XSS |
| FOUN-04 | Deployed to GitHub Pages with zero hosting cost | Vite 8.x + GitHub Actions deploy workflow; vite.config.js base path setting |
</phase_requirements>

---

## Summary

Phase 1 builds the entire data contract and operational scaffold for Campaign Hype. The URL codec (`shared/url-codec.js`) is the single most important artifact this phase produces — it is the schema both pages depend on for the rest of the project. Changing it after the admin form and report page exist is a breaking change on both sides simultaneously, so it must be designed correctly here.

The admin form is straightforward form validation with one critical constraint: the encoded URL must stay under 600 characters to survive SMS sharing reliably on VoterPing's platform. The districts registry is a direct port of the proven `districts.js` from voterping-viz, extended with a display-name field and district key for admin dropdown use. GitHub Pages deployment is fully documented by Vite's official guide and requires only one vite.config.js change (`base` path) plus a single GitHub Actions workflow file.

The report page's foundation task for this phase is minimal: correctly decode the URL params and display the candidate's name via `textContent` (never `innerHTML`) — no animations yet, just data decoding and personalized name rendering to satisfy FOUN-03.

**Primary recommendation:** Write and fully test `shared/url-codec.js` encode/decode round-trip before any other file. The schema is the contract — lock it first.

---

## Standard Stack

### Core (Phase 1 relevant)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vite | 8.0.1 | Build tool, dev server, multi-page bundling | Confirmed npm latest; voterping-viz proven baseline (was 6.1.0); v8 uses Rolldown (Rust) for 10-30x faster builds; same config API |
| URLSearchParams | Browser built-in | Encode/decode URL query params | Native; no library needed; query params survive SMS sharing where hash fragments are stripped |
| btoa / atob | Browser built-in | Base64 encode/decode for payload serialization | Native; pair with URL-safe replacement (`+`→`-`, `/`→`_`) |
| localStorage | Browser built-in | Link history persistence (DATA-04) | Native; zero-cost; survives page reloads; scoped to origin |
| navigator.clipboard | Browser built-in | Copy-to-clipboard (DATA-03) | Modern async API; async/await friendly; fallback to execCommand for older browsers |

### No additional npm installs needed for Phase 1

Vite is the only devDependency. All data encoding, form validation, clipboard, and history use native browser APIs. The only npm install in Phase 1 is scaffolding the project itself:

```bash
npm create vite@latest campaign-hype -- --template vanilla
# (no additional runtime packages for Phase 1)
```

MapLibre, GSAP, CountUp.js, canvas-confetti are installed in later phases when needed.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| URLSearchParams + btoa | lz-string or pako compression | Compression only matters above ~1500 chars; Phase 1 payload estimated ~200 chars encoded — overkill |
| localStorage for history | IndexedDB | IndexedDB is async and complex; localStorage is synchronous and sufficient for a list of URL strings |
| navigator.clipboard | clipboard.js library | clipboard.js is 3KB — native API covers all modern browsers used by campaign staff |
| Hash fragment (#) | Query params (?) | Hash stripped by SMS clients; query params survive all sharing contexts — critical for VoterPing use case |

---

## Architecture Patterns

### Recommended Project Structure

```
campaign-hype/
├── index.html              # Redirect to admin/ or admin page itself
├── admin/
│   ├── index.html          # Admin form page (lightweight — no animation deps)
│   └── form.js             # Validates inputs, calls url-codec, copies URL, manages history
├── report/
│   ├── index.html          # Report/player page (reads URL params, displays candidate name)
│   └── main.js             # Decodes URL, inserts candidate name via textContent
├── shared/
│   ├── url-codec.js        # encode/decode report payload — THE schema contract
│   └── districts.js        # District registry (coords, fly params, display names)
├── assets/
│   ├── style.css           # Global styles (minimal in Phase 1)
│   ├── admin.css           # Admin form styles
│   └── report.css          # Report page placeholder styles
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Pages deploy action
```

**Why two separate HTML files:** The report page will eventually load MapLibre GL JS, GSAP, and run heavy WebGL animations. Separating admin and report into distinct entry points ensures the admin form is a lightweight ~50KB page regardless of what the report page loads. Merging them is an anti-pattern documented in ARCHITECTURE.md.

**Vite multi-page config:**

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/campaign-hype/',   // GitHub Pages repo subdirectory — REQUIRED
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin/index.html',
        report: 'report/index.html',
      },
    },
  },
});
```

**Note on `base`:** The value must match the GitHub repository name exactly. If the repo is `campaign-hype`, `base` is `/campaign-hype/`. This affects all asset paths and must be set before any other files reference assets.

### Pattern 1: URL-as-Database (Compact Encoded Payload)

**What:** All report data encoded into a single `?d=<base64>` query param. No server, no database.

**Payload schema (compact keys to minimize URL length):**

```javascript
// shared/url-codec.js
// Schema v1 — LOCKED. Changes here break both admin and report pages.
// Fields: n=name, k=district key, s=sent, dv=delivered, f=failed, ts=timestamp

export function encodeReport(data) {
  const payload = {
    n:  data.candidateName,    // string
    k:  data.districtKey,      // string (e.g., 'raleigh-nc')
    s:  data.sent,             // integer
    dv: data.delivered,        // integer
    f:  data.failed,           // integer
    ts: Date.now(),            // unix ms timestamp
  };
  const json = JSON.stringify(payload);
  const b64 = btoa(json)
    .replace(/\+/g, '-')      // URL-safe Base64
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${window.location.origin}/campaign-hype/report/?d=${b64}`;
}

export function decodeReport(search = window.location.search) {
  const params = new URLSearchParams(search);
  const raw = params.get('d');
  if (!raw) return null;
  try {
    // Reverse URL-safe Base64 transformation
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64);
    const p = JSON.parse(json);
    return {
      candidateName: p.n,
      districtKey:   p.k,
      sent:          Number(p.s),
      delivered:     Number(p.dv),
      failed:        Number(p.f),
      timestamp:     Number(p.ts),
      // Derived fields (computed, not stored in URL):
      deliverabilityPct: p.s > 0 ? Math.round((p.dv / p.s) * 1000) / 10 : 0,
    };
  } catch {
    return null;  // Graceful failure — report page shows error state
  }
}
```

**URL length budget:**
- Longest realistic name: "Congressman William P. Hutchinson III" (38 chars)
- Longest district key: "north-carolina-senate-district-22" (33 chars)
- Sent/delivered/failed: up to 7 digits each
- Timestamp: 13 digits
- After JSON stringify + base64 encoding (~133% of raw): ~200–250 chars encoded
- Full URL with origin + path + `?d=`: ~350–400 chars total
- Target ceiling: 600 chars — well within budget even with padding

**When to use:** All static sites where payload fits under ~1.5KB — no backend needed.

### Pattern 2: Districts Registry (Ported from voterping-viz)

**What:** A static JS module mapping district keys to all parameters needed for map flyTo and synthetic data generation. Used by the admin form dropdown AND by the report page for map centering.

The voterping-viz `districts.js` is the direct source. For Phase 1, copy it verbatim and add a `displayName` convenience field for the admin dropdown. The full cluster/flyTo params are needed later (Phase 2) but should live here from day one — moving them later risks schema drift.

```javascript
// shared/districts.js — extend voterping-viz pattern
export const DISTRICTS = {
  'raleigh-nc': {
    displayName: 'Raleigh, NC — Wake County',
    center: [-78.6382, 35.7796],
    bounds: [[-78.95, 35.55], [-78.30, 36.05]],
    flyToZoom: 11,
    pitch: 45,
    bearing: -15,
    totalVoters: 18000,
    clusters: [ /* from voterping-viz districts.js */ ],
  },
  // 'el-paso-tx', 'phoenix-az' — same pattern
};

export function getDistrictKeys() {
  return Object.keys(DISTRICTS);
}

export function getDistrict(key) {
  return DISTRICTS[key] || null;
}
```

### Pattern 3: Admin Form Validation

**What:** All fields validated before URL generation. Real-time validation on `input` events. Final validation on submit. No library needed — native Constraint Validation API + custom checks.

**Validation rules per field:**
- `candidateName`: required, max 50 chars, trim whitespace
- `districtKey`: required, must be a valid key in DISTRICTS registry
- `sent`: required, positive integer, max 10,000,000
- `delivered`: required, positive integer, must be <= sent
- `failed`: required, non-negative integer, `sent - delivered - failed` >= 0 (they must sum correctly)

**Derived field validation:** Show a warning (not block) if `sent !== delivered + failed` — this catches data entry errors while allowing campaigns that track partial data.

### Pattern 4: Link History (DATA-04)

**What:** localStorage array of `{ url, candidateName, districtKey, generatedAt }` objects. Rendered as a list below the admin form on the same page. Max 50 entries (FIFO, oldest dropped).

```javascript
// In admin/form.js
const HISTORY_KEY = 'campaign-hype:link-history';
const MAX_HISTORY = 50;

export function addToHistory(entry) {
  const history = getHistory();
  history.unshift(entry);       // newest first
  if (history.length > MAX_HISTORY) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}
```

Render the list by generating DOM nodes via `document.createElement` + `textContent` — never innerHTML with URL data (XSS vector).

### Pattern 5: GitHub Pages CI/CD

**What:** Push-to-main triggers Vite build and deploys `dist/` to GitHub Pages via official actions.

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: ['main']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: lts/*
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: './dist'
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Setup step (one-time, in GitHub UI):** Repository Settings → Pages → Source: "GitHub Actions". Must be done before first deploy or the workflow errors.

### Anti-Patterns to Avoid

- **Hash fragments for data (`#?d=...`):** Hash is stripped by SMS clients including those used by VoterPing. Use `?d=` query param exclusively.
- **innerHTML to render candidate name:** XSS vector — a malicious URL can inject script tags. Always use `element.textContent = payload.candidateName`.
- **Raw Base64 without URL-safe transformation:** `+` becomes space, `/` can trigger path parsing issues in some URL parsers. Always replace `+`→`-`, `/`→`_`, strip `=` padding.
- **Schema fields with long names:** `candidate_name` in the URL payload wastes ~10 chars per field. Use single-letter or two-letter keys (`n`, `k`, `s`, `dv`, `f`, `ts`).
- **No URL length guard:** Add a real-time character count to the admin form that warns at 500 chars and blocks at 2000 chars.
- **Merging admin and report into one HTML file:** Report page will load heavy animation deps in later phases. Keep them separate from day one.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL encoding | Custom encoding scheme | URLSearchParams + btoa | Native, battle-tested, handles all edge cases |
| Base64 URL-safety | Custom character table | One-liner: `.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')` | Standard URL-safe Base64 variant, implemented in one line |
| Clipboard copy | execCommand fallback | `navigator.clipboard.writeText()` with `execCommand` catch | Async API works in all modern browsers; fallback is one line |
| Form validation | Custom validation framework | Native Constraint Validation API + manual checks | No library needed for 5-field form |
| History persistence | Custom storage system | localStorage JSON array | No complexity; 50 links is well within localStorage 5MB limit |

**Key insight:** Phase 1 is deliberately library-free at runtime. Everything is native browser APIs. This keeps the admin page fast and avoids any dependency management complexity before the codec schema is locked.

---

## Common Pitfalls

### Pitfall 1: URL-Safe Base64 Not Applied

**What goes wrong:** Raw `btoa()` output contains `+`, `/`, and `=` characters. `+` decodes as a space when URLSearchParams reads it back. `/` can confuse URL parsers. `=` causes issues in some SMS clients that truncate at `=`. The decode silently fails and the report page shows an error.

**Why it happens:** Developer tests with short ASCII strings that don't generate `+` or `/` in their base64. Works in tests, breaks with real candidate data.

**How to avoid:** Always apply the URL-safe transformation in `encodeReport()` and reverse it in `decodeReport()`. Test with a candidate name containing spaces and special characters.

**Warning signs:** Decoded `candidateName` shows spaces where the name contains mixed characters; `atob()` throws on decode.

### Pitfall 2: Schema Changes After Both Pages Exist

**What goes wrong:** Phase 2 or 3 work requires adding a field to the URL payload. Changing the schema breaks every existing report link ever generated — candidates who received their link now see a broken experience.

**Why it happens:** "We'll just add a field" sounds easy. But existing encoded URLs don't have the new field, so `decodeReport()` returns `undefined` for it unless defaults are handled.

**How to avoid:** Design the schema to be forward-compatible from day one. In `decodeReport()`, always provide defaults for every field (`p.ts ?? Date.now()`). Add a schema version field (`v: 1`) from the start so future versions can detect and handle old payloads.

**Warning signs:** Any change to `url-codec.js` that removes a field or changes a key name.

### Pitfall 3: vite.config.js `base` Path Missing

**What goes wrong:** Vite builds with default `base: '/'`. All asset paths are `/assets/style.css`. On GitHub Pages, the site is at `https://username.github.io/campaign-hype/` — paths resolve to `https://username.github.io/assets/style.css` which 404s. The deployed site loads blank.

**Why it happens:** Local dev works fine (Vite dev server serves from root). The mismatch only appears after deploy to GitHub Pages subdirectory.

**How to avoid:** Set `base: '/campaign-hype/'` in vite.config.js before any other development. Verify in the built `dist/` folder that asset paths include the base prefix.

**Warning signs:** Site works locally but shows blank page on GitHub Pages; all CSS/JS requests 404 in browser devtools network tab.

### Pitfall 4: GitHub Pages Source Not Set to "GitHub Actions"

**What goes wrong:** The deploy workflow runs successfully but the site doesn't publish. GitHub Pages still shows the old content (or "No GitHub Pages yet"). The `actions/deploy-pages` step silently succeeds but the page source is still set to a branch.

**Why it happens:** GitHub repository defaults Pages source to branch (`gh-pages` or `main`). The Actions source must be explicitly selected.

**How to avoid:** Before merging any commit that includes the deploy workflow, go to Repository Settings → Pages → Source → select "GitHub Actions". This is a one-time manual step that cannot be automated.

**Warning signs:** Deploy workflow shows green checkmark but `https://username.github.io/campaign-hype/` still 404s.

### Pitfall 5: XSS via Candidate Name in DOM

**What goes wrong:** A malicious actor crafts a report URL where the candidate name is `<img src=x onerror=alert(1)>`. Admin shares this URL. Candidates open it. The script executes. This is a reflected XSS vulnerability.

**Why it happens:** Developer uses `element.innerHTML = payload.candidateName` for convenience. Seems harmless with test data. Becomes a security hole with crafted URLs.

**How to avoid:** Always use `element.textContent = payload.candidateName` for URL-decoded strings. This is unconditional — no exceptions for "trusted" data. Audit every DOM insertion point where URL params are used.

**Warning signs:** Any `innerHTML` assignment that uses URL-decoded data.

---

## Code Examples

### URL Codec — Complete Round-Trip

```javascript
// shared/url-codec.js
// Source: native browser APIs (MDN URLSearchParams, btoa/atob)

const SCHEMA_VERSION = 1;

export function encodeReport(data) {
  const payload = {
    v:  SCHEMA_VERSION,
    n:  data.candidateName,
    k:  data.districtKey,
    s:  data.sent,
    dv: data.delivered,
    f:  data.failed,
    ts: Date.now(),
  };
  const json = JSON.stringify(payload);
  const b64 = btoa(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const origin = window.location.origin;
  return `${origin}/campaign-hype/report/?d=${b64}`;
}

export function decodeReport(search = window.location.search) {
  const params = new URLSearchParams(search);
  const raw = params.get('d');
  if (!raw) return null;
  try {
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64);
    const p = JSON.parse(json);
    const sent = Number(p.s ?? 0);
    const delivered = Number(p.dv ?? 0);
    return {
      schemaVersion:    Number(p.v ?? 1),
      candidateName:    String(p.n ?? 'Unknown Candidate'),
      districtKey:      String(p.k ?? ''),
      sent,
      delivered,
      failed:           Number(p.f ?? 0),
      timestamp:        Number(p.ts ?? Date.now()),
      deliverabilityPct: sent > 0 ? Math.round((delivered / sent) * 1000) / 10 : 0,
    };
  } catch {
    return null;
  }
}
```

### Clipboard Copy with Fallback

```javascript
// In admin/form.js
// Source: MDN navigator.clipboard
async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for non-HTTPS or older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
```

### Safe Candidate Name Display (FOUN-03)

```javascript
// In report/main.js
// Source: OWASP XSS Prevention Cheat Sheet
const payload = decodeReport();
if (!payload) {
  // Show user-friendly error — never a JS exception
  document.getElementById('error-state').style.display = 'block';
} else {
  // ALWAYS textContent, never innerHTML for URL-decoded strings
  document.getElementById('candidate-name').textContent = payload.candidateName;
  document.title = `${payload.candidateName} — Campaign Results`;
}
```

### GitHub Pages Vite Config

```javascript
// vite.config.js
// Source: https://vite.dev/guide/static-deploy#github-pages
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/campaign-hype/',
  build: {
    rollupOptions: {
      input: {
        main:   'index.html',
        admin:  'admin/index.html',
        report: 'report/index.html',
      },
    },
  },
  server: {
    open: true,
  },
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `document.execCommand('copy')` | `navigator.clipboard.writeText()` async API | ~2018, wide support by 2022 | Async, works in secure contexts (HTTPS), no DOM manipulation needed |
| Hash fragment for SPA routing on static hosts | Query params for data; hash-free URLs | Ongoing — SMS stripping is a known issue | Query params survive all sharing contexts including SMS; GitHub Pages 404.html trick not needed for this use case |
| Vite 6 + esbuild | Vite 8 + Rolldown (Rust bundler) | Vite 8.0.1, March 2026 | 10-30x faster production builds; same config API — drop-in upgrade from voterping-viz baseline |
| `gh-pages` branch deploy | GitHub Actions + `actions/deploy-pages` | GitHub Pages source options expanded 2022 | Branch deploy is deprecated in favor of Actions — cleaner, no orphan branch needed |

---

## Open Questions

1. **GitHub repository name for `base` path**
   - What we know: `base` in vite.config.js must match the repo name exactly
   - What's unclear: Is the GitHub repo named `campaign-hype` or something else?
   - Recommendation: Planner should confirm repo name before writing vite.config.js; use `campaign-hype` as default assumption based on project directory name

2. **District list scope for v1**
   - What we know: voterping-viz has 3 presets (Raleigh NC, El Paso TX, Phoenix AZ)
   - What's unclear: Does VoterPing serve campaigns beyond these 3 districts in current active use?
   - Recommendation: Start with those 3 districts ported verbatim from voterping-viz; the registry is additive — add more later without breaking existing URLs (district key is stored in URL, not district data)

3. **Admin form URL — same origin or configurable?**
   - What we know: `encodeReport()` uses `window.location.origin` for the report URL prefix
   - What's unclear: Should the generated URL always point to the live GitHub Pages site, or to whatever origin the admin form is running on?
   - Recommendation: Use `window.location.origin` dynamically — works correctly on both localhost dev and GitHub Pages production without hardcoding

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`. Phase 1 produces no test framework yet — this is the scaffold phase. The planner should include a Wave 0 task to install Vitest and create the test infrastructure for the URL codec.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (to be installed in Phase 1, Wave 0) |
| Config file | `vitest.config.js` — does not exist yet (Wave 0 gap) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATA-02 | encodeReport() produces valid URL with all fields | unit | `npx vitest run tests/url-codec.test.js` | Wave 0 |
| DATA-02 | decodeReport() round-trips encode output losslessly | unit | `npx vitest run tests/url-codec.test.js` | Wave 0 |
| DATA-02 | decodeReport() returns null for missing/corrupt `?d=` param | unit | `npx vitest run tests/url-codec.test.js` | Wave 0 |
| DATA-02 | URL-safe Base64 — no `+`, `/`, `=` in output | unit | `npx vitest run tests/url-codec.test.js` | Wave 0 |
| DATA-02 | Full URL stays under 600 chars with max-length inputs | unit | `npx vitest run tests/url-codec.test.js` | Wave 0 |
| DATA-01 | Admin form validates required fields (name, district, sent/delivered/failed) | manual | Open admin page, submit empty form — all fields show error state | N/A |
| DATA-03 | Copy button copies URL to clipboard | manual | Click copy button — paste confirms correct URL in clipboard | N/A |
| DATA-04 | Link history persists across page reload | manual | Generate URL, reload page — previous links visible in history list | N/A |
| FOUN-03 | Report page displays decoded candidate name | manual | Open generated URL — candidate name appears in h1 | N/A |
| FOUN-04 | Site deploys to GitHub Pages after push to main | smoke | Check `https://username.github.io/campaign-hype/` after CI run | N/A |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/url-codec.test.js`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/url-codec.test.js` — covers DATA-02 encode/decode round-trip, URL-safe Base64, null handling, URL length budget
- [ ] `vitest.config.js` — minimal config pointing at `tests/` directory
- [ ] Framework install: `npm install -D vitest` — no test runner detected in project yet

---

## Sources

### Primary (HIGH confidence)

- `/home/vpliam/voterping-viz/src/districts.js` — district registry pattern; directly portable
- `/home/vpliam/voterping-viz/src/main.js` — module boundary pattern (map.js, animation.js, ui.js separation)
- `/home/vpliam/voterping-viz/package.json` — confirmed Vite 6.1.0 + MapLibre 4.7.1 baseline
- [Vite static deploy guide — GitHub Pages](https://vite.dev/guide/static-deploy#github-pages) — GitHub Actions workflow YAML confirmed
- [MDN URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) — native API confirmed
- [MDN navigator.clipboard](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText) — async clipboard API
- [npm: vite@8.0.1](https://www.npmjs.com/package/vite) — confirmed latest, March 2026
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) — textContent vs innerHTML guidance

### Secondary (MEDIUM confidence)

- `.planning/research/STACK.md` — stack decisions already made; Phase 1 relevant portions reproduced here
- `.planning/research/ARCHITECTURE.md` — module boundaries, URL codec schema, anti-patterns
- `.planning/research/PITFALLS.md` — URL length overflow, XSS via URL params (Pitfalls 1, XSS section)

### Tertiary (LOW confidence)

- None for Phase 1 — all claims backed by primary or secondary sources

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Vite 8.0.1 and all browser APIs verified via npm and MDN; voterping-viz baseline proven
- Architecture: HIGH — module boundaries ported directly from existing working codebase
- URL codec schema: HIGH — compact key design, URL-safe Base64, and length budget all verified against official sources
- Pitfalls: HIGH — each pitfall backed by official docs or direct observation in voterping-viz codebase
- GitHub Pages deploy: HIGH — workflow pattern confirmed directly from Vite official guide

**Research date:** 2026-03-20
**Valid until:** 2026-06-20 (stable APIs; GitHub Actions versions may increment but pattern is stable)
