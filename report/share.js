/**
 * report/share.js — Share button logic for Campaign Hype
 *
 * Exports:
 *   shareReport(candidateName, url) — Web Share API with clipboard fallback
 *
 * Constraints:
 *   - Never use innerHTML — textContent only for any dynamic DOM updates
 *   - navigator.share() is mobile-first; clipboard.writeText() is the desktop fallback
 *   - Does not import from map.js, overlay.js, or sequencer.js — standalone module
 */

/**
 * shareReport — exported
 * Attempts Web Share API first (mobile native sheet).
 * Falls back to clipboard copy + visual feedback on desktop.
 *
 * @param {string} candidateName — shown in share title and text
 * @param {string} url           — full canonical report URL (window.location.href)
 * @returns {Promise<void>}
 */
export async function shareReport(candidateName, url) {
  const title = `${candidateName}'s Campaign Results`;
  const text  = `See ${candidateName}'s messaging campaign results — powered by VoterPing`;

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
    } catch (err) {
      // User cancelled the share sheet — not an error worth surfacing
      if (err.name !== 'AbortError') {
        console.warn('[share.js] navigator.share failed:', err);
        // Fall through to clipboard on unexpected failure
        await _clipboardFallback(url);
      }
    }
  } else {
    await _clipboardFallback(url);
  }
}

/**
 * _clipboardFallback — private
 * Copies url to clipboard and briefly changes the share button text to 'Copied!'.
 *
 * @param {string} url — URL to copy
 */
async function _clipboardFallback(url) {
  try {
    await navigator.clipboard.writeText(url);
    _showCopiedFeedback();
  } catch (err) {
    console.warn('[share.js] clipboard.writeText failed:', err);
    // Final fallback: prompt (Safari <13.1 and some old Android browsers)
    window.prompt('Copy this link:', url);
  }
}

/**
 * _showCopiedFeedback — private
 * Temporarily changes #share-btn text to 'Copied!' for 1.8s then restores.
 * Uses textContent exclusively.
 */
function _showCopiedFeedback() {
  const btn = document.getElementById('share-btn');
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = 'Copied!';
  btn.classList.add('share-btn--copied');
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('share-btn--copied');
  }, 1800);
}
