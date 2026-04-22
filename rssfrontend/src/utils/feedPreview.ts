import { isProbablyNitterUrl } from './nitter';
import { isLocalInstanceUrl, toProxyUrl } from './proxyUrl';

export type FeedPreviewItem = {
  id: string;
  title: string;
  link?: string;
  source?: string;
  publishedAt?: string;
  summary?: string;
  imageUrl?: string;
};

export type FeedPreviewSnapshot = {
  feedTitle?: string;
  feedDescription?: string;
  homeUrl?: string;
  totalItems: number;
  items: FeedPreviewItem[];
};

export type FeedPreviewState = 'success' | 'empty' | 'parse_failed';

export type FeedPreviewResult = {
  status: number;
  statusText: string;
  contentType?: string;
  body: unknown;
  rawText: string;
  sourceUrl: string;
  requestUrl: string;
  snapshot: FeedPreviewSnapshot;
  state: FeedPreviewState;
  note?: string;
};

export class FeedPreviewRequestError extends Error {
  kind: 'fetch_failed';
  status: number;
  statusText: string;
  sourceUrl: string;
  requestUrl: string;

  constructor(options: {
    message: string;
    status: number;
    statusText: string;
    sourceUrl: string;
    requestUrl: string;
  }) {
    super(options.message);
    this.name = 'FeedPreviewRequestError';
    this.kind = 'fetch_failed';
    this.status = options.status;
    this.statusText = options.statusText;
    this.sourceUrl = options.sourceUrl;
    this.requestUrl = options.requestUrl;
  }
}

function toPreviewUrl(feedUrl: string): string {
  const url = new URL(feedUrl);

  if (!isLocalInstanceUrl(feedUrl)) {
    return url.toString();
  }

  if (url.pathname.endsWith('.debug.json')) {
    return url.toString();
  }

  if (url.pathname.endsWith('.json')) {
    return url.toString();
  }

  if (url.pathname.endsWith('.atom')) {
    url.pathname = url.pathname.replace(/\.atom$/, '.debug.json');
    return url.toString();
  }

  if (url.pathname.endsWith('.rss')) {
    url.pathname = url.pathname.replace(/\.rss$/, '');
  }

  url.pathname = `${url.pathname}.debug.json`;
  return url.toString();
}

function looksLikeHtml(rawText: string, contentType?: string): boolean {
  const normalized = rawText.trim().toLowerCase();

  return (
    Boolean(contentType?.toLowerCase().includes('text/html')) ||
    normalized.startsWith('<!doctype html') ||
    normalized.startsWith('<html')
  );
}

function getParseFailureNote(options: {
  sourceUrl: string;
  rawText: string;
  contentType?: string;
}): string {
  const { sourceUrl, rawText, contentType } = options;

  if (isProbablyNitterUrl(sourceUrl)) {
    if (looksLikeHtml(rawText, contentType)) {
      return 'The selected Nitter instance returned an HTML page instead of RSS, so compact preview cards are blocked by that instance response even though the raw feed URL may still open.';
    }

    return 'The selected Nitter instance responded, but not with a preview-friendly RSS or Atom payload for the in-page parser.';
  }

  if (looksLikeHtml(rawText, contentType)) {
    return 'The feed responded with HTML instead of RSS, Atom, or JSON preview data.';
  }

  return 'The feed responded, but the preview parser could not extract compact cards from the response.';
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
}

function getNestedValue(value: unknown, path: string[]): unknown {
  let current = value;

  for (const segment of path) {
    const record = asRecord(current);

    if (!record) {
      return undefined;
    }

    current = record[segment];
  }

  return current;
}

function firstDefinedString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (Array.isArray(value)) {
      const nested = firstDefinedString(...value);
      if (nested) {
        return nested;
      }

      continue;
    }

    const record = asRecord(value);
    if (record) {
      const nested = firstDefinedString(
        record.name,
        record.title,
        record.label,
        record.url,
        record.href,
        record.value
      );
      if (nested) {
        return nested;
      }
    }

    const direct = asString(value);
    if (direct) {
      return direct;
    }
  }

  return undefined;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripHtml(value: string): string {
  return collapseWhitespace(
    value
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&#39;/gi, "'")
      .replace(/&quot;/gi, '"')
  );
}

function summarizeText(value?: string, maxLength = 180): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = stripHtml(value);

  if (!normalized) {
    return undefined;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function extractImageFromHtml(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const match = value.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1];
}

