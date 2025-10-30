// Simple segmentation utilities for tagging contacts

const DEFAULT_CROSSWARE_DOMAINS: readonly string[] = [
  'crossware.co.nz',
  'crossware.com',
];

// Allow runtime configuration via localStorage (optional). Expected CSV of emails or domains
function loadCsvList(key: string): string[] {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    if (!raw) return [];
    return raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function isCrosswareEmail(email: string): boolean {
  const lower = (email || '').toLowerCase();
  const domain = lower.split('@')[1] || '';
  const configured = loadCsvList('olx_crossware_domains');
  const domains = configured.length > 0 ? configured : DEFAULT_CROSSWARE_DOMAINS;
  if (domains.includes(domain)) return true;
  // Fallback contains check
  return domain.includes('crossware') || lower.includes('crossware');
}

export function isResellerEmail(email: string): boolean {
  const lower = (email || '').toLowerCase();
  const domain = lower.split('@')[1] || '';
  const resellerEmails = loadCsvList('olx_reseller_emails');
  const resellerDomains = loadCsvList('olx_reseller_domains');
  if (resellerEmails.includes(lower)) return true;
  if (resellerDomains.includes(domain)) return true;
  return false;
}


