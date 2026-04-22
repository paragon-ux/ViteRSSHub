import { ArrowUpRight, Copy, Download, ListFilter, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { SavedFeed } from '../types';
import PanelHeader from './PanelHeader';
import StateBlock from './StateBlock';

type SavedFeedsProps = {
  feeds: SavedFeed[];
  activeFeedId?: string;
  onDeleteFeed: (id: string) => void;
  onOpenFeed: (feed: SavedFeed) => void;
  onOpenFilter?: () => void;
};

function buildOpml(feeds: SavedFeed[]): string {
  const outlines = feeds
    .map(
      (feed) =>
        `    <outline text="${escapeXml(feed.label)}" title="${escapeXml(
          feed.label
        )}" type="rss" xmlUrl="${escapeXml(feed.url)}" />`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
  <head>
    <title>RSSHub Saved Feeds</title>
  </head>
  <body>
${outlines}
  </body>
</opml>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function formatSavedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function SavedFeeds({
  feeds,
  activeFeedId,
  onDeleteFeed,
  onOpenFeed,
  onOpenFilter,
}: SavedFeedsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const opml = useMemo(() => buildOpml(feeds), [feeds]);
  const sortedFeeds = useMemo(
    () => [...feeds].sort((a, b) => b.createdAt - a.createdAt),
    [feeds]
  );

  async function handleCopy(url: string, id: string) {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);

    window.setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 1200);
  }

  function handleExport() {
    const blob = new Blob([opml], { type: 'text/xml;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = 'rsshub-feeds.opml';
    link.click();
    URL.revokeObjectURL(href);
  }

  return (
    <section className="panel panel--secondary utility-mode-panel saved-feeds">
      <PanelHeader
        eyebrow="Library"
        title="Saved feeds"
        description="Keep reusable feeds close, then open the selected entry in the dedicated live-feed view."
        actions={
          <>
            <button
              type="button"
              className="ghost-button"
              onClick={onOpenFilter}
              disabled={!onOpenFilter}
            >
              <ListFilter size={16} />
              <span>Filter</span>
            </button>

            <button
              type="button"
              className="ghost-button"
              onClick={handleExport}
              disabled={!feeds.length}
            >
              <Download size={16} />
              <span>Export OPML</span>
            </button>
          </>
        }
      />

      {!sortedFeeds.length ? (
        <StateBlock
          title="No saved feeds yet"
          message="Build a route and save it here to keep a reusable local subscription list."
        />
      ) : (
        <div className="saved-library-list saved-library-list--compact" role="list" aria-label="Saved feeds">
          {sortedFeeds.map((feed) => {
            const isActive = feed.id === activeFeedId;

            return (
              <article
                key={feed.id}
                className={`saved-feed-card saved-feed-card--compact ${isActive ? 'active' : ''}`}
                role="listitem"
              >
                <button
                  type="button"
                  className="saved-feed-select"
                  onClick={() => onOpenFeed(feed)}
                >
                  <div className="saved-feed-content">
                    <div className="saved-feed-meta">
                      <span className="badge subtle">Saved {formatSavedAt(feed.createdAt)}</span>
                      {isActive ? <span className="badge">Open</span> : null}
                    </div>
                    <h3>{feed.label}</h3>
                    <p>{feed.url}</p>
                  </div>
                </button>

                <div className="saved-feed-actions">
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => onOpenFeed(feed)}
                    aria-label="Open live feed"
                    title="Open live feed"
                  >
                    <ArrowUpRight size={16} />
                  </button>

                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => void handleCopy(feed.url, feed.id)}
                    aria-label="Copy feed URL"
                    title="Copy feed URL"
                  >
                    <Copy size={16} />
                  </button>

                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => onDeleteFeed(feed.id)}
                    aria-label="Delete saved feed"
                    title="Delete saved feed"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {copiedId === feed.id ? (
                  <div className="saved-feed-copied">Copied to clipboard</div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
