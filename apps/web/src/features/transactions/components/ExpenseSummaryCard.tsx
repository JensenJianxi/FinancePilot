export function ExpenseSummaryCard({
  label,
  meta,
  value
}: {
  label: string;
  meta: string;
  value: string;
}) {
  return (
    <div className="summary-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{meta}</p>
    </div>
  );
}
