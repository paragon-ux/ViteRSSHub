import type {
  ConfigEntry,
  RouteItem,
  RouteSupportFilter,
  RouteSupportStatus,
} from '../types';
import { getRouteRequirements } from './routeRequirements';
import {
  getTwitterSourceMode,
  getTwitterSupport,
  type TwitterSupport,
} from './twitterSource';

export type RouteSupportSummary = {
  status: RouteSupportStatus;
  label: string;
  badgeClassName: string;
  description: string;
  sourceLabel?: string;
};

function badgeClassNameForStatus(status: RouteSupportStatus): string {
  if (status === 'ready') {
    return 'support-badge support-badge--ready';
  }

  if (status === 'recommended') {
    return 'support-badge support-badge--recommended';
  }

  if (status === 'required') {
    return 'support-badge support-badge--required';
  }

  if (status === 'advanced') {
    return 'support-badge support-badge--advanced';
  }

  return 'support-badge support-badge--unsupported';
}

function summarizeTwitterSupport(
  route: RouteItem,
  configEntries: ConfigEntry[]
): RouteSupportSummary | null {
  if (!route.routePath.startsWith('/twitter/')) {
    return null;
  }

  const sourceMode = getTwitterSourceMode(configEntries);
  const support = getTwitterSupport(route);

  if (sourceMode === 'disabled') {
    return {
      status: 'unsupported',
      label: 'Unsupported on this instance',
      badgeClassName: badgeClassNameForStatus('unsupported'),
      description:
        'Twitter/X routes are disabled by the current instance configuration.',
      sourceLabel: 'Twitter/X disabled',
    };
  }

  if (sourceMode === 'nitter') {
    if (support === 'nitter_user') {
      return {
        status: 'ready',
        label: 'Ready to use',
        badgeClassName: badgeClassNameForStatus('ready'),
        description:
          'This route is mapped to a Nitter-backed public user feed. Set a custom Nitter base URL if your default mirror is unstable.',
        sourceLabel: 'Nitter-backed',
      };
    }

    return {
      status: 'unsupported',
      label: 'Unsupported on this instance',
      badgeClassName: badgeClassNameForStatus('unsupported'),
      description:
        support === 'official_only'
          ? route.routePath.startsWith('/twitter/keyword/') ||
            route.routePath.startsWith('/twitter/search/')
            ? 'Nitter RSS is profile-based at `/<handle>/rss`, so Twitter/X keyword and search routes are not available while the instance stays in Nitter mode.'
            : 'This Twitter/X route needs official RSSHub Twitter config and is not available while the instance is set to Nitter mode.'
          : 'This Twitter/X route does not currently have a Nitter fallback on this instance.',
      sourceLabel: 'Official auth needed',
    };
  }

  return {
    status: support === 'unsupported' ? 'advanced' : 'required',
    label:
      support === 'unsupported'
        ? 'Advanced setup required'
        : 'Required API/config',
    badgeClassName: badgeClassNameForStatus(
      support === 'unsupported' ? 'advanced' : 'required'
    ),
    description:
      support === 'unsupported'
        ? 'This Twitter/X route may need custom provider support or deeper instance setup when not using Nitter mode.'
        : 'This Twitter/X route uses RSSHub official handling and may require authenticated Twitter/X instance config.',
    sourceLabel: 'Official Twitter/X',
  };
}

function summarizeGenericSupport(route: RouteItem): RouteSupportSummary {
  const requirements = getRouteRequirements(route);
  const requiredTypes = requirements
    .filter((requirement) => requirement.level === 'required')
    .map((requirement) => requirement.type);
  const recommendedTypes = requirements
    .filter((requirement) => requirement.level === 'recommended')
    .map((requirement) => requirement.type);

  if (requiredTypes.some((type) => type === 'self_host' || type === 'browser' || type === 'unknown')) {
    return {
      status: 'advanced',
      label: 'Advanced setup required',
      badgeClassName: badgeClassNameForStatus('advanced'),
      description:
        'This route depends on self-hosting, browser support, or another advanced instance dependency before it is reliable.',
    };
  }

  if (requiredTypes.length) {
    return {
      status: 'required',
      label: 'Required API/config',
      badgeClassName: badgeClassNameForStatus('required'),
      description:
        'This route needs credentials, cookies, tokens, or other required instance config before it will work.',
    };
  }

  if (recommendedTypes.some((type) => type === 'api_key' || type === 'token')) {
    return {
      status: 'recommended',
      label: 'Optional API recommended',
      badgeClassName: badgeClassNameForStatus('recommended'),
      description:
        'This route is usually usable immediately, but an API key or token is recommended for better reliability or richer results.',
    };
  }

  if (recommendedTypes.length) {
    return {
      status: 'recommended',
      label: 'Setup recommended',
      badgeClassName: badgeClassNameForStatus('recommended'),
      description:
        'This route can often work as-is, but instance tuning or supporting services are recommended for stable behavior.',
    };
  }

  return {
    status: 'ready',
    label: 'Ready to use',
    badgeClassName: badgeClassNameForStatus('ready'),
    description:
      'This route has no known required setup burden from the frontend and is a good first candidate to try immediately.',
  };
}

export function getRouteSupportSummary(
  route: RouteItem | undefined,
  configEntries: ConfigEntry[]
): RouteSupportSummary | undefined {
  if (!route) {
    return undefined;
  }

  return summarizeTwitterSupport(route, configEntries) ?? summarizeGenericSupport(route);
}

export function matchesSupportFilter(
  summary: RouteSupportSummary | undefined,
  filter: RouteSupportFilter
): boolean {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'ready') {
    return summary?.status === 'ready' || summary?.status === 'recommended';
  }

  return summary?.status === filter;
}

export function isRouteUsableByDefault(
  summary: RouteSupportSummary | undefined
): boolean {
  return matchesSupportFilter(summary, 'ready');
}

export function getTwitterSupportSourceLabel(support: TwitterSupport): string | undefined {
  if (support === 'nitter_user') {
    return 'Nitter-backed';
  }

  if (support === 'official_only') {
    return 'Official auth needed';
  }

  return undefined;
}
