export interface ExpenseFilterState {
  category: string;
  search: string;
  sort: "amountAsc" | "amountDesc" | "newest" | "oldest" | "titleAsc";
  type: string;
}

export function ExpenseFilters({
  categories,
  onChange,
  value
}: {
  categories: string[];
  onChange: (next: ExpenseFilterState) => void;
  value: ExpenseFilterState;
}) {
  return (
    <div className="expense-filter-fields">
      <div className="filters-grid">
        <label className="field-block">
          <span>Search</span>
          <input
            onChange={(event) => onChange({ ...value, search: event.target.value })}
            placeholder="Coffee, rent, Netflix"
            value={value.search}
          />
        </label>

        <label className="field-block">
          <span>Type</span>
          <select
            onChange={(event) => onChange({ ...value, type: event.target.value })}
            value={value.type}
          >
            <option value="all">All types</option>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>

        <label className="field-block">
          <span>Category</span>
          <select
            onChange={(event) => onChange({ ...value, category: event.target.value })}
            value={value.category}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="field-block filter-sort-field">
        <span>Sort results</span>
        <select
          onChange={(event) =>
            onChange({
              ...value,
              sort: event.target.value as ExpenseFilterState["sort"]
            })
          }
          value={value.sort}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="amountDesc">Amount: highest to lowest</option>
          <option value="amountAsc">Amount: lowest to highest</option>
          <option value="titleAsc">Title: A to Z</option>
        </select>
      </label>
    </div>
  );
}
