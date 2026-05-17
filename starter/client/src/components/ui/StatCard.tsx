import React from "react";
import * as FaIcons from "react-icons/fa6";
import { Icon } from "./Icon";

interface StatCardProps {
  iconName: keyof typeof FaIcons;
  label: string;
  value: string | number;
  trend?: string;
  tone?: "primary" | "secondary" | "success" | "warning" | "danger" | "info";
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  primary: "bg-primary/15 text-primary",
  secondary: "bg-secondary/15 text-secondary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  info: "bg-info/15 text-info",
};

export const StatCard: React.FC<StatCardProps> = ({
  iconName,
  label,
  value,
  trend,
  tone = "primary",
}) => (
  <article className="rounded-2xl border border-border-muted bg-bg-light p-5 shadow transition-all duration-300 hover:border-primary/40">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-3">
        <p className="text-xs font-black uppercase italic tracking-widest text-text-muted">
          {label}
        </p>
        <strong className="block text-3xl font-black uppercase italic tracking-tighter text-text">
          {value}
        </strong>
      </div>
      <div className={`rounded-2xl p-3 ${toneClasses[tone]}`}>
        <Icon iconName={iconName} size={20} />
      </div>
    </div>
    {trend && (
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
        {trend}
      </p>
    )}
  </article>
);

export default StatCard;
