import React from "react";

export type StatusBadgeStatus =
  | "pending"
  | "submitted"
  | "approved"
  | "rejected"
  | "graded"
  | "overdue"
  | "active"
  | "inactive";

interface StatusBadgeProps {
  status: StatusBadgeStatus;
  label?: string;
}

const statusClasses: Record<StatusBadgeStatus, string> = {
  pending: "bg-warning/20 text-warning border-warning/30",
  submitted: "bg-info/20 text-info border-info/30",
  approved: "bg-success/20 text-success border-success/30",
  rejected: "bg-danger/20 text-danger border-danger/30",
  graded: "bg-primary/20 text-primary border-primary/30",
  overdue: "bg-danger/20 text-danger border-danger/30",
  active: "bg-success/20 text-success border-success/30",
  inactive: "bg-bg-main text-text-muted border-border-muted",
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => (
  <span
    className={`inline-flex w-fit items-center rounded-2xl border px-3 py-1 text-[11px] font-black uppercase italic tracking-widest ${statusClasses[status]}`}
  >
    {label ?? status}
  </span>
);

export default StatusBadge;
