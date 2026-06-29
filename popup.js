// Tracking parameters to strip
const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid',
  'twclid', 'sc_campaign', 'sc_channel', 'sc_content', 'sc_medium',
  'sc_outcome', 'sc_geo', 'sc_country', 'ref', 'ref_src', 'ref_url',
  'source', 'si', 's_kwcid', 'redirect', 'track', 'tracking',
  'aff_id', 'affiliate', 'aff', 'campaign_id', 'cid',
  'mc_cid', 'mc_eid', 'pk_source', 'pk_medium', 'pk_campaign',
  ' pk_keyword', 'ysclid', 'wickedid', 'vgo_eo'
];

function cleanUrl(url) {
  try {
    const u = new URL(url);
    let removed = 0;
    
    // Strip tracking params
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.includes(key.toLowerCase())) {
        u.searchParams.delete(key);
        removed++;
      }
    }
    
    // Remove empty search
    let result = u.toString();
    if (result.endsWith('?')) result = result.slice(0, -1);
    
    // Remove trailing slash on path-only URLs
    if (result.endsWith('/') && !result.includes('?')) {
      // Keep if it's a root domain
      try {
        const parsed = new URL(result);
        if (parsed.pathname.length > 1) {
          result = result.replace(/\/$/, '');
        }
      } catch(e) {}
    }
    
    return { url: result, removed };
  } catch (e) {
    return { url: null, removed: 0 };
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('loading');
  const cleanUrlEl = document.getElementById('cleanUrl');
  const originalUrlEl = document.getElementById('originalUrl');
  const copyBtn = document.getElementById('copyBtn');
  const copiedMsg = document.getElementById('copiedMsg');
  const statsEl = document.getElementById('stats');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const original = tab.url;
    
    const result = cleanUrl(original);
    
    if (!result.url) {
      statusEl.textContent = '❌ Could not read this URL';
      return;
    }
    
    if (result.removed === 0) {
      statusEl.textContent = '✅ Already clean';
      originalUrlEl.textContent = original;
      originalUrlEl.style.display = 'block';
      statsEl.textContent = 'No tracking parameters found';
      statsEl.style.display = 'block';
      return;
    }
    
    statusEl.textContent = `🧹 Stripped ${result.removed} tracking parameter${result.removed > 1 ? 's' : ''}`;
    cleanUrlEl.textContent = result.url;
    cleanUrlEl.style.display = 'block';
    originalUrlEl.textContent = original;
    originalUrlEl.style.display = 'block';
    statsEl.textContent = `${result.removed} param${result.removed > 1 ? 's' : ''} removed`;
    statsEl.style.display = 'block';
    
    copyBtn.disabled = false;
    
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(result.url);
        copiedMsg.style.display = 'block';
        setTimeout(() => { copiedMsg.style.display = 'none'; }, 2000);
      } catch (e) {
        copiedMsg.textContent = '❌ Copy failed';
        copiedMsg.style.display = 'block';
      }
    });
    
  } catch (e) {
    statusEl.textContent = '❌ Error reading tab';
  }
});
