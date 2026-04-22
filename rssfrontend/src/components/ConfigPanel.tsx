import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, Save, Settings2, Upload } from 'lucide-react';
import PanelHeader from './PanelHeader';
import StateBlock from './StateBlock';
import type { ConfigEntry, ConfigHint } from '../types';
import { mergeConfigEntries, toConfigExport } from '../utils/configHints';

type ConfigPanelProps = {
  hints: ConfigHint[];
  entries: ConfigEntry[];
  endpointUrl: string;
  onChangeEndpointUrl: (value: string) => void;
  onChangeEntries: (entries: ConfigEntry[]) => void;
  onLoadRemote: () => Promise<void> | void;
  onSaveRemote: () => Promise<void> | void;
  isLoadingRemote?: boolean;
  isSavingRemote?: boolean;
  lastLoadedAt?: string;
  lastSavedAt?: string;
  statusMessage?: string;
  errorMessage?: string;
};

export default function ConfigPanel({
  hints,
  entries,
  endpointUrl,
  onChangeEndpointUrl,
  onChangeEntries,
  onLoadRemote,
  onSaveRemote,
  isLoadingRemote = false,
  isSavingRemote = false,
  lastLoadedAt,
  lastSavedAt,
  statusMessage,
  errorMessage,
}: ConfigPanelProps) {
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const mergedEntries = useMemo(
    () => mergeConfigEntries(entries, hints),
    [entries, hints]
  );

  const exportText = useMemo(() => toConfigExport(mergedEntries), [mergedEntries]);

  useEffect(() => {
    const changed =
      mergedEntries.length !== entries.length ||
      mergedEntries.some((entry, index) => {
        const current = entries[index];
        return (
          !current ||
          current.key !== entry.key ||
          current.value !== entry.value ||
          current.label !== entry.label ||
          current.description !== entry.description ||
          current.valueType !== entry.valueType ||
          current.required !== entry.required
        );
      });

    if (changed) {
      onChangeEntries(mergedEntries);
    }
  }, [entries, mergedEntries, onChangeEntries]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCopied(false);
    }, 1400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [copied]);

  async function handleCopyExport() {
    if (!exportText.trim()) {
      return;
    }

    await navigator.clipboard.writeText(exportText);
    setCopied(true);
  }

  function updateEntry(key: string, value: string) {
    onChangeEntries(
      mergedEntries.map((entry) =>
        entry.key === key
          ? {
              ...entry,
              value,
            }
          : entry
      )
    );
  }

  function triggerImport() {
    fileInputRef.current?.click();
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();

    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const importedEntries = Object.entries(parsed).map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      }));
      onChangeEntries(mergeConfigEntries(importedEntries, hints));
    } catch {
      // Ignore invalid imports; app-level error handling can be added later.
    } finally {
      event.target.value = '';
    }
  }

  function renderInput(entry: ConfigEntry) {
    const valueType = entry.valueType ?? 'text';

    if (valueType === 'textarea') {
      return (
        <textarea
          className="url-output"
          value={entry.value}
          onChange={(event) => updateEntry(entry.key, event.target.value)}
          placeholder={`Enter ${entry.key}`}
          rows={4}
          spellCheck={false}
        />
      );
    }

    return (
      <input
        className="text-input"
        type={valueType === 'password' ? 'password' : 'text'}
        value={entry.value}
        onChange={(event) => updateEntry(entry.key, event.target.value)}
        placeholder={`Enter ${entry.key}`}
        spellCheck={false}
        autoComplete="off"
      />
    );
  }

  return (
    <section className="panel panel--secondary utility-mode-panel config-panel">
      <PanelHeader
        eyebrow="Instance setup"
        title="Config"
        description={
          <>
            Edit the remote RSSHub config document used by <code>REMOTE_CONFIG</code>.
            This is the source of truth for supported instance-level keys.
          </>
        }
        align="center"
        actions={
          <div className="config-header-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={triggerImport}
            >
              <Upload size={16} />
              <span>Import JSON</span>
            </button>

            <button
              type="button"
              className="ghost-button"
              onClick={handleCopyExport}
              disabled={!exportText.trim()}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copied' : 'Copy export'}</span>
            </button>
          </div>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden-input"
        onChange={handleImportFile}
      />

      <div className="surface-card surface-card--quiet config-remote-card">
        <label className="field-group">
          <span className="field-label">Remote config endpoint</span>
          <input
            className="text-input"
            type="url"
            value={endpointUrl}
            onChange={(event) => onChangeEndpointUrl(event.target.value)}
            placeholder="https://example.com/rsshub-config.json"
            spellCheck={false}
            autoComplete="off"
          />
        </label>

        <div className="config-meta-row">
          <span className="config-meta-item">
            Remote source for RSSHub startup config. Some basic settings may still
            need local bootstrap env vars.
          </span>
          {lastLoadedAt ? (
            <span className="config-meta-item">Last loaded: {lastLoadedAt}</span>
          ) : null}
          {lastSavedAt ? (
            <span className="config-meta-item">Last saved: {lastSavedAt}</span>
          ) : null}
        </div>

        <div className="builder-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => void onLoadRemote()}
            disabled={!endpointUrl.trim() || isLoadingRemote}
          >
            <Download size={16} />
            <span>{isLoadingRemote ? 'Loading...' : 'Load remote config'}</span>
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => void onSaveRemote()}
            disabled={!endpointUrl.trim() || isSavingRemote}
          >
            <Save size={16} />
            <span>{isSavingRemote ? 'Saving...' : 'Save remote config'}</span>
          </button>
        </div>

        {statusMessage ? (
          <StateBlock
            compact
            variant="success"
            title="Remote config updated"
            message={statusMessage}
          />
        ) : null}

        {errorMessage ? (
          <StateBlock
            compact
            variant="error"
            title="Remote config error"
            message={errorMessage}
          />
        ) : null}
      </div>

      {!hints.length ? (
        <StateBlock
          title="No route-specific config hints"
          message="Select a route to see any relevant instance-level configuration keys."
        />
      ) : (
        <div className="config-list">
          {hints.map((hint) => {
            const entry = mergedEntries.find((item) => item.key === hint.key);

            if (!entry) {
              return null;
            }

            return (
              <article
                key={hint.key}
                className="surface-card surface-card--quiet config-card"
              >
                <div className="config-card-top">
                  <div className="config-title-wrap">
                    <div className="route-meta-label">
                      <Settings2 size={16} />
                      <span>{hint.label}</span>
                    </div>

                    <div className="config-badges">
                      <span
                        className={`badge ${
                          hint.required ? 'danger-badge' : 'subtle'
                        }`}
                      >
                        {hint.required ? 'required' : 'optional'}
                      </span>
                      <span className="badge">{hint.key}</span>
                    </div>
                  </div>
                </div>

                <p className="config-description">{hint.description}</p>

                <label className="field-group">
                  <span className="field-label">Value</span>
                  {renderInput(entry)}
                </label>
              </article>
            );
          })}
        </div>
      )}

      <div className="surface-card surface-card--ghost builder-block config-json-preview">
        <label className="field-label">JSON preview</label>
        <textarea
          className="url-output"
          value={JSON.stringify(
            mergedEntries.reduce<Record<string, string>>((accumulator, entry) => {
              const key = entry.key.trim();
              const value = entry.value.trim();

              if (key && value) {
                accumulator[key] = value;
              }

              return accumulator;
            }, {}),
            null,
            2
          )}
          readOnly
          rows={Math.max(6, hints.length + 2)}
        />
      </div>
    </section>
  );
}
