// report/main.js — Phase 2 complete: map init + sequencer wiring
// Phase 1 logic retained: URL decode, error-state, candidateName via textContent.
// Phase 2: MapLibre map init, voter data generation, layer setup, promise-chain sequence.
// Phase 3 will add: stat counter reveal after runDotCascade resolves.

import { decodeReport } from '../shared/url-codec.js';
import { getDistrict } from '../shared/districts.js';
import { createMap, addVoterLayers } from './map.js';
import { generateVoterData } from './data.js';
import { playCameraSequence, runDotCascade } from './sequencer.js';
import { revealStats, showBenchmarkPopup, celebrate } from './overlay.js';
import { shareReport } from './share.js';
import { playWhoosh, playPing, playRisingTone, playChime, playCelebration } from './sound.js';

const payload = decodeReport();

if (!payload) {
  // No valid ?d= param — show error state
  // NEVER throw — always show a user-friendly message (pitfall research)
  document.getElementById('error-state').style.display = 'flex';
  document.getElementById('loading-overlay').style.display = 'none';
} else {
  // ALWAYS textContent for URL-decoded data — never innerHTML (XSS prevention)
  const nameEl = document.getElementById('candidate-name');
  nameEl.textContent = payload.candidateName;
  document.title = `${payload.candidateName} — Campaign Results`;

  // Fallback: if districtKey not found (e.g. future districts), use raleigh-nc
  const district = getDistrict(payload.districtKey) || getDistrict('raleigh-nc');

  // Generate synthetic voter coordinates now — not waiting for map load
  // Count = delivered messages, capped at 5000 inside generateVoterData
  const voterGeoJSON = generateVoterData(district, payload.delivered);

  // Store on window for debugging and Phase 3 sequencer access
  window.__reportPayload = payload;
  window.__district = district;
  window.__voterGeoJSON = voterGeoJSON;

  // Initialize map — immediately starts fetching tiles
  // createMap() wires WebGL context-loss handlers and the reload button
  const map = createMap('map-container');
  window.__map = map;

  // When map style loads: run the full cinematic sequence
  // Pitfall #4: Promise chain — no nested setTimeout between stages
  map.on('load', () => {
    // Add voter layers (initially hidden via filter = -1)
    addVoterLayers(map, voterGeoJSON);

    // Hide loading overlay — map is visible and ready
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';

    // Show candidate name immediately — context before the animation begins
    document.getElementById('report-content').style.display = 'flex';

    // Sequence: fly to district → cascade dots
    // Each stage returns a Promise; async/await makes the ordering explicit and auditable.
    // Promise chain = the architectural pattern from ARCHITECTURE.md:
    //   "each stage returns a Promise that resolves when it is complete, triggering the next stage"
    (async () => {
      // Stage 1: Camera flies from USA overview to candidate's district
      playWhoosh();
      await playCameraSequence(map, district);

      // Stage 2: Cascading gold dots animate across the district
      // onProgress callback available for Phase 3 stat counter sync
      await runDotCascade(map, voterGeoJSON, {
        onProgress: (delivered, total) => {
          // Phase 3: stat counters will update here
          // For now: log progress for verification
          if (delivered === total) {
            console.log(`[main.js] Cascade complete: ${delivered}/${total} delivered`);
          }
        },
        onBatchPing: (progress) => {
          // Play ping every few batches to avoid overwhelming audio
          if (Math.random() < 0.15) playPing(progress);
        },
      });

      // Stage 3: Stat counters roll up from 0 — all four in parallel, resolve when last finishes
      playRisingTone();
      await revealStats(payload);

      // Stage 4: Industry benchmark popup — celebrates deliverability vs 85-92% industry average
      // Resolves when user dismisses (tap/click) or automatically after overlay click
      playChime();
      await showBenchmarkPopup(payload);

      // Stage 5: Confetti burst + floating voter reaction bubbles — the finale
      playCelebration();
      await celebrate(payload);

      // Stage 6: Reveal share button — candidates can now forward their report
      const shareContainer = document.getElementById('share-container');
      if (shareContainer) {
        shareContainer.style.display = 'flex';
        const shareBtn = document.getElementById('share-btn');
        if (shareBtn) {
          shareBtn.addEventListener('click', () => {
            shareReport(payload.candidateName, window.location.href);
          });
        }
      }

      console.log('[main.js] Full sequence complete');
    })();
  });
}
