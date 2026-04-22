import { useEffect, useMemo, useState } from 'react';
import type {
  ConfigEntry,
  FeedFormat,
  RouteItem,
  RouteParameter,
} from '../types';
import { buildFeedUrl } from '../utils/rsshub';
import {
  buildTwitterSourceUrl,
  getTwitterSourceMode,
  getTwitterSupport,
  type TwitterSourceMode,
  type TwitterSupport,
} from '../utils/twitterSource';

export type QueryRow = {
  id: string;
  key: string;
  value: string;
};

export type FeedComposerState = {
  paramValues: Record<string, string>;
  queryRows: QueryRow[];
  format: FeedFormat;
  requiredParams: RouteParameter[];
  optionalParams: RouteParameter[];
  feedUrl: string;
  hasMissingRequiredParams: boolean;
  hasAppliedValues: boolean;
  hasPendingChanges: boolean;
  canApply: boolean;
  isBlockedByTwitterSource: boolean;
  builderNotice: string;
  twitterSourceMode: TwitterSourceMode;
  twitterSupport: TwitterSupport;
  applyDraft: () => void;
  setParamValue: (name: string, value: string) => void;
  updateQueryRow: (id: string, field: 'key' | 'value', value: string) => void;
  removeQueryRow: (id: string) => void;
  addQueryRow: () => void;
  setFormat: (format: FeedFormat) => void;
};

function makeRow(): QueryRow {
  return {
    id: crypto.randomUUID(),
    key: '',
    value: '',
  };
}

function normalizeParamValues(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => Boolean(value))
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

function normalizeQueryRows(rows: QueryRow[]): Array<{ key: string; value: string }> {
  return rows
    .map((row) => ({
      key: row.key.trim(),
      value: row.value.trim(),
    }))
    .filter((row) => row.key && row.value);
}

function toQueryParams(rows: QueryRow[]): Record<string, string> {
  return normalizeQueryRows(rows).reduce<Record<string, string>>((accumulator, row) => {
    accumulator[row.key] = row.value;
    return accumulator;
  }, {});
}

function areDraftsEqual(options: {
  paramValues: Record<string, string>;
  appliedParamValues: Record<string, string>;
  queryRows: QueryRow[];
  appliedQueryRows: QueryRow[];
  format: FeedFormat;
  appliedFormat: FeedFormat;
}): boolean {
  const {
    paramValues,
    appliedParamValues,
    queryRows,
    appliedQueryRows,
    format,
    appliedFormat,
  } = options;

  return (
    JSON.stringify(normalizeParamValues(paramValues)) ===
      JSON.stringify(normalizeParamValues(appliedParamValues)) &&
    JSON.stringify(normalizeQueryRows(queryRows)) ===
      JSON.stringify(normalizeQueryRows(appliedQueryRows)) &&
    format === appliedFormat
  );
}

export function getParamLabel(paramName: string): string {
  return paramName === 'routeParams' ? 'routeParams' : paramName;
}

export function getParamHelp(
  route: RouteItem | undefined,
  paramName: string
): string | undefined {
  if (!route) {
    return undefined;
  }

  if (route.routePath.startsWith('/youtube/user/') && paramName === 'username') {
    return 'Use the YouTube user handle, for example @OpenAI.';
  }

  if (route.routePath.startsWith('/youtube/user/') && paramName === 'routeParams') {
    return 'Optional advanced path options, for example embed=false&filterShorts=false';
  }

  if (route.routePath.startsWith('/twitter/user/')) {
    if (paramName === 'id' || paramName === 'username' || paramName === 'handle') {
      return 'Public Twitter/X username for Nitter, for example elonmusk.';
    }
  }

  if (
    route.routePath.startsWith('/twitter/keyword/') ||
    route.routePath.startsWith('/twitter/search/')
  ) {
    if (paramName === 'keyword' || paramName === 'query' || paramName === 'q') {
      return 'Keyword or query for RSSHub Twitter/X search handling. This route does not map to a Nitter profile RSS URL.';
    }
  }

  if (paramName === 'routeParams') {
    return 'Optional advanced route parameters.';
  }

  return undefined;
}

