import AxiosInstance from "../api/AxiosIntance";
import { handleRequest } from "../api/apiHandler";
import type { QueryParams } from "./types";

const SubmissionService = {
  getAllForAssignment: (assignmentId: number, params?: QueryParams) =>
    handleRequest(AxiosInstance.get(`assignments/${assignmentId}/submissions`, { params }), "Failed to fetch submissions"),
  getMine: (params?: QueryParams) =>
    handleRequest(AxiosInstance.get("student/submissions", { params }), "Failed to fetch submissions"),
  create: (assignmentId: number, data: FormData) =>
    handleRequest(AxiosInstance.post(`assignments/${assignmentId}/submissions`, data), "Failed to submit assignment"),
  review: (id: number, data: { status: string; grade?: number | null; feedback?: string | null }) =>
    handleRequest(AxiosInstance.put(`submissions/${id}/review`, data), "Failed to review submission"),
};

export default SubmissionService;
