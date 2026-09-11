import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { isNavigationItemActive, navigationItems } from "./navigationItems";

export function BottomNav() {
  const { pathname } = useLocation();

  return createPortal(
    <nav aria-label="Primary navigation" className="bottom-nav">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = isNavigationItemActive(pathname, item.activePaths);

        return (
          <Link
            key={item.path}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.label}
            className={`tab-link ${isActive ? "tab-link-active" : ""}`}
            to={item.path}
          >
            <Icon className="nav-icon" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>,
    document.body
  );
}
