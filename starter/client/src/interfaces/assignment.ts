import type { ClassRoom } from "./class";

export type AssignmentStatus = "pending" | "submitted" | "graded" | "overdue";

export interface Assignment {
  id: number;
  class_id: number;
  teacher_id: number;
  title: string;
  description: string;
  due_date: string;
  points: number | null;
  allow_late_submission: boolean;
  file_path: string | null;
  file_url?: string | null;
  submission_status?: AssignmentStatus;
  submissions_count?: number;
  class?: Pick<ClassRoom, "id" | "name" | "subject">;
  created_at: string;
  updated_at: string;
}
