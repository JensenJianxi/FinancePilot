import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

function isInteractiveTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("a, button, input, select, textarea"));
}

export function DashboardLinkCard({
  ariaLabel,
  children,
  className,
  to
}: {
  ariaLabel: string;
  children: ReactNode;
  className: string;
  to: string;
}) {
  const navigate = useNavigate();

  function handleClick(event: MouseEvent<HTMLElement>) {
    if (!isInteractiveTarget(event.target)) {
      navigate(to);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    navigate(to);
  }

  return (
    <section
      aria-label={ariaLabel}
      className={`${className} dashboard-link-card`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
    >
      {children}
    </section>
  );
}
