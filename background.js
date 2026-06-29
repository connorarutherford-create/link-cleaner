// Background service worker for Link Cleaner Pro
// Handles extension install, auto-clean toggle sync, right-click menu, and toast notifications

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
      if (u.searchParams.get(key) === '' || u.searchParams.get(key) === null) {
        u.searchParams.delete(key);
        removed++;
      }
    }
    return { url: u.toString(), removed };
  } catch (e) {
    return null;
  }
}

// Install handler
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ autoClean: true });
  // Check if Pro and add context menu
  chrome.storage.sync.get(['proLicense'], (result) => {
    if (result.proLicense === true) {
      chrome.contextMenus.create({
        id: 'copy-clean-link',
        title: 'Copy Clean Link',
        contexts: ['link']
      });
    }
  });
});

// Listen for license changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.proLicense) {
    if (changes.proLicense.newValue === true) {
      chrome.contextMenus.create({
        id: 'copy-clean-link',
        title: 'Copy Clean Link',
        contexts: ['link']
      });
    } else {
      chrome.contextMenus.remove('copy-clean-link');
    }
  }
});

// Handle right-click on links — only if Pro
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'copy-clean-link' && info.linkUrl) {
    const cleaned = cleanUrl(info.linkUrl);
    if (!cleaned) return;
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (url, removed) => {
        navigator.clipboard.writeText(url).then(() => {
          const msg = 'Clean link copied (' + removed + ' param' + (removed > 1 ? 's' : '') + ' stripped)';
          try {
            const el = document.createElement('div');
            el.textContent = msg;
            Object.assign(el.style, {
              position: 'fixed', bottom: '24px', right: '24px',
              background: '#0f0f1a', color: '#22c55e',
              padding: '10px 18px', borderRadius: '10px',
              fontSize: '13px', fontFamily: 'system-ui, sans-serif',
              zIndex: 2147483647,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              border: '1px solid rgba(34,197,94,0.2)',
            });
            document.documentElement.appendChild(el);
            setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 500); }, 4000);
          } catch(e) {
            alert(msg);
          }
        });
      },
      args: [cleaned.url, cleaned.removed]
    });
  }
});

// Handle toast notifications from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'show-toast') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon128.png',
      title: 'Link Cleaner',
      message: request.message,
      priority: 2
    });
  }
});
