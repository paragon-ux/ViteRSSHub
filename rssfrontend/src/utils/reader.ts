import type { SavedFeed } from '../types.js';
import type { FeedPreviewItem } from './feedPreview.js';

export type ReaderSection =
  | 'all'
  | 'feed'
  | 'collection'
  | 'unread'
  | 'starred'
  | 'notes'
  | 'filter'
  | 'library'
  | 'addFeed'
  | 'settings';

export type ReaderItemType = 'article' | 'video' | 'social' | 'audio' | 'newsletter';

export type ReaderSourceKind =
  | 'youtube'
  | 'threads'
  | 'twitter'
  | 'nitter'
  | 'reddit'
  | 'mastodon'
  | 'tumblr'
  | 'medium'
  | 'newsletter'
  | 'podcast'
  | 'audio'
  | 'rss';

export type FeedIdentity = {
  title: string;
  sourceName: string;
  sourceKind: ReaderSourceKind;
  subtitle: string;
};

export type ReaderItem = {
  id: string;
  feedId: string;
  feedLabel: string;
  feedDisplayTitle: string;
  feedUrl: string;
  routeId?: string;
  sourceName: string;
  sourceKind: ReaderSourceKind;
  sourceUrl: string;
  title: string;
  link?: string;
  source?: string;
  author?: string;
  publishedAt?: string;
  description?: string;
  summary?: string;
  content?: string;
  imageUrl?: string;
  type: ReaderItemType;
  lastSeenAt: number;
};

export type ReaderItemState = {
  read: boolean;
  starred: boolean;
  readLater: boolean;
  archived: boolean;
  updatedAt: number;
};

export type ReaderNote = {
  id: string;
  itemId: string;
  text: string;
  createdAt: number;
  updatedAt: number;
};

