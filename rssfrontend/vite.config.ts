import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const FEED_FETCH_PATH = '/feed-fetch';
const LOCAL_RSSHUB_FETCH_PATH = '/local-rsshub-fetch';
const LOCAL_PROXY_TARGET = 'http://127.0.0.1:1200';
const DEFAULT_EXTERNAL_ACCEPT =
  'application/rss+xml, application/atom+xml, application/feed+json, application/xml, text/xml, text/html, application/xhtml+xml;q=0.9, */*;q=0.8';
const EXTERNAL_FETCH_USER_AGENT =
  'Mozilla/5.0 (compatible; RSSHubViteFeedFetch/1.0; +https://github.com/DIYgod/RSSHub)';
const REQUEST_TIMEOUT_MS = 15000;
const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

type FeedFetchRequest = {
  url?: string;
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type FeedFetchResponse = {
  statusCode: number;
  writableEnded?: boolean;
  setHeader: (name: string, value: string) => void;
  end: (body?: string | Uint8Array) => void;
};

type SourceCandidateOptions = {
  allowLoopback?: boolean;
  requireLoopback?: boolean;
  preferredProtocols?: Array<'http' | 'https'>;
};

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripHtml(value: string): string {
  return collapseWhitespace(value.replace(/<[^>]+>/g, ' '));
}

function summarizeText(value: string, maxLength = 180): string | undefined {
  const normalized = stripHtml(value);

  if (!normalized) {
    return undefined;
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function getErrorMessageFromRawText(rawText: string): string | undefined {
  try {
    const parsed = JSON.parse(rawText) as unknown;
    const record = asRecord(parsed);

    return (
      asString(record?.message) ??
      asString(record?.detail) ??
      asString(record?.description) ??
      asString(record?.errorMessage)
    );
  } catch {
    return summarizeText(rawText);
  }
}

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, '').toLowerCase();
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);

  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === '0.0.0.0'
  );
}

