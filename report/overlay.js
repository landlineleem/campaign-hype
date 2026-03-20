/**
 * report/overlay.js — DOM overlay controller for Campaign Hype report page
 *
 * Exports:
 *   revealStats(payload)      — Phase 3 Plan 01: animated stat counter rollup
 *   showBenchmarkPopup(payload) — TODO Phase 3 Plan 02: comparison popup
 *   celebrate()               — TODO Phase 4: confetti / celebration
 *
 * CRITICAL constraints:
 *   - Never import from map.js (architecture boundary: overlay never calls map)
 *   - Never use innerHTML — textContent only
 *   - Called by sequencer/main.js, not by user interaction — no event listeners added here
 */

// Gauge math: r=38, circumference = 2 * PI * 38
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 38; // 238.76

/**
 * animateCounter — private
 * Rolls a DOM element's textContent from 0 to target over duration ms.
 * Uses ease-out cubic easing via requestAnimationFrame.
 * Calls onDone() when animation completes.
 *
 * @param {HTMLElement} el       — target element to update
 * @param {number}      target   — final numeric value
 * @param {number}      duration — animation duration in ms
 * @param {Function}    onDone   — called once when counter reaches target
 * @param {Function}    format   — (value: number) => string, formats display value
 */
function animateCounter(el, target, duration, onDone, format) {
  if (!el) {
    console.warn('[overlay.js] animateCounter: element not found, skipping');
    onDone();
    return;
  }

  const startTime = performance.now();

  function frame(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-out cubic: 1 - (1 - t)^3
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = eased * target;

    el.textContent = format(current);

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      el.textContent = format(target);
      onDone();
    }
  }

  requestAnimationFrame(frame);
}

/**
 * animateGauge — private
 * Animates the SVG circular gauge (#pct-gauge-fill) from empty (dashoffset=circumference)
 * to the filled state corresponding to pct using ease-out cubic.
 *
 * @param {number} pct      — deliverability percentage, 0-100
 * @param {number} duration — animation duration in ms
 */
function animateGauge(pct, duration) {
  const fillEl = document.getElementById('pct-gauge-fill');
  if (!fillEl) {
    console.warn('[overlay.js] animateGauge: #pct-gauge-fill not found, skipping');
    return;
  }

  const targetOffset = GAUGE_CIRCUMFERENCE * (1 - pct / 100);
  const startTime = performance.now();

  function frame(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const currentOffset = GAUGE_CIRCUMFERENCE - eased * (GAUGE_CIRCUMFERENCE - targetOffset);

    fillEl.style.strokeDashoffset = currentOffset;

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      fillEl.style.strokeDashoffset = targetOffset;
    }
  }

  requestAnimationFrame(frame);
}

/**
 * revealStats — exported
 * Reveals the #stats-panel and animates all four stat counters in parallel.
 * Resolves the returned Promise when all four counters finish.
 *
 * @param {Object} payload — decoded report payload with: sent, delivered, failed, deliverabilityPct
 * @returns {Promise<void>}
 */
export function revealStats(payload) {
  return new Promise((resolve) => {
    const panel = document.getElementById('stats-panel');
    if (!panel) {
      console.warn('[overlay.js] revealStats: #stats-panel not found');
      resolve();
      return;
    }

    // Show the stats panel
    panel.style.display = 'flex';

    let doneCount = 0;
    const TOTAL = 4;

    function onCounterDone(cardId) {
      const card = document.getElementById(cardId);
      if (card) {
        card.classList.add('stat-done');
      }
      doneCount++;
      if (doneCount >= TOTAL) {
        resolve();
      }
    }

    // Run all four counters in parallel
    // Integer counters: format with toLocaleString for readable comma separation
    animateCounter(
      document.getElementById('stat-sent-value'),
      payload.sent,
      1500,
      () => onCounterDone('stat-sent'),
      (v) => Math.round(v).toLocaleString()
    );

    animateCounter(
      document.getElementById('stat-delivered-value'),
      payload.delivered,
      1500,
      () => onCounterDone('stat-delivered'),
      (v) => Math.round(v).toLocaleString()
    );

    animateCounter(
      document.getElementById('stat-failed-value'),
      payload.failed,
      1500,
      () => onCounterDone('stat-failed'),
      (v) => Math.round(v).toLocaleString()
    );

    animateCounter(
      document.getElementById('stat-pct-value'),
      payload.deliverabilityPct,
      1800,
      () => onCounterDone('stat-pct'),
      (v) => v.toFixed(1) + '%'
    );

    // Gauge animates alongside the pct counter
    animateGauge(payload.deliverabilityPct, 1800);
  });
}

const INDUSTRY_FLOOR = 85;
const INDUSTRY_CEIL  = 92;

/**
 * showBenchmarkPopup — Phase 3 Plan 02
 * Displays the industry benchmark popup with deliverabilityPct and a contextual message.
 * Resolves when the user dismisses the popup (button click or overlay background click).
 *
 * Message logic:
 *   pct >= 92  -> "CRUSHED the industry average!"   (gold celebration)
 *   pct >= 85  -> "Beat the industry average!"      (positive)
 *   pct < 85   -> "Campaign delivery results"       (neutral, no judgment)
 *
 * @param {Object} payload — decoded report payload with deliverabilityPct
 * @returns {Promise<void>}
 */
export function showBenchmarkPopup(payload) {
  return new Promise((resolve) => {
    const popup  = document.getElementById('benchmark-popup');
    const pctEl  = document.getElementById('benchmark-pct');
    const msgEl  = document.getElementById('benchmark-message');
    const dismiss = document.getElementById('benchmark-dismiss');

    if (!popup || !pctEl || !msgEl) {
      console.warn('[overlay.js] benchmark popup elements not found — skipping');
      resolve();
      return;
    }

    // Populate content — textContent only, never innerHTML
    pctEl.textContent = payload.deliverabilityPct.toFixed(1) + '%';

    if (payload.deliverabilityPct >= INDUSTRY_CEIL) {
      msgEl.textContent = 'CRUSHED the industry average!';
    } else if (payload.deliverabilityPct >= INDUSTRY_FLOOR) {
      msgEl.textContent = 'Beat the industry average!';
    } else {
      msgEl.textContent = 'Campaign delivery results';
    }

    popup.style.display = 'flex';

    // Dismiss: clicking the dismiss button OR anywhere on the dark overlay background
    function onDismiss() {
      popup.style.display = 'none';
      popup.removeEventListener('click', onDismiss);
      if (dismiss) dismiss.removeEventListener('click', onDismiss);
      resolve();
    }

    // Clicking the overlay background (not just the card) also dismisses
    popup.addEventListener('click', onDismiss);
    // Prevent card clicks from bubbling to overlay (so card interior doesn't dismiss)
    const card = document.getElementById('benchmark-card');
    if (card) {
      card.addEventListener('click', (e) => e.stopPropagation());
    }
    if (dismiss) {
      dismiss.addEventListener('click', onDismiss);
    }
  });
}

/**
 * celebrate — stub for Phase 4
 * Will trigger confetti or celebration animation after stats reveal.
 *
 * @returns {Promise<void>}
 */
export function celebrate() { // TODO Phase 4
  return Promise.resolve();
}
