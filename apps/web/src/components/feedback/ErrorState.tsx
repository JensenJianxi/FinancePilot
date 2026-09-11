export function ErrorState({
  actionLabel = "Try again",
  message = "Check your connection and try again.",
  onRetry,
  title = "FinancePilot could not load."
}: {
  actionLabel?: string;
  message?: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className="state-card" role="alert">
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry ? (
        <button className="secondary-cta" onClick={onRetry} type="button">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
