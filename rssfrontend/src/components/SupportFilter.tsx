import { SlidersHorizontal, X } from 'lucide-react';
import type { RouteSupportFilter } from '../types';

type SupportFilterProps = {
  value: RouteSupportFilter;
  onChange: (value: RouteSupportFilter) => void;
};

const FILTER_OPTIONS: Array<{ value: RouteSupportFilter; label: string }> = [
  { value: 'all', label: 'All support levels' },
  { value: 'ready', label: 'Ready to use (+ optional)' },
  { value: 'recommended', label: 'Optional setup recommended' },
  { value: 'required', label: 'Required API or config' },
  { value: 'advanced', label: 'Advanced setup required' },
  { value: 'unsupported', label: 'Unsupported on this instance' },
];

export default function SupportFilter({
  value,
  onChange,
}: SupportFilterProps) {
  return (
    <div className="category-filter">
      <div className="category-filter-label">
        <SlidersHorizontal size={16} />
        <span>Support</span>
      </div>

      <div className="category-filter-controls">
        <select
          className="text-input category-select"
          value={value}
          onChange={(event) => onChange(event.target.value as RouteSupportFilter)}
        >
          {FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {value !== 'all' ? (
          <button
            type="button"
            className="icon-button"
            onClick={() => onChange('all')}
            aria-label="Clear support filter"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
