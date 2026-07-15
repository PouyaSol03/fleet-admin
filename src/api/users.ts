import apiClient from "./client";

type Params = Record<string, unknown>;
type Payload = Record<string, unknown>;

export const usersAPI = {
  list: (params?: Params) => apiClient.get("/users/", { params }),
  create: (data: Payload) => apiClient.post("/users/", data),
  get: (id: number | string) => apiClient.get(`/users/${id}/`),
  update: (id: number | string, data: Payload) => apiClient.put(`/users/${id}/`, data),
  delete: (id: number | string) => apiClient.delete(`/users/${id}/`),

  downloadUsers: (params?: Params) =>
    apiClient.get("/users/export/", {
      params,
      responseType: "blob",
    }),
  dashboardSummary: () => apiClient.get("/users/dashboard/summary/"),

  listDrivers: (params?: Params) => apiClient.get("/users/drivers/", { params }),
  getDriver: (id: number | string) => apiClient.get(`/users/drivers/${id}/`),
  createDriver: (data: Payload) => apiClient.post("/users/drivers/", data),
  updateDriver: (id: number | string, data: Payload) =>
    apiClient.patch(`/users/drivers/${id}/`, data),
  deleteDriver: (id: number | string) => apiClient.delete(`/users/drivers/${id}/`),
  downloadDrivers: (params?: Params) =>
    apiClient.get("/users/drivers/export/", {
      params,
      responseType: "blob",
    }),

  listAccessGroups: (params?: Params) =>
    apiClient.get("/users/access-groups/", { params }),
  getAccessGroup: (id: number | string) =>
    apiClient.get(`/users/access-groups/${id}/`),
  createAccessGroup: (data: Payload) =>
    apiClient.post("/users/access-groups/", data),
  updateAccessGroup: (id: number | string, data: Payload) =>
    apiClient.patch(`/users/access-groups/${id}/`, data),
  deleteAccessGroup: (id: number | string) =>
    apiClient.delete(`/users/access-groups/${id}/`),
  permissionCodes: () =>
    apiClient.get("/users/access-groups/permission-codes/"),
};
