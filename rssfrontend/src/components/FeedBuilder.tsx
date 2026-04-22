import {
  ArrowRight,
  CheckCircle2,
  Copy,
  ExternalLink,
  Save,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FeedComposerState } from '../hooks/useFeedComposer';
import {
  getParamHelp,
  getParamLabel,
  getParamPlaceholder,
} from '../hooks/useFeedComposer';
import type { RouteItem } from '../types';
import type { RouteSupportSummary } from '../utils/routeSupport';
import FeedCardsPreview from './FeedCardsPreview';
import StateBlock from './StateBlock';

type FeedBuilderProps = {
  embedded?: boolean;
  route?: RouteItem;
  composer: FeedComposerState;
  supportSummary?: RouteSupportSummary;
  onSaveFeed: (payload: {
    label: string;
    url: string;
    routeId: string;
  }) => void;
};

export default function FeedBuilder({
  embedded = false,
  route,
  composer,
  supportSummary,
  onSaveFeed,
}: FeedBuilderProps) {
  const [saveLabel, setSaveLabel] = useState(route?.title ?? '');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaveLabel(route?.title ?? '');
    setCopied(false);
    setSaved(false);
  }, [route?.id, composer.feedUrl]);

  const applyDisabled =
    !composer.canApply || (composer.hasAppliedValues && !composer.hasPendingChanges);

  const applyLabel = useMemo(() => {
    if (!route) {
      return 'Apply';
    }

    if (!composer.hasAppliedValues) {
      return 'Apply and preview';
    }

    if (composer.hasPendingChanges) {
      return 'Apply changes';
    }

    return 'Applied';
  }, [composer.hasAppliedValues, composer.hasPendingChanges, route]);

  const previewMode = useMemo<'pending_input' | 'unsupported' | 'ready'>(() => {
    if (composer.isBlockedByTwitterSource) {
      return 'unsupported';
    }

    if (!route || !composer.hasAppliedValues || !composer.feedUrl) {
      return 'pending_input';
    }

    return 'ready';
  }, [
    composer.feedUrl,
    composer.hasAppliedValues,
    composer.isBlockedByTwitterSource,
    route,
  ]);

  async function handleCopyFeedUrl() {
    if (!composer.feedUrl) {
      return;
    }

    await navigator.clipboard.writeText(composer.feedUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function handleSaveFeed() {
    if (!route || !composer.feedUrl) {
      return;
    }

    onSaveFeed({
      label: saveLabel.trim() || route.title,
      url: composer.feedUrl,
      routeId: route.id,
    });

    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <section className={embedded ? 'feed-builder feed-builder--embedded' : 'feed-builder'}>
      <div className="surface-card builder-flow-card">
        <form
          className="builder-flow-section"
          onSubmit={(event) => {
            event.preventDefault();
            composer.applyDraft();
          }}
        >
          <div className="panel-header panel-header--center">
            <div className="panel-header-copy">
              <span className="panel-eyebrow">Step 2</span>
              <h2>Required path parameters</h2>
              <p>Fill the required route fields, then apply them once to refresh the feed output and preview.</p>
            </div>

            <div className="panel-header-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={applyDisabled}
              >
                <ArrowRight size={16} />
                <span>{applyLabel}</span>
              </button>
            </div>
          </div>

          {!route ? (
            <StateBlock
              compact
              title="Pick a route first"
              message="Use Route search above to choose a route before filling any parameters."
            />
          ) : (
            <>
              {composer.requiredParams.length ? (
                <div className="param-grid">
                  {composer.requiredParams.map((param) => {
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
                  <p>This route does not need required path parameters. Apply once to generate the feed and load preview cards.</p>
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
                <div className="builder-submit-copy">
                  {composer.hasPendingChanges ? (
                    <span className="inline-state-note">
                      <ArrowRight size={14} />
                      <span>Apply the current values to refresh the generated feed and preview.</span>
                    </span>
                  ) : composer.hasAppliedValues ? (
                    <span className="inline-state-note">
                      <CheckCircle2 size={14} />
                      <span>Preview is showing the last applied route values.</span>
                    </span>
                  ) : (
                    <span className="inline-state-note">
                      <ArrowRight size={14} />
                      <span>Apply once to lock in the current parameter set.</span>
                    </span>
                  )}
                </div>

                {supportSummary ? (
                  <span className={supportSummary.badgeClassName}>
                    {supportSummary.label}
                  </span>
                ) : null}
              </div>

              <div className="builder-output-inline">
                <div className="builder-output-top">
                  <div className="section-heading">
                    <h3>Generated feed</h3>
                    <p>Copy, open, or save the last applied feed without leaving the main flow.</p>
                  </div>

                  {composer.hasPendingChanges && composer.hasAppliedValues ? (
                    <span className="badge">Showing last applied feed</span>
                  ) : null}
                </div>

                {composer.feedUrl ? (
                  <>
                    <textarea
                      className="url-output url-output--compact"
                      value={composer.feedUrl}
                      readOnly
                    />

                    <div className="builder-output-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => void handleCopyFeedUrl()}
                      >
                        <Copy size={16} />
                        <span>{copied ? 'Copied' : 'Copy URL'}</span>
                      </button>

                      <a
                        href={composer.feedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ghost-button"
                      >
                        <ExternalLink size={16} />
                        <span>Open raw feed</span>
                      </a>
                    </div>

                    <div className="builder-save-inline">
                      <input
                        className="text-input"
                        type="text"
                        value={saveLabel}
                        onChange={(event) => setSaveLabel(event.target.value)}
                        placeholder={route?.title ?? 'Saved feed label'}
                      />

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={handleSaveFeed}
                      >
                        <Save size={16} />
                        <span>{saved ? 'Saved' : 'Save feed'}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="builder-empty-note">
                    <p>Apply the current parameter set to generate a feed URL and unlock the in-page preview.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </form>

        <div className="builder-flow-section builder-flow-section--preview">
          <FeedCardsPreview
            feedUrl={composer.feedUrl}
            mode={previewMode}
            unavailableReason={composer.builderNotice}
            hasPendingChanges={composer.hasPendingChanges && composer.hasAppliedValues}
          />
        </div>
      </div>
    </section>
  );
}
