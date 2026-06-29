// Content script — Link Cleaner Pro
// Auto-clean on copy + clean link clicks on every page

const ESSENTIAL = ['q', 'v', 'id', 's', 'page', 'tab', 't'];

function cleanUrl(url) {
  try {
    const u = new URL(url);
    let removed = 0;
    if (u.hash) { u.hash = ''; removed = 1; }
    const kept = [];
    for (const [key, val] of u.searchParams.entries()) {
      if (ESSENTIAL.includes(key)) kept.push([key, val]);
      else removed++;
    }
    u.search = '';
    for (const [key, val] of kept) u.searchParams.set(key, val);
    return { url: u.toString(), removed };
  } catch (e) {
    return null;
  }
}

function looksLikeUrl(text) {
  if (!text || text.length < 8 || text.length > 4096) return false;
  return text.startsWith('http://') || text.startsWith('https://');
}

function showToast(count, action) {
  const prefix = action === 'click' ? 'Redirected - ' : '';
  const el = document.createElement('div');
  el.textContent = 'Link Cleaner: ' + prefix + 'stripped ' + count + ' tracking param' + (count > 1 ? 's' : '');
  Object.assign(el.style, {
    position: 'fixed', bottom: '24px', right: '24px',
    background: '#0f0f1a', color: '#22c55e',
    padding: '10px 18px', borderRadius: '10px',
    fontSize: '13px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    zIndex: 2147483647,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    border: '1px solid rgba(34,197,94,0.2)',
    opacity: '1', transition: 'opacity 0.3s',
  });
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); }, 4000);
}

// ─── Auto-clean on copy ─────────────────────────────────────────────────────
document.addEventListener('copy', (e) => {
  const sel = window.getSelection().toString().trim();
  if (!looksLikeUrl(sel)) return;

  document.body.dataset.lcLoaded = 'true';
  const cleaned = cleanUrl(sel);
  if (!cleaned || cleaned.removed === 0) return;

  e.preventDefault();
  e.clipboardData.setData('text/plain', cleaned.url);
  showToast(cleaned.removed, 'copy');
});

// ─── Clean on click (toggleable, off by default) ────────────────────────────
document.addEventListener('click', (e) => {
  let el = e.target;
  while (el && el.tagName !== 'A') el = el.parentElement;
  if (!el || !el.href) return;
  if (!el.href.startsWith('http')) return;

  // Check if clean-on-click is enabled (with safe fallback)
  try {
    chrome.storage.sync.get(['cleanOnClick'], (result) => {
      if (!result.cleanOnClick) return;
      handleClickRedirect(e, el);
    });
  } catch (e) {
    // Storage unavailable on this page — no-op
  }
});

function handleClickRedirect(e, el) {
  const cleaned = cleanUrl(el.href);
  if (!cleaned || cleaned.removed === 0) return;
  e.preventDefault();
  showToast(cleaned.removed, 'click');
  setTimeout(() => { window.location.href = cleaned.url; }, 800);
}

// ─── Listen for setting changes from popup ──────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') sendResponse({ status: 'alive' });
});
