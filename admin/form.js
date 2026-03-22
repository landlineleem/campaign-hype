// admin/form.js — admin form: cascading district selector, validation, URL generation, clipboard, history
import { encodeReport } from '../shared/url-codec.js';
import { addToHistory, getHistory } from './history.js';

// --- District type labels ---
const TYPE_LABELS = {
  congressional: 'Congressional District',
  state_senate: 'State Senate District',
  state_house: 'State House District',
  county: 'County',
};

// --- State dropdown population (from _index.json) ---
const stateSelect = document.getElementById('state-select');
const typeSelect = document.getElementById('district-type-select');
const districtSelect = document.getElementById('district-select');

let currentStateData = null; // loaded state JSON
let selectedDistrict = null; // { name, center, bounds }

// Load state index and populate state dropdown
async function loadStateIndex() {
  try {
    const base = import.meta.env.BASE_URL || '/campaign-hype/';
    const res = await fetch(`${base}district-data/_index.json`);
    const index = await res.json();
    for (const state of index) {
      const option = document.createElement('option');
      option.value = state.abbr;
      option.textContent = state.name;
      stateSelect.appendChild(option);
    }
  } catch (err) {
    console.error('Failed to load state index:', err);
  }
}
loadStateIndex();

// --- Cascading dropdown handlers ---

stateSelect.addEventListener('change', async () => {
  const stateAbbr = stateSelect.value;
  typeSelect.innerHTML = '<option value="">Select a district type...</option>';
  districtSelect.innerHTML = '<option value="">Select a district...</option>';
  districtSelect.disabled = true;
  selectedDistrict = null;

  if (!stateAbbr) {
    typeSelect.disabled = true;
    currentStateData = null;
    return;
  }

  try {
    const base = import.meta.env.BASE_URL || '/campaign-hype/';
    const res = await fetch(`${base}district-data/${stateAbbr}.json`);
    currentStateData = await res.json();

    // Populate type dropdown with available types for this state
    for (const [type, districts] of Object.entries(currentStateData.districts)) {
      if (districts.length === 0) continue;
      const option = document.createElement('option');
      option.value = type;
      option.textContent = `${TYPE_LABELS[type] || type} (${districts.length})`;
      typeSelect.appendChild(option);
    }
    typeSelect.disabled = false;
  } catch (err) {
    console.error(`Failed to load districts for ${stateAbbr}:`, err);
    typeSelect.disabled = true;
  }
});

typeSelect.addEventListener('change', () => {
  const type = typeSelect.value;
  districtSelect.innerHTML = '<option value="">Select a district...</option>';
  selectedDistrict = null;

  if (!type || !currentStateData) {
    districtSelect.disabled = true;
    return;
  }

  const districts = currentStateData.districts[type] || [];
  for (let i = 0; i < districts.length; i++) {
    const d = districts[i];
    const option = document.createElement('option');
    option.value = i;
    option.textContent = d.name;
    districtSelect.appendChild(option);
  }
  districtSelect.disabled = false;
});

districtSelect.addEventListener('change', () => {
  const idx = districtSelect.value;
  const type = typeSelect.value;
  if (idx === '' || !type || !currentStateData) {
    selectedDistrict = null;
    return;
  }
  const d = currentStateData.districts[type][parseInt(idx, 10)];
  if (d) {
    // Build a display name like "Wake County, NC" or "Congressional District 1, NC"
    selectedDistrict = {
      name: `${d.name}, ${currentStateData.state}`,
      center: d.center,
      bounds: d.bounds,
    };
  }
});

// — Form validation —
function validateForm(data) {
  const errors = {};

  const name = data.candidateName.trim();
  if (!name) errors.name = 'Candidate name is required';
  else if (name.length > 50) errors.name = 'Name must be 50 characters or fewer';

  if (!stateSelect.value) errors.state = 'Please select a state';
  if (!typeSelect.value) errors.districtType = 'Please select a district type';
  if (!selectedDistrict) errors.district = 'Please select a district';

  const sent = parseInt(data.sent, 10);
  if (!data.sent || isNaN(sent) || sent < 1) errors.sent = 'Sent must be at least 1';
  else if (sent > 10000000) errors.sent = 'Sent cannot exceed 10,000,000';

  const delivered = parseInt(data.delivered, 10);
  if (data.delivered === '' || isNaN(delivered) || delivered < 0) errors.delivered = 'Delivered must be 0 or greater';
  else if (delivered > sent) errors.delivered = 'Delivered cannot exceed sent';

  const failed = parseInt(data.failed, 10);
  if (data.failed === '' || isNaN(failed) || failed < 0) errors.failed = 'Failed must be 0 or greater';

  return errors;
}

function showErrors(errors) {
  document.getElementById('name-error').textContent = errors.name || '';
  document.getElementById('state-error').textContent = errors.state || '';
  document.getElementById('district-type-error').textContent = errors.districtType || '';
  document.getElementById('district-error').textContent = errors.district || '';
  document.getElementById('sent-error').textContent = errors.sent || '';
  document.getElementById('delivered-error').textContent = errors.delivered || '';
  document.getElementById('failed-error').textContent = errors.failed || '';
}

