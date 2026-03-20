// admin/history.js — pure localStorage history logic (no DOM)
export const HISTORY_KEY = 'campaign-hype:link-history';
export const MAX_HISTORY = 50;

export function addToHistory(entry) {
  const history = getHistory();
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history.pop();
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}
