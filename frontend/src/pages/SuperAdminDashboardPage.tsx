import { useMemo, useState, useEffect } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  ShieldCheck,
  X,
  LogOut,
  Clock,
  AlertTriangle,
  Building2,
  ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";

const API_BASE_URL = getApiBaseUrl();

type VerificationStatus = "Pending" | "Approved" | "Rejected";
type StatusFilter = "All" | VerificationStatus;

interface Organization {
  id: string;
  organizationName: string;
  adminName: string;
  email: string;
  role: string;
  status: VerificationStatus;
  documents: OrganizationDocument[];
}

interface OrganizationDocument {
  id: string;
  document_type?: string;
  file_name: string;
  document_hash?: string | null;
  url?: string | null;
}

const mapBackendOrgToFrontend = (backendOrg: any): Organization => {
  let status: VerificationStatus = "Pending";
  if (backendOrg.verification_status === "VERIFIED") status = "Approved";
  if (backendOrg.verification_status === "REJECTED") status = "Rejected";

  return {
    id: backendOrg.id,
    organizationName: backendOrg.legal_name || backendOrg.trade_name,
    adminName: backendOrg.adminName || "Representative",
    email: backendOrg.email || "N/A",
    role: "Organization Admin",
    status,
    documents: Array.isArray(backendOrg.documents)
      ? backendOrg.documents.map((document: any) => ({
          id: document.id || document.file_path || document.file_name,
          document_type: document.document_type,
          file_name: document.file_name || "Registration document",
          document_hash: document.document_hash || null,
          url: document.url || null,
        }))
      : []
  };
};

