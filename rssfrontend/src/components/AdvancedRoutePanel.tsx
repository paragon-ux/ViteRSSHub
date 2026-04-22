import { Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import type { RouteItem } from '../types';
import type { FeedComposerState } from '../hooks/useFeedComposer';
import {
  getParamHelp,
  getParamLabel,
  getParamPlaceholder,
} from '../hooks/useFeedComposer';
import StateBlock from './StateBlock';

type AdvancedRoutePanelProps = {
  route?: RouteItem;
  composer: FeedComposerState;
};

export default function AdvancedRoutePanel({
  route,
  composer,
}: AdvancedRoutePanelProps) {
  if (!route) {
    return (
      <section className="panel panel--secondary utility-mode-panel">
        <StateBlock
          title="No route selected"
          message="Pick a route first to see optional path parameters and advanced query tuning."
        />
      </section>
    );
  }

  const hasOptionalControls =
    composer.optionalParams.length > 0 || composer.queryRows.length > 0;

  return (
    <section className="panel panel--secondary utility-mode-panel">
      <div className="panel-header">
        <div className="panel-header-copy">
          <span className="panel-eyebrow">Advanced route tuning</span>
          <h2>Optional query and path controls</h2>
          <p>Keep advanced route tuning nearby without letting it dominate the main path.</p>
        </div>

        <div className="panel-header-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={composer.addQueryRow}
          >
            <Plus size={16} />
            <span>Add query row</span>
          </button>
        </div>
      </div>

      {!hasOptionalControls ? (
        <StateBlock
          compact
          variant="info"
          title="No advanced controls for this route"
          message="This route does not expose optional path params or query tuning from the frontend."
        />
      ) : (
        <div className="advanced-route-stack">
          <div className="surface-card surface-card--quiet">
            <div className="section-title-row">
              <div className="section-heading">
                <h3>Query parameters</h3>
                <p>Add optional filters, paging values, or route-specific tuning only when you need them.</p>
              </div>
              <span className="badge subtle">
                <SlidersHorizontal size={14} />
                Optional
              </span>
            </div>

            <div className="query-rows">
              {composer.queryRows.map((row) => (
                <div key={row.id} className="query-row">
                  <input
                    className="text-input"
                    type="text"
                    value={row.key}
                    onChange={(event) =>
                      composer.updateQueryRow(row.id, 'key', event.target.value)
                    }
                    placeholder="key"
                  />
                  <input
                    className="text-input"
                    type="text"
                    value={row.value}
                    onChange={(event) =>
                      composer.updateQueryRow(row.id, 'value', event.target.value)
                    }
                    placeholder="value"
                  />
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => composer.removeQueryRow(row.id)}
                    aria-label="Remove query parameter"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {composer.optionalParams.length ? (
            <div className="surface-card surface-card--quiet">
              <div className="section-heading">
                <h3>Optional path parameters</h3>
                <p>Only fill these if the route docs or your use case call for them.</p>
              </div>

              <div className="optional-param-grid">
                {composer.optionalParams.map((param) => {
                  const helpText = getParamHelp(route, param.name);

                  return (
                    <label key={param.name} className="field-group field-group--optional">
                      <span className="field-label">
                        {getParamLabel(param.name)}
                        <span className="optional-pill">optional</span>
                      </span>

                      <input
                        className="text-input"
                        type="text"
                        value={composer.paramValues[param.name] ?? ''}
                        onChange={(event) =>
                          composer.setParamValue(param.name, event.target.value)
                        }
                        placeholder={getParamPlaceholder(route, param.name, false)}
                      />

                      {helpText ? <span className="field-help">{helpText}</span> : null}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
