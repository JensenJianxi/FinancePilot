import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { BottomNav } from "../navigation/BottomNav";
import { FloatingActionButton } from "../navigation/FloatingActionButton";
import { SidebarNav } from "../navigation/SidebarNav";

export function AppShell({
  children,
  onAdd
}: {
  children: ReactNode;
  onAdd: () => void;
}) {
  const location = useLocation();
  const showExpenseAction = location.pathname.startsWith("/expenses");

  return (
    <div className="app-frame">
      <div className="app-shell">
        <SidebarNav />
        <div className="app-surface">
          <main className="screen-content">{children}</main>
          {showExpenseAction ? <FloatingActionButton onClick={onAdd} /> : null}
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