export type ReaderCollection = {
  id: string;
  name: string;
  itemIds: string[];
  feedIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type ReaderItemView = ReaderItem & {
  read: boolean;
  starred: boolean;
  readLater: boolean;
  archived: boolean;
  notesCount: number;
};

export type FeedRefreshStatus = {
  feedId: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  updatedAt?: number;
};

export function normalizeReaderCollection(
  collection: Partial<ReaderCollection> & Pick<ReaderCollection, 'id' | 'name'>
): ReaderCollection {
  return {
    id: collection.id,
    name: collection.name,
    itemIds: Array.isArray(collection.itemIds)
      ? collection.itemIds.filter((value): value is string => typeof value === 'string')
      : [],
    feedIds: Array.isArray(collection.feedIds)
      ? collection.feedIds.filter((value): value is string => typeof value === 'string')
      : [],
    createdAt: typeof collection.createdAt === 'number' ? collection.createdAt : Date.now(),
    updatedAt: typeof collection.updatedAt === 'number' ? collection.updatedAt : Date.now(),
  };
}

function normalizeKey(value: string): string {
  return encodeURIComponent(value.trim().toLowerCase()).replace(/%/g, '');
}

function looksLike(value: string | undefined, matcher: RegExp): boolean {
  return Boolean(value && matcher.test(value));
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function prettifyIdentifier(value: string): string {
  return safeDecode(value)
    .replace(/^@/, '')
    .replace(/\.rss$/i, '')
    .replace(/\+/g, ' ')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function prettifyUrlSegment(value: string): string {
  return prettifyIdentifier(value).replace(/\.(xml|atom|json)$/i, '').trim();
}

function isGenericRouteTitle(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return Boolean(
    normalized &&
      (/with |handle|route|timeline|path parameter|user id|channel id/i.test(normalized) ||
        normalized === 'rss' ||
        normalized === 'feed' ||
        normalized === 'atom' ||
        normalized === 'json feed' ||
        normalized === 'rss feed' ||
        normalized === 'atom feed')
  );
}

export function isGenericNativeFeedTitle(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return Boolean(
    normalized &&
      (normalized === 'rss' ||
        normalized === 'feed' ||
        normalized === 'feeds' ||
        normalized === 'atom' ||
        normalized === 'xml' ||
        normalized === 'json' ||
        normalized === 'rss feed' ||
        normalized === 'atom feed' ||
        normalized === 'json feed' ||
        normalized === 'feed xml' ||
        normalized === 'rss xml' ||
        normalized === 'atom xml' ||
        normalized === 'index' ||
        normalized === 'index xml' ||
        normalized === 'discover' ||
        normalized === 'videos xml' ||
        normalized === 'feed json')
  );
}

function isNativeLikeFeed(feed: Pick<SavedFeed, 'routeId'> & { kind?: SavedFeed['kind'] }): boolean {
  return Boolean(
    feed.kind === 'native' ||
      feed.kind === 'file' ||
      feed.routeId === 'native:rss' ||
      feed.routeId === 'native:file' ||
      feed.routeId.startsWith('native:')
  );
}

export function getSourceKind(value: string): ReaderSourceKind {
  const normalized = value.toLowerCase();

  if (normalized.includes('youtube') || normalized.includes('youtu.be')) {
    return 'youtube';
  }

  if (normalized.includes('threads')) {
    return 'threads';
  }

  if (
    normalized.includes('nitter')
  ) {
    return 'nitter';
  }

  if (normalized.includes('twitter') || normalized.includes('x.com')) {
    return 'twitter';
  }

  if (normalized.includes('reddit')) {
    return 'reddit';
  }

  if (normalized.includes('mastodon')) {
    return 'mastodon';
  }

  if (normalized.includes('tumblr')) {
    return 'tumblr';
  }

  if (normalized.includes('medium')) {
    return 'medium';
  }

  if (
    normalized.includes('newsletter') ||
    normalized.includes('substack') ||
    normalized.includes('mailchimp') ||
    normalized.includes('buttondown') ||
    normalized.includes('beehiiv')
  ) {
    return 'newsletter';
  }

  if (normalized.includes('podcast')) {
    return 'podcast';
  }

  if (normalized.includes('audio')) {
    return 'audio';
  }

  return 'rss';
}

export function getSourceName(kind: ReaderSourceKind): string {
  if (kind === 'youtube') {
    return 'YouTube';
  }

  if (kind === 'threads') {
    return 'Threads';
  }

  if (kind === 'twitter') {
    return 'Twitter/X';
  }

  if (kind === 'nitter') {
    return 'Nitter';
  }

  if (kind === 'reddit') {
    return 'Reddit';
  }

  if (kind === 'mastodon') {
    return 'Mastodon';
  }

  if (kind === 'tumblr') {
    return 'Tumblr';
  }

  if (kind === 'medium') {
    return 'Medium';
  }

  if (kind === 'newsletter') {
    return 'Newsletter';
  }

  if (kind === 'podcast') {
    return 'Podcast';
  }

  if (kind === 'audio') {
    return 'Audio';
  }

  return 'RSS';
}

function extractTargetFromUrl(url: string, sourceKind: ReaderSourceKind): string | undefined {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname
      .split('/')
      .map((segment) => prettifyUrlSegment(segment))
      .filter(Boolean);
    const genericSegments = new Set([
      'rss',
      'feed',
      'feeds',
      'xml',
      'atom',
      'json',
      'index',
      'discover',
      'user',
      'channel',
      'channels',
      'video',
      'videos',
      'playlist',
      'playlists',
      'search',
      'keyword',
      'route Params?',
      'route Params',
      'routeParams?',
      'routeParams',
    ]);

    if (
      sourceKind === 'twitter' ||
      sourceKind === 'nitter' ||
      sourceKind === 'threads' ||
      parsed.hostname.includes('nitter')
    ) {
      const socialSegment = segments.find((segment) => !genericSegments.has(segment));
      return socialSegment ? prettifyIdentifier(socialSegment) : undefined;
    }

    const sourceIndex =
      sourceKind === 'youtube'
        ? segments.findIndex((segment) => segment.toLowerCase() === 'youtube')
        : 0;
    const candidates = sourceIndex >= 0 ? segments.slice(sourceIndex + 1) : segments;
    const target = candidates.find(
      (segment) =>
        !genericSegments.has(segment) &&
        !segment.startsWith(':') &&
        !segment.endsWith('?')
    );

    return target ? prettifyIdentifier(target) : undefined;
  } catch {
    return undefined;
  }
}

export function getFeedIdentity(
  feed: Pick<SavedFeed, 'label' | 'url' | 'routeId'> & { kind?: SavedFeed['kind'] }
): FeedIdentity {
  const sourceKind = getSourceKind(`${feed.url} ${feed.routeId} ${feed.label}`);
  const sourceName = getSourceName(sourceKind);
  const targetFromUrl = extractTargetFromUrl(feed.url, sourceKind);
  const label = prettifyIdentifier(feed.label);
  const nativeLike = isNativeLikeFeed(feed);
  const hasMeaningfulNativeLabel = Boolean(label && !isGenericNativeFeedTitle(label));
  const title = nativeLike
    ? hasMeaningfulNativeLabel
      ? label
      : targetFromUrl || sourceName
    : targetFromUrl || (isGenericRouteTitle(label) ? sourceName : label);

  return {
    title,
    sourceName,
    sourceKind,
    subtitle: `${title} - ${sourceName}`,
  };
}

export function detectReaderItemType(
  item: FeedPreviewItem,
  feed: Pick<SavedFeed, 'label' | 'url' | 'routeId'>
): ReaderItemType {
  const haystack = `${feed.label} ${feed.url} ${feed.routeId} ${item.link ?? ''} ${
    item.source ?? ''
  } ${item.title}`.toLowerCase();

  if (item.mediaType?.startsWith('audio/')) {
    return 'audio';
  }

  if (
    looksLike(haystack, /youtube|youtu\.be|vimeo|video|watch\?v=|\/shorts\//)
  ) {
    return 'video';
  }

  if (looksLike(haystack, /nitter|twitter|x\.com|mastodon|reddit|threads/)) {
    return 'social';
  }

  if (looksLike(haystack, /newsletter|substack|mailchimp|buttondown|beehiiv/)) {
    return 'newsletter';
  }

  return 'article';
}

export function makeReaderItemId(feedId: string, item: FeedPreviewItem): string {
  return `${feedId}:${normalizeKey(item.id || item.link || item.title)}`;
}

export function normalizePreviewItemsForReader(
  feed: SavedFeed,
  items: FeedPreviewItem[],
  seenAt = Date.now()
): ReaderItem[] {
  const identity = getFeedIdentity(feed);

  return items.map((item) => ({
    id: makeReaderItemId(feed.id, item),
    feedId: feed.id,
    feedLabel: feed.label,
    feedDisplayTitle: identity.title,
    feedUrl: feed.url,
    routeId: feed.routeId,
    sourceName: identity.sourceName,
    sourceKind: identity.sourceKind,
    sourceUrl: item.link || feed.url,
    title: item.title,
    link: item.link,
    source: item.source || feed.label,
    author: item.author,
    publishedAt: item.publishedAt,
    description: item.description,
    summary: item.summary,
    content: item.content,
    imageUrl: item.imageUrl,
    type: detectReaderItemType(item, feed),
    lastSeenAt: seenAt,
  }));
}

export function mergeReaderItems(
  current: ReaderItem[],
  incoming: ReaderItem[]
): ReaderItem[] {
  const map = new Map(current.map((item) => [item.id, item]));

  for (const item of incoming) {
    map.set(item.id, {
      ...map.get(item.id),
      ...item,
    });
  }

  return Array.from(map.values()).sort((left, right) => {
    const rightTime = Date.parse(right.publishedAt ?? '') || right.lastSeenAt;
    const leftTime = Date.parse(left.publishedAt ?? '') || left.lastSeenAt;
    return rightTime - leftTime;
  });
}

export function getDefaultReaderItemState(): ReaderItemState {
  return {
    read: false,
    starred: false,
    readLater: false,
    archived: false,
    updatedAt: Date.now(),
  };
}

export function buildReaderItemViews(options: {
  items: ReaderItem[];
  stateById: Record<string, ReaderItemState>;
  notes: ReaderNote[];
}): ReaderItemView[] {
  const notesByItem = new Map<string, number>();

  for (const note of options.notes) {
    notesByItem.set(note.itemId, (notesByItem.get(note.itemId) ?? 0) + 1);
  }

  return options.items.map((item) => {
    const state = options.stateById[item.id] ?? getDefaultReaderItemState();

    return {
      ...item,
      read: state.read,
      starred: state.starred,
      readLater: state.readLater,
      archived: state.archived,
      notesCount: notesByItem.get(item.id) ?? 0,
    };
  });
}

export function filterReaderItems(
  section: ReaderSection,
  items: ReaderItemView[]
): ReaderItemView[] {
  const activeItems = items.filter((item) => !item.archived);

  if (section === 'unread') {
    return activeItems.filter((item) => !item.read);
  }

  if (section === 'starred') {
    return activeItems.filter((item) => item.starred);
  }

  if (section === 'notes') {
    return activeItems.filter((item) => item.notesCount > 0);
  }

  return activeItems;
}
