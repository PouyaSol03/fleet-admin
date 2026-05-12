import apiClient from "./client";

type Credentials = {
  username: string;
  password: string;
};

export const authAPI = {
  login: (credentials: Credentials) =>
    apiClient.post("/users/sign-in/", {
      userName: credentials.username,
      password: credentials.password,
    }),
  bootstrap: (credentials: Credentials) =>
    apiClient.post("/users/sign-up/", {
      userName: credentials.username,
      password: credentials.password,
    }),
  getBootstrapStatus: () => apiClient.get("/users/bootstrap-status/"),
  getProfile: () => apiClient.get("/users/me/"),
  logout: (refresh: string) => apiClient.post("/users/sign-out/", { refresh }),
  getAllowedRoles: () => apiClient.get("/users/allowed-roles/"),
};
