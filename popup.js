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
  const statusIcon = document.getElementById('statusIcon');
  const statusLabel = document.getElementById('statusLabel');
  const statusSub = document.getElementById('statusSub');
  const urlBox = document.getElementById('urlBox');
  const originalUrlEl = document.getElementById('originalUrl');
  const copyBtn = document.getElementById('copyBtn');
  const copiedMsg = document.getElementById('copiedMsg');
  const autoToggle = document.getElementById('autoToggle');
  const switchKnob = document.getElementById('switchKnob');
  const upgradeBtn = document.getElementById('upgradeBtn');
  const statsRow = document.getElementById('statsRow');
  const statCleaned = document.getElementById('statCleaned');
  const statTracking = document.getElementById('statTracking');

  // Track daily stats
  const today = new Date().toDateString();
  const stored = await chrome.storage.sync.get(['dailyCleaned', 'dailyTrackers', 'lastDate', 'autoClean']);
  
  let dailyCleaned = (stored.lastDate === today) ? (stored.dailyCleaned || 0) : 0;
  let dailyTrackers = (stored.lastDate === today) ? (stored.dailyTrackers || 0) : 0;

  const isActive = stored.autoClean !== false;
  switchKnob.classList.toggle('active', isActive);

  // Toggle auto-clean
  autoToggle.addEventListener('click', async () => {
    const nowActive = !switchKnob.classList.contains('active');
    switchKnob.classList.toggle('active');
    await chrome.storage.sync.set({ autoClean: nowActive });
  });

  // Upgrade button
  upgradeBtn.addEventListener('click', () => {
    statusIcon.textContent = '\uD83D\uDD17';
    statusLabel.textContent = 'Coming Soon';
    statusSub.textContent = 'Pro payments will be available shortly';
    setTimeout(() => setStatusNeutral(), 2500);
  });

  function setStatusNeutral() {
    statusIcon.textContent = '\uD83D\uDD17';
    statusLabel.textContent = 'Ready';
    statusSub.textContent = 'Click a button to clean the current URL';
  }

  async function loadCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const original = tab.url;
      const result = cleanUrl(original);

      if (!result.url) {
        statusIcon.textContent = '\u274C';
        statusLabel.textContent = 'Cannot Read Page';
        statusSub.textContent = 'This page URL cannot be processed';
        return;
      }

      if (!result.cleaned) {
        statusIcon.textContent = '\u2705';
        statusLabel.textContent = 'Already Clean';
        statusSub.textContent = 'No tracking parameters found';
        copyBtn.disabled = true;
        return;
      }

      statusIcon.textContent = '\uD83E\uDDF9';
      statusLabel.textContent = `Cleaned: ${result.removed} tracking param${result.removed > 1 ? 's' : ''}`;
      statusSub.textContent = 'The clean URL is ready to copy';
      urlBox.style.display = 'block';
      originalUrlEl.textContent = original;
      copyBtn.disabled = false;

      copyBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(result.url);
          copiedMsg.style.display = 'block';
          setTimeout(() => { copiedMsg.style.display = 'none'; }, 2500);
        } catch (e) {
          statusLabel.textContent = '\u274C Copy Failed';
        }
      };

    } catch (e) {
      statusIcon.textContent = '\u274C';
      statusLabel.textContent = 'Error';
      statusSub.textContent = 'Could not read the current tab';
    }
  }

  // Update stats display
  statCleaned.textContent = dailyCleaned;
  statTracking.textContent = dailyTrackers;
  if (dailyCleaned > 0 || dailyTrackers > 0) {
    statsRow.style.display = 'flex';
  }

  loadCurrentTab();
});
