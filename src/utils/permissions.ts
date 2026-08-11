import type { AuthUser } from "../context/AuthContext";

export function isSuperAdmin(user: AuthUser | null | undefined) {
  if (!user) return false;

  const userType = String(user.userType || "").trim().toLowerCase();
  const authority = Array.isArray(user.authority)
    ? user.authority.map((item) => String(item).trim().toLowerCase())
    : [];

  return Boolean(
    user.isSuperuser ||
      userType === "superadmin" ||
      authority.includes("superadmin"),
  );
}

export function hasPermission(user: AuthUser | null, permission: string) {
  if (isSuperAdmin(user)) return true;
  return Boolean(user?.permissions?.includes(permission));
}
