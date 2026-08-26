import React from "react";
import { useWorkspace, TradeDirection } from "@/context/WorkspaceContext";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ArrowLeftRight } from "lucide-react";

const FIELD_LABEL = "text-[11px] font-mono uppercase tracking-wide text-[var(--text-tertiary)]";
const FIELD_VALUE = "text-sm text-[var(--text-primary)] font-medium";

/**
 * Settings — the first user/org/direction-settings surface in the app.
 * Org name/business type are real (WorkspaceContext, backed by
 * organizations.business_type) and shown read-only: there is no backend
 * route to edit an organization's profile fields today, so this does not
 * pretend to be an editable form. The direction switch reuses
 * WorkspaceContext.setActiveDirection exactly — no second direction system.
 */
export const SettingsPage: React.FC = () => {
  const { user, businessType, activeDirection, canSwitchDirection, setActiveDirection } = useWorkspace();

  const otherDirection: TradeDirection = activeDirection === "Export" ? "Import" : "Export";

  return (
    <AppShell maxWidth="md">
      <div className="space-y-6 select-none">
        <PageHeader
          breadcrumbs={[{ label: "Dashboard", href: "/home" }, { label: "Settings" }]}
          title="Settings"
          subtitle="Organization profile, user profile, and trade direction."
        />

        <section className="rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--surface-1)] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Organization</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className={FIELD_LABEL}>Company</div>
              <div className={FIELD_VALUE}>{user.companyName || "Not set"}</div>
            </div>
            <div>
              <div className={FIELD_LABEL}>Country</div>
              <div className={FIELD_VALUE}>{user.country || "Not set"}</div>
            </div>
            <div>
              <div className={FIELD_LABEL}>Business Type</div>
              <div className={FIELD_VALUE}>{businessType}</div>
            </div>
            <div>
              <div className={FIELD_LABEL}>Active Direction</div>
              <StatusBadge status="verified" label={activeDirection} />
            </div>
          </div>
          <p className="text-xs text-[var(--text-tertiary)]">
            Organization profile editing has no backend route yet — these fields are read-only.
          </p>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--surface-1)] p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">User</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className={FIELD_LABEL}>Name</div>
              <div className={FIELD_VALUE}>{user.name}</div>
            </div>
            <div>
              <div className={FIELD_LABEL}>Email</div>
              <div className={FIELD_VALUE}>{user.email || "Not set"}</div>
            </div>
            <div>
              <div className={FIELD_LABEL}>Role</div>
              <div className={FIELD_VALUE}>{user.roleTitle}</div>
            </div>
          </div>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--surface-1)] p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Trade Direction</h2>
          {canSwitchDirection ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                Your organization is registered as <strong>BOTH</strong> — you may switch which
                journey (Export or Import) drives Discover, Assess, and every model call.
              </p>
              <button
                type="button"
                onClick={() => setActiveDirection(otherDirection)}
                className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--hairline-strong)] bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-xs font-semibold text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                Switch to {otherDirection}
              </button>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-secondary)]">
              Your organization is pinned to <strong>{activeDirection}</strong> ({businessType}) —
              direction is a fact about the org, not a per-user preference, so it cannot be
              switched here.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
};

export default SettingsPage;
