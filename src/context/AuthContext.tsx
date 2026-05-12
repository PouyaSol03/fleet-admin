import { createContext, useContext } from "react";

export type AuthUser = {
  id?: number;
  userName?: string;
  fullName?: string;
  isDriver?: boolean;
  isSuperuser?: boolean;
  permissions?: string[];
  accessGroupName?: string;
  userTypeLabel?: string;
  roleLabel?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
};

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  setUser: () => undefined,
});

export function useAuth() {
  return useContext(AuthContext);
}
