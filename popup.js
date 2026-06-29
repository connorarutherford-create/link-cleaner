// Shared clean logic
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
  const clickToggle = document.getElementById('clickToggle');
  const clickSwitch = document.getElementById('clickSwitch');
  const toastToggle = document.getElementById('toastToggle');
  const toastSwitch = document.getElementById('toastSwitch');
  const upgradeBtn = document.getElementById('upgradeBtn');
  const proBadge = document.getElementById('proBadge');
  const activationSection = document.getElementById('activationSection');
  const licenseInput = document.getElementById('licenseInput');
  const activateBtn = document.getElementById('activateBtn');
  const activationMsg = document.getElementById('activationMsg');
  const upgradeTitle = document.getElementById('upgradeTitle');
  const upgradeSub = document.getElementById('upgradeSub');
  const statsRow = document.getElementById('statsRow');
  const statCleaned = document.getElementById('statCleaned');
  const statTracking = document.getElementById('statTracking');

  // Track daily stats
  const today = new Date().toDateString();
  const stored = await chrome.storage.sync.get(['dailyCleaned', 'dailyTrackers', 'lastDate', 'autoClean', 'cleanOnClick', 'proLicense', 'showToasts']);
  
  let dailyCleaned = (stored.lastDate === today) ? (stored.dailyCleaned || 0) : 0;
  let dailyTrackers = (stored.lastDate === today) ? (stored.dailyTrackers || 0) : 0;

  // Pro license state
  const isPro = stored.proLicense === true;
  
  if (isPro) {
    upgradeTitle.textContent = 'Pro Active';
    upgradeSub.textContent = 'All features unlocked';
    upgradeBtn.style.cursor = 'default';
    upgradeBtn.onclick = null;
    proBadge.textContent = 'Pro';
    proBadge.style.cursor = 'default';
    proBadge.onclick = null;
  } else {
    upgradeBtn.addEventListener('click', () => {
      activationSection.style.display = activationSection.style.display === 'none' ? 'block' : 'none';
      licenseInput.focus();
    });
    proBadge.addEventListener('click', () => {
      window.open('https://7330469556177.gumroad.com/l/qohjoe', '_blank');
    });
  }

  // License activation
  activateBtn.addEventListener('click', async () => {
    const key = licenseInput.value.trim();
    if (!key) { activationMsg.textContent = 'Enter a license key'; return; }
    
    activationMsg.textContent = 'Verifying...';
    activationMsg.style.color = '#8b8ba3';
    
    try {
      const resp = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'product_id=' + encodeURIComponent('ukk37CB6CSPdQPMMdsA-sA==') + '&license_key=' + encodeURIComponent(key)
      });
      const data = await resp.json();
      
      if (data.success && data.uses === 1) {
        await chrome.storage.sync.set({ proLicense: true });
        activationMsg.textContent = 'Pro activated! Reload the popup.';
        activationMsg.style.color = '#22c55e';
        setTimeout(() => location.reload(), 1500);
      } else if (data.success) {
        await chrome.storage.sync.set({ proLicense: true });
        activationMsg.textContent = 'Pro activated (key has ' + data.uses + ' uses)';
        activationMsg.style.color = '#22c55e';
        setTimeout(() => location.reload(), 1500);
      } else {
        activationMsg.textContent = 'Invalid license key';
        activationMsg.style.color = '#ef4444';
      }
    } catch(e) {
      activationMsg.textContent = 'Could not verify license (check connection)';
      activationMsg.style.color = '#ef4444';
    }
  });
  
  const isActive = stored.autoClean !== false;
  switchKnob.classList.toggle('active', isActive);
  
  const clickActive = stored.cleanOnClick === true;
  clickSwitch.classList.toggle('active', clickActive);

  const toastActive = stored.showToasts !== false;
  toastSwitch.classList.toggle('active', toastActive);

  // Toggle auto-clean
  autoToggle.addEventListener('click', async () => {
    const nowActive = !switchKnob.classList.contains('active');
    switchKnob.classList.toggle('active');
    await chrome.storage.sync.set({ autoClean: nowActive });
  });

  // Toggle clean-on-click
  clickToggle.addEventListener('click', async () => {
    const nowActive = !clickSwitch.classList.contains('active');
    clickSwitch.classList.toggle('active');
    await chrome.storage.sync.set({ cleanOnClick: nowActive });
  });

  // Toggle toasts
  toastToggle.addEventListener('click', async () => {
    const nowActive = !toastSwitch.classList.contains('active');
    toastSwitch.classList.toggle('active');
    await chrome.storage.sync.set({ showToasts: nowActive });
  });

  // Upgrade button
  upgradeBtn.addEventListener('click', () => {
    upgradeTitle.textContent = 'Coming Soon';
    upgradeSub.textContent = 'Awaiting Chrome Web Store approval';
    setTimeout(() => { upgradeTitle.textContent = 'Upgrade to Pro'; upgradeSub.textContent = '$2.99/mo or $4.99/yr'; }, 3000);
  });
  proBadge.addEventListener('click', () => {
    upgradeBtn.click();
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
