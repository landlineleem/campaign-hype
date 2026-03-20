// report/main.js — Phase 2: map initialization + voter data generation
// Phase 1 logic retained: URL decode, error-state, candidateName via textContent.
// Phase 2 adds: MapLibre map init, generateVoterData, loading overlay management.
// Phase 3 will add: sequencer.playSequence() call.

import { decodeReport } from '../shared/url-codec.js';
import { getDistrict } from '../shared/districts.js';
import { createMap, addVoterLayers } from './map.js';
import { generateVoterData } from './data.js';

const payload = decodeReport();

if (!payload) {
  // No valid ?d= param — show error state
  // NEVER throw here — always show a user-friendly message
  document.getElementById('error-state').style.display = 'flex';
  document.getElementById('loading-overlay').style.display = 'none';
} else {
  // Candidate name — ALWAYS textContent, never innerHTML (XSS prevention, established in Phase 1)
  const nameEl = document.getElementById('candidate-name');
  nameEl.textContent = payload.candidateName;
  document.title = `${payload.candidateName} — Campaign Results`;

  // Store payload for Plan 02 sequencer access
  window.__reportPayload = payload;

  // Look up district — fall back to first available district if key is unrecognized
  const district = getDistrict(payload.districtKey) || getDistrict('raleigh-nc');

  // Generate synthetic voter coordinates now (before map loads) — no waiting
  // Count = delivered messages, capped at 5000 inside generateVoterData
  const voterGeoJSON = generateVoterData(district, payload.delivered);

  // Store on window for Plan 02 sequencer — sequencer reads these after map.on('load')
  window.__district = district;
  window.__voterGeoJSON = voterGeoJSON;

  // Initialize map (starts loading tiles immediately)
  // createMap() also wires WebGL context-loss handlers and the reload button
  const map = createMap('map-container');
  window.__map = map;

  // When map style and tiles are ready: hide loading overlay, add voter layers
  // Then Plan 02 sequencer will call playCameraSequence() and runDotCascade()
  map.on('load', () => {
    // Add voter layers (invisible initially — animation reveals them progressively)
    addVoterLayers(map, voterGeoJSON);

    // Hide loading overlay — map is ready
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';

    // Signal that map is ready for sequencer (Plan 02 will read window.__mapReady)
    window.__mapReady = true;

    // TODO Phase 2 Plan 02: import sequencer and call playSequence(payload, map, voterGeoJSON)
    // For now: show candidate name to confirm data flow works end-to-end
    document.getElementById('report-content').style.display = 'flex';
  });
}
