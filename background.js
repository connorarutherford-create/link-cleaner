// Background service worker for Link Cleaner Pro
// Handles extension install, auto-clean toggle sync, and right-click menu

// Install handler
chrome.runtime.onInstalled.addListener(() => {
  // Set default: auto-clean is ON
  chrome.storage.sync.set({ autoClean: true });
  
  // Create right-click menu
  chrome.contextMenus.create({
    id: 'copy-clean-link',
    title: 'Copy Clean Link',
    contexts: ['link']
  });
});

// Handle right-click on links
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'copy-clean-link' && info.linkUrl) {
    // Inject content script to handle the clean + copy
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (url) => {
        // Same clean logic as content.js
        const ESSENTIAL = ['q', 'v', 'id', 's', 'page', 'tab', 't'];
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
          
          navigator.clipboard.writeText(u.toString()).then(() => {
            const el = document.createElement('div');
            el.textContent = `\u2705 Clean link copied (${removed} param${removed > 1 ? 's' : ''} stripped)`;
            Object.assign(el.style, {
              position: 'fixed', bottom: '20px', right: '20px',
              background: '#1a1a2e', color: '#4ade80',
              padding: '8px 16px', borderRadius: '8px',
              fontSize: '13px', fontFamily: 'system-ui, sans-serif',
              zIndex: 999999, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            });
            document.body.appendChild(el);
            setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 2000);
          });
        } catch(e) {}
      },
      args: [info.linkUrl]
    });
  }
});
