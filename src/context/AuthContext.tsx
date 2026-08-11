import { createContext, useContext } from "react";

export type AuthUser = {
  id?: number;
  userName?: string;
  fullName?: string;
  isDriver?: boolean;
  isSuperuser?: boolean;
  permissions?: string[];
  accessGroupId?: number | null;
  accessGroupName?: string;
  parentId?: number | null;
  userType?: string;
  userTypeLabel?: string;
  authority?: string[];
};

type AuthContextValue = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  profileLoading: boolean;
};

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  setUser: () => undefined,
  profileLoading: false,
});

export function useAuth() {
  return useContext(AuthContext);
}
