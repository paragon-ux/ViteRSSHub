import { isProbablyNitterUrl } from './nitter';
import { isLocalInstanceUrl, toProxyUrl } from './proxyUrl';

export type FeedPreviewItem = {
  id: string;
  title: string;
  link?: string;
  source?: string;
  author?: string;
  publishedAt?: string;
  description?: string;
  summary?: string;
  content?: string;
  imageUrl?: string;
  mediaType?: string;
};

export type FeedPreviewSnapshot = {
  feedTitle?: string;
  feedDescription?: string;
  homeUrl?: string;
  feedImageUrl?: string;
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

function getProductErrorMessage(body: unknown): string | undefined {
  const record = asRecord(body);
  if (!record) {
    return undefined;
  }

  return firstDefinedString(
    record.message,
    record.detail,
    record.description,
    record.errorMessage,
    getNestedValue(record, ['error', 'message'])
  );
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

function resolvePreviewAssetUrl(value: string | undefined, baseUrl?: string): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const trimmed = value.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  if (!baseUrl) {
    return trimmed;
  }

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return trimmed;
  }
}

function getJsonItemImage(value: unknown, baseUrl?: string): string | undefined {
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
    return resolvePreviewAssetUrl(direct, baseUrl);
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
      return resolvePreviewAssetUrl(url, baseUrl);
    }
  }

  return resolvePreviewAssetUrl(
    extractImageFromHtml(
      firstDefinedString(
        record.description,
        record.summary,
        record.content_html,
        record.content
      )
    ),
    baseUrl
  );
}

function getJsonItemMediaType(value: unknown): string | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  return firstDefinedString(
    record.mediaType,
    record.media_type,
    record.mimeType,
    record.mime_type,
    getNestedValue(record, ['enclosure', 'type']),
    getNestedValue(record, ['media:content', '$', 'type']),
    getNestedValue(record, ['media', 'content', 'type'])
  );
}

function getJsonFeedImage(value: unknown, baseUrl?: string): string | undefined {
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  return resolvePreviewAssetUrl(
    firstDefinedString(
      record.icon,
      record.favicon,
      record.logo,
      record.image,
      record.imageUrl,
      getNestedValue(record, ['feed', 'icon']),
      getNestedValue(record, ['feed', 'image']),
      getNestedValue(record, ['channel', 'image', 'url']),
      getNestedValue(record, ['channel', 'image'])
    ),
    baseUrl
  );
}

function normalizeJsonItem(
  value: unknown,
  index: number,
  feedTitle?: string,
  baseUrl?: string
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
  const rawDescription = firstDefinedString(
    record.description,
    record.excerpt
  );
  const rawSummary = firstDefinedString(
    record.summary,
    rawDescription,
    record.excerpt
  );
  const rawContent = firstDefinedString(
    record.content_html,
    record.content_text,
    record.content,
    rawSummary
  );

  return {
    id: firstDefinedString(record.id, record.guid, link, title, index) || `item-${index}`,
    title,
    link,
    source,
    author: firstDefinedString(getNestedValue(record, ['author', 'name']), record.author),
    publishedAt,
    description: summarizeText(rawDescription, 220),
    summary: summarizeText(rawSummary, 220),
    content: summarizeText(rawContent, 900),
    imageUrl: getJsonItemImage(record, baseUrl),
    mediaType: getJsonItemMediaType(record),
  };
}

function parseJsonPreview(body: unknown, baseUrl?: string): FeedPreviewSnapshot {
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
  const feedImageUrl = getJsonFeedImage(record, baseUrl);

  const items = itemsValue
    .map((item, index) => normalizeJsonItem(item, index, feedTitle, baseUrl))
    .filter((item): item is FeedPreviewItem => Boolean(item));

  return {
    feedTitle,
    feedDescription,
    homeUrl,
    feedImageUrl,
    totalItems: items.length,
    items,
  };
}

function matchesXmlTag(element: Element, tagName: string): boolean {
  const target = tagName.toLowerCase();
  const localTarget = target.split(':').pop() ?? target;
  const names = [
    element.tagName,
    element.nodeName,
    element.localName,
    element.tagName.split(':').pop(),
    element.nodeName.split(':').pop(),
  ]
    .filter((name): name is string => Boolean(name))
    .map((name) => name.toLowerCase());

  return names.includes(target) || names.includes(localTarget);
}

