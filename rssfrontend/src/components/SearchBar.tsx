import { X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { KeyboardEvent } from 'react';
import type { RouteItem } from '../types';
import type { RouteSupportSummary } from '../utils/routeSupport';
import { getRoutePlaceholder } from '../utils/rsshub';

type SearchBarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  results: RouteItem[];
  supportByRouteId: Map<string, RouteSupportSummary | undefined>;
  selectedRouteId?: string;
  onSelectRoute: (route: RouteItem) => void;
  isLoading?: boolean;
};

const MAX_RESULTS = 8;
const DROPDOWN_GUTTER = 14;
const DROPDOWN_MIN_SHELL_HEIGHT = 220;
const DROPDOWN_CHROME_HEIGHT = 64;

export default function SearchBar({
  query,
  onQueryChange,
  results,
  supportByRouteId,
  selectedRouteId,
  onSelectRoute,
  isLoading = false,
}: SearchBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dropdownDirection, setDropdownDirection] = useState<'down' | 'up'>('down');
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState<number>(420);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const visibleResults = useMemo(
    () => results.slice(0, MAX_RESULTS),
    [results]
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    window.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !inputRef.current) {
      return;
    }

    function updateDropdownPlacement() {
      const input = inputRef.current;

      if (!input) {
        return;
      }

      const rect = input.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const availableBelow = Math.max(0, viewportHeight - rect.bottom - DROPDOWN_GUTTER);
      const availableAbove = Math.max(0, rect.top - DROPDOWN_GUTTER);
      const shouldOpenUp =
        availableBelow < DROPDOWN_MIN_SHELL_HEIGHT && availableAbove > availableBelow;
      const available = shouldOpenUp ? availableAbove : availableBelow;

      setDropdownDirection(shouldOpenUp ? 'up' : 'down');
      setDropdownMaxHeight(Math.max(0, Math.min(420, available)));
    }

    updateDropdownPlacement();

    window.addEventListener('resize', updateDropdownPlacement);
    window.addEventListener('scroll', updateDropdownPlacement, true);

    return () => {
      window.removeEventListener('resize', updateDropdownPlacement);
      window.removeEventListener('scroll', updateDropdownPlacement, true);
    };
  }, [isOpen, visibleResults.length]);

  function handleFocus() {
    setIsOpen(true);
  }

  function handleClear() {
    onQueryChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function handleSelect(route: RouteItem) {
    onSelectRoute(route);
    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!visibleResults.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) =>
        current >= visibleResults.length - 1 ? 0 : current + 1
      );
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) =>
        current <= 0 ? visibleResults.length - 1 : current - 1
      );
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const route = visibleResults[activeIndex];
      if (route) {
        handleSelect(route);
      }
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }

  const dropdownStyle: CSSProperties = {
    maxHeight: dropdownMaxHeight,
    ...(dropdownDirection === 'up'
      ? { top: 'auto', bottom: 'calc(100% + 10px)' }
      : { top: 'calc(100% + 10px)', bottom: 'auto' }),
  };

  const resultsListStyle: CSSProperties = {
    maxHeight: Math.max(0, dropdownMaxHeight - DROPDOWN_CHROME_HEIGHT),
  };

  return (
    <div className="searchbar" ref={rootRef}>
      <div className="searchbar-input-wrap">
        <input
          ref={inputRef}
          className="searchbar-input"
          type="text"
          placeholder="Search RSSHub routes by keyword, path, category, or source"
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setIsOpen(true);
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        {query ? (
          <button
            type="button"
            className="searchbar-clear"
            onClick={handleClear}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>

      {isOpen ? (
        <div
          className={[
            'searchbar-dropdown',
            dropdownDirection === 'up' ? 'searchbar-dropdown--upward' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={dropdownStyle}
        >
          <div className="searchbar-dropdown-header">
            <span>
              {isLoading
                ? 'Loading routes...'
                : `${visibleResults.length} suggestion${
                    visibleResults.length === 1 ? '' : 's'
                  }`}
            </span>
          </div>

          {visibleResults.length ? (
            <ul className="searchbar-results" role="listbox" style={resultsListStyle}>
              {visibleResults.map((route, index) => {
                const isActive = index === activeIndex;
                const isSelected = route.id === selectedRouteId;
                const supportSummary = supportByRouteId.get(route.id);

                return (
                  <li key={route.id}>
                    <button
                      type="button"
                      className={[
                        'searchbar-result',
                        isActive ? 'active' : '',
                        isSelected ? 'selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        handleSelect(route);
                      }}
                    >
                      <div className="searchbar-result-top">
                        <span className="searchbar-result-title">{route.title}</span>
                        <span className="searchbar-result-namespace">
                          {route.namespace}
                        </span>
                      </div>

                      <div className="searchbar-result-path">
                        {getRoutePlaceholder(route)}
                      </div>

                      {supportSummary ? (
                        <div className="searchbar-result-support">
                          <span className={supportSummary.badgeClassName}>
                            {supportSummary.label}
                          </span>
                          {supportSummary.sourceLabel ? (
                            <span className="badge subtle">
                              {supportSummary.sourceLabel}
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="searchbar-result-description">
                        {route.description}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="searchbar-empty">
              No routes found for <strong>{query}</strong>.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
