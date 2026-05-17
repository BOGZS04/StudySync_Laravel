import React from "react";
import { Link } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  breadcrumb?: Array<{
    label: string;
    href?: string;
  }>;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  eyebrow,
  description,
  breadcrumb = [],
  action,
}) => (
  <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div className="space-y-2">
      {breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2">
          {breadcrumb.map((item, index) => {
            const isLast = index === breadcrumb.length - 1;

            return (
              <React.Fragment key={`${item.label}-${index}`}>
                {item.href && !isLast ? (
                  <Link
                    to={item.href}
                    className="text-xs font-black uppercase italic tracking-widest text-primary transition-all duration-300 hover:text-secondary"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-xs font-black uppercase italic tracking-widest text-text-muted">
                    {item.label}
                  </span>
                )}
                {!isLast && <span className="text-xs text-text-muted">/</span>}
              </React.Fragment>
            );
          })}
        </nav>
      )}
      {eyebrow && (
        <p className="text-xs font-black uppercase italic tracking-widest text-text-muted">
          {eyebrow}
        </p>
      )}
      <h1 className="text-3xl font-black uppercase italic tracking-tighter text-text md:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="max-w-3xl text-sm font-medium leading-relaxed text-text-muted">
          {description}
        </p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>
);

export default PageHeader;
