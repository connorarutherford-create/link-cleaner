// Content script — intercepts copy events and auto-cleans URLs

const ESSENTIAL_PARAMS = ['q', 'v', 'id', 's', 'page', 'tab', 't'];

function cleanUrl(url) {
  try {
    const u = new URL(url);
    let removed = 0;
    
    // Strip hash fragments (almost always tracking/state)
    if (u.hash) {
      u.hash = '';
      removed = 1;
    }
    
    // Strip non-essential query params
    const kept = [];
    for (const [key, val] of u.searchParams.entries()) {
      if (ESSENTIAL_PARAMS.includes(key)) {
        kept.push([key, val]);
      }
    }
    removed += u.searchParams.toString() ? (u.searchParams.toString().split('&').length - kept.length) : 0;
    
    if (kept.length === 0 && !removed) return { url: u.toString(), cleaned: false, removed: 0 };
    
    u.search = '';
    for (const [key, val] of kept) {
      u.searchParams.set(key, val);
    }
    
    return { url: u.toString(), cleaned: removed > 0, removed };
  } catch (e) {
    return { url: url, cleaned: false, removed: 0 };
  }
}

function looksLikeUrl(text) {
  if (!text || text.length < 5 || text.length > 4096) return false;
  // Must start with http:// or https://
  if (!text.startsWith('http://') && !text.startsWith('https://')) return false;
  // Must have a domain with a dot
  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
}

// Intercept copy events
document.addEventListener('copy', async (e) => {
  // Check if auto-clean is enabled (stored in chrome.storage)
  const result = await chrome.storage.sync.get(['autoClean']);
  if (result.autoClean === false) return;
  
  // Get the selected text
  const selection = window.getSelection().toString().trim();
  
  // Check if it looks like a URL
  if (!looksLikeUrl(selection)) {
    // Also check if there's a link element in the selection
    let linkUrl = '';
    const anchor = e.target?.closest?.('a');
    if (anchor?.href && looksLikeUrl(anchor.href)) {
      linkUrl = anchor.href;
    }
    if (!linkUrl) return;
    return replaceClipboard(linkUrl);
  }
  
  return replaceClipboard(selection);
});

async function replaceClipboard(text) {
  const clean = cleanUrl(text);
  if (!clean.cleaned) return;
  
  // Override clipboard with clean URL
  try {
    await navigator.clipboard.writeText(clean.url);
    // Notify the user via a brief toast
    showToast(`\u2705 Tracking removed (${clean.removed} param${clean.removed > 1 ? 's' : ''})`);
  } catch (e) {
    // Clipboard write failed silently
  }
}

function showToast(msg) {
  const el = document.createElement('div');
  el.textContent = msg;
  Object.assign(el.style, {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    background: '#1a1a2e',
    color: '#4ade80',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: 'system-ui, sans-serif',
    zIndex: 999999,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    transition: 'opacity 0.3s',
  });
  document.body.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2000);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ status: 'alive' });
  }
});
