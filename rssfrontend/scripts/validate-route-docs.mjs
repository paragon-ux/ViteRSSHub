import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturePath = path.join(__dirname, 'fixtures', 'route-docs-fixture.json');
const PARAM_REGEX = /:([A-Za-z0-9_]+)(?:\{[^}]+\})?(\?)?/g;
const PARAM_SEGMENT_REGEX = /^:([A-Za-z0-9_]+)(?:\{[^}]+\})?(\?)?$/;

function extractRouteParams(routePath) {
  const seen = new Set();
  const params = [];

  for (const match of routePath.matchAll(PARAM_REGEX)) {
    const name = match[1];
    const optionalFlag = match[2];

    if (!seen.has(name)) {
      seen.add(name);
      params.push({
        name,
        required: optionalFlag !== '?',
      });
    }
  }

  return params;
}

function applyRouteParams(routePath, values) {
  const segments = routePath.split('/').filter(Boolean);
  const builtSegments = [];

  for (const segment of segments) {
    const match = segment.match(PARAM_SEGMENT_REGEX);

    if (!match) {
      builtSegments.push(segment);
      continue;
    }

    const [, name, optionalFlag] = match;
    const value = values[name]?.trim() ?? '';

    if (!value) {
      if (optionalFlag === '?') {
        continue;
      }

      builtSegments.push('');
      continue;
    }

    builtSegments.push(encodeURIComponent(value));
  }

  return `/${builtSegments.join('/')}`;
}

function getRouteSegments(route, exampleSegments) {
  const routeSegments = route.routePath.split('/').filter(Boolean);

  if (routeSegments[0] === route.namespace && exampleSegments[0] !== route.namespace) {
    return routeSegments.slice(1);
  }

  return routeSegments;
}

function extractExampleValues(route) {
  if (!route.example) {
    return {};
  }

  const url = new URL(route.example, 'https://docs.rsshub.app');
  const exampleSegments = url.pathname.split('/').filter(Boolean);
  const routeSegments = getRouteSegments(route, exampleSegments);
  const values = {};
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

function normalizeExamplePath(route) {
  if (!route.example) {
    return undefined;
  }

  const url = new URL(route.example, 'https://docs.rsshub.app');
  const pathname = url.pathname;

  if (pathname.startsWith(`/${route.namespace}/`) || pathname === `/${route.namespace}`) {
    return pathname;
  }

  return `/${route.namespace}${pathname.startsWith('/') ? '' : '/'}${pathname}`;
}

function normalizeRoute(route) {
  const params = extractRouteParams(route.routePath);
  const exampleValues = extractExampleValues(route);
  const normalizedParams = params.map((param) => {
    const definition = route.parameters?.[param.name];
    const description =
      typeof definition === 'string' ? definition : definition?.description;
    const defaultValue =
      typeof definition === 'object' && definition ? definition.default : undefined;
    const options =
      typeof definition === 'object' && definition && Array.isArray(definition.options)
        ? definition.options
        : [];

    return {
      ...param,
      description,
      defaultValue,
      options,
      exampleValue: exampleValues[param.name],
    };
  });

  return {
    params: normalizedParams,
    documentedParamNames: Object.keys(route.parameters ?? {}),
    exampleValues,
    defaults: Object.fromEntries(
      normalizedParams
        .filter((param) => param.defaultValue)
        .map((param) => [param.name, param.defaultValue])
    ),
    coordinatedParamNames: normalizedParams
      .filter((param) => param.exampleValue || param.defaultValue)
      .map((param) => param.name),
  };
}

function assert(condition, message, errors) {
  if (!condition) {
    errors.push(message);
  }
}

const routes = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const errors = [];

for (const route of routes) {
  const normalized = normalizeRoute(route);
  const pathParamNames = normalized.params.map((param) => param.name);

  assert(
    normalized.documentedParamNames.every((name) => pathParamNames.includes(name)),
    `${route.routePath}: documented params must be represented in the extracted route schema`,
    errors
  );

  for (const param of normalized.params) {
    const rawDefinition = route.parameters?.[param.name];
    const rawDefault =
      rawDefinition && typeof rawDefinition === 'object' ? rawDefinition.default : undefined;
    const rawOptions =
      rawDefinition && typeof rawDefinition === 'object' && Array.isArray(rawDefinition.options)
        ? rawDefinition.options
        : [];

    if (rawDefault !== undefined) {
      assert(
        param.defaultValue === rawDefault,
        `${route.routePath}:${param.name} should preserve the documented default`,
        errors
      );
    }

    if (rawOptions.length) {
      assert(
        param.options.length === rawOptions.length,
        `${route.routePath}:${param.name} should preserve documented options`,
        errors
      );
    }
  }

  if (route.example) {
    const normalizedExamplePath = normalizeExamplePath(route);
    const roundtripPath = applyRouteParams(route.routePath, normalized.exampleValues);

    assert(
      Object.keys(normalized.exampleValues).length > 0,
      `${route.routePath}: documented example should yield at least one example value`,
      errors
    );
    assert(
      roundtripPath === normalizedExamplePath,
      `${route.routePath}: applying extracted example values should reproduce the documented example path`,
      errors
    );
  }

  const documentedCombinationCount = normalized.params.filter(
    (param) => param.exampleValue || param.defaultValue
  ).length;

  if (documentedCombinationCount > 1) {
    assert(
      normalized.coordinatedParamNames.length > 1,
      `${route.routePath}: multi-parameter documented combinations should be detectable`,
      errors
    );
  }
}

if (errors.length) {
  console.error('Route docs validation failed:\n');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Validated ${routes.length} documented route fixtures successfully.`);
