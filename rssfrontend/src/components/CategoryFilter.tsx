import { Filter, X } from 'lucide-react';

type CategoryFilterProps = {
  categories: string[];
  activeCategory: string;
  onChange: (value: string) => void;
};

export default function CategoryFilter({
  categories,
  activeCategory,
  onChange,
}: CategoryFilterProps) {
  return (
    <div className="category-filter">
      <div className="category-filter-label">
        <Filter size={16} />
        <span>Category</span>
      </div>

      <div className="category-filter-controls">
        <select
          className="text-input category-select"
          value={activeCategory}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        {activeCategory ? (
          <button
            type="button"
            className="icon-button"
            onClick={() => onChange('')}
            aria-label="Clear category filter"
          >
            <X size={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}