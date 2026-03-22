// report/main.js — Full cinematic sequence with v1/v2 URL support
// v1 URLs: districtKey lookup from legacy DISTRICTS object
// v2 URLs: geo data (center + bounds) embedded — self-contained, no lookup

import { decodeReport } from '../shared/url-codec.js';
import { getDistrict, buildDistrictFromGeo } from '../shared/districts.js';
import { createMap, addVoterLayers } from './map.js';
import { generateVoterData } from './data.js';
import { playCameraSequence, runDotCascade } from './sequencer.js';
import { revealStats, showBenchmarkPopup, celebrate } from './overlay.js';
import { shareReport } from './share.js';
import { playWhoosh, playPing, playRisingTone, playChime, playCelebration } from './sound.js';

const payload = decodeReport();

if (!payload) {
  document.getElementById('error-state').style.display = 'flex';
  document.getElementById('loading-overlay').style.display = 'none';
} else {
  // ALWAYS textContent for URL-decoded data — never innerHTML (XSS prevention)
  const nameEl = document.getElementById('candidate-name');
  nameEl.textContent = payload.candidateName;
  document.title = `${payload.candidateName} — Campaign Results`;

  // Resolve district: v2 builds from embedded geo, v1 falls back to legacy lookup
  let district;
  if (payload.center && payload.bounds) {
    district = buildDistrictFromGeo(payload.center, payload.bounds, payload.districtName);
  } else {
    district = getDistrict(payload.districtKey) || getDistrict('raleigh-nc');
  }

  // Generate synthetic voter coordinates — count = delivered messages, capped at 5000
  const voterGeoJSON = generateVoterData(district, payload.delivered);

  window.__reportPayload = payload;
  window.__district = district;
  window.__voterGeoJSON = voterGeoJSON;

  const map = createMap('map-container');
  window.__map = map;

  map.on('load', () => {
    addVoterLayers(map, voterGeoJSON);

    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';

    document.getElementById('report-content').style.display = 'flex';

    (async () => {
      playWhoosh();
      await playCameraSequence(map, district);

      await runDotCascade(map, voterGeoJSON, {
        onProgress: (delivered, total) => {
          if (delivered === total) {
            console.log(`[main.js] Cascade complete: ${delivered}/${total} delivered`);
          }
        },
        onBatchPing: (progress) => {
          if (Math.random() < 0.15) playPing(progress);
        },
      });

      playRisingTone();
      await revealStats(payload);

      playChime();
      await showBenchmarkPopup(payload);

      playCelebration();
      await celebrate(payload);

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
