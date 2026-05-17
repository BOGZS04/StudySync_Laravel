import type { Assignment } from "./assignment";
import type { User } from "./user";

export type SubmissionStatus = "submitted" | "approved" | "rejected" | "graded";

export interface Submission {
  id: number;
  assignment_id: number;
  student_id: number;
  content: string | null;
  file_path: string | null;
  file_url?: string | null;
  status: SubmissionStatus;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  student?: Pick<User, "id" | "name" | "avatar" | "slug">;
  assignment?: Pick<Assignment, "id" | "title" | "points">;
  created_at: string;
  updated_at: string;
}
