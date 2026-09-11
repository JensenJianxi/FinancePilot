import type { ReactNode } from "react";

export function StatusPill({
  children,
  tone
}: {
  children: ReactNode;
  tone: "accent" | "danger" | "success" | "warning";
}) {
  return <span className={`status-pill status-pill-${tone}`}>{children}</span>;
}
