import { ExternalLink, LoaderCircle, Play } from 'lucide-react';
import { useState } from 'react';
import PanelHeader from './PanelHeader';
import StateBlock from './StateBlock';
import type { FeedPreviewResult } from '../utils/feedPreview';
import { fetchFeedPreview } from '../utils/feedPreview';

type FeedPreviewProps = {
  feedUrl: string;
  disabled?: boolean;
};

export default function FeedPreview({
  feedUrl,
  disabled = false,
}: FeedPreviewProps) {
  const [preview, setPreview] = useState<FeedPreviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLoadPreview() {
    if (!feedUrl || disabled) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await fetchFeedPreview(feedUrl);
      setPreview(result);
    } catch (unknownError) {
      const message =
        unknownError instanceof Error
          ? unknownError.message
          : 'Unable to load feed preview.';
      setError(message);
      setPreview(null);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="panel panel--muted utility-mode-panel feed-preview">
      <PanelHeader
        eyebrow="Debug"
        title="Raw feed response"
        description="Load the debug JSON only when you need to inspect the underlying response payload."
        actions={
          <div className="builder-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={handleLoadPreview}
              disabled={!feedUrl || disabled || isLoading}
            >
              {isLoading ? <LoaderCircle size={16} className="spin" /> : <Play size={16} />}
              <span>{isLoading ? 'Loading...' : 'Load debug JSON'}</span>
            </button>

            {preview?.sourceUrl ? (
              <a
                href={preview.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="ghost-button"
              >
                <ExternalLink size={16} />
                <span>Open raw response</span>
              </a>
            ) : null}
          </div>
        }
      />

      {disabled ? (
        <StateBlock
          title="Debug view unavailable"
          message="Generate a valid feed first. The raw debug JSON is kept secondary to the in-page preview cards."
        />
      ) : null}

      {!disabled && error ? (
        <StateBlock
          variant="error"
          title="Preview request failed"
          message={error}
          action={
            <button
              type="button"
              className="ghost-button"
              onClick={handleLoadPreview}
              disabled={isLoading}
            >
              Retry preview
            </button>
          }
        />
      ) : null}

      {!disabled && !isLoading && !error && preview ? (
        <div className="preview-output-wrap">
          <div className="preview-meta">
            <span className="badge subtle">Status {preview.status}</span>
            <span className="badge">{preview.statusText || 'OK'}</span>
          </div>

          <pre className="surface-card preview-output">
            {typeof preview.body === 'string'
              ? preview.body
              : JSON.stringify(preview.body, null, 2)}
          </pre>
        </div>
      ) : null}

      {!disabled && !isLoading && !error && !preview ? (
        <StateBlock
          variant="info"
          title="Debug JSON not loaded yet"
          message="Use this only when you want to inspect the raw response shape behind the in-page preview cards."
        />
      ) : null}
    </section>
  );
}
