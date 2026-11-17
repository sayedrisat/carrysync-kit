import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
};

export default function Card({
  children,
  title,
  description,
  action,
  className = "",
  ...props
}: CardProps) {
  return (
    <section
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm transition-colors sm:p-6 ${className}`}
      {...props}
    >
      {(title || description || action) && (
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            {title && (
              <h3 className="font-bold text-[var(--text)]">{title}</h3>
            )}
            {description && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                {description}
              </p>
            )}
          </div>
          {action}
        </div>
      )}

      {children}
    </section>
  );
}