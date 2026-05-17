import AxiosInstance from "../api/AxiosIntance";
import { handleRequest } from "../api/apiHandler";
import type { QueryParams } from "./types";

const BASE_PREFIX = "classes";

const ClassService = {
  getAll: (params?: QueryParams) =>
    handleRequest(AxiosInstance.get(BASE_PREFIX, { params }), "Failed to fetch classes"),
  getOne: (id: number) =>
    handleRequest(AxiosInstance.get(`${BASE_PREFIX}/${id}`), "Failed to fetch class"),
  create: (data: FormData) =>
    handleRequest(AxiosInstance.post(BASE_PREFIX, data), "Failed to create class"),
  update: (id: number, data: FormData) =>
    handleRequest(AxiosInstance.post(`${BASE_PREFIX}/${id}`, data), "Failed to update class"),
  delete: (id: number) =>
    handleRequest(AxiosInstance.delete(`${BASE_PREFIX}/${id}`), "Failed to delete class"),
  join: (class_code: string) =>
    handleRequest(AxiosInstance.post(`${BASE_PREFIX}/join`, { class_code }), "Failed to join class"),
  students: (classId: number, params?: QueryParams) =>
    handleRequest(AxiosInstance.get(`${BASE_PREFIX}/${classId}/students`, { params }), "Failed to fetch class students"),
  removeStudent: (classId: number, studentId: number) =>
    handleRequest(AxiosInstance.delete(`${BASE_PREFIX}/${classId}/students/${studentId}`), "Failed to remove student"),
};

export default ClassService;
