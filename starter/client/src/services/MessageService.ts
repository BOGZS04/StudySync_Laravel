import AxiosInstance from "../api/AxiosIntance";
import { handleRequest } from "../api/apiHandler";

const BASE_PREFIX = "messages";

const MessageService = {
  conversations: () =>
    handleRequest(AxiosInstance.get(`${BASE_PREFIX}/conversations`), "Failed to fetch conversations"),
  contacts: () =>
    handleRequest(AxiosInstance.get(`${BASE_PREFIX}/contacts`), "Failed to fetch message contacts"),
  thread: (userId: number) =>
    handleRequest(AxiosInstance.get(`${BASE_PREFIX}/${userId}`), "Failed to fetch message thread"),
  send: (data: { receiver_id: number; content: string }) =>
    handleRequest(AxiosInstance.post(BASE_PREFIX, data), "Failed to send message"),
};

export default MessageService;
