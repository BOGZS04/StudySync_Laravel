import type { ClassRoom } from "./class";
import type { User } from "./user";

export interface Announcement {
  id: number;
  class_id: number;
  teacher_id: number;
  title: string;
  content: string;
  file_path: string | null;
  file_url?: string | null;
  class?: Pick<ClassRoom, "id" | "name" | "subject">;
  teacher?: Pick<User, "id" | "name" | "avatar">;
  created_at: string;
}
