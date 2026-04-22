import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  RadioTower,
  Save,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLiveFeedPreview, type LiveFeedFailure } from '../hooks/useLiveFeedPreview';
import type { RouteItem } from '../types';
import BrandMark from './BrandMark';
import StateBlock from './StateBlock';

type FeedCardsPreviewProps = {
  feedUrl: string;
  mode: 'pending_input' | 'unsupported' | 'ready';
  unavailableReason?: string;
  hasPendingChanges?: boolean;
  route?: RouteItem;
  feedLabel?: string;
  onSaveFeed: (payload: {
    label: string;
    url: string;
    routeId: string;
  }) => void;
  onOpenLiveFeed: () => void;
};

type StatePill = {
  label: string;
  className: string;
};

function formatFeedCount(options: { totalItems: number; shownItems: number }): string {
  const { totalItems, shownItems } = options;

  if (totalItems > shownItems) {
    return `Showing ${shownItems} of ${totalItems}`;
  }

  return `${totalItems} item${totalItems === 1 ? '' : 's'} in feed`;
}

function getStatePill(options: {
  mode: FeedCardsPreviewProps['mode'];
  isLoading: boolean;
  totalItems: number;
  shownItems: number;
  failure: LiveFeedFailure | null;
  isEmpty: boolean;
}): StatePill {
  const { mode, isLoading, totalItems, shownItems, failure, isEmpty } = options;

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
    label: formatFeedCount({ totalItems, shownItems }),
    className: 'preview-state-pill preview-state-pill--success',
  };
}

export default function FeedCardsPreview({
  feedUrl,
  mode,
  unavailableReason,
  hasPendingChanges = false,
  route,
  feedLabel,
  onSaveFeed,
  onOpenLiveFeed,
}: FeedCardsPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const { preview, isLoading, failure, totalItems, shownItems } = useLiveFeedPreview({
    feedUrl,
    mode,
  });

  useEffect(() => {
    setCopied(false);
    setSaved(false);
  }, [feedUrl]);

  async function handleCopyFeedUrl() {
    if (!feedUrl) {
      return;
    }

    await navigator.clipboard.writeText(feedUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function handleSaveFeed() {
    if (!route || !feedUrl) {
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
  const isEmpty = preview?.state === 'empty';
  const statePill = getStatePill({
    mode,
    isLoading,
    totalItems,
    shownItems,
    failure,
    isEmpty,
  });

  if (mode === 'pending_input') {
    return (
      <StateBlock
        compact
        title="Live feed waits for applied inputs"
        message="Apply the route values first, then open the live feed."
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

  return (
    <section className="feed-launcher">
      <div className="feed-launcher-entry">
        <div className="feed-launcher-mark">
          <div className="feed-launcher-brand">
            <BrandMark size={54} className="brand-mark" />
          </div>
          <div className="feed-launcher-mark-icon" aria-hidden="true">
            <RadioTower size={20} />
          </div>
        </div>

        <div className="feed-launcher-copy">
          <span className="panel-eyebrow">Live feed ready</span>
          <h4>{resolvedFeedTitle}</h4>
          <p>
            {hasPendingChanges
              ? 'The last applied feed is ready. Apply the latest inputs when you want to refresh it.'
              : 'Enter the dedicated live-feed view to browse the full feed.'}
          </p>
        </div>

        <div className="feed-launcher-meta">
          <span className={statePill.className}>{statePill.label}</span>
          {preview?.status ? (
            <span className="badge subtle">Status {preview.status}</span>
          ) : null}
          {preview?.snapshot.homeUrl ? (
            <span className="badge subtle">Feed source available</span>
          ) : null}
        </div>

        <button
          type="button"
          className="primary-button feed-launcher-button"
          onClick={onOpenLiveFeed}
          disabled={!feedUrl}
        >
          <span>Open live feed</span>
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="feed-actions-card">
        <div className="section-title-row">
          <div className="section-heading">
            <span className="panel-eyebrow">Feed URL & actions</span>
            <h4>{resolvedFeedTitle}</h4>
            <p>Keep the current feed nearby for saving, copying, or opening.</p>
          </div>

          <div className="preview-meta">
            <span className="badge subtle">{formatFeedCount({ totalItems, shownItems })}</span>
            {route ? <span className="badge">{route.routePath}</span> : null}
          </div>
        </div>

        <div className="feed-actions-url" title={feedUrl}>
          {feedUrl || 'Feed URL appears after apply'}
        </div>

        <div className="feed-actions-row">
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

          {route ? (
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
        </div>

        {failure ? (
          <StateBlock
            compact
            variant={failure.kind === 'fetch_failed' ? 'error' : 'info'}
            title={
              failure.kind === 'fetch_failed'
                ? 'Live feed needs attention'
                : 'Live feed needs a raw fallback'
            }
            message={failure.message}
            action={
              <button
                type="button"
                className="ghost-button"
                onClick={onOpenLiveFeed}
                disabled={!feedUrl}
              >
                Open live feed
              </button>
            }
          />
        ) : null}
      </div>
    </section>
  );
}