function clearErrors() {
  showErrors({});
}

// — Totals consistency check —
function checkTotals(sent, delivered, failed) {
  const totalsCheck = document.getElementById('totals-check');
  const totalsWarning = document.getElementById('totals-warning');
  const s = parseInt(sent, 10) || 0;
  const d = parseInt(delivered, 10) || 0;
  const f = parseInt(failed, 10) || 0;
  if (s > 0 && d + f !== s) {
    totalsWarning.textContent = `Note: Delivered (${d}) + Failed (${f}) = ${d + f}, but Sent = ${s}. Continuing will encode the numbers as entered.`;
    totalsCheck.style.display = 'block';
  } else {
    totalsCheck.style.display = 'none';
  }
}

// Real-time totals check
['sent-input', 'delivered-input', 'failed-input'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    const sent = document.getElementById('sent-input').value;
    const delivered = document.getElementById('delivered-input').value;
    const failed = document.getElementById('failed-input').value;
    checkTotals(sent, delivered, failed);
  });
});

// — Clipboard copy —
async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
  } else {
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

// — History rendering —
function renderHistory() {
  const history = getHistory();
  const section = document.getElementById('history-section');
  const list = document.getElementById('history-list');

  if (history.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  list.innerHTML = '';  // Safe: no user data inserted via innerHTML here

  history.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'history-item';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'history-name';
    nameSpan.textContent = entry.candidateName;  // textContent — never innerHTML

    const districtSpan = document.createElement('span');
    districtSpan.className = 'history-district';
    districtSpan.textContent = entry.districtName || entry.districtKey || '';

    const dateSpan = document.createElement('span');
    dateSpan.className = 'history-date';
    dateSpan.textContent = new Date(entry.generatedAt).toLocaleDateString();

    const copyBtn = document.createElement('button');
    copyBtn.className = 'history-copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.type = 'button';
    copyBtn.addEventListener('click', async () => {
      await copyToClipboard(entry.url);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
    });

    const urlSpan = document.createElement('span');
    urlSpan.className = 'history-url';
    urlSpan.textContent = entry.url;  // textContent — safe

    li.appendChild(nameSpan);
    li.appendChild(districtSpan);
    li.appendChild(dateSpan);
    li.appendChild(copyBtn);
    li.appendChild(urlSpan);
    list.appendChild(li);
  });
}

// Render history on page load
renderHistory();

// — Form submission —
let lastGeneratedUrl = null;

document.getElementById('report-form').addEventListener('submit', (e) => {
  e.preventDefault();
  clearErrors();

  const formData = new FormData(e.target);
  const data = {
    candidateName: formData.get('candidateName') || '',
    sent: formData.get('sent') || '',
    delivered: formData.get('delivered') || '',
    failed: formData.get('failed') || '',
  };

  const errors = validateForm(data);
  if (Object.keys(errors).length > 0) {
    showErrors(errors);
    return;
  }

  const payload = {
    candidateName: data.candidateName.trim(),
    districtName: selectedDistrict.name,
    center: selectedDistrict.center,
    bounds: selectedDistrict.bounds,
    sent: parseInt(data.sent, 10),
    delivered: parseInt(data.delivered, 10),
    failed: parseInt(data.failed, 10),
  };

  const url = encodeReport(payload);
  lastGeneratedUrl = url;

  // Show URL preview
  const urlPreview = document.getElementById('url-preview');
  const urlText = document.getElementById('url-text');
  const urlLength = document.getElementById('url-length');
  urlText.textContent = url;  // textContent — safe
  urlLength.textContent = `${url.length} chars`;
  if (url.length > 500) urlLength.classList.add('url-length-warn');
  else urlLength.classList.remove('url-length-warn');
  urlPreview.style.display = 'block';

  // Show copy button
  document.getElementById('copy-btn').style.display = 'inline-block';

  // Add to history
  addToHistory({
    url,
    candidateName: payload.candidateName,
    districtName: payload.districtName,
    generatedAt: Date.now(),
  });

  renderHistory();
});

// Copy button click
document.getElementById('copy-btn').addEventListener('click', async () => {
  if (!lastGeneratedUrl) return;
  try {
    await copyToClipboard(lastGeneratedUrl);
    const feedback = document.getElementById('copy-feedback');
    feedback.textContent = 'Link copied to clipboard!';
    setTimeout(() => { feedback.textContent = ''; }, 3000);
    document.getElementById('copy-btn').textContent = 'Copied!';
    setTimeout(() => { document.getElementById('copy-btn').textContent = 'Copy Link'; }, 2000);
  } catch {
    const feedback = document.getElementById('copy-feedback');
    feedback.textContent = 'Copy failed — please copy manually from the URL above.';
  }
});
