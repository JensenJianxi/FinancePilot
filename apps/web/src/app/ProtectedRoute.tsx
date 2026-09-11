import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LoadingState } from "../components/feedback/LoadingState";
import { useAuth } from "./AuthProvider";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { status } = useAuth();

  if (status === "loading") {
    return <LoadingState label="Restoring secure session" />;
  }

  if (status !== "authenticated") {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <>{children}</>;
}
