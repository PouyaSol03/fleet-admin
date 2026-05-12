import apiClient from "./client";

export const notificationsAPI = {
  list: () => apiClient.get("/notifications/"),
  markRead: (id: number | string) => apiClient.post(`/notifications/${id}/read/`),
  markAllRead: () => apiClient.post("/notifications/read-all/"),
};
