import type { User } from "./user";

export interface ClassRoom {
  id: number;
  teacher_id: number;
  name: string;
  subject: string;
  section: string;
  class_code: string;
  description: string | null;
  is_active: boolean;
  students_count?: number;
  assignments_count?: number;
  teacher?: Pick<User, "id" | "name" | "avatar">;
  created_at: string;
  updated_at: string;
}
