export type RouteParameter = {
  name: string;
  required: boolean;
};

export type RouteDocOption = {
  value: string;
  label?: string;
};

export type RouteDocParameterDefinition = {
  description?: string;
  default?: string;
  options?: RouteDocOption[];
};

export type RouteDocParameter = string | RouteDocParameterDefinition;

export type RouteDocParameters = Record<string, RouteDocParameter>;

export type RouteFeatureConfigRequirement = {
  name?: string;
  optional?: boolean;
  description?: string;
};

export type RouteFeatureDefinition = {
  requireConfig?: boolean | RouteFeatureConfigRequirement[];
};

export type RouteItem = {
  id: string;
  namespace: string;
  sourceTitle: string;
  sourceDescription?: string;
  title: string;
  description: string;
  routePath: string;
  radar?: string;
  maintainers?: string[];
  params: RouteParameter[];
  categories: string[];
  docsUrl?: string;
  docExample?: string;
  docParameters?: RouteDocParameters;
  docFeatures?: RouteFeatureDefinition;
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
  example?: string;
  parameters?: RouteDocParameters;
  features?: RouteFeatureDefinition;
  test?: unknown;
  topFeeds?: unknown;
  location?: string;
  heat?: number;
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
