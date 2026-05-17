export type EventType = "exam" | "deadline" | "personal" | "reminder";

export interface CalendarEvent {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  type: EventType;
  start_date: string;
  end_date: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}
