import { Link } from "react-router-dom";

export function MenuLink({
  label,
  sublabel,
  to
}: {
  label: string;
  sublabel: string;
  to: string;
}) {
  return (
    <Link className="menu-row" to={to}>
      <div>
        <strong>{label}</strong>
        <p>{sublabel}</p>
      </div>
      <span>Open</span>
    </Link>
  );
}

export function MenuStatic({ label, value }: { label: string; value: string }) {
  return (
    <div className="menu-row">
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  );
}
