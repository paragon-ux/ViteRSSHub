import { Copy, Download, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import PanelHeader from './PanelHeader';
import StateBlock from './StateBlock';
import type { SavedFeed } from '../types';

type SavedFeedsProps = {
  feeds: SavedFeed[];
  onDeleteFeed: (id: string) => void;
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
  onDeleteFeed,
}: SavedFeedsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const opml = useMemo(() => buildOpml(feeds), [feeds]);

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
    <section className="panel panel--secondary saved-feeds">
      <PanelHeader
        eyebrow="Library"
        title="Saved feeds"
        description="Keep a reusable list of generated RSSHub feeds and export them as OPML."
        actions={
          <button
            type="button"
            className="ghost-button"
            onClick={handleExport}
            disabled={!feeds.length}
          >
            <Download size={16} />
            <span>Export OPML</span>
          </button>
        }
      />

      {!feeds.length ? (
        <StateBlock
          title="No saved feeds yet"
          message="Build a route and save it here to keep a reusable local subscription list."
        />
      ) : (
        <div className="saved-feed-list">
          {feeds.map((feed) => (
            <article
              key={feed.id}
              className="surface-card surface-card--quiet saved-feed-card"
            >
              <div className="saved-feed-content">
                <div className="saved-feed-meta">
                  <span className="badge subtle">Saved {formatSavedAt(feed.createdAt)}</span>
                </div>
                <h3>{feed.label}</h3>
                <p>{feed.url}</p>
              </div>

              <div className="saved-feed-actions">
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => handleCopy(feed.url, feed.id)}
                  aria-label="Copy feed URL"
                >
                  <Copy size={16} />
                </button>

                <button
                  type="button"
                  className="icon-button danger"
                  onClick={() => onDeleteFeed(feed.id)}
                  aria-label="Delete saved feed"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {copiedId === feed.id ? (
                <div className="saved-feed-copied">Copied to clipboard</div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