function getXmlElements(
  parent: Document | Element | undefined,
  tagNames: string[]
): Element[] {
  if (!parent) {
    return [];
  }

  return Array.from(parent.getElementsByTagName('*')).filter((element) =>
    tagNames.some((tagName) => matchesXmlTag(element, tagName))
  );
}

function getXmlText(
  parent: Document | Element | undefined,
  tagNames: string[]
): string | undefined {
  if (!parent) {
    return undefined;
  }

  for (const tagName of tagNames) {
    const match = getXmlElements(parent, [tagName])[0];
    const value = match?.textContent ? collapseWhitespace(match.textContent) : '';
    if (value) {
      return value;
    }
  }

  return undefined;
}

function getXmlLink(parent: Document | Element | undefined): string | undefined {
  if (!parent) {
    return undefined;
  }

  const links = getXmlElements(parent, ['link']);
  let fallback: string | undefined;

  for (const link of links) {
    const href = link.getAttribute('href');
    if (href?.trim()) {
      const rel = link.getAttribute('rel')?.trim().toLowerCase();
      if (!rel || rel === 'alternate') {
        return href.trim();
      }

      fallback = fallback ?? href.trim();
      continue;
    }

    const text = link.textContent ? collapseWhitespace(link.textContent) : '';
    if (text) {
      return text;
    }
  }

  return fallback;
}

function getXmlMedia(item: Element): { url?: string; type?: string } {
  const selectors = ['media:content', 'media:thumbnail', 'thumbnail', 'enclosure'];

  for (const selector of selectors) {
    const element = getXmlElements(item, [selector])[0];
    if (!element) {
      continue;
    }

    const type = element.getAttribute('type');
    if (type && selector === 'enclosure' && !type.startsWith('image/')) {
      continue;
    }

    const url = element.getAttribute('url') ?? element.getAttribute('href');
    if (url?.trim()) {
      return {
        url: url.trim(),
        type: type?.trim(),
      };
    }
  }

  return {};
}

function getXmlImage(item: Element, baseUrl?: string): string | undefined {
  const media = getXmlMedia(item);
  if (media.url) {
    return resolvePreviewAssetUrl(media.url, baseUrl);
  }

  return resolvePreviewAssetUrl(
    extractImageFromHtml(
      getXmlText(item, ['description', 'content:encoded', 'content', 'summary'])
    ),
    baseUrl
  );
}

function getXmlFeedImage(
  parent: Document | Element | undefined,
  baseUrl?: string
): string | undefined {
  if (!parent) {
    return undefined;
  }

  const imageElement = getXmlElements(parent, ['image', 'logo', 'icon'])[0];
  if (!imageElement) {
    return undefined;
  }

  return resolvePreviewAssetUrl(
    firstDefinedString(
      imageElement.getAttribute('href'),
      imageElement.getAttribute('url'),
      getXmlText(imageElement, ['url']),
      imageElement.textContent
    ),
    baseUrl
  );
}

function parseXmlPreview(rawText: string, baseUrl?: string): FeedPreviewSnapshot | null {
  const parser = new DOMParser();
  const document = parser.parseFromString(rawText, 'application/xml');

  if (document.getElementsByTagName('parsererror').length > 0) {
    return null;
  }

  const channel = getXmlElements(document, ['channel'])[0];
  const feed = getXmlElements(document, ['feed'])[0];
  const feedTitle = getXmlText(channel, ['title']) || getXmlText(feed, ['title']);
  const feedDescription =
    getXmlText(channel, ['description']) ||
    getXmlText(feed, ['subtitle', 'summary']);
  const homeUrl = getXmlLink(channel) || getXmlLink(feed);
  const feedImageUrl = getXmlFeedImage(channel, baseUrl) || getXmlFeedImage(feed, baseUrl);
  const nodes = getXmlElements(document, ['item']);
  const entries = nodes.length ? nodes : getXmlElements(document, ['entry']);

  const items = entries.map((entry, index) => {
    const title = getXmlText(entry, ['title']) || `Item ${index + 1}`;
    const rawDescription = getXmlText(entry, ['description', 'summary']);
    const rawContent = getXmlText(entry, [
      'description',
      'content:encoded',
      'encoded',
      'summary',
      'content',
    ]);
    const media = getXmlMedia(entry);

    return {
      id:
        getXmlText(entry, ['guid', 'id']) ||
        getXmlLink(entry) ||
        `${title}-${index}`,
      title,
      link: getXmlLink(entry),
      source: getXmlText(entry, ['author', 'dc:creator']) || feedTitle,
      author: getXmlText(entry, ['author', 'dc:creator']),
      publishedAt: getXmlText(entry, ['pubDate', 'published', 'updated']),
      description: summarizeText(rawDescription, 220),
      summary: summarizeText(rawDescription || rawContent, 220),
      content: summarizeText(rawContent, 900),
      imageUrl: getXmlImage(entry, baseUrl),
      mediaType: media.type,
    };
  });

  return {
    feedTitle,
    feedDescription,
    homeUrl,
    feedImageUrl,
    totalItems: items.length,
    items,
  };
}

