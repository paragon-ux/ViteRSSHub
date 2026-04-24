import { toProxyUrl } from './proxyUrl';

export type DiscoveredFeedCandidate = {
  url: string;
  title: string;
  type: string;
  sourceUrl: string;
  homeUrl?: string;
  iconUrl?: string;
  siteTitle?: string;
};

export type FeedAutodiscoveryResult = {
  sourceUrl: string;
  isHtml: boolean;
  contentType?: string;
  siteTitle?: string;
  iconUrl?: string;
  candidates: DiscoveredFeedCandidate[];
};

const FEED_TYPE_LABELS: Record<string, string> = {
  'application/rss+xml': 'RSS',
  'application/atom+xml': 'Atom',
  'application/feed+json': 'JSON Feed',
};
const HOST_LIKE_PATTERN =
  /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\:\d+)?(?:[/?#].*)?$/i;
const LOCALHOST_PATTERN =
  /^(?:localhost|127(?:\.\d{1,3}){3})(?:\:\d+)?(?:[/?#].*)?$/i;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function extractErrorMessage(rawText: string): string | undefined {
  try {
    const parsed = JSON.parse(rawText) as unknown;
    const record = asRecord(parsed);
    const message =
      typeof record?.message === 'string'
        ? record.message.trim()
        : typeof record?.detail === 'string'
          ? record.detail.trim()
          : '';

    return message || undefined;
  } catch {
    const normalized = collapseWhitespace(rawText.replace(/<[^>]+>/g, ' '));
    return normalized || undefined;
  }
}

function resolveUrl(value: string | null, baseUrl: string): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  try {
    return new URL(value.trim(), baseUrl).toString();
  } catch {
    return undefined;
  }
}

function prettifyUrl(value: string): string {
  try {
    const parsed = new URL(value);
    const lastSegment = parsed.pathname
      .split('/')
      .filter(Boolean)
      .pop();

    if (!lastSegment) {
      return parsed.hostname.replace(/^www\./i, '');
    }

    return decodeURIComponent(lastSegment)
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();
  } catch {
    return value;
  }
}

export function looksLikeUrlInput(input: string): boolean {
  const trimmed = input.trim();

  if (!trimmed) {
    return false;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return true;
  }

  if (/\s/.test(trimmed)) {
    return false;
  }

  return HOST_LIKE_PATTERN.test(trimmed) || LOCALHOST_PATTERN.test(trimmed);
}

export function buildUrlCandidates(input: string): string[] {
  const trimmed = input.trim();

  if (!looksLikeUrlInput(trimmed)) {
    return [];
  }

  const rawCandidates = /^https?:\/\//i.test(trimmed)
    ? [trimmed]
    : [`https://${trimmed.replace(/^\/\//, '')}`, `http://${trimmed.replace(/^\/\//, '')}`];

  return Array.from(
    new Set(
      rawCandidates.flatMap((candidate) => {
        try {
          return [new URL(candidate).toString()];
        } catch {
          return [];
        }
      })
    )
  );
}

export function looksLikeHtmlDocument(rawText: string, contentType?: string): boolean {
  const normalized = rawText.trim().toLowerCase();

  return (
    Boolean(contentType?.toLowerCase().includes('text/html')) ||
    normalized.startsWith('<!doctype html') ||
    normalized.startsWith('<html') ||
    normalized.includes('<head') ||
    normalized.includes('<body')
  );
}

export function parseAutodiscoveredFeeds(options: {
  html: string;
  sourceUrl: string;
  contentType?: string;
}): FeedAutodiscoveryResult {
  const isHtml = looksLikeHtmlDocument(options.html, options.contentType);

  if (!isHtml) {
    return {
      sourceUrl: options.sourceUrl,
      isHtml: false,
      contentType: options.contentType,
      candidates: [],
    };
  }

  const document = new DOMParser().parseFromString(options.html, 'text/html');
  const siteTitle = collapseWhitespace(document.querySelector('title')?.textContent ?? '');
  const iconUrl =
    resolveUrl(
      document.querySelector(
        'link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
      )?.getAttribute('href') ?? null,
      options.sourceUrl
    ) ?? undefined;

  const candidates: DiscoveredFeedCandidate[] = [];

  for (const element of Array.from(document.querySelectorAll('link[rel]'))) {
      const relTokens = (element.getAttribute('rel') ?? '')
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      const type = (element.getAttribute('type') ?? '').toLowerCase();

      if (!relTokens.includes('alternate') || !(type in FEED_TYPE_LABELS)) {
        continue;
      }

      const url = resolveUrl(element.getAttribute('href'), options.sourceUrl);

      if (!url) {
        continue;
      }

      const title =
        collapseWhitespace(element.getAttribute('title') ?? '') ||
        siteTitle ||
        prettifyUrl(url);

      candidates.push({
        url,
        title,
        type: FEED_TYPE_LABELS[type],
        sourceUrl: options.sourceUrl,
        homeUrl: options.sourceUrl,
        iconUrl,
        siteTitle: siteTitle || undefined,
      });
  }

  const dedupedCandidates = Array.from(
    new Map(candidates.map((candidate) => [candidate.url, candidate])).values()
  );

  return {
    sourceUrl: options.sourceUrl,
    isHtml: true,
    contentType: options.contentType,
    siteTitle: siteTitle || undefined,
    iconUrl,
    candidates: dedupedCandidates,
  };
}

export async function discoverFeedsFromWebsite(
  sourceUrl: string,
  options: { signal?: AbortSignal } = {}
): Promise<FeedAutodiscoveryResult> {
  const response = await fetch(toProxyUrl(sourceUrl), {
    signal: options.signal,
    headers: {
      Accept: 'text/html, application/xhtml+xml;q=0.9, */*;q=0.8',
      'Cache-Control': 'no-cache',
    },
  });
  const rawText = await response.text();
  const contentType = response.headers.get('content-type') ?? undefined;

  if (!response.ok) {
    throw new Error(
      extractErrorMessage(rawText) ||
        `Website request failed with ${response.status} ${response.statusText}`
    );
  }

  const resolvedSourceUrl =
    response.headers.get('x-rsshubvite-final-url')?.trim() || sourceUrl;

  return parseAutodiscoveredFeeds({
    html: rawText,
    sourceUrl: resolvedSourceUrl,
    contentType,
  });
}
