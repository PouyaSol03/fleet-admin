import apiClient from "./client";

type Credentials = {
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  nationalCode?: string;
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
      firstName: credentials.firstName,
      lastName: credentials.lastName,
      phone: credentials.phone,
      nationalCode: credentials.nationalCode,
    }),
  getBootstrapStatus: () => apiClient.get("/users/bootstrap-status/"),
  getProfile: () => apiClient.get("/users/me/"),
  logout: (refresh: string) => apiClient.post("/users/sign-out/", { refresh }),
};
