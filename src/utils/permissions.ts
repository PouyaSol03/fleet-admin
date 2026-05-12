import type { AuthUser } from "../context/AuthContext";

export function hasPermission(user: AuthUser | null, permission: string) {
  if (user?.isSuperuser) return true;
  return Boolean(user?.permissions?.includes(permission));
}
