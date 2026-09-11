import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../app/AuthProvider";
import { AccountEntry } from "../account/AccountEntry";
import { isNavigationItemActive, navigationItems } from "./navigationItems";

function getInitials(value: string): string {
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function SidebarNav() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  return (
    <aside className="sidebar-nav" aria-label="Desktop navigation">
      <Link className="brand-mark" to="/">
        <span className="brand-icon">FP</span>
        <div>
          <strong>FinancePilot</strong>
          <p>Personal finance, made calm.</p>
        </div>
      </Link>

      <div className="sidebar-account-block">
        <AccountEntry
          avatarLabel={user ? getInitials(user.fullName) : undefined}
          href={user ? "/profile" : "/login"}
          label={user ? user.fullName : "Sign in"}
          sublabel={user ? user.email : "Access your account"}
          variant="sidebar"
        />
      </div>

      <div className="sidebar-links">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = isNavigationItemActive(pathname, item.activePaths);

          return (
            <Link
              key={item.path}
              aria-current={isActive ? "page" : undefined}
              className={`sidebar-link ${isActive ? "sidebar-link-active" : ""}`}
              to={item.path}
            >
              <Icon className="nav-icon" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="sidebar-panel">
        <p className="section-label">FinancePilot AI</p>
        <strong>Spending is steady.</strong>
        <p>Your grocery and transport trends look stable this week.</p>
      </div>
    </aside>
  );
}
