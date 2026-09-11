export function ScreenHeader({
  actions,
  eyebrow,
  title
}: {
  actions?: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="screen-header">
      <div>
        <p className="section-label">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {actions ? <div className="screen-header-actions">{actions}</div> : null}
    </header>
  );
}
