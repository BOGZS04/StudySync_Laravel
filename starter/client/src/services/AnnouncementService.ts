import AxiosInstance from "../api/AxiosIntance";
import { handleRequest } from "../api/apiHandler";
import type { QueryParams } from "./types";

const BASE_PREFIX = "announcements";

const AnnouncementService = {
  getAll: (params?: QueryParams) =>
    handleRequest(AxiosInstance.get(BASE_PREFIX, { params }), "Failed to fetch announcements"),
  create: (data: FormData) =>
    handleRequest(AxiosInstance.post(BASE_PREFIX, data), "Failed to create announcement"),
  delete: (id: number) =>
    handleRequest(AxiosInstance.delete(`${BASE_PREFIX}/${id}`), "Failed to delete announcement"),
};

export default AnnouncementService;
