import type { RouteItem } from '../types';
import { getTwitterSupport } from './twitterSource';

export type RequirementLevel = 'none' | 'recommended' | 'required';

export type RequirementType =
  | 'none'
  | 'cookie'
  | 'api_key'
  | 'token'
  | 'self_host'
  | 'browser'
  | 'cache'
  | 'login'
  | 'unknown';

export type RouteRequirement = {
  level: RequirementLevel;
  type: RequirementType;
  label: string;
  message: string;
  configUrl: string;
  docsUrl?: string;
};

const CONFIG_GUIDE_URL = 'https://docs.rsshub.app/deploy/config';

function hasPrefix(route: RouteItem, prefix: string): boolean {
  return route.routePath === prefix || route.routePath.startsWith(`${prefix}/`);
}

function defaultRequirement(route: RouteItem): RouteRequirement[] {
  return [
    {
      level: 'none',
      type: 'none',
      label: 'Ready to try',
      message:
        'This route has no known extra instance setup requirements from the frontend. You can usually test it immediately against your RSSHub instance.',
      configUrl: CONFIG_GUIDE_URL,
      docsUrl: route.docsUrl,
    },
  ];
}

export function getRouteRequirements(route?: RouteItem): RouteRequirement[] {
  if (!route) {
    return [];
  }

  const requirements: RouteRequirement[] = [];

  const add = (requirement: RouteRequirement) => {
    requirements.push({
      ...requirement,
      configUrl: requirement.configUrl || CONFIG_GUIDE_URL,
      docsUrl: requirement.docsUrl || route.docsUrl,
    });
  };

  if (hasPrefix(route, '/twitter')) {
    const support = getTwitterSupport(route);

    if (support === 'nitter_user') {
      add({
        level: 'none',
        type: 'none',
        label: 'Public Nitter route',
        message:
          'This Twitter/X profile route can be handled through a public or self-hosted Nitter instance when `TWITTER_SOURCE=nitter` is configured.',
        configUrl: CONFIG_GUIDE_URL,
      });

      add({
        level: 'recommended',
        type: 'unknown',
        label: 'Set NITTER_BASE_URL',
        message:
          'Set `NITTER_BASE_URL` to a working public or self-hosted Nitter instance. Public instances can be unreliable, so operator override is recommended.',
        configUrl: CONFIG_GUIDE_URL,
      });

      return requirements;
    }

    if (support === 'official_only') {
      add({
        level: 'required',
        type: 'login',
        label:
          hasPrefix(route, '/twitter/keyword') || hasPrefix(route, '/twitter/search')
            ? 'Profile RSS only on Nitter'
            : 'Official Twitter/X auth required',
        message:
          hasPrefix(route, '/twitter/keyword') || hasPrefix(route, '/twitter/search')
            ? 'Nitter RSS is reenabled for main profile feeds like `/<handle>/rss`, not keyword or search feeds. Use official RSSHub Twitter/X config for this route.'
            : 'This route is not a good Nitter fallback candidate and still requires authenticated Twitter/X configuration in RSSHub.',
        configUrl: CONFIG_GUIDE_URL,
      });

      return requirements;
    }

    add({
      level: 'recommended',
      type: 'unknown',
      label: 'No Nitter mapping',
      message:
        'This Twitter/X route is not currently mapped to a Nitter fallback. It may require official Twitter/X configuration or a custom provider implementation.',
      configUrl: CONFIG_GUIDE_URL,
    });

    return requirements;
  }

  if (hasPrefix(route, '/youtube/user')) {
    add({
      level: 'none',
      type: 'none',
      label: 'Ready to use',
      message:
        'This route usually works without special instance setup. It requires `username` in the path, supports optional `routeParams`, and accepts values like `embed=false`, `filterShorts=false`, or `embed=false&filterShorts=false`.',
      configUrl: CONFIG_GUIDE_URL,
    });

    add({
      level: 'recommended',
      type: 'api_key',
      label: 'Optional YOUTUBE_KEY',
      message:
        'RSSHub lists `YOUTUBE_KEY` as an optional instance config for this route, not a required one.',
      configUrl: CONFIG_GUIDE_URL,
    });
  }

  if (hasPrefix(route, '/instagram') || hasPrefix(route, '/instagram/2')) {
    add({
      level: 'required',
      type: 'self_host',
      label: 'Self-host only',
      message:
        'Instagram routes should be treated as self-hosted routes. Server-side credentials or access configuration may be needed depending on the route variant.',
      configUrl: CONFIG_GUIDE_URL,
    });

    add({
      level: 'required',
      type: 'login',
      label: 'Instance config required',
      message:
        'Instagram-related routes may require instance-level credentials or access configuration. Use the Config panel to manage the values expected by your deployment.',
      configUrl: CONFIG_GUIDE_URL,
    });

    add({
      level: 'recommended',
      type: 'cache',
      label: 'Redis recommended',
      message:
        'These routes are more fragile and anti-crawler sensitive, so cache support is helpful.',
      configUrl: CONFIG_GUIDE_URL,
    });
  }

  if (hasPrefix(route, '/mastodon')) {
    add({
      level: 'required',
      type: 'token',
      label: 'App credentials',
      message:
        'Mastodon API-based routes may require creating an application on a Mastodon instance, then configuring your RSSHub instance with those credentials.',
      configUrl: CONFIG_GUIDE_URL,
    });
  }

  if (hasPrefix(route, '/iwara/subscriptions')) {
    add({
      level: 'required',
      type: 'self_host',
      label: 'Self-host only',
      message: 'This route is intended for self-hosted RSSHub use.',
      configUrl: CONFIG_GUIDE_URL,
    });

    add({
      level: 'required',
      type: 'cookie',
      label: 'Cookie required',
      message:
        'This route requires a Cookie configured on the server side.',
      configUrl: CONFIG_GUIDE_URL,
    });
  }

  if (hasPrefix(route, '/discuz') && route.routePath.includes('/:cid/')) {
    add({
      level: 'required',
      type: 'self_host',
      label: 'Self-host only',
      message:
        'This Discuz variant expects server-side environment configuration and should be treated as a self-hosted route.',
      configUrl: CONFIG_GUIDE_URL,
    });

    add({
      level: 'required',
      type: 'cookie',
      label: 'Cookie required',
      message:
        'You need to configure the matching cookie information in your RSSHub deployment for this route to work.',
      configUrl: CONFIG_GUIDE_URL,
    });
  }

  const lowerTitle = `${route.title} ${route.description} ${route.routePath}`.toLowerCase();

  if (
    lowerTitle.includes('cookie') &&
    !requirements.some((item) => item.type === 'cookie')
  ) {
    add({
      level: 'required',
      type: 'cookie',
      label: 'Cookie likely required',
      message:
        'This route metadata suggests cookie-based access. Check the route docs and configure the needed cookie values in RSSHub.',
      configUrl: CONFIG_GUIDE_URL,
    });
  }

  if (
    (lowerTitle.includes('self-host') || lowerTitle.includes('self host')) &&
    !requirements.some((item) => item.type === 'self_host')
  ) {
    add({
      level: 'required',
      type: 'self_host',
      label: 'Self-host only',
      message:
        'This route appears to be intended only for self-hosted RSSHub deployments.',
      configUrl: CONFIG_GUIDE_URL,
    });
  }

  if (
    (lowerTitle.includes('api key') || lowerTitle.includes('token')) &&
    !requirements.some((item) => item.type === 'api_key' || item.type === 'token')
  ) {
    add({
      level: 'required',
      type: 'api_key',
      label: 'API key or token',
      message:
        'This route likely depends on an API key or token configured in the RSSHub environment.',
      configUrl: CONFIG_GUIDE_URL,
    });
  }

  if (
    lowerTitle.includes('browser extension') ||
    lowerTitle.includes('chromium') ||
    lowerTitle.includes('puppeteer')
  ) {
    add({
      level: 'recommended',
      type: 'browser',
      label: 'Browser automation may help',
      message:
        'Some routes work better when your RSSHub deployment supports Chromium or browser automation.',
      configUrl: CONFIG_GUIDE_URL,
    });
  }

  if (!requirements.length) {
    return defaultRequirement(route);
  }

  return requirements;
}

export function getRequirementTone(level: RequirementLevel): 'neutral' | 'warn' | 'danger' {
  if (level === 'required') {
    return 'danger';
  }

  if (level === 'recommended') {
    return 'warn';
  }

  return 'neutral';
}
