import type { ComponentType, SVGProps } from "react";
import { BudgetIcon, ExpensesIcon, HomeIcon, MoreIcon } from "../ui/icons";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const navigationItems: Array<{
  activePaths: string[];
  icon: IconComponent;
  label: string;
  path: string;
}> = [
  { activePaths: ["/"], icon: HomeIcon, label: "Home", path: "/" },
  {
    activePaths: ["/expenses", "/activity"],
    icon: ExpensesIcon,
    label: "Expenses",
    path: "/expenses"
  },
  { activePaths: ["/budget"], icon: BudgetIcon, label: "Budget", path: "/budget" },
  {
    activePaths: ["/more", "/profile", "/categories"],
    icon: MoreIcon,
    label: "More",
    path: "/more"
  }
];

export function isNavigationItemActive(pathname: string, activePaths: string[]) {
  return activePaths.some((path) =>
    path === "/" ? pathname === path : pathname === path || pathname.startsWith(`${path}/`)
  );
}
