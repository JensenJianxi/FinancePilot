export function LoadingState({ label }: { label: string }) {
  return (
    <div className="state-card" role="status">
      <div className="skeleton-frame" aria-hidden="true">
        <div className="skeleton-line skeleton-line-title" />
        <div className="skeleton-line skeleton-line-copy" />
        <div className="skeleton-grid">
          <div className="skeleton-tile" />
          <div className="skeleton-tile" />
          <div className="skeleton-tile" />
        </div>
      </div>
      <p>{label}</p>
    </div>
  );
}
