// report/main.js — stub; candidate name display implemented in Plan 02
import { decodeReport } from '../shared/url-codec.js';
const payload = decodeReport();
if (!payload) {
  document.getElementById('error-state').style.display = 'block';
} else {
  document.getElementById('report-content').style.display = 'block';
  document.getElementById('candidate-name').textContent = payload.candidateName;
  document.title = `${payload.candidateName} — Campaign Results`;
}
