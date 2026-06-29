// Content script — Link Cleaner Pro auto-clean on copy
// Intercepts copy events, checks for dirty URLs, replaces with clean version

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

// Listen for copy events
document.addEventListener('copy', (e) => {
  const sel = window.getSelection().toString().trim();
  if (!looksLikeUrl(sel)) return;
  
  // Mark the page so we know content script is loaded
  document.body.dataset.lcLoaded = 'true';
  
  const cleaned = cleanUrl(sel);
  if (!cleaned || cleaned.removed === 0) return;
  
  // Override clipboard with clean URL
  e.preventDefault();
  e.clipboardData.setData('text/plain', cleaned.url);
  
  // Flash toast
  showToast(cleaned.removed);
});

function showToast(count) {
  const el = document.createElement('div');
  el.textContent = 'Link Cleaner: stripped ' + count + ' tracking param' + (count > 1 ? 's' : '');
  Object.assign(el.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    background: '#0f0f1a',
    color: '#22c55e',
    padding: '10px 18px',
    borderRadius: '10px',
    fontSize: '13px',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    zIndex: 2147483647,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    border: '1px solid rgba(34,197,94,0.2)',
    opacity: '1',
    transition: 'opacity 0.3s',
  });
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 300);
  }, 2500);
}
