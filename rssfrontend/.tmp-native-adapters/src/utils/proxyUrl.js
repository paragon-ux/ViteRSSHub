const LOCAL_RSSHUB_FETCH_PREFIX = '/local-rsshub-fetch';
const EXTERNAL_FEED_FETCH_PREFIX = '/feed-fetch';
function isAbsoluteHttpUrl(value) {
    return /^https?:\/\//i.test(value);
}
function isLoopbackHost(hostname) {
    const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
    return (normalized === 'localhost' ||
        normalized === '127.0.0.1' ||
        normalized === '::1' ||
        normalized === '0.0.0.0');
}
export function isLocalInstanceUrl(url) {
    if (!isAbsoluteHttpUrl(url)) {
        return false;
    }
    try {
        const parsed = new URL(url);
        return isLoopbackHost(parsed.hostname);
    }
    catch {
        return false;
    }
}
export function toProxyUrl(url) {
    if (!url.trim()) {
        return url;
    }
    if (!isAbsoluteHttpUrl(url)) {
        return url;
    }
    try {
        if (isLocalInstanceUrl(url)) {
            return `${LOCAL_RSSHUB_FETCH_PREFIX}?source=${encodeURIComponent(url)}`;
        }
        return `${EXTERNAL_FEED_FETCH_PREFIX}?source=${encodeURIComponent(url)}`;
    }
    catch {
        return url;
    }
}
