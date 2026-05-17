import AxiosInstance from "../api/AxiosIntance";
import { handleRequest } from "../api/apiHandler";
import type { QueryParams } from "./types";

const BASE_PREFIX = "assignments";

const AssignmentService = {
  getAll: (params?: QueryParams) =>
    handleRequest(AxiosInstance.get(BASE_PREFIX, { params }), "Failed to fetch assignments"),
  getByClass: (classId: number, params?: QueryParams) =>
    handleRequest(AxiosInstance.get(`classes/${classId}/assignments`, { params }), "Failed to fetch class assignments"),
  getOne: (id: number) =>
    handleRequest(AxiosInstance.get(`${BASE_PREFIX}/${id}`), "Failed to fetch assignment"),
  create: (data: FormData) =>
    handleRequest(AxiosInstance.post(BASE_PREFIX, data), "Failed to create assignment"),
  update: (id: number, data: FormData) =>
    handleRequest(AxiosInstance.post(`${BASE_PREFIX}/${id}`, data), "Failed to update assignment"),
  delete: (id: number) =>
    handleRequest(AxiosInstance.delete(`${BASE_PREFIX}/${id}`), "Failed to delete assignment"),
};

export default AssignmentService;
