function toUrl(input: string): URL | undefined {
  const trimmed = input.trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    return new URL(trimmed);
  } catch {
    try {
      return new URL(`https://${trimmed}`);
    } catch {
      return undefined;
    }
  }
}

const faviconLookupCache = new Map<string, 'success' | 'failed'>();

export function normalizeDomain(input?: string): string | undefined {
  if (!input?.trim()) {
    return undefined;
  }

  const parsed = toUrl(input);
  if (parsed?.hostname) {
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  }

  return input.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0]?.toLowerCase();
}

export function getDirectFaviconUrl(domainOrUrl?: string): string | undefined {
  const domain = normalizeDomain(domainOrUrl);
  return domain ? `https://${domain}/favicon.ico` : undefined;
}

export function getGoogleFaviconUrl(
  domainOrUrl?: string,
  size = 64
): string | undefined {
  const domain = normalizeDomain(domainOrUrl);
  return domain
    ? `https://s2.googleusercontent.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${size}`
    : undefined;
}

export function recordFaviconLookupResult(
  domainOrUrl: string | undefined,
  status: 'success' | 'failed'
): void {
  const domain = normalizeDomain(domainOrUrl);

  if (!domain) {
    return;
  }

  faviconLookupCache.set(domain, status);
}

export function getCachedFaviconLookupResult(
  domainOrUrl?: string
): 'success' | 'failed' | undefined {
  const domain = normalizeDomain(domainOrUrl);
  return domain ? faviconLookupCache.get(domain) : undefined;
}

export function isDirectFaviconUrl(url?: string): boolean {
  if (!url?.trim()) {
    return false;
  }

  return /^https?:\/\/[^/]+\/favicon\.ico(?:\?.*)?$/i.test(url.trim());
}

export function buildSourceIconCandidates(options: {
  iconUrl?: string;
  homeUrl?: string;
  feedUrl?: string;
  itemUrl?: string;
}): string[] {
  const faviconSource = options.homeUrl || options.itemUrl || options.feedUrl;
  const directFaviconUrl = getDirectFaviconUrl(faviconSource);
  const directFaviconStatus = getCachedFaviconLookupResult(faviconSource);
  const candidates = [
    options.iconUrl,
    directFaviconStatus === 'failed' ? undefined : directFaviconUrl,
    getGoogleFaviconUrl(faviconSource),
  ].filter((value): value is string => Boolean(value?.trim()));

  return Array.from(new Set(candidates));
}
