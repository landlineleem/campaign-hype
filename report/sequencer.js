// report/sequencer.js — Camera flyTo and dot cascade animation for Campaign Hype
// Promise-based: each function resolves when its stage is fully complete.
// Pitfall research:
//   #3: Anti-pattern — setTimeout for animation timing. Use event-driven (moveend) and rAF.
//   #4: Animation sequencing — no nested setTimeout, single rAF loop.
//   #6: Never use sessionStorage/localStorage in animation trigger paths.

// ─── State ───────────────────────────────────────────────────────────────────
// Module-level state for the dot cascade animation loop.
// Reset at the start of each runDotCascade call — safe to call multiple times.

let _animationFrameId = null;
let _pulseFrameId = null;
let _cascadeState = null;

/**
 * Compute batch size from total point count.
 * Larger batches = shorter total animation time.
 * Target: ~8-12 seconds for the full cascade at any point count (up to 5000 cap).
 */
function computeBatchSize(totalPoints) {
  if (totalPoints <= 500)  return 5;
  if (totalPoints <= 1000) return 10;
  if (totalPoints <= 2000) return 20;
  if (totalPoints <= 5000) return 40;
  return 60;  // above cap — shouldn't occur given 5000 cap in data.js
}

// ─── Camera Fly ───────────────────────────────────────────────────────────────

/**
 * Jump to USA overview, pause for visual beat, then flyTo the candidate's district.
 * Resolves when MapLibre fires 'moveend' (camera animation complete).
 *
 * Anti-pattern avoided: setTimeout to sequence camera fly (pitfall #3).
 * 'moveend' fires when the flyTo actually finishes — duration varies by distance traveled.
 *
 * @param {Map}    map      - Loaded MapLibre map instance (from window.__map)
 * @param {object} district - District from shared/districts.js (center, flyToZoom, pitch, bearing)
 * @returns {Promise<void>} - Resolves when camera arrives at district
 */
export function playCameraSequence(map, district) {
  return new Promise((resolve) => {
    const { center, flyToZoom, pitch, bearing } = district;

    // Snap to USA overview — instant jump (not animated) so the viewer sees the full country
    map.jumpTo({
      center: [-98.5795, 39.8283],
      zoom: 4,
      pitch: 0,
      bearing: 0,
    });

    // Brief pause at USA view — gives the viewer a "you are here" moment before the zoom
    // This is the one intentional setTimeout in the sequence — it's a fixed visual beat,
    // not timing-dependent on any async operation. Safe.
    setTimeout(() => {
      map.flyTo({
        center,
        zoom: flyToZoom || 11,
        pitch: pitch || 45,
        bearing: bearing || -15,
        duration: 4000,
        curve: 1.5,
        essential: true,  // tells MapLibre: don't interrupt this animation
      });

      // Resolve when the fly animation actually completes — event-driven, not timed
      map.once('moveend', () => {
        // Short pause after landing — visual breath before dots start appearing
        setTimeout(resolve, 600);
      });
    }, 1500);
  });
}

// ─── Dot Cascade ─────────────────────────────────────────────────────────────

/**
 * Animate cascading dot reveal across the district.
 * Each batch: update filter to activate next N dots, update ping ring, fire callbacks.
 * Resolves when all points are activated.
 *
 * Anti-patterns avoided:
 *   - No setTimeout chains (pitfall #4) — timing from requestAnimationFrame
 *   - No setFeatureState loop (perf trap) — uses setFilter with data-driven expression
 *
 * @param {Map}    map         - Loaded MapLibre map instance
 * @param {object} geojsonData - GeoJSON FeatureCollection from report/data.js
 * @param {object} callbacks   - Optional callbacks:
 *   callbacks.onProgress(delivered, total) — called each batch (for Phase 3 counter sync)
 *   callbacks.onBatchPing(progress 0-1)    — called each batch (for pulse effects)
 * @returns {Promise<void>}    - Resolves when all dots are activated
 */
