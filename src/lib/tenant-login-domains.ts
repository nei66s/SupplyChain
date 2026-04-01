const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'yahoo.com',
  'yahoo.com.br',
  'bol.com.br',
  'uol.com.br',
  'terra.com.br',
  'aol.com',
  'proton.me',
  'protonmail.com',
]);

export function normalizeEmail(email: string): string {
  return String(email ?? '').trim().toLowerCase();
}

export function extractEmailDomain(email: string): string | null {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.lastIndexOf('@');

  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    return null;
  }

  return normalized.slice(atIndex + 1).trim() || null;
}

export function isPublicEmailDomain(domain: string | null | undefined): boolean {
  if (!domain) return false;
  return PUBLIC_EMAIL_DOMAINS.has(String(domain).trim().toLowerCase());
}

export function getSuggestedTenantLoginDomain(email: string): string | null {
  const domain = extractEmailDomain(email);
  if (!domain || isPublicEmailDomain(domain)) {
    return null;
  }

  return domain;
}
