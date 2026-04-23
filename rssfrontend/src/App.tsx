import {
  Bookmark,
  Bug,
  ChevronRight,
  FileText,
  Home,
  ListFilter,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AdvancedRoutePanel from './components/AdvancedRoutePanel';
import BrandMark from './components/BrandMark';
import CategoryFilter from './components/CategoryFilter';
import ConfigPanel from './components/ConfigPanel';
import FeedBuilder from './components/FeedBuilder';
import FeedCardsPreview from './components/FeedCardsPreview';
import FilterMode, { type FilterModeTarget } from './components/FilterMode';
import LiveFeedMode from './components/LiveFeedMode';
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
import {
  normalizeFeedDisplayLimitSetting,
  resolveFeedDisplayLimit,
  type FeedDisplayLimitSetting,
} from './utils/feedDisplay';
import { fetchRoutesCatalog } from './utils/fetchRoutes';
import {
  getRouteSupportSummary,
  isRouteUsableByDefault,
  matchesSupportFilter,
} from './utils/routeSupport';
import { flattenRoutesCatalog, searchRoutes } from './utils/rsshub';

const DEFAULT_BASE_URL = 'http://localhost:1200';
const DEFAULT_REMOTE_CONFIG_URL = '';
const DEFAULT_SUPPORT_FILTER: RouteSupportFilter = 'ready';

type AppSection =
  | 'home'
  | 'live-feed'
  | 'filter'
  | 'route-context'
  | 'advanced'
  | 'debug'
  | 'library'
  | 'config';

type FilterOrigin = 'flow' | 'library' | 'live-feed';

type WorkflowStep = 1 | 2 | 3;

type LiveFeedContext = {
  feedUrl: string;
  label?: string;
  route?: RouteItem;
  source: 'flow' | 'library';
  savedFeedId?: string;
};

function buildFlowFilterTarget(route?: RouteItem): FilterModeTarget | null {
  if (!route) {
    return null;
  }

  return {
    source: 'flow',
    key: route.id,
    label: route.title,
    subtitle: route.routePath,
  };
}

function buildLibraryFilterTarget(feed?: SavedFeed): FilterModeTarget | null {
  if (!feed) {
    return null;
  }

  return {
    source: 'library',
    key: feed.id,
    label: feed.label,
    subtitle: feed.url,
  };
}

function getFilterStorageKey(target: FilterModeTarget): string {
  return `${target.source}:${target.key}`;
}

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

function summarizeRouteDescription(route?: RouteItem): string {
  if (!route?.description.trim()) {
    return 'Ready to apply once you add the required inputs.';
  }

  const normalized = route.description.trim().replace(/\s+/g, ' ');

  if (normalized.length <= 120) {
    return normalized;
  }

  return `${normalized.slice(0, 117)}...`;
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

  return 'Ready + optional';
}

function describeStepStatus(options: {
  step: WorkflowStep;
  selectedRoute?: RouteItem;
  hasAppliedValues: boolean;
  hasPendingChanges: boolean;
}): string {
  const { step, selectedRoute, hasAppliedValues, hasPendingChanges } = options;

  if (step === 1) {
    return selectedRoute ? 'Route selected' : 'Choose a route';
  }

  if (step === 2) {
    if (!selectedRoute) {
      return 'Locked';
    }

    if (hasAppliedValues && !hasPendingChanges) {
      return 'Applied';
    }

    return 'Add inputs';
  }

  if (!hasAppliedValues) {
    return 'Waiting';
  }

  return 'Live feed ready';
}

export default function App() {
  const [baseUrl] = useLocalStorage<string>('rsshub.baseUrl', DEFAULT_BASE_URL);
  const [savedFeeds, setSavedFeeds] = useLocalStorage<SavedFeed[]>(
    'rsshub.savedFeeds',
    []
  );
  const [displayLimitSettings, setDisplayLimitSettings] = useLocalStorage<
    Record<string, FeedDisplayLimitSetting>
  >('rsshub.feedDisplayLimits', {});
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
  const [liveFeedContext, setLiveFeedContext] = useState<LiveFeedContext | null>(null);
  const [isLiveFeedExpanded, setIsLiveFeedExpanded] = useState(false);
  const [filterTarget, setFilterTarget] = useState<FilterModeTarget | null>(null);
  const [filterOrigin, setFilterOrigin] = useState<FilterOrigin>('flow');
  const [filterBackSection, setFilterBackSection] = useState<AppSection | null>(null);
  const [currentStep, setCurrentStep] = useState<WorkflowStep>(1);
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
        setSelectedRoute((current) => findMatchingRoute(flattened, current));
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

  const usableRouteCount = useMemo(() => {
    return filteredRoutes.filter((route) =>
      isRouteUsableByDefault(supportByRouteId.get(route.id))
    ).length;
  }, [filteredRoutes, supportByRouteId]);

  const configHints = useMemo(() => {
    return getConfigHints(selectedRoute);
  }, [selectedRoute]);
  const activeSavedFeed = useMemo(() => {
    if (liveFeedContext?.source !== 'library' || !liveFeedContext.savedFeedId) {
      return undefined;
    }

    return savedFeeds.find((feed) => feed.id === liveFeedContext.savedFeedId);
  }, [liveFeedContext, savedFeeds]);

  const composer = useFeedComposer({
    baseUrl,
    route: selectedRoute,
    configEntries,
  });

  useEffect(() => {
    setConfigEntries((current) => mergeConfigEntries(current, configHints));
  }, [configHints]);

  useEffect(() => {
    setSelectedRoute((current) => findMatchingRoute(filteredRoutes, current));
  }, [filteredRoutes]);

  useEffect(() => {
    if (!selectedRoute) {
      setCurrentStep(1);
      return;
    }

    if (currentStep === 3 && !composer.hasAppliedValues) {
      setCurrentStep(2);
    }
  }, [composer.hasAppliedValues, currentStep, selectedRoute]);

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
    setCurrentStep(1);
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

  function handleOpenLiveFeed(payload: LiveFeedContext) {
    setLiveFeedContext(payload);
    setIsLiveFeedExpanded(false);
    setActiveSection('live-feed');
  }

  function handleOpenFilter(
    target: FilterModeTarget | null,
    origin: FilterOrigin,
    backSection: AppSection | null = null
  ) {
    setFilterTarget(target);
    setFilterOrigin(origin);
    setFilterBackSection(backSection);
    setActiveSection('filter');
  }

  function handleSaveDisplayLimit(setting: FeedDisplayLimitSetting) {
    if (!filterTarget) {
      return;
    }

    const storageKey = getFilterStorageKey(filterTarget);

    setDisplayLimitSettings((current) => ({
      ...current,
      [storageKey]: normalizeFeedDisplayLimitSetting(setting),
    }));

    if (filterOrigin === 'flow') {
      setCurrentStep(2);
      setActiveSection('home');
      return;
    }

    if (filterOrigin === 'library') {
      setActiveSection('library');
      return;
    }

    setActiveSection('live-feed');
  }

  function handleDeleteFeed(id: string) {
    setSavedFeeds((current) => current.filter((feed) => feed.id !== id));

    if (filterTarget?.source === 'library' && filterTarget.key === id) {
      setFilterTarget(null);
    }

    if (liveFeedContext?.source === 'library' && liveFeedContext.savedFeedId === id) {
      setLiveFeedContext(null);

      if (activeSection === 'live-feed') {
        setActiveSection('library');
      }
    }
  }

  const previewDisabled =
    !composer.feedUrl || !composer.hasAppliedValues || composer.isBlockedByTwitterSource;

  const isStepTwoAvailable = Boolean(selectedRoute);
  const isStepThreeAvailable = Boolean(selectedRoute && composer.hasAppliedValues);
  const stepThreeDisplayTarget = buildFlowFilterTarget(selectedRoute);
  const stepThreeDisplayLimit = stepThreeDisplayTarget
    ? resolveFeedDisplayLimit(
        displayLimitSettings[getFilterStorageKey(stepThreeDisplayTarget)]
      )
    : null;
  const liveFeedDisplayTarget =
    liveFeedContext?.source === 'library'
      ? buildLibraryFilterTarget(activeSavedFeed)
      : buildFlowFilterTarget(liveFeedContext?.route);
  const liveFeedDisplayLimit = liveFeedDisplayTarget
    ? resolveFeedDisplayLimit(
        displayLimitSettings[getFilterStorageKey(liveFeedDisplayTarget)]
      )
    : null;

  const navigationItems: Array<{
    id: AppSection;
    label: string;
    icon: typeof Home;
  }> = [
    { id: 'home', label: 'Flow', icon: Home },
    { id: 'route-context', label: 'Route', icon: FileText },
    { id: 'advanced', label: 'Tune', icon: SlidersHorizontal },
    { id: 'debug', label: 'Debug', icon: Bug },
    { id: 'library', label: 'Library', icon: Bookmark },
    { id: 'filter', label: 'Filter', icon: ListFilter },
    { id: 'config', label: 'Setup', icon: Settings2 },
  ];
  const workflowSteps: Array<{
    id: WorkflowStep;
    title: string;
    available: boolean;
    complete: boolean;
  }> = [
    {
      id: 1,
      title: 'Route search',
      available: true,
      complete: Boolean(selectedRoute),
    },
    {
      id: 2,
      title: 'Required path parameters',
      available: isStepTwoAvailable,
      complete: composer.hasAppliedValues,
    },
    {
      id: 3,
      title: 'Live feed',
      available: isStepThreeAvailable,
      complete: isStepThreeAvailable,
    },
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
      return (
        <SavedFeeds
          feeds={savedFeeds}
          activeFeedId={
            liveFeedContext?.source === 'library' ? liveFeedContext.savedFeedId : undefined
          }
          onDeleteFeed={handleDeleteFeed}
          onOpenFeed={(feed) =>
            handleOpenLiveFeed({
              feedUrl: feed.url,
              label: feed.label,
              source: 'library',
              savedFeedId: feed.id,
            })
          }
          onOpenFilter={() =>
            handleOpenFilter(
              buildLibraryFilterTarget(activeSavedFeed),
              'library',
              'library'
            )
          }
        />
      );
    }

    if (section === 'filter') {
      return (
        <FilterMode
          target={filterTarget}
          appliedSetting={
            filterTarget
              ? displayLimitSettings[getFilterStorageKey(filterTarget)]
              : undefined
          }
          onSave={handleSaveDisplayLimit}
          onBack={
            filterBackSection
              ? () => {
                  setActiveSection(filterBackSection);
                }
              : undefined
          }
        />
      );
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

  const previewMode: 'pending_input' | 'unsupported' | 'ready' = composer.isBlockedByTwitterSource
    ? 'unsupported'
    : composer.hasAppliedValues && composer.feedUrl
      ? 'ready'
      : 'pending_input';

  const activeWorkflowStep =
    currentStep === 1 ? (
      <article
        className={[
          'guided-step-panel',
          'guided-step-panel--search',
          'guided-step-panel--active-screen',
          'active',
          selectedRoute ? 'complete' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="guided-step-header">
          <div className="guided-step-copy">
            <span className="guided-step-eyebrow">Step 1</span>
            <h3>Route search</h3>
            <p>Search and select a route.</p>
          </div>
          <span className="guided-step-status">
            {selectedRoute ? 'Selected' : 'Choose'}
          </span>
        </div>

        <div className="guided-step-body guided-step-body--search">
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            results={filteredRoutes}
            supportByRouteId={supportByRouteId}
            selectedRouteId={selectedRoute?.id}
            onSelectRoute={handleSelectRoute}
            isLoading={isLoading}
          />

          <div className="discover-filter-cluster discover-filter-cluster--guided">
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

          {selectedRoute ? (
            <div className="workflow-route-summary workflow-route-summary--guided">
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
              title="Choose a route to continue"
              message="Select a route to unlock the next step."
            />
          )}
        </div>

        <div className="guided-step-footer guided-step-footer--solo">
          <button
            type="button"
            className="primary-button"
            onClick={() => setCurrentStep(2)}
            disabled={!selectedRoute}
          >
            <span>Continue</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </article>
    ) : currentStep === 2 ? (
      <FeedBuilder
        route={selectedRoute}
        composer={composer}
        supportSummary={selectedRouteSupport}
        isActive
        isAvailable={isStepTwoAvailable}
        onApplied={() => setCurrentStep(3)}
        onOpenFilter={() =>
          handleOpenFilter(buildFlowFilterTarget(selectedRoute), 'flow', 'home')
        }
      />
    ) : (
      <article
        className={[
          'guided-step-panel',
          'guided-step-panel--preview',
          'guided-step-panel--active-screen',
          'guided-step-panel--viewport',
          'active',
          isStepThreeAvailable ? 'available' : 'locked',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="guided-step-header">
          <div className="guided-step-copy">
            <span className="guided-step-eyebrow">Step 3</span>
            <h3>Live feed</h3>
            <p>Confirm the feed is ready, then open the dedicated live-feed view.</p>
          </div>
          <span className="guided-step-status">
            {isStepThreeAvailable ? 'Ready' : 'Waiting'}
          </span>
        </div>

        <div className="guided-step-body">
          <FeedCardsPreview
            feedUrl={composer.feedUrl}
            mode={previewMode}
            unavailableReason={composer.builderNotice}
            hasPendingChanges={composer.hasPendingChanges && composer.hasAppliedValues}
            displayLimit={stepThreeDisplayLimit}
            route={selectedRoute}
            onSaveFeed={handleSaveFeed}
            onOpenLiveFeed={() =>
              handleOpenLiveFeed({
                feedUrl: composer.feedUrl,
                label: selectedRoute?.title,
                route: selectedRoute,
                source: 'flow',
              })
            }
          />
        </div>
      </article>
    );

  const mainHomeSurface = (
    <section className="panel panel--primary workflow-surface workflow-surface--guided">
      <div className="workflow-shell-header workflow-shell-header--compact">
        <div className="workflow-caption">
          <span className="hero-eyebrow">Guided workflow</span>
          <h2>Search a route, apply the inputs, and use the live feed.</h2>
        </div>

        <div className="workflow-shell-metrics workflow-shell-metrics--compact">
          <span className="discover-meta-pill">
            {filteredRoutes.length} visible result
            {filteredRoutes.length === 1 ? '' : 's'}
          </span>
          <span className="discover-meta-pill discover-meta-pill--active">
            {usableRouteCount} usable now
          </span>
          <span className="discover-meta-pill">{savedFeeds.length} saved</span>
        </div>
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

      <div className="workflow-stepper">
        {workflowSteps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isClickable = step.id === 1 || step.available;

          return (
            <div key={step.id} className="workflow-stepper-segment">
              <button
                type="button"
                className={[
                  'workflow-step-button',
                  isActive ? 'active' : '',
                  step.complete ? 'complete' : '',
                  step.available ? 'available' : 'locked',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  if (isClickable) {
                    setCurrentStep(step.id);
                  }
                }}
                disabled={!isClickable}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="workflow-step-index">0{step.id}</span>
                <span className="workflow-step-copy">
                  <strong>{step.title}</strong>
                  <span>
                    {describeStepStatus({
                      step: step.id,
                      selectedRoute,
                      hasAppliedValues: composer.hasAppliedValues,
                      hasPendingChanges: composer.hasPendingChanges,
                    })}
                  </span>
                </span>
              </button>

              {index < workflowSteps.length - 1 ? (
                <span className="workflow-step-connector" aria-hidden="true">
                  <ChevronRight size={16} />
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="workflow-step-stage">{activeWorkflowStep}</div>
    </section>
  );

  const utilitySurface = (
    <section className="panel panel--primary utility-view-panel">
      {renderUtilitySection(
        activeSection as Exclude<AppSection, 'home' | 'live-feed'>
      )}
    </section>
  );

  const liveFeedSurface = liveFeedContext ? (
    <section className="panel panel--primary utility-view-panel">
      <LiveFeedMode
        feedUrl={liveFeedContext.feedUrl}
        mode={liveFeedContext.feedUrl ? 'ready' : 'pending_input'}
        unavailableReason={
          liveFeedContext.source === 'flow' ? composer.builderNotice : undefined
        }
        hasPendingChanges={
          liveFeedContext.source === 'flow'
            ? composer.hasPendingChanges && composer.hasAppliedValues
            : false
        }
        displayLimit={liveFeedDisplayLimit}
        route={liveFeedContext.route}
        feedLabel={liveFeedContext.label}
        entrySource={liveFeedContext.source}
        isExpanded={isLiveFeedExpanded}
        onToggleExpanded={() => setIsLiveFeedExpanded((current) => !current)}
        onOpenFilter={
          liveFeedContext.source === 'library'
            ? () =>
                handleOpenFilter(
                  buildLibraryFilterTarget(activeSavedFeed),
                  'live-feed',
                  'live-feed'
                )
            : undefined
        }
        onBack={() => {
          setIsLiveFeedExpanded(false);
          setActiveSection(liveFeedContext.source === 'library' ? 'library' : 'home');
        }}
        onSaveFeed={liveFeedContext.route ? handleSaveFeed : undefined}
      />
    </section>
  ) : null;

  const highlightedSection: AppSection =
    activeSection === 'live-feed'
      ? liveFeedContext?.source === 'library'
        ? 'library'
        : 'home'
      : activeSection;

  return (
    <div className="app-frame">
      <main className="app-page">
        <header className="app-topbar">
          <div className="brand brand--topbar">
            <div className="brand-icon brand-icon--shell">
              <BrandMark size={52} className="brand-mark" />
            </div>

            <div className="brand-copy">
              <span className="brand-eyebrow">Live feed workflow</span>
              <h1>RSSHubVite</h1>
              <p>Route search, applied inputs, and live feed output in one place.</p>
            </div>
          </div>

          <div className="topbar-meta">
            <span className="discover-meta-pill">{routes.length} routes indexed</span>
            <span className="discover-meta-pill discover-meta-pill--active">
              {usableRouteCount} usable now
            </span>
            {activeCategory ? (
              <span className="discover-meta-pill">{activeCategory}</span>
            ) : null}
            {activeSupportFilter !== 'all' ? (
              <span className="discover-meta-pill">
                {formatSupportFilterLabel(activeSupportFilter)}
              </span>
            ) : null}
          </div>
        </header>

        <div className="workspace-layout">
          <section className="workspace-main">
            {activeSection === 'home'
              ? mainHomeSurface
              : activeSection === 'live-feed'
                ? (liveFeedSurface ?? mainHomeSurface)
                : utilitySurface}
          </section>

          <aside className="utility-rail">
            <nav className="utility-nav" aria-label="Workflow views">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = highlightedSection === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`utility-nav-button ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (item.id === 'filter') {
                        const nextTarget =
                          activeSection === 'library' || liveFeedContext?.source === 'library'
                            ? buildLibraryFilterTarget(activeSavedFeed)
                            : buildFlowFilterTarget(
                                liveFeedContext?.source === 'flow'
                                  ? liveFeedContext.route
                                  : selectedRoute
                              );
                        const origin: FilterOrigin =
                          activeSection === 'live-feed'
                            ? 'live-feed'
                            : activeSection === 'library'
                              ? 'library'
                              : 'flow';
                        handleOpenFilter(nextTarget, origin, null);
                        return;
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
          </aside>
        </div>
      </main>
    </div>
  );
}
