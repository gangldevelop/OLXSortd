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
  if (resellerEmails.includes(lower)) {
    console.log(`Reseller match: ${email} (direct match)`);
    return true;
  }
  if (resellerDomains.includes(domain)) {
    console.log(`Reseller match: ${email} (domain match)`);
    return true;
  }
  return false;
}

export function parseCsvLines(csvText: string): string[][] {
  console.log('parseCsvLines - input length:', csvText.length);
  if (csvText.length === 0) {
    console.warn('Empty CSV text received!');
    return [];
  }
  
  const lines: string[][] = [];
  let currentLine: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentLine.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (currentField || currentLine.length > 0) {
        currentLine.push(currentField.trim());
        lines.push(currentLine);
        currentLine = [];
        currentField = '';
      }
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
    } else {
      currentField += char;
    }
  }
  
  if (currentField || currentLine.length > 0) {
    currentLine.push(currentField.trim());
    lines.push(currentLine);
  }
  
  console.log('parseCsvLines - parsed lines:', lines.length);
  if (lines.length > 0) {
    console.log('First few lines:', lines.slice(0, 3));
  }
  
  return lines;
}

export function extractResellerEmailsFromCsv(csvText: string): string[] {
  const lines = parseCsvLines(csvText);
  const emails: string[] = [];
  
  console.log(`Parsed ${lines.length} CSV lines`);
  
  for (const line of lines) {
    if (line.length >= 4) {
      const email = line[3]?.trim();
      if (email && email.includes('@') && !email.match(/^\d+$/)) {
        const cleanEmail = email.split('\n')[0].split('/')[0].trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(cleanEmail)) {
          emails.push(cleanEmail.toLowerCase());
        }
      }
    }
  }
  
  console.log(`Extracted ${emails.length} unique emails from CSV`);
  console.log('Sample emails:', emails.slice(0, 5));
  
  return [...new Set(emails)];
}

export function loadResellerDataIntoLocalStorage(csvText: string): void {
  if (typeof window === 'undefined') return;
  
  const emails = extractResellerEmailsFromCsv(csvText);
  const emailsString = emails.join(',');
  
  try {
    localStorage.setItem('olx_reseller_emails', emailsString);
    console.log(`Loaded ${emails.length} reseller emails into localStorage`);
    console.log('First 10 emails:', emails.slice(0, 10));
    const stored = localStorage.getItem('olx_reseller_emails');
    console.log('Verification - stored data length:', stored?.length);
  } catch (error) {
    console.error('Failed to save reseller emails to localStorage:', error);
  }
}


export interface ResellerCsvEntry {
  id: string;
  reseller: string;
  representative: string;
  contact: string;
  mobile: string;
  location: string;
  revenue: string;
  newsletter: string;
}

export function extractResellersFromCsv(csvText: string): ResellerCsvEntry[] {
  const rows = parseCsvLines(csvText);
  const results: ResellerCsvEntry[] = [];
  for (const row of rows) {
    if (!row || row.length < 6) continue;
    const id = (row[0] || '').trim();
    // skip header and empty rows; ensure first column is a number-like ID
    if (!/^\d+$/.test(id)) continue;
    const entry: ResellerCsvEntry = {
      id,
      reseller: (row[1] || '').trim(),
      representative: (row[2] || '').trim(),
      contact: ((row[3] || '').split('\n')[0].split('/')[0] || '').trim(),
      mobile: (row[4] || '').trim(),
      location: (row[5] || '').trim(),
      revenue: (row[6] || '').replace(/\s+/g, ' ').trim(),
      newsletter: (row[7] || '').trim(),
    };
    results.push(entry);
  }
  return results;
}


