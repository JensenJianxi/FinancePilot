export function PlaceholderCard({
  description,
  eyebrow,
  title
}: {
  description: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <div className="empty-card">
      {eyebrow ? <p className="section-label">{eyebrow}</p> : null}
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
