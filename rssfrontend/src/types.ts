export type RouteParameter = {
  name: string;
  required: boolean;
};

export type RouteItem = {
  id: string;
  namespace: string;
  title: string;
  description: string;
  routePath: string;
  radar?: string;
  maintainers?: string[];
  params: RouteParameter[];
  categories: string[];
  docsUrl?: string;
};

export type RouteSupportFilter =
  | 'all'
  | 'ready'
  | 'recommended'
  | 'required'
  | 'advanced'
  | 'unsupported';

export type RouteSupportStatus =
  | Exclude<RouteSupportFilter, 'all'>;

export type RouteDefinition = {
  path?: string;
  name?: string;
  title?: string;
  docs?: string;
  doc?: string;
  url?: string;
  radar?: string;
  maintainers?: string[];
  categories?: string[];
};

export type RouteNamespace = {
  name?: string;
  title?: string;
  url?: string;
  description?: string;
  docs?: string;
  radar?: string;
  maintainers?: string[];
  categories?: string[];
  routes?: Record<string, RouteDefinition>;
};

export type RoutesCatalog = Record<string, RouteNamespace>;

export type FeedFormat = 'rss' | 'atom' | 'json' | 'debug';

export type SavedFeed = {
  id: string;
  label: string;
  url: string;
  routeId: string;
  createdAt: number;
};

export type ConfigValueType = 'text' | 'password' | 'textarea';

export type ConfigHint = {
  key: string;
  label: string;
  description: string;
  required: boolean;
  valueType?: ConfigValueType;
};

export type ConfigEntry = {
  key: string;
  value: string;
  label?: string;
  description?: string;
  valueType?: ConfigValueType;
  required?: boolean;
};

export type RemoteConfigStatus = {
  endpointUrl: string;
  lastLoadedAt?: string;
  lastSavedAt?: string;
  message?: string;
  error?: string;
};
