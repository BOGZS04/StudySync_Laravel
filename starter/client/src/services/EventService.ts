import AxiosInstance from "../api/AxiosIntance";
import { handleRequest } from "../api/apiHandler";
import type { QueryParams } from "./types";

const BASE_PREFIX = "events";

const EventService = {
  getAll: (params?: QueryParams) =>
    handleRequest(AxiosInstance.get(BASE_PREFIX, { params }), "Failed to fetch events"),
  create: (data: FormData) =>
    handleRequest(AxiosInstance.post(BASE_PREFIX, data), "Failed to create event"),
  update: (id: number, data: FormData) =>
    handleRequest(AxiosInstance.post(`${BASE_PREFIX}/${id}`, data), "Failed to update event"),
  delete: (id: number) =>
    handleRequest(AxiosInstance.delete(`${BASE_PREFIX}/${id}`), "Failed to delete event"),
};

export default EventService;
