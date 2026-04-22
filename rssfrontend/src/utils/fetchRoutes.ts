import type { RoutesCatalog } from '../types';

const ROUTES_CATALOG_URL = '/rsshub-docs/routes.json';

async function fetchJson(url: string): Promise<RoutesCatalog> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load routes catalog from ${url}: ${response.status}`);
  }

  console.log(`Loaded routes catalog from ${url}: ${response.status}`);

  return (await response.json()) as RoutesCatalog;
}

export async function fetchRoutesCatalog(): Promise<RoutesCatalog> {
  return fetchJson(ROUTES_CATALOG_URL);
}

export const routesCatalogSources = {
  catalog: ROUTES_CATALOG_URL,
};