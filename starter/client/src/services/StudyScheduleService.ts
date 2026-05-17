import AxiosInstance from "../api/AxiosIntance";
import { handleRequest } from "../api/apiHandler";
import type { QueryParams } from "./types";

const BASE_PREFIX = "study-schedules";

const StudyScheduleService = {
  getAll: (params?: QueryParams) =>
    handleRequest(AxiosInstance.get(BASE_PREFIX, { params }), "Failed to fetch study schedules"),
  create: (data: FormData) =>
    handleRequest(AxiosInstance.post(BASE_PREFIX, data), "Failed to create study schedule"),
  update: (id: number, data: FormData) =>
    handleRequest(AxiosInstance.post(`${BASE_PREFIX}/${id}`, data), "Failed to update study schedule"),
  delete: (id: number) =>
    handleRequest(AxiosInstance.delete(`${BASE_PREFIX}/${id}`), "Failed to delete study schedule"),
};

export default StudyScheduleService;
