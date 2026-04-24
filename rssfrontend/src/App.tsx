import {
  Archive,
  Bell,
  Check,
  Copy,
  ExternalLink,
  FolderUp,
  Home,
  Inbox,
  Library,
  ListFilter,
  LoaderCircle,
  Mail,
  MessageCircle,
  Monitor,
  Moon,
  Music2,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Podcast,
  RefreshCw,
  Rss,
  Search,
  Settings,
  Share2,
  Star,
  Sun,
  Trash2,
  Twitter,
  Youtube,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import BrandMark from './components/BrandMark';
import CategoryFilter from './components/CategoryFilter';
import ConfigPanel from './components/ConfigPanel';
import FeedBuilder from './components/FeedBuilder';
import StateBlock from './components/StateBlock';
import SupportFilter from './components/SupportFilter';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { useFeedComposer } from './hooks/useFeedComposer';
import { useLocalStorage } from './hooks/useLocalStorage';
import type {
  ConfigEntry,
  RouteItem,
  RouteSupportFilter,
  SavedFeed,
} from './types';
import { getConfigHints, mergeConfigEntries } from './utils/configHints';
import {
  FeedPreviewRequestError,
  fetchFeedPreview,
  parseFeedPreviewFromText,
} from './utils/feedPreview';
import {
  FEED_DISPLAY_LIMIT_PRESETS,
  normalizeFeedDisplayLimitSetting,
  resolveFeedDisplayLimit,
  type FeedDisplayLimitSetting,
} from './utils/feedDisplay';
import { fetchRoutesCatalog } from './utils/fetchRoutes';
import {
  buildReaderItemViews,
  filterReaderItems,
  getDefaultReaderItemState,
  getFeedIdentity,
  mergeReaderItems,
  normalizeReaderCollection,
  normalizePreviewItemsForReader,
  type FeedRefreshStatus,
  type FeedIdentity,
  type ReaderCollection,
  type ReaderItem,
  type ReaderItemState,
  type ReaderSourceKind,
  type ReaderItemType,
  type ReaderItemView,
  type ReaderNote,
  type ReaderSection,
} from './utils/reader';
import {
  getRouteSupportSummary,
  matchesSupportFilter,
} from './utils/routeSupport';
import { flattenRoutesCatalog, searchRoutes } from './utils/rsshub';
import {
  buildUrlCandidates,
  discoverFeedsFromWebsite,
  looksLikeHtmlDocument,
  looksLikeUrlInput,
  type DiscoveredFeedCandidate,
} from './utils/feedAutodiscovery';
import {
  buildSourceIconCandidates,
  isDirectFaviconUrl,
  normalizeDomain,
  recordFaviconLookupResult,
} from './utils/sourceIcons';

const DEFAULT_BASE_URL = 'http://localhost:1200';
const DEFAULT_REMOTE_CONFIG_URL = '';
const DEFAULT_SUPPORT_FILTER: RouteSupportFilter = 'ready';
const DEFAULT_READER_SORT_ORDER: ReaderSortOrder = 'newest';
const DEFAULT_READ_LATER_COLLECTION_NAME = 'Read later';
const DEFAULT_THEME_MODE: ThemeMode = 'system';

type ReaderSortOrder = 'newest' | 'oldest';
type ThemeMode = 'system' | 'light' | 'dark';
type DetectedNativeFeedResult = Pick<
  DiscoveredFeedCandidate,
  'url' | 'title' | 'sourceUrl' | 'homeUrl' | 'iconUrl' | 'siteTitle'
> & {
  itemCount: number;
  typeLabel: string;
  statusLabel: string;
};

const READER_SECTIONS = new Set<ReaderSection>([
  'all',
  'feed',
  'collection',
  'unread',
  'starred',
  'notes',
]);

function normalizeRemoteConfigToEntries(payload: unknown): ConfigEntry[] {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return [];
  }

  return Object.entries(payload as Record<string, unknown>)
    .filter(([key]) => key.trim())
    .map(([key, value]) => ({
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value),
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function getTimestampLabel(date: Date = new Date()): string {
  return date.toLocaleString();
}

function findMatchingRoute(
  routes: RouteItem[],
  current?: RouteItem
): RouteItem | undefined {
  if (!current) {
    return undefined;
  }

  return routes.find((route) => route.id === current.id);
}

function formatDateTime(value?: string | number): string {
  if (!value) {
    return 'Just now';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatShortDate(value?: string | number): string {
  if (!value) {
    return 'Now';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function summarizeRouteDescription(route?: RouteItem): string {
  if (!route?.description.trim()) {
    return 'Ready to follow once the required inputs are applied.';
  }

  const normalized = route.description.trim().replace(/\s+/g, ' ');
  return normalized.length <= 140 ? normalized : `${normalized.slice(0, 137)}...`;
}

function getSectionTitle(section: ReaderSection): string {
  if (section === 'unread') {
    return 'Unread';
  }

  if (section === 'feed') {
    return 'Feed';
  }

  if (section === 'collection') {
    return 'Collection';
  }

  if (section === 'starred') {
    return 'Starred';
  }

  if (section === 'notes') {
    return 'Notes';
  }

  if (section === 'filter') {
    return 'Filter';
  }

  if (section === 'library') {
    return 'Library';
  }

  if (section === 'addFeed') {
    return 'Add feed';
  }

  if (section === 'settings') {
    return 'Settings';
  }

  return 'All posts';
}

function getTypeLabel(type: ReaderItemType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function getRouteSourceKind(route?: RouteItem): ReaderSourceKind {
  if (!route) {
    return 'rss';
  }

  return getFeedIdentity({
    label: route.sourceTitle || route.namespace || route.title,
    url: route.docsUrl || route.docExample || route.routePath,
    routeId: route.id,
  }).sourceKind;
}

function getRouteSourceName(route?: RouteItem): string {
  if (!route) {
    return 'RSS';
  }

  return getFeedIdentity({
    label: route.sourceTitle || route.namespace || route.title,
    url: route.docsUrl || route.docExample || route.routePath,
    routeId: route.id,
  }).sourceName;
}

function SourceIcon({
  kind,
  size = 16,
}: {
  kind: ReaderSourceKind;
  size?: number;
}) {
  if (kind === 'youtube') {
    return <Youtube size={size} />;
  }

  if (kind === 'twitter') {
    return <Twitter size={size} />;
  }

  if (kind === 'threads') {
    return <MessageCircle size={size} />;
  }

  if (kind === 'reddit') {
    return <MessageCircle size={size} />;
  }

  if (kind === 'newsletter') {
    return <Mail size={size} />;
  }

  if (kind === 'podcast') {
    return <Podcast size={size} />;
  }

  if (kind === 'audio') {
    return <Music2 size={size} />;
  }

  if (kind === 'mastodon') {
    return <MessageCircle size={size} />;
  }

  return <Rss size={size} />;
}

function SourceAvatar({
  identity,
  iconCandidates = [],
  size = 'default',
}: {
  identity: FeedIdentity;
  iconCandidates?: string[];
  size?: 'default' | 'small' | 'large';
}) {
  const [iconIndex, setIconIndex] = useState(0);
  const activeIcon = iconCandidates[iconIndex];

  return (
    <span
      className={[
        'reader-source-avatar',
        `reader-source-avatar--${identity.sourceKind}`,
        `reader-source-avatar--${size}`,
      ].join(' ')}
      aria-hidden="true"
    >
      {activeIcon ? (
        <img
          src={activeIcon}
          alt=""
          loading="lazy"
          onLoad={() => {
            if (isDirectFaviconUrl(activeIcon)) {
              recordFaviconLookupResult(activeIcon, 'success');
            }
          }}
          onError={() => {
            if (isDirectFaviconUrl(activeIcon)) {
              recordFaviconLookupResult(activeIcon, 'failed');
            }

            setIconIndex((current) => current + 1);
          }}
        />
      ) : (
        <SourceIcon kind={identity.sourceKind} size={size === 'large' ? 22 : 16} />
      )}
    </span>
  );
}

function ReaderItemMedia({
  item,
  identity,
  iconCandidates,
}: {
  item: ReaderItemView;
  identity: FeedIdentity;
  iconCandidates: string[];
}) {
  const [imageFailed, setImageFailed] = useState(false);

  if (item.imageUrl && !imageFailed) {
    return (
      <span className="reader-item-media reader-item-media--image" aria-hidden="true">
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className="reader-item-media reader-item-media--source" aria-hidden="true">
      <SourceAvatar identity={identity} iconCandidates={iconCandidates} />
    </span>
  );
}

function getFeedStatusMessage(status?: FeedRefreshStatus): string {
  if (!status) {
    return 'Not synced yet';
  }

  if (status.status === 'loading') {
    return 'Syncing...';
  }

  if (status.status === 'success') {
    if (status.message) {
      return status.message;
    }

    return status.updatedAt ? `Synced ${formatShortDate(status.updatedAt)}` : 'Synced';
  }

  if (status.status === 'error') {
    return status.message || 'Sync failed';
  }

  return 'Ready';
}

function makeSavedFeed(payload: {
  label: string;
  url: string;
  routeId: string;
  kind?: SavedFeed['kind'];
  homeUrl?: string;
  iconUrl?: string;
  importedText?: string;
  importedContentType?: string;
  fileName?: string;
}): SavedFeed {
  return {
    id: crypto.randomUUID(),
    label: payload.label,
    url: payload.url,
    routeId: payload.routeId,
    kind: payload.kind,
    homeUrl: payload.homeUrl,
    iconUrl: payload.iconUrl,
    importedText: payload.importedText,
    importedContentType: payload.importedContentType,
    fileName: payload.fileName,
    createdAt: Date.now(),
  };
}

function getSystemTheme(): Exclude<ThemeMode, 'system'> {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }

  return 'light';
}

function getResolvedTheme(mode: ThemeMode): Exclude<ThemeMode, 'system'> {
  return mode === 'system' ? getSystemTheme() : mode;
}

function getThemeLabel(mode: ThemeMode): string {
  if (mode === 'light') {
    return 'Light';
  }

  if (mode === 'dark') {
    return 'Night';
  }

  return 'System';
}

function getSourceIconCandidates(
  feed?: Pick<SavedFeed, 'iconUrl' | 'homeUrl' | 'url'>,
  item?: Pick<ReaderItemView, 'link'>
): string[] {
  return buildSourceIconCandidates({
    iconUrl: feed?.iconUrl,
    homeUrl: feed?.homeUrl,
    feedUrl: feed?.url,
    itemUrl: item?.link,
  });
}

export default function App() {
  const [baseUrl] = useLocalStorage<string>('rsshub.baseUrl', DEFAULT_BASE_URL);
  const [savedFeeds, setSavedFeeds] = useLocalStorage<SavedFeed[]>(
    'rsshub.savedFeeds',
    []
  );
  const [readerItems, setReaderItems] = useLocalStorage<ReaderItem[]>(
    'rsshub.readerItems',
    []
  );
  const [readerItemState, setReaderItemState] = useLocalStorage<
    Record<string, ReaderItemState>
  >('rsshub.readerItemState', {});
  const [readerNotes, setReaderNotes] = useLocalStorage<ReaderNote[]>(
    'rsshub.readerNotes',
    []
  );
  const [readerCollections, setReaderCollections] = useLocalStorage<
    ReaderCollection[]
  >('rsshub.readerCollections', []);
  const [themeMode, setThemeMode] = useLocalStorage<ThemeMode>(
    'rsshub.themeMode',
    DEFAULT_THEME_MODE
  );
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useLocalStorage<boolean>(
    'rsshub.readerAutoRefresh',
    true
  );
  const [displayLimitSettings, setDisplayLimitSettings] = useLocalStorage<
    Record<string, FeedDisplayLimitSetting>
  >('rsshub.feedDisplayLimits', {});
  const [readerSortOrders, setReaderSortOrders] = useLocalStorage<
    Record<string, ReaderSortOrder>
  >('rsshub.readerSortOrders', {});
  const [endpointUrl, setEndpointUrl] = useLocalStorage<string>(
    'rsshub.remoteConfigUrl',
    DEFAULT_REMOTE_CONFIG_URL
  );

  const [activeSection, setActiveSection] = useState<ReaderSection>('all');
  const [activeFeedId, setActiveFeedId] = useState<string>();
  const [activeCollectionId, setActiveCollectionId] = useState<string>();
  const [filterContext, setFilterContext] = useState<{
    section: ReaderSection;
    feedId?: string;
    collectionId?: string;
  }>({ section: 'all' });
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteItem | undefined>();
  const [routeQuery, setRouteQuery] = useState('');
  const [readerQuery, setReaderQuery] = useState('');
  const [openFeedOptionsId, setOpenFeedOptionsId] = useState<string>();
  const [activeCategory, setActiveCategory] = useState('');
  const [activeSupportFilter, setActiveSupportFilter] =
    useState<RouteSupportFilter>(DEFAULT_SUPPORT_FILTER);
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const [routeCatalogError, setRouteCatalogError] = useState('');
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(true);
  const [feedStatuses, setFeedStatuses] = useState<Record<string, FeedRefreshStatus>>({});
  const [noteDraft, setNoteDraft] = useState('');
  const [collectionDraft, setCollectionDraft] = useState('');
  const [libraryCollectionDraft, setLibraryCollectionDraft] = useState('');
  const [customLimitDraft, setCustomLimitDraft] = useState('');
  const [nativeAddMessage, setNativeAddMessage] = useState('');
  const [nativeAddError, setNativeAddError] = useState('');
  const [isResolvingNativeFeed, setIsResolvingNativeFeed] = useState(false);
  const [detectedNativeFeed, setDetectedNativeFeed] =
    useState<DetectedNativeFeedResult | null>(null);
  const [discoveredFeedCandidates, setDiscoveredFeedCandidates] = useState<
    DiscoveredFeedCandidate[]
  >([]);

  const [configEntries, setConfigEntries] = useState<ConfigEntry[]>([]);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const [isSavingRemote, setIsSavingRemote] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<string>();
  const [lastSavedAt, setLastSavedAt] = useState<string>();
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const preserveNextDetailOpenRef = useRef(false);
  const previousSectionRef = useRef<ReaderSection>('all');
  const nativeFeedFileInputRef = useRef<HTMLInputElement | null>(null);

  const debouncedRouteQuery = useDebouncedValue(routeQuery, 120);
  const debouncedReaderQuery = useDebouncedValue(readerQuery, 120);

  const composer = useFeedComposer({
    baseUrl,
    route: selectedRoute,
    configEntries,
  });

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = () => {
      root.dataset.theme = getResolvedTheme(themeMode);
    };

    applyTheme();

    if (themeMode !== 'system') {
      return undefined;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', applyTheme);
    return () => {
      media.removeEventListener('change', applyTheme);
    };
  }, [themeMode]);

  useEffect(() => {
    let isMounted = true;

    async function loadRoutes() {
      setIsLoadingRoutes(true);
      setRouteCatalogError('');

      try {
        const catalog = await fetchRoutesCatalog();
        const flattened = flattenRoutesCatalog(catalog);

        if (!isMounted) {
          return;
        }

        setRoutes(flattened);
        setSelectedRoute((current) => findMatchingRoute(flattened, current));
      } catch (unknownError) {
        if (!isMounted) {
          return;
        }

        setRouteCatalogError(
          unknownError instanceof Error
            ? unknownError.message
            : 'Unable to load RSSHub routes.'
        );
      } finally {
        if (isMounted) {
          setIsLoadingRoutes(false);
        }
      }
    }

    void loadRoutes();

    return () => {
      isMounted = false;
    };
  }, []);

  const configHints = useMemo(() => getConfigHints(selectedRoute), [selectedRoute]);

  useEffect(() => {
    setConfigEntries((current) => mergeConfigEntries(current, configHints));
  }, [configHints]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(routes.flatMap((route) => route.categories).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [routes]);

  const supportByRouteId = useMemo(() => {
    return new Map(
      routes.map((route) => [route.id, getRouteSupportSummary(route, configEntries)])
    );
  }, [configEntries, routes]);

  const filteredRoutes = useMemo(() => {
    return searchRoutes(routes, debouncedRouteQuery).filter((route) => {
      if (activeCategory && !route.categories.includes(activeCategory)) {
        return false;
      }

      return matchesSupportFilter(
        supportByRouteId.get(route.id),
        activeSupportFilter
      );
    });
  }, [
    activeCategory,
    activeSupportFilter,
    debouncedRouteQuery,
    routes,
    supportByRouteId,
  ]);

  const selectedRouteSupport = useMemo(
    () => getRouteSupportSummary(selectedRoute, configEntries),
    [configEntries, selectedRoute]
  );

  const readerViews = useMemo(() => {
    return buildReaderItemViews({
      items: readerItems,
      stateById: readerItemState,
      notes: readerNotes,
    });
  }, [readerItemState, readerItems, readerNotes]);

  const normalizedReaderCollections = useMemo(
    () => readerCollections.map((collection) => normalizeReaderCollection(collection)),
    [readerCollections]
  );

  const readerCounts = useMemo(
    () => ({
      all: readerViews.filter((item) => !item.archived).length,
      unread: readerViews.filter((item) => !item.read && !item.archived).length,
      starred: readerViews.filter((item) => item.starred && !item.archived).length,
      notes: readerViews.filter((item) => item.notesCount > 0 && !item.archived).length,
      collections: normalizedReaderCollections.length,
      collectedItems: new Set(
        normalizedReaderCollections.flatMap((collection) => collection.itemIds)
      ).size,
      collectedFeeds: new Set(
        normalizedReaderCollections.flatMap((collection) => collection.feedIds)
      ).size,
    }),
    [normalizedReaderCollections, readerViews]
  );

  const readerCollectionsById = useMemo(
    () =>
      new Map(
        normalizedReaderCollections.map((collection) => [collection.id, collection])
      ),
    [normalizedReaderCollections]
  );

  const savedFeedsById = useMemo(
    () => new Map(savedFeeds.map((feed) => [feed.id, feed])),
    [savedFeeds]
  );
  const activeFeed = activeFeedId ? savedFeedsById.get(activeFeedId) : undefined;
  const activeFeedIdentity = activeFeed ? getFeedIdentity(activeFeed) : undefined;
  const activeCollection = activeCollectionId
    ? readerCollectionsById.get(activeCollectionId)
    : undefined;
  const effectiveFilterSection =
    activeSection === 'filter' ? filterContext.section : activeSection;
  const effectiveFilterFeedId =
    activeSection === 'filter' ? filterContext.feedId : activeFeedId;
  const effectiveFilterCollectionId =
    activeSection === 'filter' ? filterContext.collectionId : activeCollectionId;
  const readerFilterKey =
    effectiveFilterSection === 'feed' && effectiveFilterFeedId
      ? `feed:${effectiveFilterFeedId}`
      : effectiveFilterSection === 'collection' && effectiveFilterCollectionId
        ? `collection:${effectiveFilterCollectionId}`
      : `section:${READER_SECTIONS.has(effectiveFilterSection) ? effectiveFilterSection : 'all'}`;
  const activeDisplayLimitSetting = normalizeFeedDisplayLimitSetting(
    displayLimitSettings[readerFilterKey]
  );
  const activeDisplayLimit = resolveFeedDisplayLimit(activeDisplayLimitSetting);
  const activeSortOrder = readerSortOrders[readerFilterKey] ?? DEFAULT_READER_SORT_ORDER;

  const filteredReaderItems = useMemo(() => {
    const sectionItems =
      activeSection === 'feed'
        ? readerViews.filter((item) => item.feedId === activeFeedId && !item.archived)
        : activeSection === 'collection'
          ? activeCollection
            ? readerViews.filter(
                (item) =>
                  (activeCollection.itemIds.includes(item.id) ||
                    activeCollection.feedIds.includes(item.feedId)) &&
                  !item.archived
              )
            : []
        : READER_SECTIONS.has(activeSection)
          ? filterReaderItems(activeSection, readerViews)
          : readerViews.filter((item) => !item.archived);
    const baseItems = sectionItems;
    const normalizedQuery = debouncedReaderQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return baseItems;
    }

    return baseItems.filter((item) => {
      const haystack = `${item.title} ${item.feedDisplayTitle ?? ''} ${
        item.feedLabel
      } ${item.sourceName ?? ''} ${item.source ?? ''} ${item.summary ?? ''} ${
        item.type
      }`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [
    activeCollection,
    activeFeedId,
    activeSection,
    debouncedReaderQuery,
    readerViews,
  ]);

  const visibleReaderItems = useMemo(() => {
    const sortedItems = [...filteredReaderItems].sort((left, right) => {
      const leftTime = new Date(left.publishedAt ?? left.lastSeenAt).getTime();
      const rightTime = new Date(right.publishedAt ?? right.lastSeenAt).getTime();
      const safeLeft = Number.isNaN(leftTime) ? left.lastSeenAt : leftTime;
      const safeRight = Number.isNaN(rightTime) ? right.lastSeenAt : rightTime;

      return activeSortOrder === 'oldest' ? safeLeft - safeRight : safeRight - safeLeft;
    });

    return activeDisplayLimit ? sortedItems.slice(0, activeDisplayLimit) : sortedItems;
  }, [activeDisplayLimit, activeSortOrder, filteredReaderItems]);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) {
      return undefined;
    }

    return readerViews.find((item) => item.id === selectedItemId);
  }, [readerViews, selectedItemId]);

  const selectedItemNotes = useMemo(
    () =>
      selectedItem
        ? readerNotes.filter((note) => note.itemId === selectedItem.id)
        : [],
    [readerNotes, selectedItem]
  );

  useEffect(() => {
    setSelectedRoute((current) => findMatchingRoute(filteredRoutes, current));
  }, [filteredRoutes]);

  useEffect(() => {
    setNoteDraft('');
    setCollectionDraft('');
  }, [selectedItem?.id]);

  useEffect(() => {
    setCustomLimitDraft(
      activeDisplayLimitSetting.mode === 'custom' &&
        activeDisplayLimitSetting.customLimit
        ? String(activeDisplayLimitSetting.customLimit)
        : ''
    );
  }, [activeDisplayLimitSetting.customLimit, activeDisplayLimitSetting.mode]);

  useEffect(() => {
    if (activeSection === 'feed' && activeFeedId && !savedFeedsById.has(activeFeedId)) {
      setActiveFeedId(undefined);
      setActiveSection('all');
    }
  }, [activeFeedId, activeSection, savedFeedsById]);

  useEffect(() => {
    if (
      activeSection === 'collection' &&
      activeCollectionId &&
      !readerCollectionsById.has(activeCollectionId)
    ) {
      setActiveCollectionId(undefined);
      setActiveSection('all');
    }
  }, [activeCollectionId, activeSection, readerCollectionsById]);

  useEffect(() => {
    setReaderCollections((current) => {
      const changed = current.some(
        (collection) =>
          !Array.isArray(collection.itemIds) || !Array.isArray(collection.feedIds)
      );
      const normalized = current.map((collection) =>
        normalizeReaderCollection(collection)
      );

      return changed ? normalized : current;
    });
  }, [setReaderCollections]);

  useEffect(() => {
    setOpenFeedOptionsId(undefined);
    const previousSection = previousSectionRef.current;
    previousSectionRef.current = activeSection;

    if (preserveNextDetailOpenRef.current) {
      preserveNextDetailOpenRef.current = false;
      return;
    }

    const previousKeepsReaderOpen =
      READER_SECTIONS.has(previousSection) || previousSection === 'library';
    const currentKeepsReaderOpen =
      READER_SECTIONS.has(activeSection) || activeSection === 'library';

    if (previousKeepsReaderOpen && currentKeepsReaderOpen) {
      return;
    }

    setSelectedItemId(undefined);
  }, [activeCollectionId, activeFeedId, activeSection]);

  useEffect(() => {
    const legacyReadLaterIds = readerViews
      .filter((item) => item.readLater && !item.archived)
      .map((item) => item.id);

    if (!legacyReadLaterIds.length) {
      return;
    }

    setReaderCollections((current) => {
      const normalizedCurrent = current.map((collection) =>
        normalizeReaderCollection(collection)
      );
      const existing = normalizedCurrent.find(
        (collection) => collection.name === DEFAULT_READ_LATER_COLLECTION_NAME
      );
      const now = Date.now();
      const currentIds = new Set(existing?.itemIds ?? []);
      let changed = !existing;

      for (const itemId of legacyReadLaterIds) {
        if (!currentIds.has(itemId)) {
          currentIds.add(itemId);
          changed = true;
        }
      }

      if (!changed) {
        return current;
      }

      if (!existing) {
        return [
          {
            id: crypto.randomUUID(),
            name: DEFAULT_READ_LATER_COLLECTION_NAME,
            itemIds: Array.from(currentIds),
            feedIds: [],
            createdAt: now,
            updatedAt: now,
          },
          ...normalizedCurrent,
        ];
      }

      return normalizedCurrent.map((collection) =>
        collection.id === existing.id
          ? {
              ...collection,
              itemIds: Array.from(currentIds),
              updatedAt: now,
            }
          : collection
      );
    });
  }, [readerViews, setReaderCollections]);

  function updateReaderState(itemId: string, patch: Partial<ReaderItemState>) {
    setReaderItemState((current) => {
      const existing = current[itemId] ?? getDefaultReaderItemState();

      return {
        ...current,
        [itemId]: {
          ...existing,
          ...patch,
          updatedAt: Date.now(),
        },
      };
    });
  }

  function handleSelectReaderItem(item: ReaderItemView) {
    setSelectedItemId(item.id);
    updateReaderState(item.id, { read: true });
  }

  function handleSelectRoute(route: RouteItem) {
    setSelectedRoute(route);
    setRouteQuery(route.title);
  }

  function handleOpenFilterMode() {
    setFilterContext({
      section: READER_SECTIONS.has(activeSection) ? activeSection : 'all',
      feedId: activeSection === 'feed' ? activeFeedId : undefined,
      collectionId: activeSection === 'collection' ? activeCollectionId : undefined,
    });
    setActiveSection('filter');
  }

  function setFeedStatus(feedId: string, status: FeedRefreshStatus) {
    setFeedStatuses((current) => ({
      ...current,
      [feedId]: status,
    }));
  }

  async function refreshFeed(feed: SavedFeed) {
    setFeedStatus(feed.id, {
      feedId: feed.id,
      status: 'loading',
      updatedAt: Date.now(),
    });

    try {
      const preview =
        feed.kind === 'file' && feed.importedText
          ? parseFeedPreviewFromText({
              rawText: feed.importedText,
              sourceUrl: feed.url,
              contentType: feed.importedContentType,
            })
          : await fetchFeedPreview(feed.url);
      const hydratedFeed: SavedFeed = {
        ...feed,
        label: preview.snapshot.feedTitle?.trim() || feed.label,
        homeUrl: preview.snapshot.homeUrl || feed.homeUrl,
        iconUrl: preview.snapshot.feedImageUrl || feed.iconUrl,
      };
      const normalizedItems = normalizePreviewItemsForReader(
        hydratedFeed,
        preview.snapshot.items
      );

      setSavedFeeds((current) =>
        current.map((currentFeed) =>
          currentFeed.id === feed.id
            ? hydratedFeed
            : currentFeed
        )
      );

      if (normalizedItems.length) {
        setReaderItems((current) => mergeReaderItems(current, normalizedItems));
        setFeedStatus(feed.id, {
          feedId: feed.id,
          status: 'success',
          updatedAt: Date.now(),
        });
        return;
      }

      setFeedStatus(feed.id, {
        feedId: feed.id,
        status: preview.state === 'empty' ? 'success' : 'error',
        message:
          preview.state === 'empty'
            ? 'No items yet'
            : preview.note || 'Preview unavailable. Open the raw feed to inspect it.',
        updatedAt: Date.now(),
      });
    } catch (unknownError) {
      const message =
        unknownError instanceof FeedPreviewRequestError
          ? unknownError.message
          : unknownError instanceof Error
            ? unknownError.message
            : 'Unable to sync this feed.';

      setFeedStatus(feed.id, {
        feedId: feed.id,
        status: 'error',
        message,
        updatedAt: Date.now(),
      });
    }
  }

  async function refreshAllFeeds() {
    if (!savedFeeds.length) {
      return;
    }

    for (const feed of savedFeeds) {
      await refreshFeed(feed);
    }
  }

  useEffect(() => {
    if (!autoRefreshEnabled || !savedFeeds.length) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void refreshAllFeeds();
    }, 5 * 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoRefreshEnabled, savedFeeds]);

  async function handleFollowCurrentFeed() {
    if (!selectedRoute || !composer.feedUrl || !composer.hasAppliedValues) {
      return;
    }

    const proposedIdentity = getFeedIdentity({
      label: selectedRoute.title,
      url: composer.feedUrl,
      routeId: selectedRoute.id,
    });
    const existingFeed = savedFeeds.find((feed) => feed.url === composer.feedUrl);
    const feed =
      existingFeed ??
      makeSavedFeed({
        label: proposedIdentity.title,
        url: composer.feedUrl,
        routeId: selectedRoute.id,
        kind: 'rsshub',
      });

    if (!existingFeed) {
      setSavedFeeds((current) => [feed, ...current]);
    }

    setActiveFeedId(feed.id);
    setActiveCollectionId(undefined);
    setActiveSection('feed');
    await refreshFeed(feed);
  }

  function handleDeleteFeed(feedId: string) {
    const deletedItemIds = new Set(
      readerItems.filter((item) => item.feedId === feedId).map((item) => item.id)
    );

    setSavedFeeds((current) => current.filter((feed) => feed.id !== feedId));
    setReaderItems((current) => current.filter((item) => item.feedId !== feedId));
    setReaderItemState((current) => {
      const next = { ...current };
      for (const itemId of deletedItemIds) {
        delete next[itemId];
      }
      return next;
    });
    setReaderCollections((current) =>
      current.map((collection) => {
        const normalizedCollection = normalizeReaderCollection(collection);

        return {
          ...normalizedCollection,
          itemIds: normalizedCollection.itemIds.filter(
            (itemId) => !deletedItemIds.has(itemId)
          ),
          feedIds: normalizedCollection.feedIds.filter(
            (currentFeedId) => currentFeedId !== feedId
          ),
          updatedAt: Date.now(),
        };
      })
    );
    setFeedStatuses((current) => {
      const next = { ...current };
      delete next[feedId];
      return next;
    });

    if (activeFeedId === feedId) {
      setActiveFeedId(undefined);
      setActiveSection('library');
    }

    if (selectedItemId && deletedItemIds.has(selectedItemId)) {
      setSelectedItemId(undefined);
    }
  }

  function handleAddNote() {
    if (!selectedItem || !noteDraft.trim()) {
      return;
    }

    const now = Date.now();
    setReaderNotes((current) => [
      {
        id: crypto.randomUUID(),
        itemId: selectedItem.id,
        text: noteDraft.trim(),
        createdAt: now,
        updatedAt: now,
      },
      ...current,
    ]);
    setNoteDraft('');
  }

  function handleDeleteNote(noteId: string) {
    setReaderNotes((current) => current.filter((note) => note.id !== noteId));
  }

  function getCollectionsForItem(itemId: string): ReaderCollection[] {
    return normalizedReaderCollections.filter((collection) =>
      collection.itemIds.includes(itemId)
    );
  }

  function getCollectionsForFeed(feedId: string): ReaderCollection[] {
    return normalizedReaderCollections.filter((collection) =>
      collection.feedIds.includes(feedId)
    );
  }

  function handleToggleItemCollection(collectionId: string, itemId: string) {
    setReaderCollections((current) =>
      current.map((collection) => {
        const normalizedCollection = normalizeReaderCollection(collection);

        if (normalizedCollection.id !== collectionId) {
          return normalizedCollection;
        }

        const isMember = normalizedCollection.itemIds.includes(itemId);
        return {
          ...normalizedCollection,
          itemIds: isMember
            ? normalizedCollection.itemIds.filter(
                (currentItemId) => currentItemId !== itemId
              )
            : [...normalizedCollection.itemIds, itemId],
          updatedAt: Date.now(),
        };
      })
    );
  }

  function handleToggleFeedCollection(collectionId: string, feedId: string) {
    setReaderCollections((current) =>
      current.map((collection) => {
        const normalizedCollection = normalizeReaderCollection(collection);

        if (normalizedCollection.id !== collectionId) {
          return normalizedCollection;
        }

        const isMember = normalizedCollection.feedIds.includes(feedId);
        return {
          ...normalizedCollection,
          feedIds: isMember
            ? normalizedCollection.feedIds.filter(
                (currentFeedId) => currentFeedId !== feedId
              )
            : [...normalizedCollection.feedIds, feedId],
          updatedAt: Date.now(),
        };
      })
    );
  }

  function handleCreateCollection(options: {
    name: string;
    itemId?: string;
    feedId?: string;
  }) {
    const name = options.name.trim();
    if (!name) {
      return;
    }

    const now = Date.now();
    setReaderCollections((current) => {
      const normalizedCurrent = current.map((collection) =>
        normalizeReaderCollection(collection)
      );
      const existing = normalizedCurrent.find(
        (collection) => collection.name.toLowerCase() === name.toLowerCase()
      );

      if (existing) {
        return normalizedCurrent.map((collection) =>
          collection.id === existing.id
            ? {
                ...collection,
                itemIds:
                  options.itemId && !collection.itemIds.includes(options.itemId)
                    ? [...collection.itemIds, options.itemId]
                    : collection.itemIds,
                feedIds:
                  options.feedId && !collection.feedIds.includes(options.feedId)
                    ? [...collection.feedIds, options.feedId]
                    : collection.feedIds,
                updatedAt: now,
              }
            : collection
        );
      }

      return [
        ...normalizedCurrent,
        {
          id: crypto.randomUUID(),
          name,
          itemIds: options.itemId ? [options.itemId] : [],
          feedIds: options.feedId ? [options.feedId] : [],
          createdAt: now,
          updatedAt: now,
        },
      ];
    });
  }

  function handleCreateCollectionForSelectedItem() {
    if (!selectedItem || !collectionDraft.trim()) {
      return;
    }

    handleCreateCollection({
      name: collectionDraft,
      itemId: selectedItem.id,
    });
    setCollectionDraft('');
  }

  function handleCreateLibraryCollection() {
    if (!libraryCollectionDraft.trim()) {
      return;
    }

    handleCreateCollection({ name: libraryCollectionDraft });
    setLibraryCollectionDraft('');
  }

  function handleDeleteCollection(collectionId: string) {
    setReaderCollections((current) =>
      current
        .map((collection) => normalizeReaderCollection(collection))
        .filter((collection) => collection.id !== collectionId)
    );

    if (activeCollectionId === collectionId) {
      setActiveCollectionId(undefined);
      setActiveSection('all');
    }
  }

  function handleOpenPostForNote(note: ReaderNote) {
    const item = readerViews.find((candidate) => candidate.id === note.itemId);

    if (!item) {
      return;
    }

    preserveNextDetailOpenRef.current = true;
    setActiveFeedId(undefined);
    setActiveCollectionId(undefined);
    setActiveSection('all');
    handleSelectReaderItem(item);
  }

  async function handleCopyItemLink(item: ReaderItemView) {
    await navigator.clipboard.writeText(item.link || item.feedUrl);
  }

  function markItemsAsRead(items: ReaderItemView[]) {
    if (!items.length) {
      return;
    }

    setReaderItemState((current) => {
      const next = { ...current };

      for (const item of items) {
        const existing = next[item.id] ?? getDefaultReaderItemState();
        next[item.id] = {
          ...existing,
          read: true,
          updatedAt: Date.now(),
        };
      }

      return next;
    });
  }

  function handleMarkFeedAsRead(feedId: string) {
    markItemsAsRead(
      readerViews.filter((item) => item.feedId === feedId && !item.archived)
    );
  }

  function handleMarkAllAsRead() {
    markItemsAsRead(readerViews.filter((item) => !item.archived));
  }

  async function handleShareFeed(feed: SavedFeed) {
    const identity = getFeedIdentity(feed);

    if ('share' in navigator && typeof navigator.share === 'function') {
      await navigator.share({
        title: identity.subtitle,
        text: identity.subtitle,
        url: feed.url,
      });
      return;
    }

    await navigator.clipboard.writeText(`${identity.subtitle}\n${feed.url}`);
  }

  function getNativeFeedLabel(
    candidate: Pick<
      DetectedNativeFeedResult | DiscoveredFeedCandidate,
      'url' | 'title' | 'homeUrl' | 'sourceUrl'
    >
  ): string {
    return (
      candidate.title?.trim() ||
      normalizeDomain(candidate.homeUrl || candidate.sourceUrl || candidate.url)?.replace(
        /\.[^.]+$/,
        ''
      ) ||
      'Imported feed'
    );
  }

  function getDetectedFeedTypeLabel(contentType?: string, fallback = 'RSS'): string {
    const normalized = contentType?.toLowerCase() ?? '';

    if (normalized.includes('feed+json') || normalized.includes('json')) {
      return 'JSON Feed';
    }

    if (normalized.includes('atom')) {
      return 'Atom';
    }

    if (normalized.includes('rss') || normalized.includes('xml')) {
      return 'RSS';
    }

    return fallback;
  }

  async function buildDetectedNativeFeedResult(
    candidate: Pick<
      DiscoveredFeedCandidate,
      'url' | 'title' | 'homeUrl' | 'iconUrl' | 'sourceUrl' | 'siteTitle' | 'type'
    >
  ): Promise<DetectedNativeFeedResult> {
    const preview = await fetchFeedPreview(candidate.url);
    const isHtmlResponse = looksLikeHtmlDocument(preview.rawText, preview.contentType);

    if (isHtmlResponse || preview.state === 'parse_failed') {
      throw new Error(preview.note || 'This URL did not return a readable feed.');
    }

    return {
      url: new URL(candidate.url).toString(),
      title: preview.snapshot.feedTitle?.trim() || getNativeFeedLabel(candidate),
      sourceUrl: candidate.sourceUrl,
      homeUrl: preview.snapshot.homeUrl || candidate.homeUrl || candidate.sourceUrl,
      iconUrl: preview.snapshot.feedImageUrl || candidate.iconUrl,
      siteTitle: candidate.siteTitle,
      itemCount: preview.snapshot.totalItems,
      typeLabel: getDetectedFeedTypeLabel(preview.contentType, candidate.type || 'RSS'),
      statusLabel: preview.snapshot.totalItems
        ? `${preview.snapshot.totalItems} item${
            preview.snapshot.totalItems === 1 ? '' : 's'
          } detected`
        : 'Feed detected',
    };
  }

  async function saveResolvedNativeFeed(
    candidate: Pick<
      DetectedNativeFeedResult,
      'url' | 'title' | 'homeUrl' | 'iconUrl' | 'sourceUrl'
    >,
    successMessage = 'Feed added to your library.'
  ) {
    const normalizedUrl = new URL(candidate.url).toString();
    const existingFeed = savedFeeds.find((feed) => feed.url === normalizedUrl);
    const label = getNativeFeedLabel(candidate);

    const nextFeed = existingFeed
      ? {
          ...existingFeed,
          label: existingFeed.label || label,
          homeUrl: existingFeed.homeUrl || candidate.homeUrl,
          iconUrl: existingFeed.iconUrl || candidate.iconUrl,
        }
      : makeSavedFeed({
          label,
          url: normalizedUrl,
          routeId: 'native:rss',
          kind: 'native',
          homeUrl: candidate.homeUrl,
          iconUrl: candidate.iconUrl,
        });

    if (existingFeed) {
      setSavedFeeds((current) =>
        current.map((feed) => (feed.id === nextFeed.id ? nextFeed : feed))
      );
    } else {
      setSavedFeeds((current) => [nextFeed, ...current]);
    }

    setNativeAddError('');
    setNativeAddMessage(successMessage);
    setDetectedNativeFeed(null);
    setDiscoveredFeedCandidates([]);
    setRouteQuery('');
    setActiveFeedId(nextFeed.id);
    setActiveCollectionId(undefined);
    setActiveSection('feed');
    await refreshFeed(nextFeed);
  }

  async function handleChooseDiscoveredFeed(candidate: DiscoveredFeedCandidate) {
    setIsResolvingNativeFeed(true);

    try {
      const detectedFeed = await buildDetectedNativeFeedResult(candidate);
      setDetectedNativeFeed(detectedFeed);
      setNativeAddError('');
      setNativeAddMessage('Detected feed ready to add.');
      setDiscoveredFeedCandidates([]);
    } catch (unknownError) {
      setDetectedNativeFeed(null);
      setNativeAddMessage('');
      setNativeAddError(
        unknownError instanceof Error
          ? unknownError.message
          : 'Unable to read the discovered feed.'
      );
    } finally {
      setIsResolvingNativeFeed(false);
    }
  }

  async function handleSaveDetectedNativeFeed() {
    if (!detectedNativeFeed) {
      return;
    }

    await saveResolvedNativeFeed(detectedNativeFeed);
  }

  async function handleResolveAddFeedInput() {
    const trimmedInput = routeQuery.trim();

    if (!trimmedInput) {
      setNativeAddError('Enter a search term or website/feed URL first.');
      setNativeAddMessage('');
      setDetectedNativeFeed(null);
      setDiscoveredFeedCandidates([]);
      return;
    }

    if (!looksLikeUrlInput(trimmedInput)) {
      setNativeAddError('');
      setNativeAddMessage('');
      setDetectedNativeFeed(null);
      setDiscoveredFeedCandidates([]);
      return;
    }

    const urlCandidates = buildUrlCandidates(trimmedInput);

    if (!urlCandidates.length) {
      setNativeAddError('Enter a valid website or feed URL.');
      setNativeAddMessage('');
      setDetectedNativeFeed(null);
      setDiscoveredFeedCandidates([]);
      return;
    }

    setIsResolvingNativeFeed(true);
    setNativeAddError('');
    setNativeAddMessage('');
    setDetectedNativeFeed(null);
    setDiscoveredFeedCandidates([]);

    try {
      let lastError =
        'Unable to detect a feed from this input. Try a direct feed URL or a page with standard RSS links.';

      for (const candidateUrl of urlCandidates) {
        try {
          const preview = await fetchFeedPreview(candidateUrl);
          const isHtmlResponse = looksLikeHtmlDocument(
            preview.rawText,
            preview.contentType
          );

          if (!isHtmlResponse && preview.state !== 'parse_failed') {
            setDetectedNativeFeed({
              url: candidateUrl,
              title:
                preview.snapshot.feedTitle?.trim() ||
                getNativeFeedLabel({
                  url: candidateUrl,
                  title: candidateUrl,
                  sourceUrl: candidateUrl,
                  homeUrl: preview.snapshot.homeUrl || candidateUrl,
                }),
              sourceUrl: candidateUrl,
              homeUrl: preview.snapshot.homeUrl || candidateUrl,
              iconUrl: preview.snapshot.feedImageUrl,
              siteTitle: preview.snapshot.feedTitle,
              itemCount: preview.snapshot.totalItems,
              typeLabel: getDetectedFeedTypeLabel(preview.contentType),
              statusLabel: preview.snapshot.totalItems
                ? `${preview.snapshot.totalItems} item${
                    preview.snapshot.totalItems === 1 ? '' : 's'
                  } detected`
                : 'Feed detected',
            });
            setNativeAddMessage('Detected feed ready to add.');
            return;
          }

          const discovery = await discoverFeedsFromWebsite(candidateUrl);

          if (!discovery.isHtml) {
            lastError = preview.note || 'This URL did not return a readable feed.';
            continue;
          }

          if (!discovery.candidates.length) {
            lastError = preview.note || 'No RSS or Atom feeds were found on this page.';
            continue;
          }

          if (discovery.candidates.length === 1) {
            const detectedFeed = await buildDetectedNativeFeedResult(
              discovery.candidates[0]
            );
            setDetectedNativeFeed(detectedFeed);
            setNativeAddMessage('Detected feed ready to add.');
            return;
          }

          setDiscoveredFeedCandidates(discovery.candidates);
          setNativeAddMessage(
            `Found ${discovery.candidates.length} feeds on this page. Choose one to preview.`
          );
          return;
        } catch (unknownError) {
          try {
            const discovery = await discoverFeedsFromWebsite(candidateUrl);

            if (!discovery.isHtml) {
              lastError =
                unknownError instanceof Error
                  ? unknownError.message
                  : 'Unable to read this URL.';
              continue;
            }

            if (!discovery.candidates.length) {
              lastError = 'No RSS or Atom feeds were found on this page.';
              continue;
            }

            if (discovery.candidates.length === 1) {
              const detectedFeed = await buildDetectedNativeFeedResult(
                discovery.candidates[0]
              );
              setDetectedNativeFeed(detectedFeed);
              setNativeAddMessage('Detected feed ready to add.');
              return;
            }

            setDiscoveredFeedCandidates(discovery.candidates);
            setNativeAddMessage(
              `Found ${discovery.candidates.length} feeds on this page. Choose one to preview.`
            );
            return;
          } catch (discoveryError) {
            lastError =
              discoveryError instanceof Error
                ? discoveryError.message
                : unknownError instanceof Error
                  ? unknownError.message
                  : lastError;
          }
        }
      }

      setNativeAddError(lastError);
      setNativeAddMessage('');
      setDetectedNativeFeed(null);
      setDiscoveredFeedCandidates([]);
    } finally {
      setIsResolvingNativeFeed(false);
    }
  }

  async function handleImportNativeFeedFile(file: File) {
    try {
      const rawText = await file.text();
      const sourceUrl = `file://${file.name}`;
      const preview = parseFeedPreviewFromText({
        rawText,
        sourceUrl,
        contentType: file.type || 'application/xml',
      });

      if (preview.state === 'parse_failed') {
        throw new Error(
          preview.note || 'Unable to import this file as RSS, Atom, or JSON Feed.'
        );
      }

      const label =
        preview.snapshot.feedTitle?.trim() ||
        file.name.replace(/\.[a-z0-9]+$/i, '') ||
        'Imported file';
      const feed = makeSavedFeed({
        label,
        url: sourceUrl,
        routeId: 'native:file',
        kind: 'file',
        homeUrl: preview.snapshot.homeUrl,
        iconUrl: preview.snapshot.feedImageUrl,
        importedText: rawText,
        importedContentType: file.type || 'application/xml',
        fileName: file.name,
      });

      setSavedFeeds((current) => [feed, ...current]);
      setNativeAddError('');
      setNativeAddMessage(`${file.name} imported.`);
      setDetectedNativeFeed(null);
      setDiscoveredFeedCandidates([]);
      setRouteQuery('');
      setActiveFeedId(feed.id);
      setActiveCollectionId(undefined);
      setActiveSection('feed');
      await refreshFeed(feed);
    } catch (unknownError) {
      setNativeAddError(
        unknownError instanceof Error
          ? unknownError.message
          : 'Unable to import this feed file.'
      );
      setNativeAddMessage('');
      setDetectedNativeFeed(null);
      setDiscoveredFeedCandidates([]);
    }
  }

  function handleSaveDisplayLimit(setting: FeedDisplayLimitSetting) {
    setDisplayLimitSettings((current) => ({
      ...current,
      [readerFilterKey]: normalizeFeedDisplayLimitSetting(setting),
    }));
  }

  function handleSaveSortOrder(sortOrder: ReaderSortOrder) {
    setReaderSortOrders((current) => ({
      ...current,
      [readerFilterKey]: sortOrder,
    }));
  }

  async function handleLoadRemote() {
    if (!endpointUrl.trim()) {
      setErrorMessage('Enter a remote config endpoint first.');
      setStatusMessage('');
      return;
    }

    setIsLoadingRemote(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const response = await fetch(endpointUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load remote config: ${response.status}`);
      }

      const payload = (await response.json()) as unknown;
      const remoteEntries = normalizeRemoteConfigToEntries(payload);
      const mergedEntries = mergeConfigEntries(remoteEntries, configHints);

      setConfigEntries(mergedEntries);
      setLastLoadedAt(getTimestampLabel());
      setStatusMessage('Loaded remote config successfully.');
    } catch (unknownError) {
      setErrorMessage(
        unknownError instanceof Error
          ? unknownError.message
          : 'Unable to load remote config.'
      );
    } finally {
      setIsLoadingRemote(false);
    }
  }

  async function handleSaveRemote() {
    if (!endpointUrl.trim()) {
      setErrorMessage('Enter a remote config endpoint first.');
      setStatusMessage('');
      return;
    }

    setIsSavingRemote(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const payload = Object.fromEntries(
        configEntries
          .filter((entry) => entry.key.trim())
          .map((entry) => [entry.key.trim(), entry.value])
      );

      const response = await fetch(endpointUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload, null, 2),
      });

      if (!response.ok) {
        throw new Error(`Failed to save remote config: ${response.status}`);
      }

      setLastSavedAt(getTimestampLabel());
      setStatusMessage(
        'Saved remote config successfully. Restart RSSHub if required for changes to take effect.'
      );
    } catch (unknownError) {
      setErrorMessage(
        unknownError instanceof Error
          ? unknownError.message
          : 'Unable to save remote config.'
      );
    } finally {
      setIsSavingRemote(false);
    }
  }

  const railItems: Array<{
    id: ReaderSection;
    label: string;
    icon: typeof Home;
  }> = [
    { id: 'all', label: 'Home', icon: Home },
    { id: 'addFeed', label: 'Add feed', icon: Plus },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const readerNavItems: Array<{
    id: ReaderSection;
    label: string;
    icon: typeof Home;
    count?: number;
  }> = [
    { id: 'all', label: 'All posts', icon: Inbox, count: readerCounts.all },
    { id: 'unread', label: 'Unread', icon: Bell, count: readerCounts.unread },
    { id: 'starred', label: 'Starred', icon: Star, count: readerCounts.starred },
    { id: 'notes', label: 'Notes', icon: NotebookPen, count: readerCounts.notes },
  ];

  function renderArticleList() {
    const title =
      activeSection === 'feed' && activeFeedIdentity
        ? activeFeedIdentity.title
        : activeSection === 'collection' && activeCollection
          ? activeCollection.name
        : getSectionTitle(activeSection);
    const description =
      activeSection === 'feed' && activeFeedIdentity
        ? `${activeFeedIdentity.sourceName} feed`
        : activeSection === 'collection' && activeCollection
          ? `${filteredReaderItems.length} saved item${
              filteredReaderItems.length === 1 ? '' : 's'
            } in this collection`
        : `${filteredReaderItems.length} item${
            filteredReaderItems.length === 1 ? '' : 's'
          } in this view`;
    const activeFeedStatus = activeFeed ? feedStatuses[activeFeed.id] : undefined;

    return (
      <section className="reader-main-panel">
        <header className="reader-content-header">
          <div>
            <span className="reader-kicker">Live feed</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>

          <div className="reader-header-actions">
            <button
              type="button"
              className="reader-button"
              onClick={handleOpenFilterMode}
            >
              <ListFilter size={15} />
              <span>Filter</span>
            </button>

            <button
              type="button"
              className="reader-button"
              onClick={() => setAutoRefreshEnabled((current) => !current)}
            >
              <RefreshCw size={15} />
              <span>Auto {autoRefreshEnabled ? 'on' : 'off'}</span>
            </button>

            <button
              type="button"
              className="reader-button"
              onClick={() => {
                setActiveFeedId(undefined);
                setActiveCollectionId(undefined);
                setActiveSection('addFeed');
              }}
            >
              <Plus size={15} />
              <span>Add feed</span>
            </button>
          </div>
        </header>

        <div className="reader-list-toolbar">
          <div className="reader-search">
            <Search size={15} />
            <input
              value={readerQuery}
              onChange={(event) => setReaderQuery(event.target.value)}
              placeholder="Search posts, sources, notes..."
            />
          </div>
          <span className="reader-muted">
            Showing {visibleReaderItems.length} of {filteredReaderItems.length} item
            {filteredReaderItems.length === 1 ? '' : 's'}
          </span>
        </div>

        {visibleReaderItems.length ? (
          <div className="reader-item-list" role="list" aria-label="Reader items">
            {visibleReaderItems.map((item) => {
              const feedForItem = savedFeedsById.get(item.feedId);
              const identity = getFeedIdentity(
                feedForItem ?? {
                  label: item.feedDisplayTitle || item.feedLabel,
                  url: item.feedUrl,
                  routeId: item.routeId || '',
                }
              );
              const iconCandidates = getSourceIconCandidates(feedForItem, item);
              const itemCollections = getCollectionsForItem(item.id);

              return (
                <article
                  key={item.id}
                  className={[
                    'reader-item-row',
                    selectedItem?.id === item.id ? 'active' : '',
                    item.read ? 'read' : 'unread',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role="listitem"
                >
                  <button
                    type="button"
                    className="reader-item-select"
                    onClick={() => handleSelectReaderItem(item)}
                  >
                    <span className="reader-unread-dot" aria-hidden="true" />
                    <ReaderItemMedia
                      item={item}
                      identity={identity}
                      iconCandidates={iconCandidates}
                    />
                    <div className="reader-item-copy">
                      <div className="reader-item-meta">
                        <span className="reader-source-chip">{identity.title}</span>
                        <span>{identity.sourceName}</span>
                        <span>{formatShortDate(item.publishedAt || item.lastSeenAt)}</span>
                        <span className={`reader-type reader-type--${item.type}`}>
                          {getTypeLabel(item.type)}
                        </span>
                      </div>
                      <h3>{item.title}</h3>
                      {item.description || item.summary ? (
                        <p>{item.description || item.summary}</p>
                      ) : null}
                      <div className="reader-item-indicators">
                        {item.notesCount ? <span>{item.notesCount} note</span> : null}
                        {itemCollections.length ? (
                          <span>
                            {itemCollections.length} collection
                            {itemCollections.length === 1 ? '' : 's'}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>

                  <div className="reader-row-actions">
                    <button
                      type="button"
                      className={`reader-icon-button ${item.starred ? 'active' : ''}`}
                      onClick={() => updateReaderState(item.id, { starred: !item.starred })}
                      aria-label={item.starred ? 'Unstar item' : 'Star item'}
                    >
                      <Star size={15} />
                    </button>
                    <button
                      type="button"
                      className="reader-icon-button"
                      onClick={() => updateReaderState(item.id, { read: !item.read })}
                      aria-label={item.read ? 'Mark unread' : 'Mark read'}
                    >
                      <Check size={15} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : activeFeed && activeFeedStatus?.status === 'error' ? (
          <StateBlock
            compact
            variant="error"
            title="Feed preview unavailable"
            message={activeFeedStatus.message || 'This feed could not be read in-page.'}
            action={
              <div className="reader-header-actions">
                <a
                  className="reader-button"
                  href={activeFeed.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={15} />
                  <span>Open raw feed</span>
                </a>
                <button
                  type="button"
                  className="reader-button reader-button--primary"
                  onClick={() => void refreshFeed(activeFeed)}
                >
                  <RefreshCw size={15} />
                  <span>Try live fetch</span>
                </button>
              </div>
            }
          />
        ) : (
          <StateBlock
            compact
            title="No posts here yet"
            message="Follow a feed from Add feed, refresh your library, or switch filters."
            action={
              <button
                type="button"
                className="reader-button reader-button--primary"
                onClick={() => {
                  setActiveFeedId(undefined);
                  setActiveCollectionId(undefined);
                  setActiveSection('addFeed');
                }}
              >
                <Plus size={15} />
                <span>Add feed</span>
              </button>
            }
          />
        )}
      </section>
    );
  }

  function renderAddFeed() {
    const topRoutes = filteredRoutes.slice(0, 8);
    const isUrlLikeQuery = looksLikeUrlInput(routeQuery.trim());
    const detectedNativeIdentity = detectedNativeFeed
      ? getFeedIdentity({
          label: detectedNativeFeed.title,
          url: detectedNativeFeed.homeUrl || detectedNativeFeed.url,
          routeId: 'native:rss',
        })
      : undefined;
    const detectedNativeIcons = detectedNativeFeed
      ? buildSourceIconCandidates({
          iconUrl: detectedNativeFeed.iconUrl,
          homeUrl: detectedNativeFeed.homeUrl,
          feedUrl: detectedNativeFeed.url,
        })
      : [];

    return (
      <section className="reader-main-panel reader-add-feed">
        <header className="reader-add-hero">
          <span className="reader-kicker">Add feed</span>
          <h2>Add a feed</h2>
          <p>Search RSSHub routes or paste a feed/website URL from one compact input.</p>
          <div className="reader-add-input-row">
            <div className="reader-search reader-search--add-feed">
              <Search size={16} />
              <input
                value={routeQuery}
                onChange={(event) => {
                  setRouteQuery(event.target.value);
                  setNativeAddError('');
                  setNativeAddMessage('');
                  setDetectedNativeFeed(null);
                  setDiscoveredFeedCandidates([]);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && looksLikeUrlInput(routeQuery.trim())) {
                    event.preventDefault();
                    void handleResolveAddFeedInput();
                  }
                }}
                placeholder="Search RSSHub routes or paste a feed/website URL"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {isUrlLikeQuery ? (
              <button
                type="button"
                className="reader-button reader-button--primary"
                onClick={() => void handleResolveAddFeedInput()}
                disabled={isResolvingNativeFeed}
              >
                {isResolvingNativeFeed ? (
                  <LoaderCircle size={15} className="spin" />
                ) : (
                  <Rss size={15} />
                )}
                <span>{isResolvingNativeFeed ? 'Resolving...' : 'Detect feed'}</span>
              </button>
            ) : null}

            <input
              ref={nativeFeedFileInputRef}
              className="hidden-input"
              type="file"
              accept=".xml,.rss,.atom,.json,.txt"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImportNativeFeedFile(file);
                }

                event.target.value = '';
              }}
            />
            <button
              type="button"
              className="reader-button"
              onClick={() => nativeFeedFileInputRef.current?.click()}
            >
              <FolderUp size={15} />
              <span>Import file</span>
            </button>
          </div>
          <p className="reader-inline-note">
            Route filters below affect only RSSHub matches. Website URLs use standard
            RSS/Atom autodiscovery when needed.
          </p>
        </header>

        {routeCatalogError ? (
          <StateBlock
            compact
            variant="error"
            title="Route catalog unavailable"
            message={routeCatalogError}
          />
        ) : null}

        {isResolvingNativeFeed ? (
          <StateBlock
            compact
            variant="loading"
            title="Resolving native feed"
            message="Trying a direct feed request first, then checking website autodiscovery links if needed."
          />
        ) : null}

        {nativeAddError ? (
          <StateBlock
            compact
            variant="error"
            title="Native feed unavailable"
            message={nativeAddError}
          />
        ) : null}

        {detectedNativeFeed ? (
          <section className="reader-follow-card reader-native-result-card">
            <div className="reader-section-title">
              <h3>Detected native feed</h3>
              <span>{detectedNativeFeed.typeLabel}</span>
            </div>
            <div className="reader-follow-card-main">
              {detectedNativeIdentity ? (
                <SourceAvatar
                  identity={detectedNativeIdentity}
                  iconCandidates={detectedNativeIcons}
                  size="large"
                />
              ) : null}
              <div>
                <strong>{normalizeDomain(detectedNativeFeed.homeUrl || detectedNativeFeed.url) || 'Native feed'}</strong>
                <h3>{detectedNativeFeed.title}</h3>
                <p>{detectedNativeFeed.url}</p>
              </div>
            </div>
            <div className="reader-feed-card-meta">
              <span>{detectedNativeFeed.statusLabel}</span>
              {detectedNativeFeed.siteTitle ? <span>{detectedNativeFeed.siteTitle}</span> : null}
              <span>{detectedNativeFeed.typeLabel}</span>
            </div>
            <div className="reader-native-actions">
              <button
                type="button"
                className="reader-button reader-button--primary"
                onClick={() => void handleSaveDetectedNativeFeed()}
              >
                <Plus size={15} />
                <span>Add feed</span>
              </button>
              <a
                className="reader-button"
                href={detectedNativeFeed.url}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={15} />
                <span>Open feed</span>
              </a>
            </div>
          </section>
        ) : null}

        {nativeAddMessage && !detectedNativeFeed && !nativeAddError ? (
          <p className="reader-inline-success">{nativeAddMessage}</p>
        ) : null}

        {discoveredFeedCandidates.length ? (
          <section className="reader-follow-card reader-native-result-card">
            <div className="reader-section-title">
              <h3>Native feed matches</h3>
              <span>{discoveredFeedCandidates.length} discovered</span>
            </div>
            <div className="reader-discovery-list" role="list">
              {discoveredFeedCandidates.map((candidate) => {
                const identity = getFeedIdentity({
                  label: candidate.title,
                  url: candidate.homeUrl || candidate.url,
                  routeId: 'native:rss',
                });
                const iconCandidates = buildSourceIconCandidates({
                  iconUrl: candidate.iconUrl,
                  homeUrl: candidate.homeUrl,
                  feedUrl: candidate.url,
                });

                return (
                  <button
                    key={candidate.url}
                    type="button"
                    className="reader-discovery-option"
                    onClick={() => void handleChooseDiscoveredFeed(candidate)}
                    disabled={isResolvingNativeFeed}
                    role="listitem"
                  >
                    <SourceAvatar
                      identity={identity}
                      iconCandidates={iconCandidates}
                      size="small"
                    />
                    <div className="reader-discovery-copy">
                      <strong>{candidate.title}</strong>
                      <span>
                        {candidate.type}
                        {candidate.siteTitle ? ` / ${candidate.siteTitle}` : ''}
                      </span>
                      <p>{candidate.url}</p>
                    </div>
                    <span className="reader-discovery-action">Preview</span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {selectedRoute ? (
          <section className="reader-follow-card">
            <div className="reader-section-title">
              <h3>Selected route</h3>
              <span>{selectedRoute.routePath}</span>
            </div>

            <FeedBuilder
              route={selectedRoute}
              composer={composer}
              supportSummary={selectedRouteSupport}
              isActive
              isAvailable={Boolean(selectedRoute)}
              onApplied={() => undefined}
            />

            {(() => {
              const proposedIdentity =
                selectedRoute && composer.feedUrl
                  ? getFeedIdentity({
                      label: selectedRoute.title,
                      url: composer.feedUrl,
                      routeId: selectedRoute.id,
                    })
                  : undefined;

              return (
                <div className="reader-follow-card-main">
                  {proposedIdentity ? (
                    <SourceAvatar identity={proposedIdentity} size="large" />
                  ) : null}
                  <div>
                    <span className="reader-kicker">Route feed</span>
                    <h3>{proposedIdentity?.title || selectedRoute.title}</h3>
                    {proposedIdentity ? <strong>{proposedIdentity.sourceName}</strong> : null}
                    <p>{composer.feedUrl || 'Apply the required inputs to build the feed URL.'}</p>
                  </div>
                </div>
              );
            })()}

            <button
              type="button"
              className="reader-button reader-button--primary"
              onClick={() => void handleFollowCurrentFeed()}
              disabled={!selectedRoute || !composer.feedUrl || !composer.hasAppliedValues}
            >
              <Plus size={15} />
              <span>Follow route feed</span>
            </button>
          </section>
        ) : null}

        <div className="reader-filter-strip">
          <CategoryFilter
            categories={categories}
            activeCategory={activeCategory}
            onChange={setActiveCategory}
          />
          <SupportFilter
            value={activeSupportFilter}
            onChange={setActiveSupportFilter}
          />
        </div>

        <section className="reader-route-results">
          <div className="reader-section-title">
            <h3>RSSHub routes</h3>
            <span>{topRoutes.length} shown</span>
          </div>

          {isLoadingRoutes ? (
            <StateBlock
              compact
              variant="loading"
              title="Loading routes"
              message="Fetching the RSSHub route catalog."
            />
          ) : topRoutes.length ? (
            <div className="reader-feed-card-grid">
              {topRoutes.map((route) => {
                const isSelected = selectedRoute?.id === route.id;
                const support = supportByRouteId.get(route.id);
                const sourceKind = getRouteSourceKind(route);
                const sourceName = getRouteSourceName(route);

                return (
                  <button
                    key={route.id}
                    type="button"
                    className={`reader-feed-card ${isSelected ? 'active' : ''}`}
                    onClick={() => handleSelectRoute(route)}
                  >
                    <div className="reader-feed-card-top">
                      <span className={`reader-feed-icon reader-feed-icon--${sourceKind}`}>
                        <SourceIcon kind={sourceKind} size={16} />
                      </span>
                      <strong>{route.sourceTitle || sourceName}</strong>
                      <span>{isSelected ? 'Selected' : 'Select'}</span>
                    </div>
                    <h4>{route.title}</h4>
                    <p>{summarizeRouteDescription(route)}</p>
                    <div className="reader-feed-card-meta">
                      <span>{sourceName}</span>
                      <span>{route.routePath}</span>
                      {support ? <span>{support.label}</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <StateBlock
              compact
              title="No route matches"
              message={
                isUrlLikeQuery
                  ? 'This input looks like a URL, so native feed detection is the main result above.'
                  : 'Try another keyword, source, path, or category.'
              }
            />
          )}
        </section>
      </section>
    );
  }

  function renderLibrary() {
    return (
      <section className="reader-main-panel">
        <header className="reader-content-header">
          <div>
            <span className="reader-kicker">Library</span>
            <h2>Feeds</h2>
            <p>Saved route feeds, native RSS URLs, and imported feed files.</p>
          </div>
          <div className="reader-header-actions">
            <div className="reader-collection-create reader-collection-create--header">
              <input
                value={libraryCollectionDraft}
                onChange={(event) => setLibraryCollectionDraft(event.target.value)}
                placeholder="New collection..."
              />
              <button
                type="button"
                className="reader-button"
                onClick={handleCreateLibraryCollection}
                disabled={!libraryCollectionDraft.trim()}
              >
                <Plus size={15} />
                <span>Create collection</span>
              </button>
            </div>
            <button
              type="button"
              className="reader-button reader-button--primary"
              onClick={() => {
                setActiveFeedId(undefined);
                setActiveCollectionId(undefined);
                setActiveSection('addFeed');
              }}
            >
              <Plus size={15} />
              <span>Add feed</span>
            </button>
          </div>
        </header>

        {savedFeeds.length ? (
          <div className="reader-library-list">
            {savedFeeds.map((feed) => {
              const feedItems = readerViews.filter((item) => item.feedId === feed.id);
              const status = feedStatuses[feed.id];
              const identity = getFeedIdentity(feed);
              const iconCandidates = getSourceIconCandidates(feed);
              const feedCollections = getCollectionsForFeed(feed.id);

              return (
                <article
                  key={feed.id}
                  className={`reader-library-row ${activeFeedId === feed.id ? 'active' : ''}`}
                >
                  <button
                    type="button"
                    className="reader-library-select"
                    onClick={() => {
                      setActiveFeedId(feed.id);
                      setActiveCollectionId(undefined);
                      setActiveSection('feed');
                    }}
                  >
                    <div className="reader-library-title">
                      <SourceAvatar identity={identity} iconCandidates={iconCandidates} />
                      <div>
                        <h3>{identity.title}</h3>
                        <span>{identity.sourceName}</span>
                      </div>
                    </div>
                    <p>{feed.url}</p>
                    <div className="reader-item-meta">
                      <span>{feedItems.length} posts</span>
                      <span>{getFeedStatusMessage(status)}</span>
                      <span>Saved {formatDateTime(feed.createdAt)}</span>
                    </div>
                  </button>

                  <div className="reader-library-collections">
                    {normalizedReaderCollections.length ? (
                      normalizedReaderCollections.map((collection) => {
                        const isMember = collection.feedIds.includes(feed.id);

                        return (
                          <button
                            key={collection.id}
                            type="button"
                            className={isMember ? 'active' : ''}
                            onClick={() =>
                              handleToggleFeedCollection(collection.id, feed.id)
                            }
                          >
                            <Library size={13} />
                            <span>{collection.name}</span>
                          </button>
                        );
                      })
                    ) : (
                      <span className="reader-muted">No collections yet.</span>
                    )}
                    {feedCollections.length ? (
                      <strong>{feedCollections.length} collection{feedCollections.length === 1 ? '' : 's'}</strong>
                    ) : null}
                  </div>

                  <div className="reader-row-actions">
                    <button
                      type="button"
                      className="reader-icon-button"
                      onClick={() => handleMarkFeedAsRead(feed.id)}
                      aria-label="Mark feed as read"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      type="button"
                      className="reader-icon-button"
                      onClick={() => void handleShareFeed(feed)}
                      aria-label="Share feed"
                    >
                      <Share2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="reader-icon-button"
                      onClick={() => void refreshFeed(feed)}
                      aria-label="Refresh feed"
                      disabled={status?.status === 'loading'}
                    >
                      {status?.status === 'loading' ? (
                        <LoaderCircle size={15} className="spin" />
                      ) : (
                        <RefreshCw size={15} />
                      )}
                    </button>
                    <a
                      className="reader-icon-button"
                      href={feed.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Open raw feed"
                    >
                      <ExternalLink size={15} />
                    </a>
                    <button
                      type="button"
                      className="reader-icon-button reader-icon-button--danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteFeed(feed.id);
                      }}
                      aria-label="Delete feed"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <StateBlock
            compact
            title="No feeds followed yet"
            message="Use Add feed to follow an RSSHub route and start filling the reader."
          />
        )}
      </section>
    );
  }

  function renderFilterMode() {
    const targetFeed =
      filterContext.section === 'feed' && filterContext.feedId
        ? savedFeedsById.get(filterContext.feedId)
        : undefined;
    const targetCollection =
      filterContext.section === 'collection' && filterContext.collectionId
        ? readerCollectionsById.get(filterContext.collectionId)
        : undefined;
    const targetIdentity = targetFeed ? getFeedIdentity(targetFeed) : undefined;
    const targetTitle =
      targetIdentity?.title ?? targetCollection?.name ?? getSectionTitle(filterContext.section);
    const targetSubtitle = targetIdentity
      ? `${targetIdentity.sourceName} feed`
      : targetCollection
        ? 'Collection'
      : 'Reader view';
    const targetItems =
      filterContext.section === 'feed' && filterContext.feedId
        ? readerViews.filter(
            (item) => item.feedId === filterContext.feedId && !item.archived
          )
        : filterContext.section === 'collection'
          ? targetCollection
            ? readerViews.filter(
                (item) =>
                  (targetCollection.itemIds.includes(item.id) ||
                    targetCollection.feedIds.includes(item.feedId)) &&
                  !item.archived
              )
            : []
        : READER_SECTIONS.has(filterContext.section)
          ? filterReaderItems(filterContext.section, readerViews)
          : readerViews.filter((item) => !item.archived);
    const customLimit = Number.parseInt(customLimitDraft.trim(), 10);
    const canSaveCustom =
      Number.isInteger(customLimit) && customLimit > 0 &&
      (activeDisplayLimitSetting.mode !== 'custom' ||
        activeDisplayLimitSetting.customLimit !== customLimit);
    const backSection =
      filterContext.section === 'filter' ? 'all' : filterContext.section;

    return (
      <section className="reader-main-panel">
        <header className="reader-content-header">
          <div>
            <span className="reader-kicker">Filter</span>
            <h2>Displayed item limit</h2>
            <p>Control sort order and how many posts render for this feed or view.</p>
          </div>
          <button
            type="button"
            className="reader-button"
            onClick={() => {
              if (backSection === 'feed' && filterContext.feedId) {
                setActiveFeedId(filterContext.feedId);
              }
              if (backSection === 'collection' && filterContext.collectionId) {
                setActiveCollectionId(filterContext.collectionId);
              }
              setActiveSection(backSection);
            }}
          >
            <X size={15} />
            <span>Close filter</span>
          </button>
        </header>

        <div className="reader-filter-panel">
          <div className="reader-filter-target">
            {targetIdentity ? (
              <SourceAvatar identity={targetIdentity} />
            ) : targetCollection ? (
              <Library size={18} />
            ) : (
              <ListFilter size={18} />
            )}
            <div>
              <span className="reader-kicker">Applies to</span>
              <h3>{targetTitle}</h3>
              <p>
                {targetSubtitle} / {targetItems.length} item
                {targetItems.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="reader-filter-card">
            <div className="reader-section-title">
              <h3>Sort displayed posts</h3>
              <span>{activeSortOrder === 'newest' ? 'Newest first' : 'Oldest first'}</span>
            </div>
            <div className="reader-segmented-control">
              <button
                type="button"
                className={activeSortOrder === 'newest' ? 'active' : ''}
                onClick={() => handleSaveSortOrder('newest')}
              >
                Newest first
              </button>
              <button
                type="button"
                className={activeSortOrder === 'oldest' ? 'active' : ''}
                onClick={() => handleSaveSortOrder('oldest')}
              >
                Oldest first
              </button>
            </div>
          </div>

          <div className="reader-filter-card">
            <div className="reader-section-title">
              <h3>Limit displayed items</h3>
              <span>
                {activeDisplayLimit === null ? 'Full feed' : `${activeDisplayLimit} shown`}
              </span>
            </div>

            <label className="reader-filter-custom">
              <span>Custom limit</span>
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={customLimitDraft}
                  onChange={(event) => setCustomLimitDraft(event.target.value)}
                  placeholder="Enter a custom item limit"
                />
                <button
                  type="button"
                  className="reader-button reader-button--primary"
                  onClick={() =>
                    handleSaveDisplayLimit({
                      mode: 'custom',
                      customLimit,
                    })
                  }
                  disabled={!canSaveCustom}
                >
                  Save
                </button>
              </div>
            </label>

            <div
              className="reader-filter-options"
              role="radiogroup"
              aria-label="Displayed item presets"
            >
              {FEED_DISPLAY_LIMIT_PRESETS.map((option) => (
                <button
                  key={option.mode}
                  type="button"
                  className={
                    activeDisplayLimitSetting.mode === option.mode ? 'active' : ''
                  }
                  onClick={() => handleSaveDisplayLimit({ mode: option.mode })}
                >
                  <span>{option.label}</span>
                  <strong>{option.detail}</strong>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  function renderNotesPage() {
    const normalizedQuery = debouncedReaderQuery.trim().toLowerCase();
    const noteRows = readerNotes
      .map((note) => ({
        note,
        item: readerViews.find((candidate) => candidate.id === note.itemId),
      }))
      .filter(({ note, item }) => {
        if (!normalizedQuery) {
          return true;
        }

        const haystack = `${note.text} ${item?.title ?? ''} ${
          item?.feedDisplayTitle ?? ''
        } ${item?.sourceName ?? ''}`.toLowerCase();
        return haystack.includes(normalizedQuery);
      });

    return (
      <section className="reader-main-panel">
        <header className="reader-content-header">
          <div>
            <span className="reader-kicker">Notes</span>
            <h2>Reader notes</h2>
            <p>
              {noteRows.length} note{noteRows.length === 1 ? '' : 's'} across your
              local posts.
            </p>
          </div>
        </header>

        <div className="reader-list-toolbar">
          <div className="reader-search">
            <Search size={15} />
            <input
              value={readerQuery}
              onChange={(event) => setReaderQuery(event.target.value)}
              placeholder="Search notes, posts, sources..."
            />
          </div>
        </div>

        {noteRows.length ? (
          <div className="reader-notes-grid" role="list" aria-label="Reader notes">
            {noteRows.map(({ note, item }) => {
              const feed = item ? savedFeedsById.get(item.feedId) : undefined;
              const identity = item
                ? getFeedIdentity(
                    feed ?? {
                      label: item.feedDisplayTitle || item.feedLabel,
                      url: item.feedUrl,
                      routeId: item.routeId || '',
                    }
                  )
                : undefined;
              const iconCandidates = getSourceIconCandidates(feed, item);

              return (
                <article key={note.id} className="reader-note-card" role="listitem">
                  <div className="reader-note-main">
                    {identity ? (
                      <SourceAvatar
                        identity={identity}
                        iconCandidates={iconCandidates}
                        size="small"
                      />
                    ) : (
                      <NotebookPen size={18} />
                    )}
                    <div>
                      <span className="reader-note-kicker">
                        {identity?.sourceName || 'Note'}
                      </span>
                      <p>{note.text}</p>
                      <div className="reader-item-meta">
                        <span>
                          {item ? item.title : 'Original post unavailable'}
                        </span>
                        <span>{formatDateTime(note.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="reader-note-actions">
                    <button
                      type="button"
                      className="reader-button"
                      onClick={() => handleOpenPostForNote(note)}
                      disabled={!item}
                    >
                      <MessageCircle size={15} />
                      <span>Open post</span>
                    </button>
                    {item?.link ? (
                      <a
                        className="reader-button"
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={15} />
                        <span>Open item</span>
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="reader-button reader-button--danger"
                      onClick={() => handleDeleteNote(note.id)}
                    >
                      <Trash2 size={15} />
                      <span>Delete</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <StateBlock
            compact
            title="No notes yet"
            message="Open a post and add a note. Notes will appear here as their own reader page."
          />
        )}
      </section>
    );
  }

  function renderSettings() {
    return (
      <section className="reader-main-panel">
        <header className="reader-content-header">
          <div>
            <span className="reader-kicker">Settings</span>
            <h2>App settings</h2>
            <p>Theme mode and route configuration live here.</p>
          </div>
        </header>

        <div className="reader-settings-stack">
          <section className="reader-settings-card">
            <div className="reader-section-title">
              <h3>Theme mode</h3>
              <span>{getThemeLabel(themeMode)}</span>
            </div>
            <div className="reader-segmented-control">
              <button
                type="button"
                className={themeMode === 'system' ? 'active' : ''}
                onClick={() => setThemeMode('system')}
              >
                System
              </button>
              <button
                type="button"
                className={themeMode === 'light' ? 'active' : ''}
                onClick={() => setThemeMode('light')}
              >
                Light
              </button>
              <button
                type="button"
                className={themeMode === 'dark' ? 'active' : ''}
                onClick={() => setThemeMode('dark')}
              >
                Night
              </button>
            </div>
          </section>

          <ConfigPanel
            hints={configHints}
            entries={configEntries}
            endpointUrl={endpointUrl}
            onChangeEndpointUrl={setEndpointUrl}
            onChangeEntries={setConfigEntries}
            onLoadRemote={handleLoadRemote}
            onSaveRemote={handleSaveRemote}
            isLoadingRemote={isLoadingRemote}
            isSavingRemote={isSavingRemote}
            lastLoadedAt={lastLoadedAt}
            lastSavedAt={lastSavedAt}
            statusMessage={statusMessage}
            errorMessage={errorMessage}
          />
        </div>
      </section>
    );
  }

  function renderMainSurface() {
    if (activeSection === 'addFeed') {
      return renderAddFeed();
    }

    if (activeSection === 'library') {
      return renderLibrary();
    }

    if (activeSection === 'filter') {
      return renderFilterMode();
    }

    if (activeSection === 'notes') {
      return renderNotesPage();
    }

    if (activeSection === 'settings') {
      return renderSettings();
    }

    return renderArticleList();
  }

  function renderReaderDetail() {
    if (!selectedItem || activeSection === 'notes' || !READER_SECTIONS.has(activeSection)) {
      return null;
    }

    const rawFeed = savedFeedsById.get(selectedItem.feedId);
    const identity = getFeedIdentity(
      rawFeed ?? {
        label: selectedItem.feedDisplayTitle || selectedItem.feedLabel,
        url: selectedItem.feedUrl,
        routeId: selectedItem.routeId || '',
      }
    );
    const iconCandidates = getSourceIconCandidates(rawFeed, selectedItem);
    const selectedItemCollections = getCollectionsForItem(selectedItem.id);

    return (
      <aside className="reader-detail-panel">
        <div className="reader-detail-header">
          <div>
            <div className="reader-detail-source">
              <SourceAvatar identity={identity} iconCandidates={iconCandidates} />
              <span>
                {identity.title} / {identity.sourceName}
              </span>
              <span className={`reader-type reader-type--${selectedItem.type}`}>
                {getTypeLabel(selectedItem.type)}
              </span>
            </div>
            <h2>{selectedItem.title}</h2>
          </div>
          <button
            type="button"
            className="reader-icon-button reader-detail-close"
            onClick={() => setSelectedItemId(undefined)}
            aria-label="Close item detail"
          >
            <X size={16} />
          </button>
        </div>

        <div className="reader-detail-meta">
          <span>{identity.title}</span>
          <span>{identity.sourceName}</span>
          <span>{formatDateTime(selectedItem.publishedAt || selectedItem.lastSeenAt)}</span>
          {selectedItem.author ? <span>{selectedItem.author}</span> : null}
        </div>

        {selectedItem.imageUrl ? (
          <img className="reader-detail-image" src={selectedItem.imageUrl} alt="" />
        ) : null}

        <div className="reader-detail-actions">
          <button
            type="button"
            className={`reader-button ${selectedItem.read ? '' : 'reader-button--primary'}`}
            onClick={() => updateReaderState(selectedItem.id, { read: !selectedItem.read })}
          >
            <Check size={15} />
            <span>{selectedItem.read ? 'Mark unread' : 'Mark read'}</span>
          </button>
          <button
            type="button"
            className={`reader-button ${selectedItem.starred ? 'active' : ''}`}
            onClick={() =>
              updateReaderState(selectedItem.id, { starred: !selectedItem.starred })
            }
          >
            <Star size={15} />
            <span>{selectedItem.starred ? 'Starred' : 'Star'}</span>
          </button>
          <button
            type="button"
            className="reader-button"
            onClick={() => updateReaderState(selectedItem.id, { archived: true })}
          >
            <Archive size={15} />
            <span>Archive</span>
          </button>
        </div>

        <section className="reader-research-section reader-collections-panel">
          <div className="reader-section-title">
            <h3>Collections</h3>
            <span>{selectedItemCollections.length}</span>
          </div>
          <div className="reader-collection-chips">
            {normalizedReaderCollections.length ? (
              normalizedReaderCollections.map((collection) => {
                const isMember = collection.itemIds.includes(selectedItem.id);

                return (
                  <button
                    key={collection.id}
                    type="button"
                    className={isMember ? 'active' : ''}
                    onClick={() =>
                      handleToggleItemCollection(collection.id, selectedItem.id)
                    }
                  >
                    <Library size={14} />
                    <span>{collection.name}</span>
                    <strong>{isMember ? 'Remove' : 'Add'}</strong>
                  </button>
                );
              })
            ) : (
              <p className="reader-muted">Create a collection for saved posts.</p>
            )}
          </div>
          <div className="reader-collection-create">
            <input
              value={collectionDraft}
              onChange={(event) => setCollectionDraft(event.target.value)}
              placeholder="New collection name..."
            />
            <button
              type="button"
              className="reader-button reader-button--primary"
              onClick={handleCreateCollectionForSelectedItem}
              disabled={!collectionDraft.trim()}
            >
              <Plus size={15} />
              <span>Create</span>
            </button>
          </div>
        </section>

        <div className="reader-detail-body">
          <p>
            {selectedItem.content ||
              selectedItem.summary ||
              selectedItem.description ||
              'This feed item did not include a summary. Open the source for the full item.'}
          </p>
        </div>

        <div className="reader-detail-link-row">
          {selectedItem.link ? (
            <a href={selectedItem.link} target="_blank" rel="noreferrer">
              <ExternalLink size={15} />
              <span>Open item</span>
            </a>
          ) : null}
          {rawFeed ? (
            <a href={rawFeed.url} target="_blank" rel="noreferrer">
              <Rss size={15} />
              <span>Raw feed</span>
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => void handleCopyItemLink(selectedItem)}
          >
            <Copy size={15} />
            <span>Copy link</span>
          </button>
        </div>

        <section className="reader-research-section">
          <div className="reader-section-title">
            <h3>Notes</h3>
            <span>{selectedItemNotes.length}</span>
          </div>
          <textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="Add a note about this item..."
          />
          <button
            type="button"
            className="reader-button reader-button--primary"
            onClick={handleAddNote}
            disabled={!noteDraft.trim()}
          >
            <NotebookPen size={15} />
            <span>Add note</span>
          </button>
          <button
            type="button"
            className="reader-button"
            onClick={() => {
              setActiveFeedId(undefined);
              setActiveCollectionId(undefined);
              setActiveSection('notes');
            }}
          >
            <NotebookPen size={15} />
            <span>Open notes</span>
          </button>
        </section>
      </aside>
    );
  }

  const isReaderIntroExpanded = activeSection === 'all' || activeSection === 'library';
  const showReaderSidebar = activeSection === 'all' || activeSection === 'library';
  const detailPanel = renderReaderDetail();

  return (
    <div
      className={[
        'reader-shell',
        detailPanel ? 'reader-shell--with-detail' : '',
        showReaderSidebar ? '' : 'reader-shell--sidebar-hidden',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <aside className="reader-rail">
        <div className="reader-rail-logo">
          <BrandMark size={34} className="brand-mark" />
        </div>

        <nav aria-label="Reader rail">
          {railItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`reader-rail-button ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (item.id !== 'feed') {
                    setActiveFeedId(undefined);
                  }
                  if (item.id !== 'collection') {
                    setActiveCollectionId(undefined);
                  }
                  setActiveSection(item.id);
                }}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="reader-rail-footer">
          <button
            type="button"
            className="reader-rail-button reader-rail-button--theme"
            onClick={() =>
              setThemeMode((current) =>
                current === 'system'
                  ? 'light'
                  : current === 'light'
                    ? 'dark'
                    : 'system'
              )
            }
            title={`Theme: ${getThemeLabel(themeMode)}`}
          >
            {themeMode === 'system' ? (
              <Monitor size={18} />
            ) : themeMode === 'dark' ? (
              <Moon size={18} />
            ) : (
              <Sun size={18} />
            )}
            <span>{getThemeLabel(themeMode)}</span>
          </button>
        </div>
      </aside>

      {showReaderSidebar ? (
        <aside className="reader-sidebar">
          <div
            className={`reader-brand ${
              isReaderIntroExpanded ? 'reader-brand--expanded' : 'reader-brand--collapsed'
            }`}
          >
            <span className="reader-kicker">
              {activeSection === 'library' ? 'Saved feeds' : 'Feature 1'}
            </span>
            <h1>RSSHubVite</h1>
            {isReaderIntroExpanded ? (
              <p>
                {activeSection === 'library'
                  ? 'Reopen saved feeds, assign collections, and refresh sources.'
                  : 'Route search, feed URLs, native RSS add, saved feeds, and notes.'}
              </p>
            ) : null}
          </div>

          <nav className="reader-nav-list" aria-label="Reader sections">
            {readerNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`reader-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveFeedId(undefined);
                    setActiveCollectionId(undefined);
                    setActiveSection(item.id);
                  }}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                  {typeof item.count === 'number' ? <strong>{item.count}</strong> : null}
                </button>
              );
            })}
          </nav>

          {savedFeeds.length || normalizedReaderCollections.length ? (
            <div className="reader-sidebar-feeds">
              <span className="reader-sidebar-label">Feeds</span>
              {savedFeeds.map((feed) => {
                const identity = getFeedIdentity(feed);
                const isActive = activeSection === 'library' && activeFeedId === feed.id;
                const status = feedStatuses[feed.id];
                const isOptionsOpen = openFeedOptionsId === feed.id;
                const iconCandidates = getSourceIconCandidates(feed);

                return (
                  <div
                    key={feed.id}
                    className={`reader-feed-nav-row ${isActive ? 'active' : ''} ${
                      isOptionsOpen ? 'options-open' : ''
                    }`}
                  >
                    <button
                      type="button"
                      className="reader-feed-nav-item"
                      onClick={() => {
                        setActiveFeedId(feed.id);
                        setActiveCollectionId(undefined);
                        setActiveSection('feed');
                      }}
                    >
                      <span
                        className={`reader-feed-nav-icon reader-feed-nav-icon--${identity.sourceKind}`}
                        aria-hidden="true"
                      >
                        <SourceAvatar
                          identity={identity}
                          iconCandidates={iconCandidates}
                          size="small"
                        />
                      </span>
                      <span>{identity.title}</span>
                    </button>

                    <button
                      type="button"
                      className="reader-feed-options-trigger"
                      aria-label={`Open options for ${identity.title}`}
                      aria-expanded={isOptionsOpen}
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenFeedOptionsId((current) =>
                          current === feed.id ? undefined : feed.id
                        );
                      }}
                    >
                      <MoreHorizontal size={15} />
                    </button>

                    {isOptionsOpen ? (
                      <div className="reader-feed-options-menu" role="menu">
                        <button
                          type="button"
                          onClick={() => {
                            handleMarkFeedAsRead(feed.id);
                            setOpenFeedOptionsId(undefined);
                          }}
                        >
                          <span>Mark feed as read</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleMarkAllAsRead();
                            setOpenFeedOptionsId(undefined);
                          }}
                        >
                          <span>Mark all as read</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleShareFeed(feed);
                            setOpenFeedOptionsId(undefined);
                          }}
                        >
                          <span>Share feed</span>
                        </button>
                        <button
                          type="button"
                          disabled={status?.status === 'loading'}
                          onClick={() => {
                            void refreshFeed(feed);
                            setOpenFeedOptionsId(undefined);
                          }}
                        >
                          <span>{status?.status === 'loading' ? 'Reloading feed' : 'Reload feed'}</span>
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => {
                            handleDeleteFeed(feed.id);
                            setOpenFeedOptionsId(undefined);
                          }}
                        >
                          <span>Delete feed</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {normalizedReaderCollections.length ? (
                <>
                  <span className="reader-sidebar-label reader-sidebar-label--sub">
                    Collections
                  </span>
                  {normalizedReaderCollections.map((collection) => {
                    const isActive =
                      activeSection === 'library' &&
                      activeCollectionId === collection.id;
                    const collectionOptionsId = `collection:${collection.id}`;
                    const isOptionsOpen = openFeedOptionsId === collectionOptionsId;
                    const collectionCount = new Set([
                      ...collection.itemIds,
                      ...readerViews
                        .filter((item) => collection.feedIds.includes(item.feedId))
                        .map((item) => item.id),
                    ]).size;

                    return (
                      <div
                        key={collection.id}
                        className={`reader-feed-nav-row ${
                          isActive ? 'active' : ''
                        } ${isOptionsOpen ? 'options-open' : ''}`}
                      >
                        <button
                          type="button"
                          className="reader-feed-nav-item"
                          onClick={() => {
                            setActiveFeedId(undefined);
                            setActiveCollectionId(collection.id);
                            setActiveSection('collection');
                          }}
                        >
                          <span
                            className="reader-feed-nav-icon reader-feed-nav-icon--collection"
                            aria-hidden="true"
                          >
                            <Library size={15} />
                          </span>
                          <span>{collection.name}</span>
                          <strong className="reader-feed-nav-count">{collectionCount}</strong>
                        </button>

                        <button
                          type="button"
                          className="reader-feed-options-trigger"
                          aria-label={`Open options for ${collection.name} collection`}
                          aria-expanded={isOptionsOpen}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenFeedOptionsId((current) =>
                              current === collectionOptionsId
                                ? undefined
                                : collectionOptionsId
                            );
                          }}
                        >
                          <MoreHorizontal size={15} />
                        </button>

                        {isOptionsOpen ? (
                          <div className="reader-feed-options-menu" role="menu">
                            <button
                              type="button"
                              className="danger"
                              onClick={() => {
                                handleDeleteCollection(collection.id);
                                setOpenFeedOptionsId(undefined);
                              }}
                            >
                              <span>Delete collection</span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </>
              ) : null}
            </div>
          ) : null}

          <div className="reader-sidebar-section">
            <button
              type="button"
              className={`reader-nav-item ${activeSection === 'library' ? 'active' : ''}`}
              onClick={() => {
                setActiveFeedId(undefined);
                setActiveCollectionId(undefined);
                setActiveSection('library');
              }}
            >
              <Library size={17} />
              <span>Library</span>
              <strong>{savedFeeds.length}</strong>
            </button>
            <button
              type="button"
              className="reader-nav-item"
              onClick={() => {
                setActiveFeedId(undefined);
                setActiveCollectionId(undefined);
                setActiveSection('addFeed');
              }}
            >
              <Plus size={17} />
              <span>Add feed</span>
            </button>
          </div>

          <div className="reader-sidebar-card">
            <div>
              <span className="reader-kicker">Feature 1</span>
              <h2>{readerCounts.all} posts indexed</h2>
              <p>
                {readerCounts.unread} unread, {readerCounts.collectedFeeds} feeds in collections.
              </p>
            </div>
          </div>
        </aside>
      ) : null}

      <main className="reader-workspace">
        {renderMainSurface()}
      </main>

      {detailPanel}
    </div>
  );
}
