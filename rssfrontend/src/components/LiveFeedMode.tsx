import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  ListFilter,
  LoaderCircle,
  Maximize2,
  Minimize2,
  RefreshCw,
  Save,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { RouteItem } from '../types';
import { useLiveFeedPreview, type LiveFeedFailure } from '../hooks/useLiveFeedPreview';
import LiveFeedItemsList from './LiveFeedItemsList';
import PanelHeader from './PanelHeader';
import StateBlock from './StateBlock';

type LiveFeedModeProps = {
  feedUrl: string;
  mode: 'pending_input' | 'unsupported' | 'ready';
  unavailableReason?: string;
  hasPendingChanges?: boolean;
  displayLimit?: number | null;
  route?: RouteItem;
  feedLabel?: string;
  entrySource: 'flow' | 'library';
  isExpanded: boolean;
  onBack: () => void;
  onOpenFilter?: () => void;
  onToggleExpanded: () => void;
  onSaveFeed?: (payload: {
    label: string;
    url: string;
    routeId: string;
  }) => void;
};

type StatePill = {
  label: string;
  className: string;
};

function formatFeedCount(totalItems: number): string {
  return `${totalItems} item${totalItems === 1 ? '' : 's'} in feed`;
}

function formatShownCount(shownItems: number): string {
  return `Showing ${shownItems}`;
}

function getStatePill(options: {
  mode: LiveFeedModeProps['mode'];
  isLoading: boolean;
  totalItems: number;
  failure: LiveFeedFailure | null;
  isEmpty: boolean;
}): StatePill {
  const { mode, isLoading, totalItems, failure, isEmpty } = options;

  if (mode === 'pending_input') {
    return {
      label: 'Waiting',
      className: 'preview-state-pill preview-state-pill--pending',
    };
  }

  if (mode === 'unsupported') {
    return {
      label: 'Unsupported',
      className: 'preview-state-pill preview-state-pill--unsupported',
    };
  }

  if (isLoading) {
    return {
      label: 'Loading',
      className: 'preview-state-pill preview-state-pill--loading',
    };
  }

  if (failure?.kind === 'fetch_failed') {
    return {
      label: 'Fetch failed',
      className: 'preview-state-pill preview-state-pill--error',
    };
  }

  if (failure?.kind === 'parse_failed') {
    return {
      label: 'Parse failed',
      className: 'preview-state-pill preview-state-pill--warning',
    };
  }

  if (isEmpty) {
    return {
      label: 'Empty',
      className: 'preview-state-pill preview-state-pill--empty',
    };
  }

  return {
    label: formatFeedCount(totalItems),
    className: 'preview-state-pill preview-state-pill--success',
  };
}

