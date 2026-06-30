import apiClient from "./client";

type Params = Record<string, unknown>;
type Payload = Record<string, unknown>;

export const reportsAPI = {
  getOperational: (params?: Params) =>
    apiClient.get("/reports/operational/", { params }),
  downloadOperational: (params?: Params) =>
    apiClient.get("/reports/operational/export/xlsx/", {
      params,
      responseType: "blob",
    }),
  listOffenses: (params?: Params) =>
    apiClient.get("/reports/offenses/", { params }),
  createOffense: (data: Payload) => apiClient.post("/reports/offenses/", data),
  updateOffense: (id: number | string, data: Payload) =>
    apiClient.patch(`/reports/offenses/${id}/`, data),
  deleteOffense: (id: number | string) =>
    apiClient.delete(`/reports/offenses/${id}/`),
  listMissionViolations: (params?: Params) =>
    apiClient.get("/reports/mission-violations/", { params }),
  createMissionViolation: (data: Payload) =>
    apiClient.post("/reports/mission-violations/", data),
  approveMissionViolation: (id: number | string, data: Payload) =>
    apiClient.post(`/reports/mission-violations/${id}/approve/`, data),
  rejectMissionViolation: (id: number | string, data: Payload) =>
    apiClient.post(`/reports/mission-violations/${id}/reject/`, data),
};
