import type {
  FeedFormat,
  RouteDefinition,
  RouteItem,
  RouteNamespace,
  RouteParameter,
  RoutesCatalog,
} from '../types';

const PARAM_REGEX = /:([A-Za-z0-9_]+)(\?)?/g;

export function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function extractRouteParams(routePath: string): RouteParameter[] {
  const seen = new Set<string>();
  const params: RouteParameter[] = [];

  for (const match of routePath.matchAll(PARAM_REGEX)) {
    const name = match[1];
    const optionalFlag = match[2];
    const required = optionalFlag !== '?';

    if (!seen.has(name)) {
      seen.add(name);
      params.push({
        name,
        required,
      });
    }
  }

  return params;
}

function asTrimmedString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

function firstString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.trim()) {
        return item.trim();
      }
    }
  }

  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  if (typeof value === 'string' && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function getNamespaceTitle(namespaceKey: string, namespaceValue: RouteNamespace): string {
  return (
    asTrimmedString(namespaceValue.name) ||
    asTrimmedString(namespaceValue.title) ||
    namespaceKey
  );
}

function getNamespaceDescription(namespaceValue: RouteNamespace): string {
  return (
    asTrimmedString(namespaceValue.description) ||
    asTrimmedString(namespaceValue.docs) ||
    ''
  );
}

function getRouteTitle(namespaceTitle: string, routeMeta: RouteDefinition): string {
  return (
    asTrimmedString(routeMeta.name) ||
    asTrimmedString(routeMeta.title) ||
    namespaceTitle
  );
}

function getRouteDescription(
  namespaceDescription: string,
  routeMeta: RouteDefinition
): string {
  return (
    asTrimmedString(routeMeta.docs) ||
    asTrimmedString(routeMeta.doc) ||
    namespaceDescription ||
    'RSSHub route'
  );
}

export function flattenRoutesCatalog(catalog: RoutesCatalog): RouteItem[] {
  const items: RouteItem[] = [];

  for (const [namespaceKey, namespaceValue] of Object.entries(catalog)) {
    if (!namespaceValue || typeof namespaceValue !== 'object') {
      continue;
    }

    const namespaceTitle = getNamespaceTitle(namespaceKey, namespaceValue);
    const namespaceDescription = getNamespaceDescription(namespaceValue);
    const namespaceCategories = asStringArray(namespaceValue.categories);
    const namespaceMaintainers = asStringArray(namespaceValue.maintainers);
    const routes = namespaceValue.routes ?? {};

    for (const [routeKey, routeMeta] of Object.entries(routes)) {
      if (!routeMeta || typeof routeMeta !== 'object') {
        continue;
      }

      const rawRoutePath = firstString(routeMeta.path) || routeKey;
      const routePath = rawRoutePath.startsWith(`/${namespaceKey}/`)
        ? rawRoutePath
        : `/${namespaceKey}${rawRoutePath.startsWith('/') ? '' : '/'}${rawRoutePath}`;
      const title = getRouteTitle(namespaceTitle, routeMeta);
      const description = getRouteDescription(namespaceDescription, routeMeta);
      const categories = asStringArray(routeMeta.categories);
      const maintainers = asStringArray(routeMeta.maintainers);

      items.push({
        id: `${namespaceKey}:${routePath}`,
        namespace: namespaceKey,
        title,
        description,
        routePath,
        radar: asTrimmedString(routeMeta.radar) || asTrimmedString(namespaceValue.radar),
        maintainers: maintainers.length ? maintainers : namespaceMaintainers,
        params: extractRouteParams(routePath),
        categories: categories.length ? categories : namespaceCategories,
        docsUrl: asTrimmedString(routeMeta.url) || asTrimmedString(namespaceValue.url),
      });
    }
  }

  return items.sort((a, b) => {
    const scoreA = `${a.title} ${a.routePath}`.toLowerCase();
    const scoreB = `${b.title} ${b.routePath}`.toLowerCase();
    return scoreA.localeCompare(scoreB);
  });
}

export function applyRouteParams(
  routePath: string,
  values: Record<string, string>
): string {
  const segments = routePath.split('/').filter(Boolean);
  const builtSegments: string[] = [];

  for (const segment of segments) {
    const match = segment.match(/^:([A-Za-z0-9_]+)(\?)?$/);

    if (!match) {
      builtSegments.push(segment);
      continue;
    }

    const [, rawName, optionalFlag] = match;
    const value = values[rawName]?.trim() ?? '';
    const isOptional = optionalFlag === '?';

    if (!value) {
      if (isOptional) {
        continue;
      }

      builtSegments.push('');
      continue;
    }

    builtSegments.push(encodeURIComponent(value));
  }

  return `/${builtSegments.join('/')}`;
}

export function buildFeedUrl(options: {
  baseUrl: string;
  routePath: string;
  routeParamValues?: Record<string, string>;
  queryParams?: Record<string, string>;
  format?: FeedFormat;
}): string {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const filledPath = applyRouteParams(
    options.routePath,
    options.routeParamValues ?? {}
  );

  const suffix =
    options.format === 'atom'
      ? '.atom'
      : options.format === 'json'
      ? '.json'
      : options.format === 'debug'
      ? '.debug.json'
      : '';

  const url = new URL(`${baseUrl}${filledPath}${suffix}`);

  for (const [key, value] of Object.entries(options.queryParams ?? {})) {
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();

    if (trimmedKey && trimmedValue) {
      url.searchParams.set(trimmedKey, trimmedValue);
    }
  }

  return url.toString();
}

export function getRoutePlaceholder(route: RouteItem): string {
  if (route.params.length === 0) {
    return route.routePath;
  }

  return `${route.routePath} - ${route.params
    .map((param) => (param.required ? `<${param.name}>` : `[${param.name}]`))
    .join(' ')}`;
}

export function matchesRoute(route: RouteItem, query: string): boolean {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  const haystack = [
    route.title,
    route.description,
    route.namespace,
    route.routePath,
    route.categories.join(' '),
    route.params.map((param) => param.name).join(' '),
    route.maintainers?.join(' ') ?? '',
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalized);
}

export function scoreRoute(route: RouteItem, query: string): number {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return 0;
  }

  let score = 0;
  const title = route.title.toLowerCase();
  const path = route.routePath.toLowerCase();
  const namespace = route.namespace.toLowerCase();
  const description = route.description.toLowerCase();
  const categories = route.categories.join(' ').toLowerCase();

  if (title === normalized) score += 140;
  if (path === normalized) score += 140;
  if (title.startsWith(normalized)) score += 90;
  if (path.startsWith(normalized)) score += 80;
  if (namespace === normalized) score += 65;
  if (namespace.startsWith(normalized)) score += 45;
  if (title.includes(normalized)) score += 40;
  if (path.includes(normalized)) score += 35;
  if (categories.includes(normalized)) score += 20;
  if (description.includes(normalized)) score += 15;

  for (const param of route.params) {
    if (param.name.toLowerCase().includes(normalized)) {
      score += 10;
    }
  }

  return score;
}

export function searchRoutes(routes: RouteItem[], query: string): RouteItem[] {
  const normalized = query.trim();

  return routes
    .filter((route) => matchesRoute(route, normalized))
    .sort((a, b) => {
      const scoreDiff = scoreRoute(b, normalized) - scoreRoute(a, normalized);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }

      const titleCompare = a.title.localeCompare(b.title);
      if (titleCompare !== 0) {
        return titleCompare;
      }

      return a.routePath.localeCompare(b.routePath);
    });
}
