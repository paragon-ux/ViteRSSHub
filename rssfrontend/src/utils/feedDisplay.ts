export type FeedDisplayLimitMode =
  | 'custom'
  | 'compact'
  | 'performance'
  | 'show20'
  | 'full';

export type FeedDisplayLimitSetting = {
  mode: FeedDisplayLimitMode;
  customLimit?: number | null;
};

export const DEFAULT_FEED_DISPLAY_LIMIT_SETTING: FeedDisplayLimitSetting = {
  mode: 'full',
};

export const FEED_DISPLAY_LIMIT_PRESETS = [
  {
    mode: 'compact' as const,
    label: 'Compact mode',
    detail: '(5 items)',
    limit: 5,
  },
  {
    mode: 'performance' as const,
    label: 'Performance mode',
    detail: '(10 items)',
    limit: 10,
  },
  {
    mode: 'show20' as const,
    label: 'Show first 20 items',
    detail: '(20 items)',
    limit: 20,
  },
  {
    mode: 'full' as const,
    label: 'Full feed',
    detail: '(all items)',
    limit: null,
  },
];

function normalizeCustomLimit(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    return null;
  }

  return value;
}

export function normalizeFeedDisplayLimitSetting(
  setting?: FeedDisplayLimitSetting
): FeedDisplayLimitSetting {
  if (!setting) {
    return DEFAULT_FEED_DISPLAY_LIMIT_SETTING;
  }

  if (setting.mode === 'custom') {
    const customLimit = normalizeCustomLimit(setting.customLimit);

    if (!customLimit) {
      return DEFAULT_FEED_DISPLAY_LIMIT_SETTING;
    }

    return {
      mode: 'custom',
      customLimit,
    };
  }

  return {
    mode: setting.mode,
  };
}

export function resolveFeedDisplayLimit(
  setting?: FeedDisplayLimitSetting
): number | null {
  const normalized = normalizeFeedDisplayLimitSetting(setting);

  if (normalized.mode === 'custom') {
    return normalized.customLimit ?? null;
  }

  const preset = FEED_DISPLAY_LIMIT_PRESETS.find(
    (entry) => entry.mode === normalized.mode
  );

  return preset?.limit ?? null;
}

export function areFeedDisplaySettingsEqual(
  left?: FeedDisplayLimitSetting,
  right?: FeedDisplayLimitSetting
): boolean {
  const normalizedLeft = normalizeFeedDisplayLimitSetting(left);
  const normalizedRight = normalizeFeedDisplayLimitSetting(right);

  return (
    normalizedLeft.mode === normalizedRight.mode &&
    (normalizedLeft.customLimit ?? null) === (normalizedRight.customLimit ?? null)
  );
}
