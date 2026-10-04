export const DEFAULT_BLOCKED_DOMAINS = [
  'youtube.com',
  'instagram.com',
  'reddit.com',
  'x.com',
  'tiktok.com',
  'facebook.com',
];

const STORAGE_KEY = 'focus_contract_blocklist';

export function normalizeDomain(value: string): string {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#]/)[0]
    .replace(/\/+$/, '')
    .replace(/\s+/g, '');
}

export function sanitizeBlockedDomains(domains: string[] = []): string[] {
  const seen = new Set<string>();

  return domains
    .map((domain) => normalizeDomain(domain))
    .filter(Boolean)
    .filter((domain) => {
      if (seen.has(domain)) return false;
      seen.add(domain);
      return true;
    })
    .slice(0, 25);
}

export function getStoredBlockedDomains(userId?: string): string[] {
  const storageKey = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;

  if (typeof window === 'undefined') {
    return [...DEFAULT_BLOCKED_DOMAINS];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [...DEFAULT_BLOCKED_DOMAINS];
    }

    const parsed = JSON.parse(raw) as string[];
    return sanitizeBlockedDomains(parsed);
  } catch {
    return [...DEFAULT_BLOCKED_DOMAINS];
  }
}

export function saveStoredBlockedDomains(domains: string[], userId?: string): void {
  const storageKey = userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
  const cleaned = sanitizeBlockedDomains(domains);

  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(cleaned));
  } catch {
    // no-op: storage may be unavailable in private browsing or restricted environments
  }
}

export function isDomainBlocked(targetUrl: string, blockedDomains: string[] = DEFAULT_BLOCKED_DOMAINS): boolean {
  const normalizedTarget = normalizeDomain(targetUrl);
  if (!normalizedTarget) return false;

  return blockedDomains.some((domain) => {
    const normalizedBlocked = normalizeDomain(domain);
    if (!normalizedBlocked) return false;
    return (
      normalizedTarget === normalizedBlocked ||
      normalizedTarget.endsWith(`.${normalizedBlocked}`) ||
      normalizedBlocked.includes(normalizedTarget)
    );
  });
}

export function getBlockedDomainsSummary(domains: string[] = []): string {
  if (domains.length === 0) return 'No custom distraction domains configured';
  return domains.join(', ');
}
