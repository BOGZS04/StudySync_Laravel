export type Theme = 'light' | 'dark' | 'system';
export type Role = 'guest' | 'admin' | 'student' | 'teacher';

export interface User {
  id: number;
  slug: string;
  avatar: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  theme: Theme;
  last_login_at: string | null;
  last_login_ip: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
