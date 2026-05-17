import React from "react";
import * as FaIcons from "react-icons/fa6";
import { Icon } from "./Icon";

interface EmptyStateProps {
  iconName: keyof typeof FaIcons;
  title: string;
  message: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  iconName,
  title,
  message,
  action,
}) => (
  <div className="rounded-2xl border border-border-muted bg-bg-light p-8 text-center shadow">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
      <Icon iconName={iconName} size={24} />
    </div>
    <h2 className="mt-5 text-xl font-black uppercase italic tracking-tighter text-text">
      {title}
    </h2>
    <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-relaxed text-text-muted">
      {message}
    </p>
    {action && <div className="mt-6">{action}</div>}
  </div>
);

export default EmptyState;