function buildSourceCandidates(source: string, options: SourceCandidateOptions = {}): string[] {
  const trimmed = source.trim();

  if (!trimmed) {
    return [];
  }

  const preferredProtocols = options.preferredProtocols ?? ['https', 'http'];
  const normalizedInput = trimmed.replace(/^\/\//, '');
  const rawCandidates = /^https?:\/\//i.test(normalizedInput)
    ? [normalizedInput]
    : URL_SCHEME_PATTERN.test(normalizedInput)
      ? [normalizedInput]
      : preferredProtocols.map((protocol) => `${protocol}://${normalizedInput}`);

  const candidates = new Set<string>();

  for (const rawCandidate of rawCandidates) {
    try {
      const parsed = new URL(rawCandidate);

      if (!/^https?:$/i.test(parsed.protocol)) {
        continue;
      }

      if (!parsed.hostname) {
        continue;
      }

      const isLoopback = isLoopbackHost(parsed.hostname);

      if (options.requireLoopback && !isLoopback) {
        continue;
      }

      if (!options.allowLoopback && isLoopback) {
        continue;
      }

      candidates.add(parsed.toString());
    } catch {
      // Ignore malformed candidate URLs.
    }
  }

  return Array.from(candidates);
}

function getUpstreamAcceptHeader(request: FeedFetchRequest): string {
  const incoming = Array.isArray(request.headers.accept)
    ? request.headers.accept.join(', ')
    : request.headers.accept;
  const trimmed = incoming?.trim();

  if (!trimmed || trimmed === '*/*') {
    return DEFAULT_EXTERNAL_ACCEPT;
  }

  return trimmed;
}

function sendJson(
  response: FeedFetchResponse,
  status: number,
  payload: Record<string, unknown>
) {
  response.statusCode = status;
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

function getUpstreamFailureError(status: number): string {
  if (status === 404) {
    return 'feed_not_found';
  }

  if (status === 401 || status === 403) {
    return 'source_forbidden';
  }

  if (status === 429) {
    return 'source_rate_limited';
  }

  return 'source_returned_non_ok';
}

function getUpstreamFailureMessage(
  status: number,
  statusText: string,
  detail?: string
): string {
  const suffix = detail ? ` ${detail}` : '';

  if (status === 404) {
    return `Feed not found. The source returned 404 Not Found.${suffix}`;
  }

  if (status === 401 || status === 403) {
    return `The source refused this feed request with ${status} ${statusText}.${suffix}`;
  }

  if (status === 429) {
    return `The source is rate limiting feed requests with 429 Too Many Requests.${suffix}`;
  }

  return `The source returned ${status} ${statusText}.${suffix}`;
}

async function fetchExternalSource(
  requestUrl: string,
  request: FeedFetchRequest
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(requestUrl, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: getUpstreamAcceptHeader(request),
        'Cache-Control': 'no-cache',
        'User-Agent': EXTERNAL_FETCH_USER_AGENT,
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function writeUpstreamSuccess(response: FeedFetchResponse, upstreamResponse: Response, requestUrl: string) {
  return upstreamResponse.arrayBuffer().then((buffer) => {
    response.statusCode = 200;
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader(
      'Content-Type',
      upstreamResponse.headers.get('content-type') ?? 'application/octet-stream'
    );

    const etag = upstreamResponse.headers.get('etag');
    if (etag) {
      response.setHeader('ETag', etag);
    }

    const lastModified = upstreamResponse.headers.get('last-modified');
    if (lastModified) {
      response.setHeader('Last-Modified', lastModified);
    }

    response.setHeader('X-RSSHubVite-Request-Url', requestUrl);
    response.setHeader('X-RSSHubVite-Final-Url', upstreamResponse.url || requestUrl);
    response.end(new Uint8Array(buffer));
  });
}

async function handleFeedFetch(request: FeedFetchRequest, response: FeedFetchResponse) {
  const incomingUrl = new URL(request.url ?? FEED_FETCH_PATH, 'http://127.0.0.1');
  const source = incomingUrl.searchParams.get('source') ?? '';

  if (request.method !== 'GET') {
    sendJson(response, 405, {
      error: 'method_not_allowed',
      message: 'Only GET is supported for feed fetch requests.',
    });
    return;
  }

  if (!source.trim()) {
    sendJson(response, 400, {
      error: 'missing_source',
      message: 'Add a feed URL in the source query parameter.',
    });
    return;
  }

  const candidates = buildSourceCandidates(source);

  if (!candidates.length) {
    sendJson(response, 400, {
      error: 'invalid_source',
      message:
        'Enter a valid external http or https feed URL. Local instance URLs should use the RSSHub API path instead.',
    });
    return;
  }

  let lastError: unknown = null;
  let lastUpstreamFailure:
    | {
        status: number;
        statusText: string;
        detail?: string;
        sourceUrl: string;
        requestUrl: string;
      }
    | null = null;
  let lastAttemptedUrl = candidates[0];

  for (const candidate of candidates) {
    lastAttemptedUrl = candidate;

    try {
      const upstreamResponse = await fetchExternalSource(candidate, request);

      if (!upstreamResponse.ok) {
        const rawErrorText = await upstreamResponse.text();
        const detail = getErrorMessageFromRawText(rawErrorText);
        lastUpstreamFailure = {
          status: upstreamResponse.status,
          statusText: upstreamResponse.statusText,
          detail,
          sourceUrl: upstreamResponse.url || candidate,
          requestUrl: candidate,
        };
        continue;
      }

      await writeUpstreamSuccess(response, upstreamResponse, candidate);
      return;
    } catch (unknownError) {
      lastError = unknownError;
    }
  }

  if (lastUpstreamFailure) {
    sendJson(response, lastUpstreamFailure.status, {
      error: getUpstreamFailureError(lastUpstreamFailure.status),
      message: getUpstreamFailureMessage(
        lastUpstreamFailure.status,
        lastUpstreamFailure.statusText,
        lastUpstreamFailure.detail
      ),
      sourceUrl: lastUpstreamFailure.sourceUrl,
      requestUrl: lastUpstreamFailure.requestUrl,
      status: lastUpstreamFailure.status,
      statusText: lastUpstreamFailure.statusText,
    });
    return;
  }

  const message =
    lastError instanceof DOMException && lastError.name === 'AbortError'
      ? 'External feed request timed out.'
      : lastError instanceof Error && lastError.message
        ? `External fetch failed: ${lastError.message}`
        : 'External fetch failed.';

  sendJson(response, 502, {
    error: 'external_fetch_failed',
    message,
    sourceUrl: lastAttemptedUrl,
  });
}

async function handleLocalRsshubFetch(request: FeedFetchRequest, response: FeedFetchResponse) {
  const incomingUrl = new URL(request.url ?? LOCAL_RSSHUB_FETCH_PATH, 'http://127.0.0.1');
  const source = incomingUrl.searchParams.get('source') ?? '';

  if (request.method !== 'GET') {
    sendJson(response, 405, {
      error: 'method_not_allowed',
      message: 'Only GET is supported for local RSSHub fetch requests.',
    });
    return;
  }

  if (!source.trim()) {
    sendJson(response, 400, {
      error: 'missing_source',
      message: 'Add a local RSSHub URL in the source query parameter.',
    });
    return;
  }

  const candidates = buildSourceCandidates(source, {
    allowLoopback: true,
    requireLoopback: true,
    preferredProtocols: ['http', 'https'],
  });

  if (!candidates.length) {
    sendJson(response, 400, {
      error: 'invalid_source',
      message:
        'Enter a valid local RSSHub http or https URL that points to localhost or another loopback address.',
    });
    return;
  }

  const candidate = candidates[0];

  try {
    const upstreamResponse = await fetchExternalSource(candidate, request);

    if (!upstreamResponse.ok) {
      const rawErrorText = await upstreamResponse.text();
      const detail = getErrorMessageFromRawText(rawErrorText);

      sendJson(response, upstreamResponse.status, {
        error: getUpstreamFailureError(upstreamResponse.status),
        message:
          detail ||
          `The local RSSHub instance returned ${upstreamResponse.status} ${upstreamResponse.statusText}.`,
        sourceUrl: upstreamResponse.url || candidate,
        requestUrl: candidate,
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
      });
      return;
    }

    await writeUpstreamSuccess(response, upstreamResponse, candidate);
  } catch (unknownError) {
    const message =
      unknownError instanceof DOMException && unknownError.name === 'AbortError'
        ? 'The local RSSHub request timed out. Make sure the instance is running and reachable.'
        : unknownError instanceof Error && unknownError.message
          ? `Unable to reach the local RSSHub instance: ${unknownError.message}`
          : 'Unable to reach the local RSSHub instance.';

    sendJson(response, 502, {
      error: 'local_rsshub_unreachable',
      message,
      sourceUrl: candidate,
    });
  }
}

function attachFeedFetchMiddleware(middlewares: {
  use: (handler: (...args: any[]) => void) => unknown;
}) {
  middlewares.use((request, response, next) => {
    if (request.url?.startsWith(FEED_FETCH_PATH)) {
      void handleFeedFetch(request, response).catch(() => {
        if (response.writableEnded) {
          return;
        }

        sendJson(response, 500, {
          error: 'unexpected_feed_fetch_error',
          message: 'An unexpected error occurred while fetching this feed through the app.',
        });
      });
      return;
    }

    if (request.url?.startsWith(LOCAL_RSSHUB_FETCH_PATH)) {
      void handleLocalRsshubFetch(request, response).catch(() => {
        if (response.writableEnded) {
          return;
        }

        sendJson(response, 500, {
          error: 'unexpected_local_rsshub_fetch_error',
          message: 'An unexpected error occurred while reading the local RSSHub instance.',
        });
      });
      return;
    }

    next();
  });
}

function sameOriginFeedFetchPlugin(): Plugin {
  return {
    name: 'rsshubvite-feed-fetch',
    configureServer(server) {
      attachFeedFetchMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachFeedFetchMiddleware(server.middlewares);
    },
  };
}

export default defineConfig({
  plugins: [react(), sameOriginFeedFetchPlugin()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    open: false,
    proxy: {
      '/rsshub-api': {
        target: LOCAL_PROXY_TARGET,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rsshub-api/, ''),
      },
      '/rsshub-docs': {
        target: 'https://docs.rsshub.app',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/rsshub-docs/, ''),
      },
      '/nitter-proxy': {
        target: 'https://nitter.poast.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/nitter-proxy/, ''),
      },
    },
  },
});
