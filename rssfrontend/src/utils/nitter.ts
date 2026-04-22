function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

export function buildNitterUserFeed(baseUrl: string, username: string): string {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedUsername = username.trim().replace(/^@/, '');

  return `${normalizedBaseUrl}/${encodeURIComponent(normalizedUsername)}/rss`;
}

export function isProbablyNitterUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  return normalized.includes('nitter') || normalized.endsWith('/rss');
}
