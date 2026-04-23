import { ArrowLeft, ListFilter } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FeedDisplayLimitSetting } from '../utils/feedDisplay';
import {
  areFeedDisplaySettingsEqual,
  FEED_DISPLAY_LIMIT_PRESETS,
  normalizeFeedDisplayLimitSetting,
} from '../utils/feedDisplay';
import PanelHeader from './PanelHeader';
import StateBlock from './StateBlock';

export type FilterModeTarget = {
  source: 'flow' | 'library';
  key: string;
  label: string;
  subtitle?: string;
};

type FilterModeProps = {
  target: FilterModeTarget | null;
  appliedSetting?: FeedDisplayLimitSetting;
  onSave: (setting: FeedDisplayLimitSetting) => void;
  onBack?: () => void;
};

function getCustomValidationMessage(value: string): string | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return 'Enter a positive item count before saving.';
  }

  if (!/^\d+$/.test(trimmed)) {
    return 'Use whole numbers only.';
  }

  const parsed = Number.parseInt(trimmed, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 'Use a positive item count.';
  }

  return undefined;
}

export default function FilterMode({
  target,
  appliedSetting,
  onSave,
  onBack,
}: FilterModeProps) {
  const normalizedApplied = useMemo(
    () => normalizeFeedDisplayLimitSetting(appliedSetting),
    [appliedSetting]
  );
  const [pendingMode, setPendingMode] = useState<FeedDisplayLimitSetting['mode']>(
    normalizedApplied.mode
  );
  const [customValue, setCustomValue] = useState(
    normalizedApplied.mode === 'custom' && normalizedApplied.customLimit
      ? String(normalizedApplied.customLimit)
      : ''
  );

  useEffect(() => {
    setPendingMode(normalizedApplied.mode);
    setCustomValue(
      normalizedApplied.mode === 'custom' && normalizedApplied.customLimit
        ? String(normalizedApplied.customLimit)
        : ''
    );
  }, [normalizedApplied, target?.key]);

  const customValidationMessage =
    pendingMode === 'custom' ? getCustomValidationMessage(customValue) : undefined;

  const pendingSetting: FeedDisplayLimitSetting =
    pendingMode === 'custom'
      ? {
          mode: 'custom',
          customLimit: customValidationMessage
            ? null
            : Number.parseInt(customValue.trim(), 10),
        }
      : { mode: pendingMode };

  const saveDisabled =
    !target ||
    Boolean(customValidationMessage) ||
    areFeedDisplaySettingsEqual(pendingSetting, normalizedApplied);

  function handleSave() {
    if (!target || saveDisabled) {
      return;
    }

    onSave(
      pendingMode === 'custom'
        ? {
            mode: 'custom',
            customLimit: Number.parseInt(customValue.trim(), 10),
          }
        : { mode: pendingMode }
    );
  }

  return (
    <section className="panel panel--secondary utility-mode-panel filter-mode">
      <PanelHeader
        eyebrow="Filter"
        title="Displayed item limit"
        description="Apply an optional display limit to the active route or saved feed without changing the underlying feed."
        actions={
          onBack ? (
            <div className="panel-header-actions">
              <button type="button" className="ghost-button" onClick={onBack}>
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
            </div>
          ) : undefined
        }
      />

      {!target ? (
        <StateBlock
          compact
          title="No active feed target"
          message="Open Filter from Step 2 or Library to adjust the displayed item count for that specific route or saved feed."
        />
      ) : (
        <>
          <div className="surface-card surface-card--quiet filter-target-card">
            <div className="route-meta-label">
              <ListFilter size={16} />
              <span>Applies to</span>
            </div>

            <div className="filter-target-copy">
              <div className="filter-target-heading">
                <h3>{target.label}</h3>
                <span className="badge subtle">
                  {target.source === 'library' ? 'Library feed' : 'Workflow route'}
                </span>
              </div>
              {target.subtitle ? <p>{target.subtitle}</p> : null}
            </div>
          </div>

          <div className="surface-card surface-card--quiet filter-mode-card">
            <label className="field-group">
              <span className="field-label">Limit displayed items</span>
              <input
                className="text-input"
                type="text"
                inputMode="numeric"
                value={customValue}
                onChange={(event) => {
                  setCustomValue(event.target.value);
                  setPendingMode('custom');
                }}
                placeholder="Enter a custom item limit"
              />
              {pendingMode === 'custom' ? (
                <span className="field-help">
                  Enter a custom positive item count, then save to apply it.
                </span>
              ) : null}
            </label>

            <div className="filter-mode-options">
              <span className="field-label">Quick presets</span>
              <div
                className="filter-mode-radio-group"
                role="radiogroup"
                aria-label="Displayed item presets"
              >
                {FEED_DISPLAY_LIMIT_PRESETS.map((option) => (
                  <label
                    key={option.mode}
                    className={`filter-mode-option ${
                      pendingMode === option.mode ? 'active' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="display-limit-preset"
                      checked={pendingMode === option.mode}
                      onChange={() => setPendingMode(option.mode)}
                    />
                    <span className="filter-mode-option-label">{option.label}</span>
                    <span className="filter-mode-option-detail">{option.detail}</span>
                  </label>
                ))}
              </div>
            </div>

            {customValidationMessage ? (
              <p className="filter-mode-validation">{customValidationMessage}</p>
            ) : null}

            <div className="panel-header-actions filter-mode-actions">
              <button
                type="button"
                className="primary-button"
                onClick={handleSave}
                disabled={saveDisabled}
              >
                <span>Save</span>
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
