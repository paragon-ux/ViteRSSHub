import type { ConfigEntry, ConfigHint, RouteItem } from '../types';

function hasPrefix(route: RouteItem, prefix: string): boolean {
  return route.routePath === prefix || route.routePath.startsWith(`${prefix}/`);
}

export function getConfigHints(route?: RouteItem): ConfigHint[] {
  if (!route) {
    return [];
  }

  const hints: ConfigHint[] = [];
  const add = (hint: ConfigHint) => {
    if (!hints.some((item) => item.key === hint.key)) {
      hints.push(hint);
    }
  };

  if (hasPrefix(route, '/twitter')) {
    add({
      key: 'TWITTER_SOURCE',
      label: 'Twitter/X source',
      description:
        'Use `nitter` for public user feeds only. Other Twitter/X route types still need official authenticated RSSHub support or remain unsupported.',
      required: false,
      valueType: 'text',
    });

    add({
      key: 'NITTER_BASE_URL',
      label: 'Nitter base URL',
      description:
        'Base URL for the Nitter instance used for public user feeds, for example https://nitter.net.',
      required: false,
      valueType: 'text',
    });
  }

  if (hasPrefix(route, '/youtube')) {
    add({
      key: 'YOUTUBE_KEY',
      label: 'YouTube API key',
      description:
        'Optional instance-level API key for YouTube routes. This belongs in your RSSHub server config, not in the feed URL.',
      required: false,
      valueType: 'password',
    });
  }

  if (hasPrefix(route, '/mastodon')) {
    add({
      key: 'MASTODON_CLIENT_ID',
      label: 'Mastodon client ID',
      description:
        'Some Mastodon API-based routes may require an application client ID configured on the RSSHub instance.',
      required: true,
      valueType: 'password',
    });

    add({
      key: 'MASTODON_CLIENT_SECRET',
      label: 'Mastodon client secret',
      description:
        'Some Mastodon API-based routes may require an application client secret configured on the RSSHub instance.',
      required: true,
      valueType: 'password',
    });
  }

  if (hasPrefix(route, '/instagram') || hasPrefix(route, '/instagram/2')) {
    add({
      key: 'INSTAGRAM_CONFIG',
      label: 'Instagram instance config',
      description:
        'Instagram-related RSSHub routes may need instance-level credentials or access configuration. Enter the exact value your admin backend expects.',
      required: true,
      valueType: 'textarea',
    });
  }

  if (hasPrefix(route, '/iwara/subscriptions')) {
    add({
      key: 'IWARA_COOKIE',
      label: 'Iwara Cookie',
      description:
        'This self-hosted route may require a server-side Cookie value configured on the RSSHub instance.',
      required: true,
      valueType: 'textarea',
    });
  }

  if (hasPrefix(route, '/discuz') && route.routePath.includes('/:cid/')) {
    add({
      key: 'DISCUZ_COOKIE',
      label: 'Discuz Cookie',
      description:
        'Discuz cookie-based routes may require site-specific server-side cookie configuration.',
      required: true,
      valueType: 'textarea',
    });
  }

  return hints;
}

export function mergeConfigEntries(
  existing: ConfigEntry[],
  hints: ConfigHint[]
): ConfigEntry[] {
  const map = new Map(existing.map((entry) => [entry.key, entry]));

  for (const hint of hints) {
    if (!map.has(hint.key)) {
      let defaultValue = '';

      if (hint.key === 'TWITTER_SOURCE') {
        defaultValue = 'nitter';
      }

      if (hint.key === 'NITTER_BASE_URL') {
        defaultValue = 'https://nitter.net';
      }

      map.set(hint.key, {
        key: hint.key,
        value: defaultValue,
        label: hint.label,
        description: hint.description,
        valueType: hint.valueType ?? 'text',
        required: hint.required,
      });
    } else {
      const current = map.get(hint.key)!;
      map.set(hint.key, {
        ...current,
        label: current.label || hint.label,
        description: current.description || hint.description,
        valueType: current.valueType || hint.valueType || 'text',
        required: current.required ?? hint.required,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function toConfigExport(entries: ConfigEntry[]): string {
  return entries
    .filter((entry) => entry.key.trim() && entry.value.trim())
    .map((entry) => `${entry.key.trim()}=${entry.value}`)
    .join('\n');
}