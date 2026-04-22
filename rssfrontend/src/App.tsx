import {
  Bookmark,
  Bug,
  ChevronDown,
  ChevronUp,
  FileText,
  Home,
  Rss,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AdvancedRoutePanel from './components/AdvancedRoutePanel';
import CategoryFilter from './components/CategoryFilter';
import ConfigPanel from './components/ConfigPanel';
import FeedBuilder from './components/FeedBuilder';
import FeedPreview from './components/FeedPreview';
import RouteDetails from './components/RouteDetails';
import SavedFeeds from './components/SavedFeeds';
import SearchBar from './components/SearchBar';
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
import { fetchRoutesCatalog } from './utils/fetchRoutes';
import {
  getRouteSupportSummary,
  matchesSupportFilter,
} from './utils/routeSupport';
import { flattenRoutesCatalog, normalizeBaseUrl, searchRoutes } from './utils/rsshub';

const DEFAULT_BASE_URL = 'http://localhost:1200';
const DEFAULT_REMOTE_CONFIG_URL = '';
const DEFAULT_SUPPORT_FILTER: RouteSupportFilter = 'ready';

type AppSection =
  | 'home'
  | 'route-context'
  | 'advanced'
  | 'debug'
  | 'library'
  | 'config';

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

function findPreferredRoute(
  routes: RouteItem[],
  current?: RouteItem
): RouteItem | undefined {
  if (!routes.length) {
    return undefined;
  }

  if (current) {
    const exact = routes.find((route) => route.id === current.id);
    if (exact) {
      return exact;
    }
  }

  return routes[0];
}

function summarizeRouteDescription(route?: RouteItem): string {
  if (!route?.description.trim()) {
    return 'Choose a route and then complete the required fields to generate a feed URL.';
  }

  const normalized = route.description.trim().replace(/\s+/g, ' ');

  if (normalized.length <= 170) {
    return normalized;
  }

  return `${normalized.slice(0, 167)}...`;
}

function formatSupportFilterLabel(filter: RouteSupportFilter): string {
  if (filter === 'recommended') {
    return 'Optional setup';
  }

  if (filter === 'required') {
    return 'Required config';
  }

  if (filter === 'advanced') {
    return 'Advanced setup';
  }

  if (filter === 'unsupported') {
    return 'Unsupported';
  }

  return 'Ready to use';
}

export default function App() {
  const [baseUrl, setBaseUrl] = useLocalStorage<string>(
    'rsshub.baseUrl',
    DEFAULT_BASE_URL
  );
  const [savedFeeds, setSavedFeeds] = useLocalStorage<SavedFeed[]>(
    'rsshub.savedFeeds',
    []
  );
  const [endpointUrl, setEndpointUrl] = useLocalStorage<string>(
    'rsshub.remoteConfigUrl',
    DEFAULT_REMOTE_CONFIG_URL
  );

  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteItem | undefined>();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [activeSupportFilter, setActiveSupportFilter] =
    useState<RouteSupportFilter>(DEFAULT_SUPPORT_FILTER);
  const [activeSection, setActiveSection] = useState<AppSection>('home');
  const [isHomeSecondaryOpen, setIsHomeSecondaryOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [configEntries, setConfigEntries] = useState<ConfigEntry[]>([]);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const [isSavingRemote, setIsSavingRemote] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<string>();
  const [lastSavedAt, setLastSavedAt] = useState<string>();
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const debouncedQuery = useDebouncedValue(query, 120);

  useEffect(() => {
    let isMounted = true;

    async function loadRoutes() {
      setIsLoading(true);
      setError('');

      try {
        const catalog = await fetchRoutesCatalog();
        const flattened = flattenRoutesCatalog(catalog);

        if (!isMounted) {
          return;
        }

        setRoutes(flattened);
        setSelectedRoute((current) => findPreferredRoute(flattened, current));
      } catch (unknownError) {
        if (!isMounted) {
          return;
        }

        const message =
          unknownError instanceof Error
            ? unknownError.message
            : 'Unable to load RSSHub routes.';
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRoutes();

    return () => {
      isMounted = false;
    };
  }, []);

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
    return searchRoutes(routes, debouncedQuery).filter((route) => {
      if (activeCategory && !route.categories.includes(activeCategory)) {
        return false;
      }

      return matchesSupportFilter(
        supportByRouteId.get(route.id),
        activeSupportFilter
      );
    });
  }, [activeCategory, activeSupportFilter, debouncedQuery, routes, supportByRouteId]);

  const selectedRouteSupport = useMemo(() => {
    return getRouteSupportSummary(selectedRoute, configEntries);
  }, [configEntries, selectedRoute]);

  const readyRouteCount = useMemo(() => {
    return filteredRoutes.filter(
      (route) => supportByRouteId.get(route.id)?.status === 'ready'
    ).length;
  }, [filteredRoutes, supportByRouteId]);

  const configHints = useMemo(() => {
    return getConfigHints(selectedRoute);
  }, [selectedRoute]);

  const composer = useFeedComposer({
    baseUrl,
    route: selectedRoute,
    configEntries,
  });

  useEffect(() => {
    setConfigEntries((current) => mergeConfigEntries(current, configHints));
  }, [configHints]);

  useEffect(() => {
    if (!filteredRoutes.length) {
      setSelectedRoute(undefined);
      return;
    }

    setSelectedRoute((current) => findPreferredRoute(filteredRoutes, current));
  }, [filteredRoutes]);

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
      const message =
        unknownError instanceof Error
          ? unknownError.message
          : 'Unable to load remote config.';
      setErrorMessage(message);
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
      const message =
        unknownError instanceof Error
          ? unknownError.message
          : 'Unable to save remote config.';
      setErrorMessage(message);
    } finally {
      setIsSavingRemote(false);
    }
  }

  function handleSelectRoute(route: RouteItem) {
    setSelectedRoute(route);
  }

  function handleSaveFeed(payload: {
    label: string;
    url: string;
    routeId: string;
  }) {
    const feed: SavedFeed = {
      id: crypto.randomUUID(),
      label: payload.label,
      url: payload.url,
      routeId: payload.routeId,
      createdAt: Date.now(),
    };

    setSavedFeeds((current) => [feed, ...current]);
  }

  function handleDeleteFeed(id: string) {
    setSavedFeeds((current) => current.filter((feed) => feed.id !== id));
  }

  const previewDisabled =
    !composer.feedUrl || !composer.hasAppliedValues || composer.isBlockedByTwitterSource;

  const navigationItems: Array<{
    id: AppSection;
    label: string;
    icon: typeof Home;
  }> = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'route-context', label: 'Route', icon: FileText },
    { id: 'advanced', label: 'Advanced', icon: SlidersHorizontal },
    { id: 'debug', label: 'Debug', icon: Bug },
    { id: 'library', label: 'Library', icon: Bookmark },
    { id: 'config', label: 'Setup', icon: Settings2 },
  ];

  function renderUtilitySection(section: Exclude<AppSection, 'home'>) {
    if (section === 'route-context') {
      return (
        <RouteDetails
          route={selectedRoute}
          supportSummary={selectedRouteSupport}
        />
      );
    }

    if (section === 'advanced') {
      return <AdvancedRoutePanel route={selectedRoute} composer={composer} />;
    }

    if (section === 'debug') {
      return <FeedPreview feedUrl={composer.feedUrl} disabled={previewDisabled} />;
    }

    if (section === 'library') {
      return <SavedFeeds feeds={savedFeeds} onDeleteFeed={handleDeleteFeed} />;
    }

    return (
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
    );
  }

  const mainHomeSurface = (
    <section className="panel panel--primary workflow-surface workflow-surface--workbench">
      <div className="workflow-shell-header">
        <div className="workflow-caption">
          <span className="hero-eyebrow">Discover and build</span>
          <h2>Find a route and generate a feed.</h2>
        </div>

        <div className="workflow-shell-metrics">
          <span className="discover-meta-pill">
            {filteredRoutes.length} visible result
            {filteredRoutes.length === 1 ? '' : 's'}
          </span>
          <span className="discover-meta-pill">
            {readyRouteCount} ready now
          </span>
          {selectedRouteSupport?.sourceLabel ? (
            <span className="discover-meta-pill">{selectedRouteSupport.sourceLabel}</span>
          ) : null}
        </div>
      </div>

      <div className="discover-search-surface discover-search-surface--integrated">
        <div className="workflow-search-row">
          <div className="discover-search-copy">
            <span className="discover-search-label">Route search</span>
            <p>Search routes and pick a result.</p>
          </div>

          <div className="discover-searchbar">
            <SearchBar
              query={query}
              onQueryChange={setQuery}
              results={filteredRoutes}
              supportByRouteId={supportByRouteId}
              selectedRouteId={selectedRoute?.id}
              onSelectRoute={handleSelectRoute}
              isLoading={isLoading}
            />
          </div>
        </div>

        <div className="discover-toolbar">
          <div className="discover-filter-cluster">
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

          <div className="discover-meta-row">
            <span className="discover-meta-pill">Base URL: {baseUrl}</span>
            {selectedRouteSupport ? (
              <span className={selectedRouteSupport.badgeClassName}>
                {selectedRouteSupport.label}
              </span>
            ) : null}
          </div>
        </div>

        {selectedRoute ? (
          <div className="workflow-route-summary">
            <div className="workflow-route-copy">
              <span className="panel-eyebrow">Selected route</span>
              <div className="workflow-route-heading">
                <h3>{selectedRoute.title}</h3>
                {selectedRouteSupport ? (
                  <span className={selectedRouteSupport.badgeClassName}>
                    {selectedRouteSupport.label}
                  </span>
                ) : null}
              </div>
              <p>{summarizeRouteDescription(selectedRoute)}</p>
              {selectedRouteSupport ? (
                <p className="workflow-route-support-note">
                  {selectedRouteSupport.description}
                </p>
              ) : null}
            </div>

            <div className="workflow-route-meta">
              <span className="badge subtle">{selectedRoute.namespace}</span>
              <span className="badge">{selectedRoute.routePath}</span>
              <span className="badge">
                {composer.requiredParams.length
                  ? `${composer.requiredParams.length} required parameter${
                      composer.requiredParams.length === 1 ? '' : 's'
                    }`
                  : 'No required parameters'}
              </span>
              {selectedRouteSupport?.sourceLabel ? (
                <span className="badge">{selectedRouteSupport.sourceLabel}</span>
              ) : null}
            </div>
          </div>
        ) : (
          <StateBlock
            compact
            variant="info"
            title="Pick a route to begin"
            message="Select an RSSHub route before filling parameters."
          />
        )}
      </div>

      {error ? (
        <StateBlock
          compact
          variant="error"
          title="Route catalog unavailable"
          message={error}
        />
      ) : null}

      {isLoading ? (
        <StateBlock
          compact
          variant="loading"
          title="Loading route catalog"
          message="Fetching the RSSHub route list."
        />
      ) : null}

      <FeedBuilder
        embedded
        route={selectedRoute}
        composer={composer}
        supportSummary={selectedRouteSupport}
        onSaveFeed={handleSaveFeed}
      />

      <div className="workflow-secondary-shell">
        <button
          type="button"
          className="workflow-secondary-toggle"
          onClick={() => setIsHomeSecondaryOpen((current) => !current)}
          aria-expanded={isHomeSecondaryOpen}
        >
          {isHomeSecondaryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span>{isHomeSecondaryOpen ? 'Hide supporting tools' : 'Show supporting tools'}</span>
        </button>

        {isHomeSecondaryOpen ? (
          <div className="workflow-secondary-region">
            <details className="secondary-disclosure">
              <summary>
                <div>
                  <strong>Generated feed details</strong>
                  <p>Adjust base URL or format without crowding the primary workflow.</p>
                </div>
                <ChevronDown size={18} />
              </summary>

              <div className="secondary-disclosure-content">
                <div className="advanced-route-stack">
                  <div className="surface-card surface-card--quiet">
                    <div className="section-heading">
                      <h3>Instance and format</h3>
                      <p>Format changes apply the next time you submit the current parameter set.</p>
                    </div>

                    <label className="field-group">
                      <span className="field-label">RSSHub base URL</span>
                      <input
                        className="text-input"
                        type="text"
                        value={baseUrl}
                        onChange={(event) =>
                          setBaseUrl(normalizeBaseUrl(event.target.value))
                        }
                        placeholder="http://localhost:1200"
                      />
                    </label>

                    <div className="field-group">
                      <span className="field-label">Feed format</span>
                      <div className="format-toggle">
                        {(['rss', 'atom', 'json', 'debug'] as const).map((format) => (
                          <button
                            key={format}
                            type="button"
                            className={composer.format === format ? 'active' : ''}
                            onClick={() => composer.setFormat(format)}
                          >
                            {format.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {composer.feedUrl ? (
                      <div className="builder-output-inline builder-output-inline--secondary">
                        <div className="section-heading">
                          <h3>Current applied URL</h3>
                          <p>This remains stable until you apply the draft values again.</p>
                        </div>
                        <textarea
                          className="url-output url-output--compact"
                          value={composer.feedUrl}
                          readOnly
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </details>

            <details className="secondary-disclosure">
              <summary>
                <div>
                  <strong>Route context</strong>
                  <p>Inspect route metadata, docs links, and support requirements.</p>
                </div>
                <ChevronDown size={18} />
              </summary>

              <div className="secondary-disclosure-content">
                <RouteDetails
                  route={selectedRoute}
                  supportSummary={selectedRouteSupport}
                />
              </div>
            </details>

            <details className="secondary-disclosure">
              <summary>
                <div>
                  <strong>Advanced route tuning</strong>
                  <p>Reveal optional path and query controls only when you need them.</p>
                </div>
                <ChevronDown size={18} />
              </summary>

              <div className="secondary-disclosure-content">
                <AdvancedRoutePanel route={selectedRoute} composer={composer} />
              </div>
            </details>

            <details className="secondary-disclosure">
              <summary>
                <div>
                  <strong>Debug preview</strong>
                  <p>Inspect the raw debug output only when the compact preview needs deeper verification.</p>
                </div>
                <ChevronDown size={18} />
              </summary>

              <div className="secondary-disclosure-content">
                <FeedPreview feedUrl={composer.feedUrl} disabled={previewDisabled} />
              </div>
            </details>

            <details className="secondary-disclosure">
              <summary>
                <div>
                  <strong>Saved library</strong>
                  <p>Review feeds you already saved without leaving the workflow page.</p>
                </div>
                <ChevronDown size={18} />
              </summary>

              <div className="secondary-disclosure-content">
                <SavedFeeds feeds={savedFeeds} onDeleteFeed={handleDeleteFeed} />
              </div>
            </details>

            <details className="secondary-disclosure">
              <summary>
                <div>
                  <strong>Instance setup</strong>
                  <p>Manage remote config, API keys, and instance requirements off the main path.</p>
                </div>
                <ChevronDown size={18} />
              </summary>

              <div className="secondary-disclosure-content">
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
            </details>
          </div>
        ) : null}
      </div>
    </section>
  );

  const utilitySurface = (
    <section className="panel panel--primary utility-view-panel">
      {renderUtilitySection(activeSection === 'home' ? 'route-context' : activeSection)}
    </section>
  );

  return (
    <div className="app-frame">
      <main className="app-page">
        <header className="app-topbar">
          <div className="brand brand--topbar">
            <div className="brand-icon">
              <Rss size={18} />
            </div>
            <div>
              <span className="brand-eyebrow">RSSHubVite</span>
              <h1>Compact route-to-feed workflow</h1>
            </div>
          </div>

          <div className="topbar-meta">
            <span className="discover-meta-pill">{routes.length} routes indexed</span>
            <span className="discover-meta-pill">{savedFeeds.length} saved feeds</span>
            {activeCategory ? (
              <span className="discover-meta-pill discover-meta-pill--active">
                {activeCategory}
              </span>
            ) : null}
            {activeSupportFilter !== 'all' ? (
              <span className="discover-meta-pill discover-meta-pill--active">
                {formatSupportFilterLabel(activeSupportFilter)}
              </span>
            ) : null}
          </div>
        </header>

        <div className="workspace-layout">
          <section className="workspace-main">
            {activeSection === 'home' ? mainHomeSurface : utilitySurface}
          </section>

          <aside className="utility-rail">
            <nav className="utility-nav" aria-label="Context and tools">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`utility-nav-button ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveSection(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    title={item.label}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      </main>
    </div>
  );
}
