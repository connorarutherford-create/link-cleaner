// No hardcoded tracking list — we use a whitelist approach instead.

function cleanUrl(url) {
  try {
    const u = new URL(url);
    let removed = 0;
    
    // Strip hash fragments entirely — they're almost always tracking/state
    if (u.hash) {
      u.hash = '';
      removed++;
    }
    
    // Strip ALL query params except known-essential ones
    const ESSENTIAL = ['q', 'v', 'id', 's', 'page', 'tab', 't'];
    const kept = [];
    for (const [key, val] of u.searchParams.entries()) {
      if (ESSENTIAL.includes(key)) {
        kept.push([key, val]);
      } else {
        removed++;
      }
    }
    
    // Rebuild with only essential params
    u.search = '';
    for (const [key, val] of kept) {
      u.searchParams.set(key, val);
    }
    
    return { url: u.toString(), removed };
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
