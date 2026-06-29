// Shared clean logic
const ESSENTIAL = ['q', 'v', 'id', 's', 'page', 'tab', 't'];

function cleanUrl(url) {
  try {
    const u = new URL(url);
    let removed = 0;
    if (u.hash) { u.hash = ''; removed++; }
    const kept = [];
    for (const [key, val] of u.searchParams.entries()) {
      if (ESSENTIAL.includes(key)) kept.push([key, val]);
      else removed++;
    }
    u.search = '';
    for (const [key, val] of kept) u.searchParams.set(key, val);
    return { url: u.toString(), cleaned: removed > 0, removed };
  } catch (e) {
    return { url: null, cleaned: false, removed: 0 };
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('loading');
  const cleanUrlEl = document.getElementById('cleanUrl');
  const originalUrlEl = document.getElementById('originalUrl');
  const copyBtn = document.getElementById('copyBtn');
  const copiedMsg = document.getElementById('copiedMsg');
  const statsEl = document.getElementById('stats');
  const toggle = document.getElementById('autoToggle');
  const upgradeBtn = document.getElementById('upgradeBtn');

  // Load auto-clean state
  const stored = await chrome.storage.sync.get(['autoClean']);
  const isActive = stored.autoClean !== false;
  toggle.classList.toggle('active', isActive);

  // Toggle auto-clean
  toggle.addEventListener('click', async () => {
    const nowActive = !toggle.classList.contains('active');
    toggle.classList.toggle('active');
    await chrome.storage.sync.set({ autoClean: nowActive });
    
    // Notify content script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'autoClean', enabled: nowActive }).catch(() => {});
  });

  // Upgrade button
  upgradeBtn.addEventListener('click', () => {
    statusEl.textContent = '\uD83D\uDD17 Coming soon - payment link';
    setTimeout(() => { init(); }, 2000);
  });

  async function init() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const original = tab.url;
      
      const result = cleanUrl(original);
      
      if (!result.url) {
        statusEl.textContent = '\u274C Could not read this URL';
        return;
      }
      
      if (!result.cleaned) {
        statusEl.textContent = '\u2705 Already clean';
        originalUrlEl.textContent = original;
        originalUrlEl.style.display = 'block';
        statsEl.textContent = 'No tracking found';
        statsEl.style.display = 'block';
        copyBtn.disabled = true;
        return;
      }
      
      statusEl.textContent = `\uD83E\uDDF9 Stripped ${result.removed} tracking parameter${result.removed > 1 ? 's' : ''}`;
      cleanUrlEl.textContent = result.url;
      cleanUrlEl.style.display = 'block';
      originalUrlEl.textContent = original;
      originalUrlEl.style.display = 'block';
      statsEl.textContent = `${result.removed} params removed`;
      statsEl.style.display = 'block';
      
      copyBtn.disabled = false;
      
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(result.url);
          copiedMsg.style.display = 'block';
          setTimeout(() => { copiedMsg.style.display = 'none'; }, 2000);
        } catch (e) {
          statusEl.textContent = '\u274C Copy failed';
        }
      });
      
    } catch (e) {
      statusEl.textContent = '\u274C Error reading tab';
    }
  }

  init();
});
