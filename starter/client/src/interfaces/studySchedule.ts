export interface StudySchedule {
  id: number;
  student_id: number;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string;
  subject: string | null;
  color: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}