function getJsonItemImage(value: unknown): string | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  const direct = firstDefinedString(
    record.image,
    record.imageUrl,
    record.image_url,
    record.banner_image,
    record.bannerImage,
    record.thumbnail,
    record.thumb,
    getNestedValue(record, ['enclosure', 'url']),
    getNestedValue(record, ['media:content', '$', 'url']),
    getNestedValue(record, ['media', 'content', 'url'])
  );

  if (direct) {
    return direct;
  }

  const attachments = Array.isArray(record.attachments) ? record.attachments : [];
  for (const attachment of attachments) {
    const attachmentRecord = asRecord(attachment);
    if (!attachmentRecord) {
      continue;
    }

    const mimeType = asString(attachmentRecord.mime_type ?? attachmentRecord.type);
    if (mimeType && !mimeType.startsWith('image/')) {
      continue;
    }

    const url = firstDefinedString(attachmentRecord.url, attachmentRecord.href);
    if (url) {
      return url;
    }
  }

  return extractImageFromHtml(
    firstDefinedString(
      record.description,
      record.summary,
      record.content_html,
      record.content
    )
  );
}

function normalizeJsonItem(
  value: unknown,
  index: number,
  feedTitle?: string
): FeedPreviewItem | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const title =
    firstDefinedString(record.title, record.name, record.headline) ||
    `Item ${index + 1}`;
  const link = firstDefinedString(
    record.url,
    record.external_url,
    record.link,
    record.guid,
    getNestedValue(record, ['links', '0', 'href'])
  );
  const source = firstDefinedString(
    getNestedValue(record, ['author', 'name']),
    getNestedValue(record, ['source', 'title']),
    getNestedValue(record, ['source', 'name']),
    record.author,
    record.source,
    feedTitle
  );
  const publishedAt = firstDefinedString(
    record.date_published,
    record.date_modified,
    record.pubDate,
    record.published,
    record.updated,
    record.created,
    record.isoDate,
    record.date
  );
  const rawSummary = firstDefinedString(
    record.summary,
    record.description,
    record.content_html,
    record.content_text,
    record.content,
    record.excerpt
  );

  return {
    id: firstDefinedString(record.id, record.guid, link, title, index) || `item-${index}`,
    title,
    link,
    source,
    publishedAt,
    summary: summarizeText(rawSummary),
    imageUrl: getJsonItemImage(record),
  };
}

function parseJsonPreview(body: unknown): FeedPreviewSnapshot {
  const record = asRecord(body);
  if (!record) {
    return { totalItems: 0, items: [] };
  }

  const channelItems = getNestedValue(record, ['channel', 'item']);
  const itemsValue =
    (Array.isArray(record.items) && record.items) ||
    (Array.isArray(record.item) && record.item) ||
    (Array.isArray(record.entries) && record.entries) ||
    (Array.isArray(channelItems) ? channelItems : []);

  const feedTitle = firstDefinedString(
    record.title,
    getNestedValue(record, ['channel', 'title']),
    getNestedValue(record, ['feed', 'title'])
  );
  const feedDescription = firstDefinedString(
    record.description,
    record.subtitle,
    record.summary,
    getNestedValue(record, ['channel', 'description']),
    getNestedValue(record, ['feed', 'subtitle'])
  );
  const homeUrl = firstDefinedString(
    record.home_page_url,
    record.link,
    record.site_url,
    getNestedValue(record, ['channel', 'link'])
  );

  const items = itemsValue
    .map((item, index) => normalizeJsonItem(item, index, feedTitle))
    .filter((item): item is FeedPreviewItem => Boolean(item));

  return {
    feedTitle,
    feedDescription,
    homeUrl,
    totalItems: items.length,
    items,
  };
}

function getXmlText(parent: Element | undefined, tagNames: string[]): string | undefined {
  if (!parent) {
    return undefined;
  }

  for (const tagName of tagNames) {
    const match = parent.getElementsByTagName(tagName)[0];
    const value = match?.textContent ? collapseWhitespace(match.textContent) : '';
    if (value) {
      return value;
    }
  }

  return undefined;
}

function getXmlLink(parent: Element | undefined): string | undefined {
  if (!parent) {
    return undefined;
  }

  const links = Array.from(parent.getElementsByTagName('link'));
  for (const link of links) {
    const href = link.getAttribute('href');
    if (href?.trim()) {
      return href.trim();
    }

    const text = link.textContent ? collapseWhitespace(link.textContent) : '';
    if (text) {
      return text;
    }
  }

  return undefined;
}

