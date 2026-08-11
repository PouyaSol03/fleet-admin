import apiClient from "./client";

type Params = Record<string, unknown>;
type Payload = Record<string, unknown>;

export const vehiclesAPI = {
  list: (params?: Params) => apiClient.get("/vehicle/vehicles/", { params }),
  get: (id: number | string) => apiClient.get(`/vehicle/vehicles/${id}/`),
  create: (data: Payload) => apiClient.post("/vehicle/vehicles/", data),
  update: (id: number | string, data: Payload) =>
    apiClient.patch(`/vehicle/vehicles/${id}/`, data),
  delete: (id: number | string) => apiClient.delete(`/vehicle/vehicles/${id}/`),
  downloadVehicles: (params?: Params) =>
    apiClient.get("/vehicle/vehicles/export/", {
      params,
      responseType: "blob",
    }),
  listLive: () => apiClient.get("/vehicle/traccar/live/"),
  syncTraccar: () => apiClient.post("/vehicle/traccar/sync/"),
  getTraccarConfig: () => apiClient.get("/vehicle/traccar/config/"),
  updateTraccarConfig: (data: Payload) =>
    apiClient.patch("/vehicle/traccar/config/", data),

  listGroups: (params?: Params) => apiClient.get("/vehicle/groups/", { params }),
  getGroup: (id: number | string) => apiClient.get(`/vehicle/groups/${id}/`),
  createGroup: (data: Payload) => apiClient.post("/vehicle/groups/", data),
  updateGroup: (id: number | string, data: Payload) =>
    apiClient.patch(`/vehicle/groups/${id}/`, data),
  deleteGroup: (id: number | string) => apiClient.delete(`/vehicle/groups/${id}/`),

  listTypes: (params?: Params) => apiClient.get("/vehicle/types/", { params }),
  getType: (id: number | string) => apiClient.get(`/vehicle/types/${id}/`),
  createType: (data: Payload) => apiClient.post("/vehicle/types/", data),
  updateType: (id: number | string, data: Payload) =>
    apiClient.patch(`/vehicle/types/${id}/`, data),
  deleteType: (id: number | string) => apiClient.delete(`/vehicle/types/${id}/`),

  listInspections: (params?: Params) =>
    apiClient.get("/vehicle/inspections/", { params }),
  getInspection: (id: number | string) =>
    apiClient.get(`/vehicle/inspections/${id}/`),
  createInspection: (data: Payload) =>
    apiClient.post("/vehicle/inspections/", data),
  updateInspection: (id: number | string, data: Payload) =>
    apiClient.patch(`/vehicle/inspections/${id}/`, data),
  deleteInspection: (id: number | string) =>
    apiClient.delete(`/vehicle/inspections/${id}/`),
};
