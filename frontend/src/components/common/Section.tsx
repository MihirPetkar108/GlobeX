import React from "react";
import { cn } from "@/lib/utils";

interface SectionProps {
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  borderBottom?: boolean;
}

export const Section: React.FC<SectionProps> = ({
  title,
  subtitle,
  badge,
  action,
  children,
  className,
  containerClassName,
  borderBottom = false,
}) => {
  return (
    <section className={cn("space-y-4", borderBottom && "border-b border-white/[0.08] pb-6", className)}>
      {(title || action || badge) && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              {title && (
                <h2 className="text-base sm:text-lg font-display font-bold text-white tracking-tight">
                  {title}
                </h2>
              )}
              {badge && <div>{badge}</div>}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-400 font-sans">{subtitle}</p>
            )}
          </div>

          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div className={cn("w-full", containerClassName)}>{children}</div>
    </section>
  );
};

export default Section;