export default function SuperAdminDashboardPage() {
  const navigate = useNavigate();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const fetchOrganizations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/organizations/admin/organizations`);
      if (!response.ok) throw new Error("Failed to fetch organizations");
      const data = await response.json();
      const mapped = data.map(mapBackendOrgToFrontend);
      setOrganizations(mapped);
    } catch (error) {
      console.error("Error loading organizations:", error);
      toast.error("Failed to load organizations from backend.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const stats = useMemo(() => {
    return {
      pending: organizations.filter(
        (org) => org.status === "Pending"
      ).length,

      approved: organizations.filter(
        (org) => org.status === "Approved"
      ).length,

      rejected: organizations.filter(
        (org) => org.status === "Rejected"
      ).length,
    };
  }, [organizations]);

  const filteredOrganizations = useMemo(() => {
    if (statusFilter === "All") return organizations;
    return organizations.filter((organization) => organization.status === statusFilter);
  }, [organizations, statusFilter]);

  const filterOptions: Array<{
    label: StatusFilter;
    count: number;
    className: string;
  }> = [
    {
      label: "All",
      count: organizations.length,
      className: "data-[active=true]:border-white/20 data-[active=true]:bg-white/10 data-[active=true]:text-white",
    },
    {
      label: "Pending",
      count: stats.pending,
      className: "data-[active=true]:border-yellow-500/30 data-[active=true]:bg-yellow-500/10 data-[active=true]:text-yellow-400",
    },
    {
      label: "Approved",
      count: stats.approved,
      className: "data-[active=true]:border-green-500/30 data-[active=true]:bg-green-500/10 data-[active=true]:text-green-400",
    },
    {
      label: "Rejected",
      count: stats.rejected,
      className: "data-[active=true]:border-red-500/30 data-[active=true]:bg-red-500/10 data-[active=true]:text-red-400",
    },
  ];

  const updateStatus = async (
    id: string,
    status: VerificationStatus
  ) => {
    let backendStatus: 'VERIFIED' | 'REJECTED' = 'VERIFIED';
    if (status === 'Rejected') backendStatus = 'REJECTED';

    try {
      const response = await fetch(`${API_BASE_URL}/api/organizations/admin/organizations/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: backendStatus })
      });

      if (!response.ok) throw new Error("Failed to update status");

      setOrganizations((current) =>
        current.map((organization) =>
          organization.id === id
            ? { ...organization, status }
            : organization
        )
      );
      toast.success(`Organization status updated to ${status}`);
    } catch (error) {
      console.error("Error updating organization status:", error);
      toast.error("Failed to update organization status on backend.");
    }
  };

  const toggleDocuments = (id: string) => {
    setExpandedId((current) =>
      current === id ? null : id
    );
  };

  const handleLogout = () => {
    navigate("/super-admin/login");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10">
              <ShieldCheck className="h-5 w-5 text-red-500" />
            </div>

            <div>
              <h1 className="font-semibold tracking-tight">
                GLOBEX
              </h1>

              <p className="text-xs text-gray-500">
                Super Admin Portal
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-400 transition hover:border-white/20 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Heading */}
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-red-500">
            ADMINISTRATION
          </p>

          <h2 className="text-3xl font-semibold tracking-tight">
            Organization Verification
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Review corporate KYC submissions and verify registered
            organizations.
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Pending */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Pending
                </p>

                <p className="mt-2 text-3xl font-semibold">
                  {stats.pending}
                </p>
              </div>

              <div className="rounded-xl bg-yellow-500/10 p-3">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
          </div>

          {/* Approved */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Approved
                </p>

                <p className="mt-2 text-3xl font-semibold">
                  {stats.approved}
                </p>
              </div>

              <div className="rounded-xl bg-green-500/10 p-3">
                <Check className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </div>

          {/* Rejected */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">
                  Rejected
                </p>

                <p className="mt-2 text-3xl font-semibold">
                  {stats.rejected}
                </p>
              </div>

              <div className="rounded-xl bg-red-500/10 p-3">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Showing{" "}
            <span className="text-gray-300">
              {filteredOrganizations.length}
            </span>{" "}
            of{" "}
            <span className="text-gray-300">
              {organizations.length}
            </span>{" "}
            organizations
          </p>

          <div className="inline-flex w-full rounded-xl border border-white/10 bg-white/[0.03] p-1 sm:w-auto">
            {filterOptions.map((option) => (
              <button
                key={option.label}
                type="button"
                data-active={statusFilter === option.label}
                onClick={() => setStatusFilter(option.label)}
                className={`flex min-h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-transparent px-3 text-xs font-medium text-gray-500 transition hover:text-white sm:flex-none ${option.className}`}
              >
                <span>{option.label}</span>
                <span className="rounded-full bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
                  {option.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Organizations */}
        <div className="space-y-4">
          {filteredOrganizations.map((organization) => {
            const isExpanded =
              expandedId === organization.id;

            return (
              <div
                key={organization.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
              >
                {/* Organization row */}
                <div className="p-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    {/* Organization information */}
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5">
                        <Building2 className="h-5 w-5 text-gray-400" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="font-medium">
                            {organization.organizationName}
                          </h3>

                          {/* Status */}
                          <StatusBadge
                            status={organization.status}
                          />
                        </div>

                        <div className="mt-2 space-y-1 text-sm text-gray-500">
                          <p>
                            Admin:{" "}
                            <span className="text-gray-300">
                              {organization.adminName}
                            </span>
                          </p>

                          <p>
                            Email:{" "}
                            <span className="text-gray-300">
                              {organization.email}
                            </span>
                          </p>

                          <p>
                            Role:{" "}
                            <span className="text-gray-300">
                              {organization.role}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Documents */}
                      <button
                        onClick={() =>
                          toggleDocuments(organization.id)
                        }
                        className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-400 transition hover:border-white/20 hover:text-white"
                      >
                        <FileText className="h-4 w-4" />

                        Documents

                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>

                      {/* Reject */}
                      <button
                        onClick={() =>
                          updateStatus(
                            organization.id,
                            "Rejected"
                          )
                        }
                        title="Reject organization"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 transition hover:bg-red-500/20"
                      >
                        <X className="h-4 w-4" />
                      </button>

                      {/* Approve */}
                      <button
                        onClick={() =>
                          updateStatus(
                            organization.id,
                            "Approved"
                          )
                        }
                        title="Approve organization"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-green-500/20 bg-green-500/10 text-green-500 transition hover:bg-green-500/20"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Documents */}
                {isExpanded && (
                  <div className="border-t border-white/10 bg-black/20 px-5 py-4">
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-600">
                      Submitted Documents
                    </p>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {organization.documents.length > 0 ? (
                        organization.documents.map((document) => {
                          const content = (
                            <>
                              <FileText className="h-4 w-4 shrink-0 text-gray-500" />

                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm text-gray-300">
                                  {document.file_name}
                                </span>
                                {document.document_type && (
                                  <span className="block truncate text-[11px] text-gray-600">
                                    {document.document_type.replace(/_/g, " ")}
                                  </span>
                                )}
                                {document.document_hash && (
                                  <span className="block truncate font-mono text-[10px] text-gray-700">
                                    SHA-256 {document.document_hash.slice(0, 12)}
                                  </span>
                                )}
                              </span>

                              {document.url && (
                                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                              )}
                            </>
                          );

                          return document.url ? (
                            <a
                              key={document.id}
                              href={document.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3 transition hover:border-white/15 hover:bg-white/[0.05]"
                            >
                              {content}
                            </a>
                          ) : (
                            <div
                              key={document.id}
                              className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-4 py-3"
                            >
                              {content}
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-lg border border-dashed border-white/10 px-4 py-3 text-sm text-gray-600 sm:col-span-2 lg:col-span-3">
                          No registration documents uploaded.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredOrganizations.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
            <Building2 className="mx-auto h-8 w-8 text-gray-600" />

            <p className="mt-4 text-gray-500">
              {organizations.length === 0
                ? "No organization submissions found."
                : `No ${statusFilter.toLowerCase()} organization submissions found.`}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: VerificationStatus;
}) {
  const styles = {
    Pending:
      "border-yellow-500/20 bg-yellow-500/10 text-yellow-500",
    Approved:
      "border-green-500/20 bg-green-500/10 text-green-500",
    Rejected:
      "border-red-500/20 bg-red-500/10 text-red-500",
  };

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
