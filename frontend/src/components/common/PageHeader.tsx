import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, LayoutDashboard, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface BreadcrumbCrumb {
  label: string;
  href?: string;
}

export interface SecondaryAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}

interface PageHeaderProps {
  section?: string;
  breadcrumbs?: BreadcrumbCrumb[];
  title: string;
  subtitle?: string | React.ReactNode;
  badge?: React.ReactNode;
  /** Primary CTA — always visible inline, never collapsed. */
  action?: React.ReactNode;
  /**
   * Secondary, page-specific actions. Rendered collapsed behind a single
   * overflow trigger so the header never competes with the primary CTA for
   * attention — the primary action is the only button a user should have to
   * decide about at a glance.
   */
  secondaryActions?: SecondaryAction[];
  className?: string;
}

const DASHBOARD_CRUMB: BreadcrumbCrumb = { label: "Dashboard", href: "/home" };

export const PageHeader: React.FC<PageHeaderProps> = ({
  section,
  breadcrumbs,
  title,
  subtitle,
  badge,
  action,
  secondaryActions,
  className,
}) => {
  // Every page lives under the dashboard — the trail always says so, so a
  // user landing deep in the app (a shared link, a refresh) can always see
  // and click their way back to the root in one step.
  const trail: BreadcrumbCrumb[] =
    breadcrumbs && breadcrumbs.length > 0
      ? breadcrumbs[0].href === DASHBOARD_CRUMB.href
        ? breadcrumbs
        : [DASHBOARD_CRUMB, ...breadcrumbs]
      : section
        ? [DASHBOARD_CRUMB, { label: section }]
        : [DASHBOARD_CRUMB];

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--hairline)] pb-5 pt-2",
        className
      )}
    >
      <div className="space-y-1.5 min-w-0 flex-1">
        {/* Breadcrumb trail — always rooted at Dashboard */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-sans flex-wrap">
          {trail.map((crumb, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === trail.length - 1;
            return (
              <React.Fragment key={crumb.label + idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-[var(--text-tertiary)] shrink-0" />}
                {crumb.href && !isLast ? (
                  <Link
                    to={crumb.href}
                    className={cn(
                      "flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors truncate max-w-[160px]",
                      isFirst ? "text-[var(--text-tertiary)]" : "text-[var(--text-secondary)]"
                    )}
                  >
                    {isFirst && <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />}
                    <span>{crumb.label}</span>
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "flex items-center gap-1 truncate max-w-[220px]",
                      isLast ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-tertiary)]"
                    )}
                  >
                    {isFirst && <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />}
                    <span>{crumb.label}</span>
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Title + Badge Row */}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-[var(--text-primary)] leading-tight">
            {title}
          </h1>
          {badge && <div className="shrink-0">{badge}</div>}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div className="text-xs sm:text-sm text-[var(--text-secondary)] font-sans leading-relaxed">
            {subtitle}
          </div>
        )}
      </div>

      {/* Action Slot — primary CTA always visible, secondary actions collapsed */}
      {(action || (secondaryActions && secondaryActions.length > 0)) && (
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center flex-wrap">
          {secondaryActions && secondaryActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="More actions"
                  className="w-9 h-9 rounded-[var(--radius-md)] border border-[var(--hairline)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--hairline-strong)] flex items-center justify-center transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {secondaryActions.map((item, idx) =>
                  item.href ? (
                    <DropdownMenuItem key={item.label + idx} disabled={item.disabled} asChild>
                      <Link to={item.href} className="flex items-center gap-2 cursor-pointer">
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      key={item.label + idx}
                      disabled={item.disabled}
                      onClick={item.onClick}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {action}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
