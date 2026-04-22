import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { FeedComposerState } from '../hooks/useFeedComposer';
import {
  getParamHelp,
  getParamLabel,
  getParamPlaceholder,
} from '../hooks/useFeedComposer';
import type { RouteItem } from '../types';
import type { RouteSupportSummary } from '../utils/routeSupport';
import StateBlock from './StateBlock';

type FeedBuilderProps = {
  route?: RouteItem;
  composer: FeedComposerState;
  supportSummary?: RouteSupportSummary;
  isActive: boolean;
  isAvailable: boolean;
  onApplied: () => void;
};

const PARAMS_PER_PAGE = 4;

export default function FeedBuilder({
  route,
  composer,
  supportSummary,
  isActive,
  isAvailable,
  onApplied,
}: FeedBuilderProps) {
  const [paramPage, setParamPage] = useState(0);

  useEffect(() => {
    setParamPage(0);
  }, [route?.id]);

  const applyDisabled =
    !composer.canApply || (composer.hasAppliedValues && !composer.hasPendingChanges);

  const applyLabel = useMemo(() => {
    if (!route) {
      return 'Apply';
    }

    if (!composer.hasAppliedValues) {
      return 'Apply and continue';
    }

    if (composer.hasPendingChanges) {
      return 'Apply changes';
    }

    return 'Applied';
  }, [composer.hasAppliedValues, composer.hasPendingChanges, route]);

  const paramPages = useMemo(() => {
    if (!composer.requiredParams.length) {
      return [[]] as FeedComposerState['requiredParams'][];
    }

    const pages: FeedComposerState['requiredParams'][] = [];
    for (let index = 0; index < composer.requiredParams.length; index += PARAMS_PER_PAGE) {
      pages.push(composer.requiredParams.slice(index, index + PARAMS_PER_PAGE));
    }

    return pages;
  }, [composer.requiredParams]);

  const currentParamPage = paramPages[paramPage] ?? [];
  const hasMultiplePages = paramPages.length > 1;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (applyDisabled) {
      return;
    }

    composer.applyDraft();
    onApplied();
  }

  return (
    <article
      className={[
        'guided-step-panel',
        'guided-step-panel--builder',
        'guided-step-panel--viewport',
        isActive ? 'active' : '',
        isAvailable ? 'available' : 'locked',
        composer.hasAppliedValues ? 'complete' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <form className="guided-step-form" onSubmit={handleSubmit}>
        <div className="guided-step-header">
          <div className="guided-step-copy">
            <span className="guided-step-eyebrow">Step 2</span>
            <h3>Required path parameters</h3>
            <p>Fill the required fields, then apply once.</p>
          </div>

          <span className="guided-step-status">
            {composer.hasAppliedValues && !composer.hasPendingChanges
              ? 'Applied'
              : isAvailable
                ? 'Ready'
                : 'Locked'}
          </span>
        </div>

        <div className="guided-step-body">
          {!route ? (
            <StateBlock
              compact
              title="Choose a route first"
              message="Select a route to unlock this step."
            />
          ) : (
            <>
              {composer.requiredParams.length ? (
                <div className="builder-param-toolbar">
                  <span className="badge subtle">
                    {composer.requiredParams.length} required
                  </span>

                  {hasMultiplePages ? (
                    <div className="builder-param-pager">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() =>
                          setParamPage((current) => Math.max(0, current - 1))
                        }
                        disabled={paramPage === 0}
                      >
                        <ChevronLeft size={16} />
                        <span>Fields</span>
                      </button>

                      <span className="builder-param-page-label">
                        {paramPage + 1} / {paramPages.length}
                      </span>

                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() =>
                          setParamPage((current) =>
                            Math.min(paramPages.length - 1, current + 1)
                          )
                        }
                        disabled={paramPage >= paramPages.length - 1}
                      >
                        <span>More</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {composer.requiredParams.length ? (
                <div className="param-grid">
                  {currentParamPage.map((param) => {
                    const helpText = getParamHelp(route, param.name);

                    return (
                      <label key={param.name} className="field-group field-group--required">
                        <span className="field-label">
                          {getParamLabel(param.name)}
                          <span className="required-dot">*</span>
                        </span>

                        <input
                          className="text-input"
                          type="text"
                          value={composer.paramValues[param.name] ?? ''}
                          onChange={(event) =>
                            composer.setParamValue(param.name, event.target.value)
                          }
                          placeholder={getParamPlaceholder(route, param.name, true)}
                        />

                        {helpText ? <span className="field-help">{helpText}</span> : null}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="builder-empty-note">
                  <p>This route does not need required path parameters. Apply once to continue.</p>
                </div>
              )}

              {composer.builderNotice ? (
                <StateBlock
                  compact
                  variant={composer.isBlockedByTwitterSource ? 'error' : 'info'}
                  title={
                    composer.isBlockedByTwitterSource
                      ? 'Route support limitation'
                      : 'Route support note'
                  }
                  message={composer.builderNotice}
                />
              ) : null}

              <div className="builder-submit-row">
                <span className="inline-state-note">
                  {composer.hasAppliedValues && !composer.hasPendingChanges ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Applied</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight size={14} />
                      <span>Apply to update the live feed.</span>
                    </>
                  )}
                </span>

                {supportSummary ? (
                  <span className={supportSummary.badgeClassName}>
                    {supportSummary.label}
                  </span>
                ) : null}
              </div>
            </>
          )}
        </div>

        <div className="guided-step-footer guided-step-footer--solo">
          <button
            type="submit"
            className="primary-button"
            disabled={applyDisabled}
          >
            <span>{applyLabel}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </article>
  );
}
