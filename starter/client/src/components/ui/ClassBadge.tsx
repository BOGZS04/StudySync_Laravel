import React from "react";

interface ClassBadgeProps {
  name: string;
  subject?: string | null;
}

export const ClassBadge: React.FC<ClassBadgeProps> = ({ name, subject }) => (
  <span className="inline-flex w-fit items-center gap-2 rounded-2xl border border-primary/30 bg-primary/15 px-3 py-1 text-[11px] font-black uppercase italic tracking-widest text-primary">
    {subject && <span>{subject}</span>}
    <span>{name}</span>
  </span>
);

export default ClassBadge;
