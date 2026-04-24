function normalizeBaseUrl(baseUrl) {
    return baseUrl.trim().replace(/\/+$/, '');
}
export function buildNitterUserFeed(baseUrl, username) {
    const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
    const normalizedUsername = username.trim().replace(/^@/, '');
    return `${normalizedBaseUrl}/${encodeURIComponent(normalizedUsername)}/rss`;
}
export function isProbablyNitterUrl(value) {
    const normalized = value.trim().toLowerCase();
    if (normalized.includes('nitter')) {
        return true;
    }
    try {
        const parsed = new URL(normalized);
        return parsed.hostname.includes('nitter');
    }
    catch {
        return false;
    }
}
