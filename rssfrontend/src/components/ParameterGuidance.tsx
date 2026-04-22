import { BookMarked, ExternalLink } from 'lucide-react';
import type { RouteItem } from '../types';
import { getRouteParameterGuidance } from '../utils/routeDocs';

type ParameterGuidanceProps = {
  route?: RouteItem;
  paramNames?: string[];
  title?: string;
  actionLink?: {
    label: string;
    href: string;
  };
};

export default function ParameterGuidance({
  route,
  paramNames,
  title = 'Documented guidance',
  actionLink,
}: ParameterGuidanceProps) {
  const guidance = getRouteParameterGuidance(route, paramNames);

  if (!guidance) {
    return null;
  }

  return (
    <div className="surface-card surface-card--quiet parameter-guidance">
      <div className="parameter-guidance-header">
        <span className="route-meta-label">
          <BookMarked size={16} />
          <span>{title}</span>
        </span>
        <div className="parameter-guidance-actions">
          {guidance.coordinatedParamNames.length > 1 ? (
            <span className="badge subtle">Coordinated values</span>
          ) : null}

          {actionLink ? (
            <a
              href={actionLink.href}
              target="_blank"
              rel="noreferrer"
              className="parameter-guidance-link"
            >
              <ExternalLink size={14} />
              <span>{actionLink.label}</span>
            </a>
          ) : null}
        </div>
      </div>

      {guidance.summary ? <p className="parameter-guidance-summary">{guidance.summary}</p> : null}

      {guidance.exampleTokens.length ? (
        <div className="parameter-guidance-row">
          <span className="parameter-guidance-label">Example</span>
          <div className="tag-list">
            {guidance.exampleTokens.map((token) => (
              <span key={token} className="tag">
                {token}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {guidance.defaultTokens.length ? (
        <div className="parameter-guidance-row">
          <span className="parameter-guidance-label">Defaults</span>
          <div className="tag-list">
            {guidance.defaultTokens.map((token) => (
              <span key={token} className="tag">
                {token}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {guidance.optionSummaries.length ? (
        <div className="parameter-guidance-row parameter-guidance-row--stacked">
          <span className="parameter-guidance-label">Allowed values</span>
          <div className="parameter-guidance-list">
            {guidance.optionSummaries.map((summary) => (
              <p key={summary}>{summary}</p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
