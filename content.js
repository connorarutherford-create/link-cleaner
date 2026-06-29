// Content script — Link Cleaner Pro
// Auto-clean on copy + clean link clicks on every page

const TRACKERS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclsrc', 'dclid', 'msclkid',
  'twclid', 'ysclid', 'wickedid',
  'sc_campaign', 'sc_channel', 'sc_content', 'sc_medium', 'sc_outcome', 'sc_geo', 'sc_country',
  'ref', 'ref_src', 'ref_url', 'source',
  'si', 's_kwcid',
  'aff_id', 'affiliate', 'aff', 'campaign_id', 'cid',
  'mc_cid', 'mc_eid',
  'pk_source', 'pk_medium', 'pk_campaign', 'pk_keyword',
  'vgo_eo',
  'mrq', 'mrqri', 'mrqei', 'mrqrs',
  'sa', 'sei', 'srsltid',
];

function cleanUrl(url) {
  try {
    const u = new URL(url);
    let removed = 0;

    if (u.hash) { u.hash = ''; removed++; }

    for (const key of [...u.searchParams.keys()]) {
      if (TRACKERS.includes(key.toLowerCase())) {
        u.searchParams.delete(key);
        removed++;
      }
    }

    for (const key of [...u.searchParams.keys()]) {
      const val = u.searchParams.get(key);
      if (val === '' || val === null) {
        u.searchParams.delete(key);
        removed++;
      }
    }

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
  try {
    const prefix = action === 'click' ? 'Redirected - ' : '';
    const msg = 'Link Cleaner: ' + prefix + 'stripped ' + count + ' tracking param' + (count > 1 ? 's' : '');
    const el = document.createElement('div');
    el.textContent = msg;
    Object.assign(el.style, {
      position: 'fixed', bottom: '24px', right: '24px',
      background: '#0f0f1a', color: '#22c55e',
      padding: '10px 18px', borderRadius: '10px',
      fontSize: '13px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      zIndex: 2147483647,
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      border: '1px solid rgba(34,197,94,0.2)',
    });
    document.documentElement.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); }, 4000);
  } catch(e) {}
}

// ─── Auto-clean on copy ─────────────────────────────────────────────────────
document.addEventListener('copy', (e) => {
  const sel = window.getSelection().toString().trim();
  if (!looksLikeUrl(sel)) return;
  const cleaned = cleanUrl(sel);
  if (!cleaned || cleaned.removed === 0) return;
  e.preventDefault();
  e.clipboardData.setData('text/plain', cleaned.url);
  showToast(cleaned.removed, 'copy');
});

// ─── Clean on click (toggleable, off by default) ────────────────────────────
let cleanOnClickEnabled = false;

// Load initial state
chrome.storage.sync.get(['cleanOnClick'], (result) => {
  cleanOnClickEnabled = result.cleanOnClick === true;
});

// Listen for changes from popup
chrome.storage.onChanged.addListener((changes) => {
  if (changes.cleanOnClick) {
    cleanOnClickEnabled = changes.cleanOnClick.newValue === true;
  }
});

document.addEventListener('click', (e) => {
  if (!cleanOnClickEnabled) return;
  let el = e.target;
  while (el && el.tagName !== 'A') el = el.parentElement;
  if (!el || !el.href) return;
  if (!el.href.startsWith('http')) return;

  const cleaned = cleanUrl(el.href);
  if (!cleaned || cleaned.removed === 0) return;
  e.preventDefault();
  showToast(cleaned.removed, 'click');
  setTimeout(() => { window.location.href = cleaned.url; }, 800);
});

// ─── Listen for setting changes from popup ──────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') sendResponse({ status: 'alive' });
});
