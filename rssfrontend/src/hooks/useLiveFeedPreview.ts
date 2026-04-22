import { useEffect, useMemo, useState } from 'react';
import {
  FeedPreviewRequestError,
  fetchFeedPreview,
  type FeedPreviewResult,
} from '../utils/feedPreview';
import { useDebouncedValue } from './useDebouncedValue';

export type LiveFeedMode = 'pending_input' | 'unsupported' | 'ready';

export type LiveFeedFailure =
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

export function useLiveFeedPreview(options: {
  feedUrl: string;
  mode: LiveFeedMode;
}) {
  const { feedUrl, mode } = options;
  const [preview, setPreview] = useState<FeedPreviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [failure, setFailure] = useState<LiveFeedFailure | null>(null);
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
              'The feed responded, but the app could not build the live feed view from the response.',
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
                : 'Unable to load the live feed.',
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

  const items = useMemo(() => preview?.snapshot.items ?? [], [preview?.snapshot.items]);
  const totalItems = preview?.snapshot.totalItems ?? items.length;
  const hasRenderableFeed = preview?.state === 'success' && items.length > 0 && !failure;

  return {
    preview,
    isLoading,
    failure,
    items,
    totalItems,
    shownItems: items.length,
    hasRenderableFeed,
    refresh: () => setReloadCount((current) => current + 1),
  };
}
