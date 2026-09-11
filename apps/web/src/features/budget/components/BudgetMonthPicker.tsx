export function BudgetMonthPicker({
  error,
  label = "Month",
  onChange,
  value
}: {
  error?: string;
  label?: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const currentDate = new Date();
  const monthOptions = Array.from({ length: 96 }, (_, index) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 24 + index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  });

  if (value && !monthOptions.includes(value)) {
    monthOptions.push(value);
    monthOptions.sort();
  }

  return (
    <label className="field-block">
      <span>{label}</span>
      <select
        aria-label="Budget month"
        className="budget-month-input"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {monthOptions.map((month) => (
          <option key={month} value={month}>
            {formatMonth(month)}
          </option>
        ))}
      </select>
      {error ? <small>{error}</small> : null}
    </label>
  );
}

function formatMonth(value: string) {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const date = new Date(year, month - 1, 1);

  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric"
  }).format(date);
}
