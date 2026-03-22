// admin/form.js — admin form: cascading district selector, validation, URL generation, clipboard, history
import { encodeReport } from '../shared/url-codec.js';
import { addToHistory, getHistory, removeFromHistory } from './history.js';

// --- District type labels ---
const TYPE_LABELS = {
  congressional: 'Congressional District',
  state_senate: 'State Senate District',
  state_house: 'State House District',
  county: 'County',
};

// --- State full names for grid display ---
const STATE_NAMES = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'DC': 'D.C.', 'FL': 'Florida',
  'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana',
  'IA': 'Iowa', 'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine',
  'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire',
  'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota',
  'OH': 'Ohio', 'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island',
  'SC': 'South Carolina', 'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin',
  'WY': 'Wyoming', 'AS': 'American Samoa', 'GU': 'Guam', 'MP': 'N. Mariana Islands',
  'PR': 'Puerto Rico', 'VI': 'U.S. Virgin Islands',
};

// Sorted state abbreviations (50 states + DC first, then territories)
const MAIN_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY',
];

// --- State dropdown population (from _index.json) ---
const stateSelect = document.getElementById('state-select');
const typeSelect = document.getElementById('district-type-select');
const districtSelect = document.getElementById('district-select');

let currentStateData = null;
let selectedDistrict = null;
let stateOutlines = null; // loaded SVG paths

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

// Load state SVG outlines
async function loadStateOutlines() {
  try {
    const base = import.meta.env.BASE_URL || '/campaign-hype/';
    const res = await fetch(`${base}state-outlines.json`);
    stateOutlines = await res.json();
  } catch (err) {
    console.error('Failed to load state outlines:', err);
    stateOutlines = {};
  }
}

// Initialize both in parallel
Promise.all([loadStateIndex(), loadStateOutlines()]).then(() => {
  renderHistory();
});

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
    selectedDistrict = {
      name: `${d.name}, ${currentStateData.state}`,
      state: currentStateData.state,
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

// — Extract state abbreviation from districtName like "Wake County, NC" ---
function extractState(entry) {
  if (entry.state) return entry.state;
  if (entry.districtName) {
    const parts = entry.districtName.split(', ');
    if (parts.length >= 2) return parts[parts.length - 1].trim();
  }
  return 'Other';
}

// — State grid history rendering —

let expandedState = null; // currently expanded state abbreviation

// Click anywhere outside a state bubble to collapse the reports panel
document.addEventListener('click', (e) => {
  if (!expandedState) return;
  if (e.target.closest('.state-bubble') || e.target.closest('.state-reports')) return;
  expandedState = null;
  renderHistory();
});

function renderHistory() {
  const history = getHistory();
  const section = document.getElementById('history-section');
  const grid = document.getElementById('state-grid');
  const panel = document.getElementById('state-reports-panel');

  if (history.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  // Group history by state
  const byState = {};
  for (const entry of history) {
    const st = extractState(entry);
    if (!byState[st]) byState[st] = [];
    byState[st].push(entry);
  }

  // Render state grid — all main states, only show states with reports
  grid.innerHTML = ''; // Safe: no user data

  // Get states that have reports, sorted alphabetically
  const statesWithReports = MAIN_STATES.filter(s => byState[s]);
  // Add any non-standard states (territories, "Other")
  for (const s of Object.keys(byState)) {
    if (!statesWithReports.includes(s)) statesWithReports.push(s);
  }

  if (statesWithReports.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'state-grid-empty';
    empty.textContent = 'No reports generated yet.';
    grid.appendChild(empty);
    return;
  }

  for (const abbr of statesWithReports) {
    const count = byState[abbr].length;
    const bubble = document.createElement('div');
    bubble.className = 'state-bubble' + (expandedState === abbr ? ' active' : '');
    bubble.dataset.state = abbr;

    // SVG outline
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'state-bubble-svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', (stateOutlines && stateOutlines[abbr]) || '');
    svg.appendChild(path);
    bubble.appendChild(svg);

    // State name
    const nameEl = document.createElement('span');
    nameEl.className = 'state-bubble-name';
    nameEl.textContent = STATE_NAMES[abbr] || abbr;
    bubble.appendChild(nameEl);

    // Badge
    const badge = document.createElement('span');
    badge.className = 'state-badge';
    badge.textContent = count;
    bubble.appendChild(badge);

    bubble.addEventListener('click', () => {
      expandedState = expandedState === abbr ? null : abbr;
      renderHistory(); // re-render to toggle active state + panel
    });

    grid.appendChild(bubble);
  }

  // Render expanded state reports panel
  panel.innerHTML = ''; // Safe: no user data via innerHTML
  if (expandedState && byState[expandedState]) {
    const container = document.createElement('div');
    container.className = 'state-reports';

    const header = document.createElement('div');
    header.className = 'state-reports-header';

    const title = document.createElement('span');
    title.className = 'state-reports-title';
    title.textContent = `${STATE_NAMES[expandedState] || expandedState} Reports`;
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'state-reports-close';
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => {
      expandedState = null;
      renderHistory();
    });
    header.appendChild(closeBtn);
    container.appendChild(header);

    const list = document.createElement('ul');
    list.className = 'state-reports-list';

    for (const entry of byState[expandedState]) {
      const li = document.createElement('li');
      li.className = 'report-item';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'report-item-name';
      nameSpan.textContent = entry.candidateName; // textContent — safe

      const districtSpan = document.createElement('span');
      districtSpan.className = 'report-item-district';
      districtSpan.textContent = entry.districtName || '';

      const dateSpan = document.createElement('span');
      dateSpan.className = 'report-item-date';
      dateSpan.textContent = new Date(entry.generatedAt).toLocaleDateString();

      const copyBtn = document.createElement('button');
      copyBtn.className = 'report-item-copy';
      copyBtn.textContent = 'Copy';
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await copyToClipboard(entry.url);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
      });

      const urlSpan = document.createElement('span');
      urlSpan.className = 'report-item-url';
      urlSpan.textContent = entry.url; // textContent — safe

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'report-item-delete';
      deleteBtn.textContent = 'Delete';
      deleteBtn.type = 'button';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFromHistory(entry.generatedAt);
        renderHistory();
      });

      li.appendChild(nameSpan);
      li.appendChild(districtSpan);
      li.appendChild(dateSpan);
      li.appendChild(copyBtn);
      li.appendChild(deleteBtn);
      li.appendChild(urlSpan);
      list.appendChild(li);
    }

    container.appendChild(list);
    panel.appendChild(container);
  }
}

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
  urlText.textContent = url;
  urlLength.textContent = `${url.length} chars`;
  if (url.length > 500) urlLength.classList.add('url-length-warn');
  else urlLength.classList.remove('url-length-warn');
  urlPreview.style.display = 'block';

  document.getElementById('copy-btn').style.display = 'inline-block';

  // Add to history with state abbreviation
  addToHistory({
    url,
    candidateName: payload.candidateName,
    districtName: payload.districtName,
    state: selectedDistrict.state,
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
