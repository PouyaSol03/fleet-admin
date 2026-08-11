import type { AuthUser } from "../context/AuthContext";
import { isSuperAdmin } from "../utils/permissions";

type ProtectedRoutePermission = {
  path: string;
  permission: string;
  superadminOnly?: boolean;
};

const protectedRoutePermissions: ProtectedRoutePermission[] = [
  { path: "/dashboard", permission: "dashboard.view" },
  { path: "/users", permission: "users.view" },
  { path: "/access-groups", permission: "access_groups.view" },
  { path: "/drivers", permission: "drivers.view" },
  { path: "/vehicles", permission: "vehicles.view" },
  { path: "/tracking", permission: "map.view", superadminOnly: true },
  { path: "/vehicle-map", permission: "map.view" },
  { path: "/vehicle-groups", permission: "vehicle_groups.view" },
  { path: "/vehicle-types", permission: "vehicle_types.view" },
  { path: "/inspections", permission: "inspections.view" },
  { path: "/missions", permission: "missions.view" },
  { path: "/missions-calendar", permission: "missions.view" },
  { path: "/requests", permission: "mission_requests.view" },
  { path: "/reports", permission: "reports.operational.view" },
];

export function getAuthenticatedLandingPath(profile: AuthUser) {
  if (isSuperAdmin(profile)) {
    return "/dashboard";
  }

  const permissions = new Set(profile.permissions || []);
  const firstAllowedRoute = protectedRoutePermissions.find(
    ({ permission, superadminOnly }) =>
      !superadminOnly && permissions.has(permission),
  );

  // DashboardLayout owns the dedicated "no permissions" state.
  return firstAllowedRoute?.path || "/dashboard";
}

export function getValidatedAuthenticatedPath(
  profile: AuthUser,
  requestedPath: string,
) {
  if (profile.isDriver) {
    return "/unauthorized";
  }

  const landingPath = getAuthenticatedLandingPath(profile);

  if (
    requestedPath === "/" ||
    requestedPath === "/login" ||
    requestedPath === "/unauthorized"
  ) {
    return landingPath;
  }

  const route = protectedRoutePermissions.find(
    ({ path }) => path === requestedPath,
  );

  if (!route) {
    return landingPath;
  }

  if (route.superadminOnly) {
    // Keep a manually requested superadmin-only page mounted so that the page
    // can show its own access-denied state without making any protected API calls.
    return requestedPath;
  }

  if (isSuperAdmin(profile) || profile.permissions?.includes(route.permission)) {
    return requestedPath;
  }

  return landingPath;
}
