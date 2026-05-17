import type { User } from "./user";

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  read_at: string | null;
  sender?: Pick<User, "id" | "name" | "avatar">;
  receiver?: Pick<User, "id" | "name" | "avatar">;
  created_at: string;
  updated_at: string;
}
