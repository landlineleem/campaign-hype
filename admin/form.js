// admin/form.js — admin form: validation, URL generation, clipboard copy, history
import { encodeReport } from '../shared/url-codec.js';
import { getDistrictKeys, getDistrict } from '../shared/districts.js';
import { addToHistory, getHistory } from './history.js';

// — District dropdown population —
const districtSelect = document.getElementById('district-select');
getDistrictKeys().forEach(key => {
  const district = getDistrict(key);
  const option = document.createElement('option');
  option.value = key;
  option.textContent = district.displayName;
  districtSelect.appendChild(option);
});

// — Form validation —
function validateForm(data) {
  const errors = {};

  const name = data.candidateName.trim();
  if (!name) errors.name = 'Candidate name is required';
  else if (name.length > 50) errors.name = 'Name must be 50 characters or fewer';

  if (!data.districtKey) errors.district = 'Please select a district';

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
    const district = getDistrict(entry.districtKey);
    districtSpan.textContent = district ? district.displayName : entry.districtKey;

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
    districtKey: formData.get('districtKey') || '',
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
    districtKey: data.districtKey,
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
  urlPreview.style.display = 'block';

  // Show copy button
  document.getElementById('copy-btn').style.display = 'inline-block';

  // Add to history
  addToHistory({
    url,
    candidateName: payload.candidateName,
    districtKey: payload.districtKey,
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
