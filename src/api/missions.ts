import apiClient from "./client";

type Params = Record<string, unknown>;
type Payload = Record<string, unknown>;

export const missionsAPI = {
  list: (params?: Params) => apiClient.get("/missions/", { params }),
  get: (id: number | string) => apiClient.get(`/missions/${id}/`),
  create: (data: Payload) => apiClient.post("/missions/", data),
  update: (id: number | string, data: Payload) =>
    apiClient.patch(`/missions/${id}/`, data),
  delete: (id: number | string) => apiClient.delete(`/missions/${id}/`),
  submitManagerReport: (id: number | string, data: Payload) =>
    apiClient.post(`/missions/${id}/manager-report/`, data),

  listRequests: (params?: Params) =>
    apiClient.get("/missions/requests/", { params }),
  getRequest: (id: number | string) =>
    apiClient.get(`/missions/requests/${id}/`),
  createRequest: (data: Payload) =>
    apiClient.post("/missions/requests/", data),
  updateRequest: (id: number | string, data: Payload) =>
    apiClient.patch(`/missions/requests/${id}/`, data),
  deleteRequest: (id: number | string) =>
    apiClient.delete(`/missions/requests/${id}/`),
  acceptRequest: (id: number | string, data: Payload) =>
    apiClient.post(`/missions/requests/${id}/accept/`, data),
  rejectRequest: (id: number | string, data: Payload) =>
    apiClient.post(`/missions/requests/${id}/reject/`, data),
};
