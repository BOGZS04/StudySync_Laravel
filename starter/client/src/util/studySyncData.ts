import type { PaginationMeta } from "../components/ui";

export interface ApiEnvelope<TData> {
  status: string;
  message: string;
  data: TData;
}

export const emptyMeta: PaginationMeta = {
  current_page: 1,
  last_page: 1,
  per_page: 10,
  total: 0,
};

export const unwrapData = <TData>(response: unknown, fallback: TData): TData => {
  const envelope = response as Partial<ApiEnvelope<TData>>;
  return envelope.data ?? fallback;
};

export const formatDate = (value: string, options?: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(new Date(value));

export const formatTime = (value: string) =>
  new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(`2026-01-01T${value}`));

export const isPastDate = (value: string) => new Date(value).getTime() < Date.now();

export const isWithinDays = (value: string, days: number) => {
  const target = new Date(value).getTime();
  const now = Date.now();
  const windowEnd = now + days * 24 * 60 * 60 * 1000;

  return target >= now && target <= windowEnd;
};

export const getTodayDate = () => new Date().toISOString().slice(0, 10);