export function runDotCascade(map, geojsonData, callbacks = {}) {
  return new Promise((resolve) => {
    // Cancel any previous animation (safe on replay)
    _cancelAnimation();

    const totalPoints = geojsonData.features.length;
    const batchSize = computeBatchSize(totalPoints);

    _cascadeState = {
      currentIndex: -1,
      totalPoints,
      batchSize,
      batchIntervalMs: 50,     // target ~20 batches/sec
      lastBatchTime: 0,
      ringPhase: 0,
      ringDuration: 400,       // ms for ping ring to expand and fade
      ringStartTime: 0,
      currentBatchFeatures: [],
      resolved: false,
    };

    const s = _cascadeState;

    function frame(timestamp) {
      if (s.resolved) return;

      const elapsed = timestamp - s.lastBatchTime;

      // Advance to next batch if interval has passed and there are more points
      if (elapsed >= s.batchIntervalMs && s.currentIndex < s.totalPoints - 1) {
        const prevIndex = s.currentIndex;
        s.currentIndex = Math.min(s.currentIndex + s.batchSize, s.totalPoints - 1);

        // Update activated layer filter — reveals dots 0..currentIndex as gold
        map.setFilter('voters-activated', ['<=', ['get', 'order'], s.currentIndex]);
        // Update heatmap to match
        map.setFilter('voters-heatmap', ['<=', ['get', 'order'], s.currentIndex]);

        // Extract batch features for ping ring display
        s.currentBatchFeatures = geojsonData.features.slice(prevIndex + 1, s.currentIndex + 1);
        map.getSource('ping-rings').setData({
          type: 'FeatureCollection',
          features: s.currentBatchFeatures,
        });

        s.ringStartTime = timestamp;
        s.ringPhase = 0;
        s.lastBatchTime = timestamp;

        // Fire progress callbacks for Phase 3 (stat counter sync)
        if (callbacks.onProgress) callbacks.onProgress(s.currentIndex + 1, s.totalPoints);
        if (callbacks.onBatchPing) callbacks.onBatchPing(s.currentIndex / s.totalPoints);
      }

      // Animate ping ring expansion every frame (smooth, not per-batch)
      if (s.ringPhase < 1 && s.currentBatchFeatures.length > 0) {
        s.ringPhase = Math.min((timestamp - s.ringStartTime) / s.ringDuration, 1);
        const eased = 1 - Math.pow(1 - s.ringPhase, 3); // ease-out cubic
        const radius = 6 + eased * 18;
        const opacity = 0.7 * (1 - eased);
        map.setPaintProperty('ping-rings-layer', 'circle-radius', radius);
        map.setPaintProperty('ping-rings-layer', 'circle-opacity', opacity);
        map.setPaintProperty('ping-rings-layer', 'circle-stroke-opacity', opacity * 0.6);
      }

      // Check completion
      if (s.currentIndex >= s.totalPoints - 1) {
        // Clear ping rings
        map.getSource('ping-rings').setData({ type: 'FeatureCollection', features: [] });
        s.resolved = true;

        // Start breathing pulse on activated dots (cosmetic — runs indefinitely in background)
        _startCompletionPulse(map);

        // Resolve the Promise — sequencer advances to next stage (Phase 3 stats)
        resolve();
        return;
      }

      _animationFrameId = requestAnimationFrame(frame);
    }

    _animationFrameId = requestAnimationFrame(frame);
  });
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function _cancelAnimation() {
  if (_animationFrameId) {
    cancelAnimationFrame(_animationFrameId);
    _animationFrameId = null;
  }
  if (_pulseFrameId) {
    cancelAnimationFrame(_pulseFrameId);
    _pulseFrameId = null;
  }
  _cascadeState = null;
}

/**
 * Post-completion breathing pulse on activated gold dots.
 * Runs indefinitely in the background — killed only on page unload.
 * Uses a sine wave to gently oscillate opacity and radius.
 */
function _startCompletionPulse(map) {
  let phase = 0;

  function pulse() {
    phase += 0.025;
    const breathe = 0.75 + Math.sin(phase) * 0.1;
    const radius = 3.5 + Math.sin(phase) * 0.5;

    if (map.getLayer('voters-activated')) {
      map.setPaintProperty('voters-activated', 'circle-opacity', breathe);
      map.setPaintProperty('voters-activated', 'circle-radius', radius);
    }

    _pulseFrameId = requestAnimationFrame(pulse);
  }

  pulse();
}
