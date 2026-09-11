import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { LoadingState } from "../components/feedback/LoadingState";
import { useAuth } from "./AuthProvider";

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === "loading") {
    return <LoadingState label="Checking your session" />;
  }

  if (status === "authenticated") {
    return <Navigate replace to="/" />;
  }

  return <>{children}</>;
}
