const DEV_PROXY_PREFIX = '/rsshub-api';
const EXTERNAL_FEED_FETCH_PREFIX = '/feed-fetch';

function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function isLocalInstanceUrl(url: string): boolean {
  if (!isAbsoluteHttpUrl(url)) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export function toProxyUrl(url: string): string {
  if (!url.trim()) {
    return url;
  }

  if (!isAbsoluteHttpUrl(url)) {
    return url;
  }

  try {
    if (isLocalInstanceUrl(url)) {
      const parsed = new URL(url);
      return `${DEV_PROXY_PREFIX}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return `${EXTERNAL_FEED_FETCH_PREFIX}?source=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}