export default function LiveFeedMode({
  feedUrl,
  mode,
  unavailableReason,
  hasPendingChanges = false,
  displayLimit,
  route,
  feedLabel,
  entrySource,
  isExpanded,
  onBack,
  onOpenFilter,
  onToggleExpanded,
  onSaveFeed,
}: LiveFeedModeProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const {
    preview,
    isLoading,
    failure,
    items,
    totalItems,
    hasRenderableFeed,
    refresh,
  } =
    useLiveFeedPreview({
      feedUrl,
      mode,
    });

  useEffect(() => {
    setCopied(false);
    setSaved(false);
  }, [feedUrl]);

  useEffect(() => {
    if (!isExpanded) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onToggleExpanded();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded, onToggleExpanded]);

  async function handleCopyFeedUrl() {
    if (!feedUrl) {
      return;
    }

    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function handleSaveFeed() {
    if (!route || !feedUrl || !onSaveFeed) {
      return;
    }

    onSaveFeed({
      label: route.title || feedLabel || preview?.snapshot.feedTitle || 'Saved feed',
      url: feedUrl,
      routeId: route.id,
    });

    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  const resolvedFeedTitle = useMemo(
    () => preview?.snapshot.feedTitle || feedLabel || route?.title || 'Live feed',
    [feedLabel, preview?.snapshot.feedTitle, route?.title]
  );
  const displayedItems = useMemo(() => {
    if (!displayLimit) {
      return items;
    }

    return items.slice(0, displayLimit);
  }, [displayLimit, items]);
  const shownItems = displayedItems.length;
  const isEmpty = preview?.state === 'empty';
  const statePill = getStatePill({
    mode,
    isLoading,
    totalItems,
    failure,
    isEmpty,
  });
  const backLabel = entrySource === 'library' ? 'Back to library' : 'Back to flow';

  function renderState() {
    if (mode === 'pending_input') {
      return (
        <StateBlock
          title="Live feed waits for applied inputs"
          message="Apply the route inputs first, then open the live feed here."
          compact
        />
      );
    }

    if (mode === 'unsupported') {
      return (
        <StateBlock
          compact
          variant="error"
          title="Live feed unavailable"
          message={
            unavailableReason ||
            'This route cannot load a live feed on the current instance.'
          }
        />
      );
    }

    if (isLoading && !preview) {
      return <div className="live-feed-browser-skeleton" aria-hidden="true" />;
    }

    if (failure?.kind === 'fetch_failed') {
      return (
        <StateBlock
          compact
          variant="error"
          title="Live feed fetch failed"
          message={failure.message}
          action={
            isExpanded
              ? undefined
              : (
                  <div className="preview-meta">
                    {typeof failure.status === 'number' ? (
                      <span className="badge danger-badge">
                        Status {failure.status}
                        {failure.statusText ? ` ${failure.statusText}` : ''}
                      </span>
                    ) : null}
                    {feedUrl ? (
                      <a
                        href={feedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ghost-button"
                      >
                        <ExternalLink size={16} />
                        <span>Open raw feed</span>
                      </a>
                    ) : null}
                  </div>
                )
          }
        />
      );
    }

    if (failure?.kind === 'parse_failed') {
      return (
        <StateBlock
          compact
          variant="info"
          title="Live feed parse failed"
          message={failure.message}
          action={
            !isExpanded && feedUrl ? (
              <a
                href={feedUrl}
                target="_blank"
                rel="noreferrer"
                className="ghost-button"
              >
                <ExternalLink size={16} />
                <span>Open raw feed</span>
              </a>
            ) : undefined
          }
        />
      );
    }

    if (isEmpty) {
      return (
        <StateBlock
          compact
          variant="info"
          title="Live feed is empty"
          message="The feed responded successfully, but there were no recent items to render."
        />
      );
    }

    if (!preview || !hasRenderableFeed) {
      return (
        <StateBlock
          compact
          variant="info"
          title="Live feed unavailable"
          message="The current feed could not be rendered yet."
        />
      );
    }

    return (
      <LiveFeedItemsList
        items={displayedItems}
        fallbackSource={resolvedFeedTitle}
        isExpanded={isExpanded}
      />
    );
  }

  const content = (
    <section
      className={`panel panel--primary utility-mode-panel live-feed-mode ${
        isExpanded ? 'expanded' : ''
      }`}
      role={isExpanded ? 'dialog' : undefined}
      aria-modal={isExpanded ? 'true' : undefined}
      aria-label={isExpanded ? resolvedFeedTitle : undefined}
    >
      <PanelHeader
        eyebrow="Live feed"
        title={resolvedFeedTitle}
        description={
          isExpanded
            ? undefined
            : hasPendingChanges
            ? 'Showing the last applied feed. Apply the latest inputs in the workflow to refresh it.'
            : 'Browse the current feed in a dedicated view.'
        }
        actions={
          isExpanded
            ? undefined
            : (
                <div className="panel-header-actions">
                  {entrySource === 'library' && onOpenFilter ? (
                    <button type="button" className="ghost-button" onClick={onOpenFilter}>
                      <ListFilter size={16} />
                      <span>Filter</span>
                    </button>
                  ) : null}

                  <button type="button" className="ghost-button" onClick={onBack}>
                    <ArrowLeft size={16} />
                    <span>{backLabel}</span>
                  </button>
                </div>
              )
        }
      />

      {!isExpanded ? (
        <div className="live-feed-mode-toolbar">
          <div className="preview-meta">
            <span className={statePill.className}>{statePill.label}</span>
            {totalItems > shownItems ? (
              <span className="badge subtle">{formatShownCount(shownItems)}</span>
            ) : null}
            {preview?.status ? (
              <span className="badge subtle">Status {preview.status}</span>
            ) : null}
            {preview?.snapshot.homeUrl ? (
              <span className="badge subtle">Feed source available</span>
            ) : null}
          </div>

          <div className="builder-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => void handleCopyFeedUrl()}
              disabled={!feedUrl}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copied' : 'Copy URL'}</span>
            </button>

            <a
              href={feedUrl || '#'}
              target="_blank"
              rel="noreferrer"
              className={`ghost-button ${!feedUrl ? 'disabled' : ''}`}
            >
              <ExternalLink size={16} />
              <span>Open raw feed</span>
            </a>

            {route && onSaveFeed ? (
              <button
                type="button"
                className="ghost-button"
                onClick={handleSaveFeed}
                disabled={!feedUrl}
              >
                {saved ? <Check size={16} /> : <Save size={16} />}
                <span>{saved ? 'Saved' : 'Save feed'}</span>
              </button>
            ) : null}

            <button
              type="button"
              className="ghost-button"
              onClick={refresh}
              disabled={mode !== 'ready' || !feedUrl || isLoading}
            >
              {isLoading ? <LoaderCircle size={16} className="spin" /> : <RefreshCw size={16} />}
              <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <button
              type="button"
              className="ghost-button"
              onClick={onToggleExpanded}
              disabled={mode !== 'ready' || !hasRenderableFeed}
            >
              <Maximize2 size={16} />
              <span>Expand feed</span>
            </button>
          </div>
        </div>
      ) : null}

      {!isExpanded ? (
        <div className="live-feed-mode-url" title={feedUrl}>
          {feedUrl || 'Feed URL appears after apply'}
        </div>
      ) : null}

      <div className={`live-feed-browser ${isExpanded ? 'expanded' : ''}`}>
        {renderState()}
      </div>
    </section>
  );

  if (!isExpanded) {
    return content;
  }

  return (
    <div className="live-feed-overlay" role="presentation">
      <button
        type="button"
        className="live-feed-overlay-backdrop"
        aria-label="Close expanded live feed"
        onClick={onToggleExpanded}
      />
      <div className="live-feed-overlay-frame" onClick={(event) => event.stopPropagation()}>
        {content}
      </div>
      <div className="live-feed-overlay-close">
        <button
          type="button"
          className="ghost-button"
          onClick={onToggleExpanded}
        >
          <Minimize2 size={16} />
          <span>Collapse feed</span>
        </button>
      </div>
    </div>
  );
}
