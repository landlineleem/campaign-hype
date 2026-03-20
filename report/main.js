// report/main.js — Phase 1: decode URL and display candidate name
// Phase 2 will add map initialization and animation sequencer
import { decodeReport } from '../shared/url-codec.js';

const payload = decodeReport();

if (!payload) {
  // Show error state — never throw or leave blank page
  document.getElementById('error-state').style.display = 'block';
  document.getElementById('report-content').style.display = 'none';
} else {
  document.getElementById('report-content').style.display = 'block';
  document.getElementById('error-state').style.display = 'none';

  // ALWAYS textContent — never innerHTML for URL-decoded strings (XSS prevention)
  const nameEl = document.getElementById('candidate-name');
  nameEl.textContent = payload.candidateName;

  // Update page title with candidate name
  document.title = `${payload.candidateName} — Campaign Results`;

  // Store payload on window for Phase 2 sequencer access
  window.__reportPayload = payload;
}
