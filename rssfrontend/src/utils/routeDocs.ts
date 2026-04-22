import type {
  RouteDocOption,
  RouteDocParameterDefinition,
  RouteItem,
} from '../types';

const PARAM_SEGMENT_REGEX = /^:([A-Za-z0-9_]+)(?:\{[^}]+\})?(\?)?$/;
const MAX_OPTION_HINTS = 4;

export type NormalizedRouteDocParam = {
  name: string;
  required: boolean;
  description?: string;
  defaultValue?: string;
  options: RouteDocOption[];
  exampleValue?: string;
};

export type RouteParameterGuidance = {
  summary?: string;
  exampleTokens: string[];
  defaultTokens: string[];
  optionSummaries: string[];
  coordinatedParamNames: string[];
  params: NormalizedRouteDocParam[];
};

export type RouteDocumentationCoverage = {
  pathParamNames: string[];
  documentedParamNames: string[];
  missingDocumentedParams: string[];
  undocumentedPathParams: string[];
  defaults: Record<string, string>;
  exampleValues: Record<string, string>;
  coordinatedParamNames: string[];
};

const DEFAULT_SOURCE_DOCS_CATEGORY = 'other';

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function stripMarkdown(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1');
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function slugifyDocsHeading(value: string): string {
  return collapseWhitespace(value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeDescription(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const cleaned = collapseWhitespace(stripMarkdown(value));
  return cleaned || undefined;
}

export function getRouteDocsCategorySlug(route?: RouteItem): string {
  if (!route?.categories.length) {
    return DEFAULT_SOURCE_DOCS_CATEGORY;
  }

  const preferred = route.categories.find((category) => category !== 'popular');
  return preferred || route.categories[0] || DEFAULT_SOURCE_DOCS_CATEGORY;
}

export function getSourceDocsUrl(route?: RouteItem): string | undefined {
  if (!route) {
    return undefined;
  }

  const baseUrl = 'https://docs.rsshub.app/deploy/config';
  const fragment = slugifyDocsHeading(route.sourceTitle);

  return fragment ? `${baseUrl}#${fragment}` : baseUrl;
}

function normalizeDocOptions(value: unknown): RouteDocOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.reduce<RouteDocOption[]>((options, item) => {
    if (!item || typeof item !== 'object') {
      return options;
    }

    const option = item as RouteDocOption;
    const optionValue = asTrimmedString(option.value);
    const optionLabel = asTrimmedString(option.label);

    if (!optionValue && !optionLabel) {
      return options;
    }

    options.push({
      value: optionValue ?? optionLabel ?? '',
      label: optionLabel,
    });

    return options;
  }, []);
}

function getDocParameterDefinition(
  route: RouteItem,
  paramName: string
): RouteDocParameterDefinition | undefined {
  const raw = route.docParameters?.[paramName];

  if (!raw) {
    return undefined;
  }

  if (typeof raw === 'string') {
    return {
      description: normalizeDescription(raw),
    };
  }

  return {
    description: normalizeDescription(raw.description),
    default: asTrimmedString(raw.default),
    options: normalizeDocOptions(raw.options),
  };
}

function getRouteSegments(route: RouteItem, exampleSegments: string[]): string[] {
  const routeSegments = route.routePath.split('/').filter(Boolean);

  if (
    routeSegments[0] === route.namespace &&
    exampleSegments[0] !== route.namespace
  ) {
    return routeSegments.slice(1);
  }

  return routeSegments;
}

export function extractExampleParamValues(route: RouteItem): Record<string, string> {
  if (!route.docExample) {
    return {};
  }

  const url = new URL(route.docExample, 'https://docs.rsshub.app');
  const exampleSegments = url.pathname.split('/').filter(Boolean);
  const routeSegments = getRouteSegments(route, exampleSegments);
  const values: Record<string, string> = {};
  let exampleIndex = 0;

  for (const routeSegment of routeSegments) {
    const match = routeSegment.match(PARAM_SEGMENT_REGEX);

    if (!match) {
      if (exampleSegments[exampleIndex] === routeSegment) {
        exampleIndex += 1;
      }

      continue;
    }

    const [, name, optionalFlag] = match;
    const nextValue = exampleSegments[exampleIndex];

    if (!nextValue) {
      if (optionalFlag === '?') {
        continue;
      }

      break;
    }

    values[name] = decodeURIComponent(nextValue);
    exampleIndex += 1;
  }

  return values;
}

export function getNormalizedRouteDocParams(route?: RouteItem): NormalizedRouteDocParam[] {
  if (!route) {
    return [];
  }

  const exampleValues = extractExampleParamValues(route);

  return route.params.map((param) => {
    const definition = getDocParameterDefinition(route, param.name);

    return {
      name: param.name,
      required: param.required,
      description: definition?.description,
      defaultValue: definition?.default,
      options: definition?.options ?? [],
      exampleValue: exampleValues[param.name],
    };
  });
}

function formatList(values: string[]): string {
  if (values.length <= 1) {
    return values[0] ?? '';
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function formatParamToken(name: string, value: string): string {
  return `${name}=${value}`;
}

function getOptionSummary(param: NormalizedRouteDocParam): string | undefined {
  if (!param.options.length) {
    return undefined;
  }

  const values = param.options
    .slice(0, MAX_OPTION_HINTS)
    .map((option) => option.value)
    .filter(Boolean);

  if (!values.length) {
    return undefined;
  }

  return `${param.name}: ${values.join(', ')}`;
}

export function getRouteDocumentationCoverage(route?: RouteItem): RouteDocumentationCoverage {
  const params = getNormalizedRouteDocParams(route);
  const pathParamNames = params.map((param) => param.name);
  const documentedParamNames = Object.keys(route?.docParameters ?? {});
  const missingDocumentedParams = documentedParamNames.filter(
    (name) => !pathParamNames.includes(name)
  );
  const undocumentedPathParams = pathParamNames.filter(
    (name) => !documentedParamNames.includes(name)
  );
  const defaults = params.reduce<Record<string, string>>((accumulator, param) => {
    if (param.defaultValue) {
      accumulator[param.name] = param.defaultValue;
    }

    return accumulator;
  }, {});
  const exampleValues = params.reduce<Record<string, string>>((accumulator, param) => {
    if (param.exampleValue) {
      accumulator[param.name] = param.exampleValue;
    }

    return accumulator;
  }, {});
  const coordinatedParamNames = params
    .filter((param) => param.exampleValue || param.defaultValue)
    .map((param) => param.name);

  return {
    pathParamNames,
    documentedParamNames,
    missingDocumentedParams,
    undocumentedPathParams,
    defaults,
    exampleValues,
    coordinatedParamNames,
  };
}

export function getRouteParameterGuidance(
  route: RouteItem | undefined,
  paramNames?: string[]
): RouteParameterGuidance | undefined {
  if (!route) {
    return undefined;
  }

  const allParams = getNormalizedRouteDocParams(route);
  const nameSet = paramNames?.length ? new Set(paramNames) : null;
  const params = nameSet
    ? allParams.filter((param) => nameSet.has(param.name))
    : allParams;

  if (!params.length) {
    return undefined;
  }

  const exampleTokens = params
    .filter((param) => param.exampleValue)
    .map((param) => formatParamToken(param.name, param.exampleValue!));
  const defaultTokens = params
    .filter((param) => param.defaultValue && !param.exampleValue)
    .map((param) => formatParamToken(param.name, param.defaultValue!));
  const optionSummaries = params
    .map((param) => getOptionSummary(param))
    .filter((summary): summary is string => Boolean(summary));
  const coordinatedParamNames = params
    .filter((param) => param.exampleValue || param.defaultValue)
    .map((param) => param.name);

  let summary: string | undefined;

  if (coordinatedParamNames.length > 1) {
    summary = `The ${route.sourceTitle} docs show this route working with coordinated values for ${formatList(
      coordinatedParamNames
    )}.`;
  } else if (optionSummaries.length) {
    summary = `The ${route.sourceTitle} docs include allowed values for this route.`;
  } else if (defaultTokens.length) {
    summary = `The ${route.sourceTitle} docs include documented defaults for this route.`;
  } else if (params.some((param) => param.description || param.exampleValue)) {
    summary = `The ${route.sourceTitle} docs include field guidance for this route.`;
  }

  if (!summary && !exampleTokens.length && !defaultTokens.length && !optionSummaries.length) {
    return undefined;
  }

  return {
    summary,
    exampleTokens,
    defaultTokens,
    optionSummaries,
    coordinatedParamNames,
    params,
  };
}

function shouldShowDescription(description?: string): boolean {
  if (!description) {
    return false;
  }

  return description.length <= 180 && !description.includes('|') && !description.includes('\n');
}

export function getRouteParamHelpText(
  route: RouteItem | undefined,
  paramName: string
): string | undefined {
  if (!route) {
    return undefined;
  }

  if (paramName === 'routeParams') {
    return 'Optional advanced route parameters.';
  }

  const param = getNormalizedRouteDocParams(route).find((item) => item.name === paramName);

  if (!param) {
    return undefined;
  }

  const segments: string[] = [];

  if (shouldShowDescription(param.description)) {
    segments.push(param.description!);
  }

  if (param.defaultValue) {
    segments.push(`Default: ${param.defaultValue}.`);
  }

  if (param.options.length) {
    const allowedValues = param.options
      .slice(0, MAX_OPTION_HINTS)
      .map((option) => option.value)
      .filter(Boolean);

    if (allowedValues.length) {
      segments.push(`Allowed: ${allowedValues.join(', ')}.`);
    }
  }

  if (param.exampleValue) {
    segments.push(`Example: ${param.exampleValue}.`);
  }

  return segments.join(' ') || undefined;
}

export function getRouteParamPlaceholderText(
  route: RouteItem | undefined,
  paramName: string,
  required: boolean
): string {
  if (paramName === 'routeParams') {
    return 'Optional advanced route parameters';
  }

  const param = route
    ? getNormalizedRouteDocParams(route).find((item) => item.name === paramName)
    : undefined;

  if (param?.exampleValue) {
    return `Example: ${param.exampleValue}`;
  }

  if (!required && param?.defaultValue) {
    return `Default: ${param.defaultValue}`;
  }

  if (param?.options.length) {
    const option = param.options.find((item) => item.value)?.value;
    if (option) {
      return `Try: ${option}`;
    }
  }

  return `Enter ${paramName}${required ? '' : ' (optional)'}`;
}