function getXmlImage(item: Element): string | undefined {
  const selectors = ['media:content', 'media:thumbnail', 'thumbnail', 'enclosure'];

  for (const selector of selectors) {
    const element = item.getElementsByTagName(selector)[0];
    if (!element) {
      continue;
    }

    const type = element.getAttribute('type');
    if (type && selector === 'enclosure' && !type.startsWith('image/')) {
      continue;
    }

    const url = element.getAttribute('url') ?? element.getAttribute('href');
    if (url?.trim()) {
      return url.trim();
    }
  }

  return extractImageFromHtml(
    getXmlText(item, ['description', 'content:encoded', 'content', 'summary'])
  );
}

function parseXmlPreview(rawText: string): FeedPreviewSnapshot | null {
  const parser = new DOMParser();
  const document = parser.parseFromString(rawText, 'application/xml');

  if (document.getElementsByTagName('parsererror').length > 0) {
    return null;
  }

  const channel = document.getElementsByTagName('channel')[0];
  const feed = document.getElementsByTagName('feed')[0];
  const feedTitle = getXmlText(channel, ['title']) || getXmlText(feed, ['title']);
  const feedDescription =
    getXmlText(channel, ['description']) ||
    getXmlText(feed, ['subtitle', 'summary']);
  const homeUrl = getXmlLink(channel) || getXmlLink(feed);
  const nodes = Array.from(document.getElementsByTagName('item'));
  const entries = nodes.length ? nodes : Array.from(document.getElementsByTagName('entry'));

  const items = entries.map((entry, index) => {
    const title = getXmlText(entry, ['title']) || `Item ${index + 1}`;
    const summary = summarizeText(
      getXmlText(entry, ['description', 'content:encoded', 'summary', 'content'])
    );

    return {
      id:
        getXmlText(entry, ['guid', 'id']) ||
        getXmlLink(entry) ||
        `${title}-${index}`,
      title,
      link: getXmlLink(entry),
      source: getXmlText(entry, ['author', 'dc:creator']) || feedTitle,
      publishedAt: getXmlText(entry, ['pubDate', 'published', 'updated']),
      summary,
      imageUrl: getXmlImage(entry),
    };
  });

  return {
    feedTitle,
    feedDescription,
    homeUrl,
    totalItems: items.length,
    items,
  };
}

async function requestPreview(
  sourceUrl: string,
  signal?: AbortSignal
): Promise<FeedPreviewResult> {
  const requestUrl = toProxyUrl(sourceUrl);
  const response = await fetch(requestUrl, { signal });
  const rawText = await response.text();
  const contentType = response.headers.get('content-type') ?? undefined;

  let body: unknown = rawText;
  try {
    body = JSON.parse(rawText);
  } catch {
    // Keep raw text when JSON parsing fails.
  }

  if (!response.ok) {
    let message =
      summarizeText(typeof body === 'string' ? body : JSON.stringify(body)) ||
      `Preview request failed with ${response.status} ${response.statusText}`;

    if (isProbablyNitterUrl(sourceUrl)) {
      if (response.status === 403 || response.status === 429 || response.status === 503) {
        message =
          'The selected Nitter instance blocked or throttled preview requests. The raw feed may still open, but in-page preview needs an instance that allows proxy fetches.';
      } else if (looksLikeHtml(rawText, contentType)) {
        message =
          'The selected Nitter instance returned an HTML page instead of an RSS response, so in-page preview could not load.';
      }
    }

    throw new FeedPreviewRequestError({
      message,
      status: response.status,
      statusText: response.statusText,
      sourceUrl,
      requestUrl,
    });
  }

  const snapshot =
    typeof body === 'string' ? parseXmlPreview(rawText) : parseJsonPreview(body);
  const state: FeedPreviewState =
    !snapshot ? 'parse_failed' : snapshot.items.length ? 'success' : 'empty';
  const note =
    state === 'parse_failed'
      ? getParseFailureNote({
          sourceUrl,
          rawText,
          contentType,
        })
      : undefined;

  return {
    status: response.status,
    statusText: response.statusText,
    contentType,
    body,
    rawText,
    sourceUrl,
    requestUrl,
    snapshot: snapshot ?? { totalItems: 0, items: [] },
    state,
    note,
  };
}

export async function fetchFeedPreview(
  feedUrl: string,
  options: { signal?: AbortSignal } = {}
): Promise<FeedPreviewResult> {
  const previewUrl = toPreviewUrl(feedUrl);

  try {
    return await requestPreview(previewUrl, options.signal);
  } catch (error) {
    if (previewUrl === feedUrl) {
      throw error;
    }

    return requestPreview(feedUrl, options.signal);
  }
}
