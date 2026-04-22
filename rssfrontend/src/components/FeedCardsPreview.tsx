import {
  AlertCircle,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import {
  FeedPreviewRequestError,
  fetchFeedPreview,
  type FeedPreviewItem,
  type FeedPreviewResult,
} from '../utils/feedPreview';
import StateBlock from './StateBlock';

type FeedCardsPreviewProps = {
  feedUrl: string;
  mode: 'pending_input' | 'unsupported' | 'ready';
  unavailableReason?: string;
  hasPendingChanges?: boolean;
};

type PreviewFailure =
  | {
      kind: 'fetch_failed';
      message: string;
      status?: number;
      statusText?: string;
    }
  | {
      kind: 'parse_failed';
      message: string;
    };

type PreviewStatePill = {
  label: string;
  className: string;
};

function formatPreviewTime(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function renderPreviewCard(
  item: FeedPreviewItem,
  index: number,
  fallbackSource?: string
) {
  const meta: string[] = [];
  const source = item.source || fallbackSource;
  const publishedAt = formatPreviewTime(item.publishedAt);

  if (source) {
    meta.push(source);
  }

  if (publishedAt) {
    meta.push(publishedAt);
  }

  return (
    <article key={item.id || `${item.title}-${index}`} className="preview-card">
      {item.imageUrl ? (
        <div className="preview-card-media">
          <img src={item.imageUrl} alt="" loading="lazy" />
        </div>
      ) : (
        <div className="preview-card-media preview-card-media--placeholder">
          <span>{item.title.charAt(0).toUpperCase()}</span>
        </div>
      )}

      <div className="preview-card-body">
        {meta.length ? (
          <div className="preview-card-meta">
            {meta.map((value) => (
              <span key={value}>{value}</span>
            ))}
          </div>
        ) : null}

        <h4>{item.title}</h4>

        {item.summary ? <p>{item.summary}</p> : null}
      </div>

      {item.link ? (
        <div className="preview-card-actions">
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer"
            className="preview-card-link"
          >
            <ExternalLink size={15} />
            <span>Open item</span>
          </a>
        </div>
      ) : null}
    </article>
  );
}

function getPreviewStatePill(options: {
  mode: FeedCardsPreviewProps['mode'];
  isLoading: boolean;
  preview: FeedPreviewResult | null;
  failure: PreviewFailure | null;
}): PreviewStatePill {
  const { mode, isLoading, preview, failure } = options;

  if (mode === 'pending_input') {
    return {
      label: 'Waiting for feed',
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

  if (failure?.kind === 'parse_failed' || preview?.state === 'parse_failed') {
    return {
      label: 'Parse failed',
      className: 'preview-state-pill preview-state-pill--warning',
    };
  }

  if (preview?.state === 'empty') {
    return {
      label: 'No recent items',
      className: 'preview-state-pill preview-state-pill--empty',
    };
  }

  if (preview) {
    return {
      label: `${preview.snapshot.items.length} item${
        preview.snapshot.items.length === 1 ? '' : 's'
      }`,
      className: 'preview-state-pill preview-state-pill--success',
    };
  }

  return {
    label: 'Ready',
    className: 'preview-state-pill preview-state-pill--pending',
  };
}

export default function FeedCardsPreview({
  feedUrl,
  mode,
  unavailableReason,
  hasPendingChanges = false,
}: FeedCardsPreviewProps) {
  const [preview, setPreview] = useState<FeedPreviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [failure, setFailure] = useState<PreviewFailure | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const debouncedFeedUrl = useDebouncedValue(feedUrl, 220);

  useEffect(() => {
    if (mode !== 'ready' || !debouncedFeedUrl) {
      setPreview(null);
      setFailure(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    let isCancelled = false;

    async function loadPreview() {
      setIsLoading(true);
      setFailure(null);

      try {
        const result = await fetchFeedPreview(debouncedFeedUrl, {
          signal: controller.signal,
        });

        if (isCancelled) {
          return;
        }

        setPreview(result);
        if (result.state === 'parse_failed') {
          setFailure({
            kind: 'parse_failed',
            message:
              result.note ||
              'The feed responded, but the preview parser could not build compact cards from the response.',
          });
        }
      } catch (unknownError) {
        if (
          isCancelled ||
          (unknownError instanceof DOMException && unknownError.name === 'AbortError')
        ) {
          return;
        }

        if (unknownError instanceof FeedPreviewRequestError) {
          setFailure({
            kind: 'fetch_failed',
            message: unknownError.message,
            status: unknownError.status,
            statusText: unknownError.statusText,
          });
        } else {
          setFailure({
            kind: 'fetch_failed',
            message:
              unknownError instanceof Error
                ? unknownError.message
                : 'Unable to load the generated feed preview.',
          });
        }

        setPreview(null);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPreview();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [debouncedFeedUrl, mode, reloadCount]);

  const items = preview?.snapshot.items ?? [];
  const visibleItems = items.slice(0, 3);
  const statePill = getPreviewStatePill({
    mode,
    isLoading,
    preview,
    failure,
  });

  return (
    <section className="preview-stage">
      <div className="preview-stage-header">
        <div className="section-heading">
          <span className="panel-eyebrow">Recent items</span>
          <h3>In-page feed preview</h3>
          <p>
            {hasPendingChanges
              ? 'Preview is showing the last applied route values. Apply the current draft to refresh these cards.'
              : 'Verify the first items here before you save or open the raw feed.'}
          </p>
        </div>

        <div className="preview-stage-toolbar">
          <span className={statePill.className}>{statePill.label}</span>

          <button
            type="button"
            className="ghost-button"
            onClick={() => setReloadCount((current) => current + 1)}
            disabled={mode !== 'ready' || !feedUrl || isLoading}
          >
            {isLoading ? <LoaderCircle size={16} className="spin" /> : <RefreshCw size={16} />}
            <span>{isLoading ? 'Refreshing...' : 'Retry preview'}</span>
          </button>

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
      </div>

      {mode === 'pending_input' ? (
        <StateBlock
          compact
          title="Preview waits for a valid feed"
          message="Complete the required route parameters and apply them to load preview cards here."
        />
      ) : null}

      {mode === 'unsupported' ? (
        <StateBlock
          compact
          variant="error"
          title="Preview unavailable"
          message={
            unavailableReason ||
            'This route cannot generate a preview on the current instance configuration.'
          }
          action={
            <span className="inline-state-note">
              <AlertCircle size={14} />
              <span>Adjust the route support mode or try a route with lighter setup requirements.</span>
            </span>
          }
        />
      ) : null}

      {mode === 'ready' && isLoading && !preview ? (
        <div className="preview-card-grid preview-card-grid--loading" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="preview-card preview-card--skeleton" />
          ))}
        </div>
      ) : null}

      {mode === 'ready' && failure?.kind === 'fetch_failed' ? (
        <StateBlock
          compact
          variant="error"
          title="Preview fetch failed"
          message={failure.message}
          action={
            <div className="preview-meta">
              {typeof failure.status === 'number' ? (
                <span className="badge danger-badge">
                  Status {failure.status}
                  {failure.statusText ? ` ${failure.statusText}` : ''}
                </span>
              ) : null}
              <span className="inline-state-note">
                <AlertCircle size={14} />
                <span>Retry the preview or fall back to the raw feed only if you need to inspect the response directly.</span>
              </span>
            </div>
          }
        />
      ) : null}

      {mode === 'ready' && failure?.kind === 'parse_failed' ? (
        <StateBlock
          compact
          variant="info"
          title="Preview parse failed"
          message={failure.message}
          action={
            <span className="inline-state-note">
              <AlertCircle size={14} />
              <span>Use the raw feed or debug panel for deeper inspection.</span>
            </span>
          }
        />
      ) : null}

      {mode === 'ready' && preview?.state === 'empty' && !failure ? (
        <StateBlock
          compact
          variant="info"
          title="Preview is empty"
          message="The feed responded successfully, but there were no recent items to render as cards."
        />
      ) : null}

      {mode === 'ready' && preview ? (
        <div className="preview-stage-body">
          <div className="preview-stage-summary">
            <div className="preview-stage-copy">
              <strong>{preview.snapshot.feedTitle || 'Generated feed'}</strong>
              {preview.snapshot.feedDescription ? (
                <p>{preview.snapshot.feedDescription}</p>
              ) : null}
            </div>

            <div className="preview-meta">
              <span className="badge subtle">Status {preview.status}</span>
              <span className="badge">
                {preview.state === 'parse_failed'
                  ? 'Parse failed'
                  : `${items.length} item${items.length === 1 ? '' : 's'}`}
              </span>
            </div>
          </div>

          {visibleItems.length ? (
            <div className="preview-card-grid">
              {visibleItems.map((item, index) =>
                renderPreviewCard(item, index, preview.snapshot.feedTitle)
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
