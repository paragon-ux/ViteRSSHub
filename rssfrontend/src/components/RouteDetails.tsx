import {
  ExternalLink,
  Hash,
  Layers3,
  Settings2,
  ShieldAlert,
  Users,
} from 'lucide-react';
import PanelHeader from './PanelHeader';
import StateBlock from './StateBlock';
import type { RouteItem } from '../types';
import type { RouteSupportSummary } from '../utils/routeSupport';
import {
  getRequirementTone,
  getRouteRequirements,
} from '../utils/routeRequirements';
import { getTwitterSupportMessage } from '../utils/twitterSource';

type RouteDetailsProps = {
  route?: RouteItem;
  supportSummary?: RouteSupportSummary;
};

function shouldShowDescription(description: string): boolean {
  const normalized = description.trim();

  if (!normalized) {
    return false;
  }

  if (normalized.length > 220) {
    return false;
  }

  if (normalized.includes('|') || normalized.includes('\n') || normalized.includes('```')) {
    return false;
  }

  return true;
}

export default function RouteDetails({
  route,
  supportSummary,
}: RouteDetailsProps) {
  if (!route) {
    return (
      <section className="panel panel--context utility-mode-panel route-details empty">
        <PanelHeader
          eyebrow="Route details"
          title="Choose a route to inspect"
          description="Route metadata, support burden, and setup requirements appear here."
        />
        <StateBlock
          title="No route selected"
          message="Pick a route from the search surface above to review its support status, parameters, categories, and setup notes."
        />
      </section>
    );
  }

  const requirements = getRouteRequirements(route);
  const isTwitterRoute = route.routePath.startsWith('/twitter/');
  const twitterSupportMessage = isTwitterRoute
    ? getTwitterSupportMessage(route)
    : undefined;
  const showDescription = shouldShowDescription(route.description);

  return (
    <section className="panel panel--context utility-mode-panel route-details">
      <PanelHeader
        eyebrow="Route details"
        title={route.title}
        description={
          showDescription
            ? route.description
            : 'Review the route metadata, support burden, and setup dependencies before generating a feed.'
        }
        actions={
          <div className="route-badges">
            <span className="badge subtle">{route.namespace}</span>
            <span className="badge">{route.routePath}</span>
          </div>
        }
      />

      {supportSummary ? (
        <div className="surface-card surface-card--quiet route-support-card">
          <div className="section-title-row">
            <div className="section-heading">
              <span className="route-meta-label">
                <ShieldAlert size={16} />
                <span>Support status</span>
              </span>
              <h3>{supportSummary.label}</h3>
              <p>{supportSummary.description}</p>
            </div>

            <div className="route-badges">
              <span className={supportSummary.badgeClassName}>
                {supportSummary.label}
              </span>
              {supportSummary.sourceLabel ? (
                <span className="badge subtle">{supportSummary.sourceLabel}</span>
              ) : null}
            </div>
          </div>

          {twitterSupportMessage && twitterSupportMessage !== supportSummary.description ? (
            <p className="muted route-support-note">{twitterSupportMessage}</p>
          ) : null}
        </div>
      ) : null}

      <div className="route-meta-grid">
        <div className="surface-card surface-card--quiet route-meta-card">
          <div className="route-meta-label">
            <Hash size={16} />
            <span>Parameters</span>
          </div>
          {route.params.length ? (
            <div className="tag-list">
              {route.params.map((param) => (
                <span key={param.name} className="tag">
                  {param.name}
                  {param.required ? '' : ' (optional)'}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">No path parameters required.</p>
          )}
        </div>

        <div className="surface-card surface-card--quiet route-meta-card">
          <div className="route-meta-label">
            <Layers3 size={16} />
            <span>Categories</span>
          </div>
          {route.categories.length ? (
            <div className="tag-list">
              {route.categories.map((category) => (
                <span key={category} className="tag">
                  {category}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">No categories listed.</p>
          )}
        </div>

        <div className="surface-card surface-card--quiet route-meta-card">
          <div className="route-meta-label">
            <Users size={16} />
            <span>Maintainers</span>
          </div>
          {route.maintainers?.length ? (
            <div className="tag-list">
              {route.maintainers.map((maintainer) => (
                <span key={maintainer} className="tag">
                  {maintainer}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">No maintainers listed.</p>
          )}
        </div>
      </div>

      <div className="setup-section">
        <div className="route-meta-label">
          <Settings2 size={16} />
          <span>Setup requirements</span>
        </div>

        <div className="requirements-list">
          {requirements.map((requirement, index) => {
            const tone = getRequirementTone(requirement.level);

            return (
              <article
                key={`${requirement.type}-${index}`}
                className={`surface-card requirement-card ${tone}`}
              >
                <div className="requirement-card-top">
                  <div className="requirement-badges">
                    <span className={`badge requirement-badge ${tone}`}>
                      {requirement.label}
                    </span>
                    <span className="badge subtle">{requirement.level}</span>
                  </div>
                </div>

                <p className="requirement-message">{requirement.message}</p>

                <div className="requirement-links">
                  <a
                    href={requirement.configUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="requirement-link"
                  >
                    <ExternalLink size={16} />
                    <span>Config guide</span>
                  </a>

                  {requirement.docsUrl ? (
                    <a
                      href={requirement.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="requirement-link"
                    >
                      <ExternalLink size={16} />
                      <span>Route docs</span>
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="route-footer-links">
        {route.docsUrl ? (
          <a href={route.docsUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            <span>Open route docs</span>
          </a>
        ) : null}

        {route.radar ? (
          <a href={route.radar} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            <span>Open route radar</span>
          </a>
        ) : null}
      </div>
    </section>
  );
}
