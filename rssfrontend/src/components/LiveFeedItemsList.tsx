import { ExternalLink } from 'lucide-react';
import {
  memo,
  useLayoutEffect,
  useRef,
} from 'react';
import type { FeedPreviewItem } from '../utils/feedPreview';

type LiveFeedItemsListProps = {
  items: FeedPreviewItem[];
  fallbackSource?: string;
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

function getItemMeta(item: FeedPreviewItem, fallbackSource?: string): string[] {
  const meta: string[] = [];
  const source = item.source || fallbackSource;
  const publishedAt = formatPreviewTime(item.publishedAt);

  if (source) {
    meta.push(source);
  }

  if (publishedAt) {
    meta.push(publishedAt);
  }

  return meta;
}

const FeedCard = memo(function FeedCard({
  item,
  fallbackSource,
  index,
  onMeasure,
}: {
  item: FeedPreviewItem;
  fallbackSource?: string;
  index: number;
  onMeasure?: (index: number, height: number) => void;
}) {
  const articleRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!onMeasure || !articleRef.current) {
      return;
    }

    const node = articleRef.current;

    const updateHeight = () => {
      onMeasure(index, node.getBoundingClientRect().height);
    };

    updateHeight();

    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [index, item.imageUrl, item.link, item.summary, item.title, onMeasure]);

  return (
    <article ref={articleRef} className="live-feed-browser-post" role="listitem">
      <div className="live-feed-browser-post-main">
        <div className="live-feed-browser-post-top">
          <div className="preview-card-meta">
            {getItemMeta(item, fallbackSource).map((value) => (
              <span key={value}>{value}</span>
            ))}
          </div>

          {item.link ? (
            <a
              href={item.link}
              target="_blank"
              rel="noreferrer"
              className="ghost-button"
            >
              <ExternalLink size={16} />
              <span>Open item</span>
            </a>
          ) : null}
        </div>

        <h3>{item.title}</h3>

        {item.summary ? <p>{item.summary}</p> : null}
      </div>

      {item.imageUrl ? (
        <div className="live-feed-browser-media">
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            fetchPriority="low"
          />
        </div>
      ) : null}
    </article>
  );
});

export default function LiveFeedItemsList({
  items,
  fallbackSource,
}: LiveFeedItemsListProps) {
  return (
    <div className="live-feed-browser-list" role="list" aria-label="Live feed items">
      {items.map((item, index) => (
        <FeedCard
          key={item.id || `${item.title}-${index}`}
          item={item}
          fallbackSource={fallbackSource}
          index={index}
        />
      ))}
    </div>
  );
}
