import AxiosInstance from "../api/AxiosIntance";
import { handleRequest } from "../api/apiHandler";
import type { QueryParams } from "./types";

const BASE_PREFIX = "notifications";

const NotificationService = {
  getAll: (params?: QueryParams) =>
    handleRequest(AxiosInstance.get(BASE_PREFIX, { params }), "Failed to fetch notifications"),
  markRead: (id: number) =>
    handleRequest(AxiosInstance.patch(`${BASE_PREFIX}/${id}/read`), "Failed to mark notification as read"),
  markAllRead: () =>
    handleRequest(AxiosInstance.post(`${BASE_PREFIX}/read-all`), "Failed to mark notifications as read"),
  delete: (id: number) =>
    handleRequest(AxiosInstance.delete(`${BASE_PREFIX}/${id}`), "Failed to clear notification"),
  clearRead: () =>
    handleRequest(AxiosInstance.delete(`${BASE_PREFIX}/read`), "Failed to clear read notifications"),
};

export default NotificationService;
