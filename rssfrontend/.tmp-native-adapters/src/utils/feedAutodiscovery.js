import { toProxyUrl } from './proxyUrl.js';
const FEED_TYPE_LABELS = {
    'application/rss+xml': 'RSS',
    'application/atom+xml': 'Atom',
    'application/feed+json': 'JSON Feed',
};
const HOST_LIKE_PATTERN = /^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\:\d+)?(?:[/?#].*)?$/i;
const LOCALHOST_PATTERN = /^(?:localhost|127(?:\.\d{1,3}){3})(?:\:\d+)?(?:[/?#].*)?$/i;
function collapseWhitespace(value) {
    return value.replace(/\s+/g, ' ').trim();
}
function asRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }
    return value;
}
function extractErrorMessage(rawText) {
    try {
        const parsed = JSON.parse(rawText);
        const record = asRecord(parsed);
        const message = typeof record?.message === 'string'
            ? record.message.trim()
            : typeof record?.detail === 'string'
                ? record.detail.trim()
                : '';
        return message || undefined;
    }
    catch {
        const normalized = collapseWhitespace(rawText.replace(/<[^>]+>/g, ' '));
        return normalized || undefined;
    }
}
function resolveUrl(value, baseUrl) {
    if (!value?.trim()) {
        return undefined;
    }
    try {
        return new URL(value.trim(), baseUrl).toString();
    }
    catch {
        return undefined;
    }
}
function prettifyUrl(value) {
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
    }
    catch {
        return value;
    }
}
function parseTagAttributes(tagSource) {
    const attributes = {};
    const attributePattern = /([^\s"'<>/=]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
    let match = null;
    while ((match = attributePattern.exec(tagSource))) {
        const [, rawName, , doubleQuoted, singleQuoted, bareValue] = match;
        attributes[rawName.toLowerCase()] = doubleQuoted ?? singleQuoted ?? bareValue ?? '';
    }
    return attributes;
}
function extractLinkTagAttributes(html) {
    return Array.from(html.matchAll(/<link\b[^>]*>/gi)).map((match) => parseTagAttributes(match[0]));
}
function extractTitleFromHtml(html) {
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    return collapseWhitespace(match?.[1] ?? '');
}
export function looksLikeUrlInput(input) {
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
export function buildUrlCandidates(input) {
    const trimmed = input.trim();
    if (!looksLikeUrlInput(trimmed)) {
        return [];
    }
    const rawCandidates = /^https?:\/\//i.test(trimmed)
        ? [trimmed]
        : [`https://${trimmed.replace(/^\/\//, '')}`, `http://${trimmed.replace(/^\/\//, '')}`];
    return Array.from(new Set(rawCandidates.flatMap((candidate) => {
        try {
            return [new URL(candidate).toString()];
        }
        catch {
            return [];
        }
    })));
}
export function looksLikeHtmlDocument(rawText, contentType) {
    const normalized = rawText.trim().toLowerCase();
    return (Boolean(contentType?.toLowerCase().includes('text/html')) ||
        normalized.startsWith('<!doctype html') ||
        normalized.startsWith('<html') ||
        normalized.includes('<head') ||
        normalized.includes('<body'));
}
export function parseAutodiscoveredFeeds(options) {
    const isHtml = looksLikeHtmlDocument(options.html, options.contentType);
    if (!isHtml) {
        return {
            sourceUrl: options.sourceUrl,
            isHtml: false,
            contentType: options.contentType,
            candidates: [],
        };
    }
    const hasDomParser = typeof DOMParser !== 'undefined';
    const document = hasDomParser
        ? new DOMParser().parseFromString(options.html, 'text/html')
        : undefined;
    const siteTitle = hasDomParser
        ? collapseWhitespace(document?.querySelector('title')?.textContent ?? '')
        : extractTitleFromHtml(options.html);
    const iconHref = hasDomParser
        ? document?.querySelector('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')?.getAttribute('href') ?? null
        : extractLinkTagAttributes(options.html).find((attributes) => {
            const rel = (attributes.rel ?? '').toLowerCase();
            return rel.includes('icon') || rel === 'shortcut icon' || rel === 'apple-touch-icon';
        })?.href ?? null;
    const iconUrl = resolveUrl(iconHref, options.sourceUrl) ?? undefined;
    const candidates = [];
    const linkSources = hasDomParser
        ? Array.from(document?.querySelectorAll('link[rel]') ?? []).map((element) => ({
            rel: element.getAttribute('rel') ?? '',
            type: element.getAttribute('type') ?? '',
            href: element.getAttribute('href') ?? '',
            title: element.getAttribute('title') ?? '',
        }))
        : extractLinkTagAttributes(options.html).map((attributes) => ({
            rel: attributes.rel ?? '',
            type: attributes.type ?? '',
            href: attributes.href ?? '',
            title: attributes.title ?? '',
        }));
    for (const element of linkSources) {
        const relTokens = element.rel
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean);
        const type = element.type.toLowerCase();
        if (!relTokens.includes('alternate') || !(type in FEED_TYPE_LABELS)) {
            continue;
        }
        const url = resolveUrl(element.href, options.sourceUrl);
        if (!url) {
            continue;
        }
        const title = collapseWhitespace(element.title) || siteTitle || prettifyUrl(url);
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
    const dedupedCandidates = Array.from(new Map(candidates.map((candidate) => [candidate.url, candidate])).values());
    return {
        sourceUrl: options.sourceUrl,
        isHtml: true,
        contentType: options.contentType,
        siteTitle: siteTitle || undefined,
        iconUrl,
        candidates: dedupedCandidates,
    };
}
export async function discoverFeedsFromWebsite(sourceUrl, options = {}) {
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
        throw new Error(extractErrorMessage(rawText) ||
            `Website request failed with ${response.status} ${response.statusText}`);
    }
    const resolvedSourceUrl = response.headers.get('x-rsshubvite-final-url')?.trim() || sourceUrl;
    return parseAutodiscoveredFeeds({
        html: rawText,
        sourceUrl: resolvedSourceUrl,
        contentType,
    });
}