export function parseFeedPreviewFromText(options: {
  rawText: string;
  sourceUrl: string;
  contentType?: string;
}): FeedPreviewResult {
  const body: unknown = (() => {
    try {
      return JSON.parse(options.rawText);
    } catch {
      return options.rawText;
    }
  })();
  const snapshot =
    typeof body === 'string'
      ? parseXmlPreview(options.rawText, options.sourceUrl)
      : parseJsonPreview(body, options.sourceUrl);
  const state: FeedPreviewState =
    !snapshot ? 'parse_failed' : snapshot.items.length ? 'success' : 'empty';
  const note =
    state === 'parse_failed'
      ? getParseFailureNote({
          sourceUrl: options.sourceUrl,
          rawText: options.rawText,
          contentType: options.contentType,
        })
      : undefined;

  return {
    status: 200,
    statusText: 'OK',
    contentType: options.contentType,
    body,
    rawText: options.rawText,
    sourceUrl: options.sourceUrl,
    requestUrl: options.sourceUrl,
    snapshot: snapshot ?? { totalItems: 0, items: [] },
    state,
    note,
  };
}

async function requestPreview(
  sourceUrl: string,
  signal?: AbortSignal
): Promise<FeedPreviewResult> {
  const requestUrl = toProxyUrl(sourceUrl);
  let response: Response;

  try {
    response = await fetch(requestUrl, { signal });
  } catch (unknownError) {
    const message = isProbablyNitterUrl(sourceUrl)
      ? 'Unable to fetch this Nitter feed through the app. Open the raw feed directly or retry the same-origin feed fetch path.'
      : unknownError instanceof Error
        ? unknownError.message
        : 'Unable to fetch this feed preview.';

    throw new FeedPreviewRequestError({
      message,
      status: 0,
      statusText: 'Fetch failed',
      sourceUrl,
      requestUrl,
    });
  }

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
      getProductErrorMessage(body) ||
      summarizeText(typeof body === 'string' ? body : JSON.stringify(body)) ||
      `Preview request failed with ${response.status} ${response.statusText}`;

    if (isProbablyNitterUrl(sourceUrl)) {
      if (response.status === 403 || response.status === 429 || response.status === 503) {
        message =
          'The selected Nitter instance blocked or throttled feed requests. The raw feed may still open, but in-page preview needs an instance that allows the app to fetch it server-side.';
      } else if (response.status >= 500) {
        message =
          'The selected Nitter instance returned a server error to the app feed fetch path. Try reloading, open the raw feed, or switch to a different Nitter base URL.';
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

  const resolvedSourceUrl =
    response.headers.get('x-rsshubvite-final-url')?.trim() || sourceUrl;

  const snapshot =
    typeof body === 'string'
      ? parseXmlPreview(rawText, resolvedSourceUrl)
      : parseJsonPreview(body, resolvedSourceUrl);
  const state: FeedPreviewState =
    !snapshot ? 'parse_failed' : snapshot.items.length ? 'success' : 'empty';
  const note =
    state === 'parse_failed'
      ? getParseFailureNote({
          sourceUrl: resolvedSourceUrl,
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
    sourceUrl: resolvedSourceUrl,
    requestUrl,
    snapshot: snapshot ?? { totalItems: 0, items: [] },
    state,
    note,
  };
}

export async function fetchFeedPreview(
  feedUrl: string,
  options: {
    signal?: AbortSignal;
  } = {}
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
