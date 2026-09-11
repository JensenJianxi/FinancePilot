export function ProgressBar({
  tone,
  value
}: {
  tone: "accent" | "danger" | "success" | "warning";
  value: number;
}) {
  return (
    <div aria-hidden="true" className="progress-track">
      <div className={`progress-fill progress-fill-${tone}`} style={{ width: `${value}%` }} />
    </div>
  );
}
