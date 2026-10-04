const BLOCKED_KEY = 'focus_contract_blocked_domains';
const ACTIVE_KEY = 'focus_contract_guard_active';
const DEFAULT_BLOCKED = ['youtube.com', 'instagram.com', 'reddit.com', 'x.com', 'tiktok.com'];

function normalizeDomain(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#]/)[0]
    .replace(/\/+$/, '')
    .replace(/\s+/g, '');
}

function isBlocked(url, blockedDomains) {
  const target = normalizeDomain(url);
  if (!target) return false;

  return blockedDomains.some((domain) => {
    const normalizedDomain = normalizeDomain(domain);
    if (!normalizedDomain) return false;
    return (
      target === normalizedDomain ||
      target.endsWith(`.${normalizedDomain}`) ||
      normalizedDomain.includes(target)
    );
  });
}

function getBlockedDomains() {
  return new Promise((resolve) => {
    chrome.storage.local.get([BLOCKED_KEY, ACTIVE_KEY], (result) => {
      const blocked = Array.isArray(result[BLOCKED_KEY]) && result[BLOCKED_KEY].length > 0
        ? result[BLOCKED_KEY]
        : DEFAULT_BLOCKED;
      const isActive = !!result[ACTIVE_KEY];
      resolve({ blocked, isActive });
    });
  });
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes[ACTIVE_KEY] || changes[BLOCKED_KEY]) {
    chrome.runtime.sendMessage({ type: 'guard-state-changed' });
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.type !== 'main_frame') return;

    getBlockedDomains().then(({ blocked, isActive }) => {
      if (!isActive || !isBlocked(details.url, blocked)) return;

      const redirectUrl = chrome.runtime.getURL(`blocked.html?target=${encodeURIComponent(details.url)}`);
      chrome.tabs.update(details.tabId, { url: redirectUrl });
    });
  },
  { urls: ['<all_urls>'] },
  ['blocking']
);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'get-guard-state') {
    getBlockedDomains().then((state) => sendResponse(state));
    return true;
  }

  if (message?.type === 'save-guard-state') {
    const list = Array.isArray(message.blocked) ? message.blocked : DEFAULT_BLOCKED;
    chrome.storage.local.set({ [BLOCKED_KEY]: list, [ACTIVE_KEY]: !!message.isActive }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  return false;
});
