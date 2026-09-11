import { Link } from "react-router-dom";
import { UserIcon } from "../ui/icons";

export function AccountEntry({
  avatarLabel,
  href,
  label,
  sublabel,
  variant = "default"
}: {
  avatarLabel?: string;
  href: string;
  label: string;
  sublabel: string;
  variant?: "default" | "sidebar";
}) {
  return (
    <Link className={`account-entry account-entry-${variant}`} to={href}>
      <span aria-hidden="true" className="account-entry-avatar">
        {avatarLabel ? <span className="account-entry-initials">{avatarLabel}</span> : <UserIcon className="account-entry-icon" />}
      </span>
      <span className="account-entry-copy">
        <strong>{label}</strong>
        <span>{sublabel}</span>
      </span>
    </Link>
  );
}
