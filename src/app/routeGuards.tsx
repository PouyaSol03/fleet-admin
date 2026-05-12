import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { getAccessToken } from "../api/client";

export function PublicRoute({ children }: { children: ReactNode }) {
  if (getAccessToken()) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  if (!getAccessToken()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