export function getParamPlaceholder(
  route: RouteItem | undefined,
  paramName: string,
  required: boolean
): string {
  if (route?.routePath.startsWith('/youtube/user/') && paramName === 'username') {
    return 'Example: @OpenAI';
  }

  if (route?.routePath.startsWith('/youtube/user/') && paramName === 'routeParams') {
    return 'Optional, for example embed=false&filterShorts=false';
  }

  if (route?.routePath.startsWith('/twitter/user/')) {
    if (paramName === 'id' || paramName === 'username' || paramName === 'handle') {
      return 'Example: elonmusk';
    }
  }

  if (
    route?.routePath.startsWith('/twitter/keyword/') ||
    route?.routePath.startsWith('/twitter/search/')
  ) {
    if (paramName === 'keyword' || paramName === 'query' || paramName === 'q') {
      return 'Example: OpenAI';
    }
  }

  if (paramName === 'routeParams') {
    return 'Optional advanced route parameters';
  }

  return `Enter ${paramName}${required ? '' : ' (optional)'}`;
}

export function useFeedComposer(options: {
  baseUrl: string;
  route?: RouteItem;
  configEntries?: ConfigEntry[];
}): FeedComposerState {
  const { baseUrl, route, configEntries = [] } = options;
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [queryRows, setQueryRows] = useState<QueryRow[]>([makeRow()]);
  const [format, setFormat] = useState<FeedFormat>('rss');
  const [appliedParamValues, setAppliedParamValues] = useState<Record<string, string>>({});
  const [appliedQueryRows, setAppliedQueryRows] = useState<QueryRow[]>([makeRow()]);
  const [appliedFormat, setAppliedFormat] = useState<FeedFormat>('rss');
  const [hasAppliedValues, setHasAppliedValues] = useState(false);

  useEffect(() => {
    setParamValues({});
    setQueryRows([makeRow()]);
    setFormat('rss');
    setAppliedParamValues({});
    setAppliedQueryRows([makeRow()]);
    setAppliedFormat('rss');
    setHasAppliedValues(false);
  }, [route?.id]);

  const requiredParams = useMemo(() => {
    return route?.params.filter((param) => param.required) ?? [];
  }, [route]);

  const optionalParams = useMemo(() => {
    return route?.params.filter((param) => !param.required) ?? [];
  }, [route]);

  const hasMissingRequiredParams = useMemo(() => {
    if (!route) {
      return false;
    }

    return route.params.some((param) => param.required && !paramValues[param.name]?.trim());
  }, [paramValues, route]);

  const appliedQueryParams = useMemo(() => {
    return toQueryParams(appliedQueryRows);
  }, [appliedQueryRows]);

  const twitterSourceMode = useMemo(() => {
    return getTwitterSourceMode(configEntries);
  }, [configEntries]);

  const twitterSupport = useMemo(() => {
    return route?.routePath.startsWith('/twitter/') ? getTwitterSupport(route) : 'unsupported';
  }, [route]);

  const twitterNitterUrl = useMemo(() => {
    if (!route?.routePath.startsWith('/twitter/')) {
      return null;
    }

    return buildTwitterSourceUrl({
      route,
      routeParamValues: appliedParamValues,
      configEntries,
    });
  }, [appliedParamValues, configEntries, route]);

  const isTwitterUnsupported = Boolean(
    route?.routePath.startsWith('/twitter/') && twitterSupport === 'unsupported'
  );

  const isTwitterUnsupportedInNitterMode = Boolean(
    route?.routePath.startsWith('/twitter/') &&
      twitterSourceMode === 'nitter' &&
      (twitterSupport === 'official_only' || twitterSupport === 'unsupported')
  );

  const isBlockedByTwitterSource = useMemo(() => {
    if (!route?.routePath.startsWith('/twitter/')) {
      return false;
    }

    if (twitterSourceMode === 'disabled') {
      return true;
    }

    return isTwitterUnsupportedInNitterMode;
  }, [isTwitterUnsupportedInNitterMode, route, twitterSourceMode]);

  const feedUrl = useMemo(() => {
    if (!route || !hasAppliedValues) {
      return '';
    }

    if (route.routePath.startsWith('/twitter/')) {
      if (twitterSourceMode === 'nitter') {
        return twitterNitterUrl ?? '';
      }

      if (twitterSourceMode === 'official') {
        return buildFeedUrl({
          baseUrl,
          routePath: route.routePath,
          routeParamValues: appliedParamValues,
          queryParams: appliedQueryParams,
          format: appliedFormat,
        });
      }

      return '';
    }

    return buildFeedUrl({
      baseUrl,
      routePath: route.routePath,
      routeParamValues: appliedParamValues,
      queryParams: appliedQueryParams,
      format: appliedFormat,
    });
  }, [
    appliedFormat,
    appliedParamValues,
    appliedQueryParams,
    baseUrl,
    hasAppliedValues,
    route,
    twitterNitterUrl,
    twitterSourceMode,
  ]);

  const hasPendingChanges = useMemo(() => {
    if (!route) {
      return false;
    }

    return !hasAppliedValues
      ? Boolean(
          Object.keys(normalizeParamValues(paramValues)).length ||
            normalizeQueryRows(queryRows).length ||
            format !== 'rss'
        )
      : !areDraftsEqual({
          paramValues,
          appliedParamValues,
          queryRows,
          appliedQueryRows,
          format,
          appliedFormat,
        });
  }, [
    appliedFormat,
    appliedParamValues,
    appliedQueryRows,
    format,
    hasAppliedValues,
    paramValues,
    queryRows,
    route,
  ]);

  const canApply = Boolean(route && !hasMissingRequiredParams && !isBlockedByTwitterSource);

  const builderNotice = useMemo(() => {
    if (!route?.routePath.startsWith('/twitter/')) {
      return '';
    }

    if (twitterSourceMode === 'disabled') {
      return 'Twitter/X feeds are disabled by config.';
    }

    if (twitterSourceMode === 'nitter') {
      if (twitterSupport === 'nitter_user') {
        return 'This public Twitter/X user route will be generated as a Nitter RSS URL. Public instances may block requests or return 403, so change NITTER_BASE_URL if needed.';
      }

      if (twitterSupport === 'official_only') {
        if (
          route.routePath.startsWith('/twitter/keyword/') ||
          route.routePath.startsWith('/twitter/search/')
        ) {
          return 'Nitter RSS is limited to main profile feeds like `/<handle>/rss`. Twitter/X keyword and search routes still require official RSSHub Twitter config.';
        }

        return 'This Twitter/X route is not supported through Nitter and still requires official authenticated RSSHub Twitter config.';
      }

      return 'This Twitter/X route is not currently mapped to a Nitter fallback.';
    }

    if (twitterSourceMode === 'official') {
      return isTwitterUnsupported
        ? 'This Twitter/X route may need custom provider support or deeper official setup on your RSSHub instance.'
        : 'This route will use RSSHub official Twitter/X handling and may require authenticated Twitter config.';
    }

    return '';
  }, [isTwitterUnsupported, route, twitterSourceMode, twitterSupport]);

  function setParamValue(name: string, value: string) {
    setParamValues((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updateQueryRow(id: string, field: 'key' | 'value', value: string) {
    setQueryRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  }

  function removeQueryRow(id: string) {
    setQueryRows((current) => {
      if (current.length === 1) {
        return [makeRow()];
      }

      return current.filter((row) => row.id !== id);
    });
  }

  function addQueryRow() {
    setQueryRows((current) => [...current, makeRow()]);
  }

  function applyDraft() {
    if (!canApply) {
      return;
    }

    setAppliedParamValues({ ...paramValues });
    setAppliedQueryRows(queryRows.map((row) => ({ ...row })));
    setAppliedFormat(format);
    setHasAppliedValues(true);
  }

  return {
    paramValues,
    queryRows,
    format,
    requiredParams,
    optionalParams,
    feedUrl,
    hasMissingRequiredParams,
    hasAppliedValues,
    hasPendingChanges,
    canApply,
    isBlockedByTwitterSource,
    builderNotice,
    twitterSourceMode,
    twitterSupport,
    applyDraft,
    setParamValue,
    updateQueryRow,
    removeQueryRow,
    addQueryRow,
    setFormat,
  };
}
