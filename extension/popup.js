const BLOCKED_KEY = 'focus_contract_blocked_domains';
const ACTIVE_KEY = 'focus_contract_guard_active';

const domainsEl = document.getElementById('domains');
const enabledEl = document.getElementById('guard-enabled');
const saveButton = document.getElementById('save');
const statusEl = document.getElementById('status');

function normalizeList(input) {
  return input
    .split(/\n|,/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);
}

function loadState() {
  chrome.storage.local.get([BLOCKED_KEY, ACTIVE_KEY], (result) => {
    const blocked = result[BLOCKED_KEY] || ['youtube.com', 'instagram.com', 'reddit.com'];
    domainsEl.value = blocked.join('\n');
    enabledEl.checked = !!result[ACTIVE_KEY];
  });
}

saveButton.addEventListener('click', () => {
  const blocked = normalizeList(domainsEl.value);
  chrome.storage.local.set({ [BLOCKED_KEY]: blocked, [ACTIVE_KEY]: enabledEl.checked }, () => {
    statusEl.textContent = `Saved ${blocked.length} blocked domains.`;
  });
});

loadState();
