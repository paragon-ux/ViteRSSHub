import type { ConfigEntry, RouteItem } from '../types';
import { buildNitterUserFeed } from './nitter';

export type TwitterSourceMode = 'nitter' | 'official' | 'disabled';

export type TwitterSupport =
  | 'nitter_user'
  | 'official_only'
  | 'unsupported';

const DEFAULT_NITTER_BASE_URL = 'https://nitter.net';

function getConfigValue(entries: ConfigEntry[], key: string): string | undefined {
  return entries.find((entry) => entry.key === key)?.value?.trim();
}

export function getTwitterSourceMode(entries: ConfigEntry[]): TwitterSourceMode {
  const rawValue = getConfigValue(entries, 'TWITTER_SOURCE')?.toLowerCase();

  if (rawValue === 'official' || rawValue === 'disabled' || rawValue === 'nitter') {
    return rawValue;
  }

  return 'nitter';
}

export function getNitterBaseUrl(entries: ConfigEntry[]): string {
  return getConfigValue(entries, 'NITTER_BASE_URL') || DEFAULT_NITTER_BASE_URL;
}

export function getTwitterSupport(route?: RouteItem): TwitterSupport {
  if (!route) {
    return 'unsupported';
  }

  const path = route.routePath;

  if (path.startsWith('/twitter/user/') || path === '/twitter/user/:id') {
    return 'nitter_user';
  }

  if (
    path.startsWith('/twitter/keyword/') ||
    path.startsWith('/twitter/search/')
  ) {
    return 'official_only';
  }

  if (
    path.startsWith('/twitter/home_latest') ||
    path.startsWith('/twitter/likes/') ||
    path.startsWith('/twitter/list/') ||
    path.startsWith('/twitter/trends') ||
    path.startsWith('/twitter/bookmarks') ||
    path.startsWith('/twitter/media/')
  ) {
    return 'official_only';
  }

  return 'unsupported';
}

export function buildTwitterSourceUrl(options: {
  route?: RouteItem;
  routeParamValues: Record<string, string>;
  configEntries: ConfigEntry[];
}): string | null {
  const { route, routeParamValues, configEntries } = options;

  if (!route) {
    return null;
  }

  const sourceMode = getTwitterSourceMode(configEntries);

  if (sourceMode === 'disabled' || sourceMode === 'official') {
    return null;
  }

  const support = getTwitterSupport(route);
  const nitterBaseUrl = getNitterBaseUrl(configEntries);

  if (support === 'nitter_user') {
    const username =
      routeParamValues.username?.trim() ||
      routeParamValues.id?.trim() ||
      routeParamValues.handle?.trim() ||
      '';

    if (!username) {
      return null;
    }

    return buildNitterUserFeed(nitterBaseUrl, username);
  }

  return null;
}

export function getTwitterSupportMessage(route?: RouteItem): string | undefined {
  const support = getTwitterSupport(route);

  if (support === 'nitter_user') {
    return 'Supported through Nitter as a public user feed only.';
  }

  if (support === 'official_only') {
    if (
      route?.routePath.startsWith('/twitter/keyword/') ||
      route?.routePath.startsWith('/twitter/search/')
    ) {
      return 'Nitter RSS is profile-based at `/<handle>/rss`. Twitter/X keyword and search routes are not mapped to that pattern.';
    }

    return 'This Twitter/X route is not supported through Nitter. Only main profile feeds are mapped to `/<handle>/rss`.';
  }

  return 'This Twitter/X route is not currently mapped to a Nitter fallback.';
}
