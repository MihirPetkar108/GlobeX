import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/context/AuthContext";
import type { BusinessType, OrganizationRole } from "@/services/auth/authService";
import { Listing } from "@/types/trade";
import { aiService, ListingRecord } from "@/services/api/aiService";
import {
  ExportListing,
  ExportRequest,
  INITIAL_EXPORT_LISTINGS,
  INITIAL_EXPORT_REQUESTS,
} from "@/data/exportRequests";

export type TradeDirection = "Export" | "Import";

/**
 * Maps a real, DB-backed listing (Express /api/v1/listings) to the
 * UI's Listing shape.
 */
function toUiListing(record: ListingRecord): Listing {
  return {
    id: record.id,
    exporterId: record.organizationId,
    exporterName: record.exporterName || "Unverified Exporter",
    exporterCountry: record.exporterCountry || "Unknown",
    exporterCity: record.exporterCity || "Unknown",
    title: record.productName,
    category: (record.productCategory as Listing["category"]) || "Agriculture",
    hsCode: record.hsCode || "",
    unitPriceUSD: record.price || 0,
    unit: record.unit || "MT",
    minimumOrderQuantity: record.minimumOrderQuantity || 0,
    availableQuantity: record.quantityAvailable || 0,
    originPort: record.originPort || "",
    certifications: record.certifications,
    leadTimeDays: record.leadTimeDays || 0,
    trustScore: 0,
    riskScore: 0,
    aiMatchScore: 0,
    description: record.description || "",
    specs: record.specs,
    isTopTrusted: false,
  };
}

const ROLE_TITLES: Record<OrganizationRole, string> = {
  ORGANIZATION_ADMIN: "Admin",
  SALES: "Sales",
  COMPLIANCE: "Compliance Officer",
  LOGISTICS: "Logistics",
  DELIVERY_STAFF: "Delivery Staff",
};

interface WorkspaceUser {
  userId: string;
  organizationId: string;
  name: string;
  email: string;
  roleTitle: string;
  companyName: string;
  country: string;
}

interface WorkspaceContextType {
  user: WorkspaceUser;
  businessType: BusinessType;
  activeDirection: TradeDirection;
  setActiveDirection: (direction: TradeDirection) => void;
  canSwitchDirection: boolean;
  isImporterView: boolean;
  isExporterView: boolean;
  listings: Listing[];
  listingsLoading: boolean;
  listingsError: string | null;
  refreshListings: () => Promise<void>;
  addListing: (newListing: Listing) => void;
  exportListings: ExportListing[];
  addExportListing: (newListing: ExportListing) => void;
  updateExportListing: (id: string, changes: Partial<ExportListing>) => void;
  exportRequests: ExportRequest[];
  updateExportRequest: (requestId: string, changes: Partial<ExportRequest>) => void;
  addExportRequest: (request: ExportRequest) => void;
  logout: () => Promise<void>;
  hasUnreadTradeUpdates: boolean;
  setHasUnreadTradeUpdates: (val: boolean) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { appUser, organization, signOut } = useAuthContext();

  const [preferredDirection, setPreferredDirection] = useState<TradeDirection>(() => {
    const saved = localStorage.getItem("globex_active_direction");
    return saved === "Import" || saved === "Export" ? saved : "Export";
  });
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState<boolean>(true);
  const [listingsError, setListingsError] = useState<string | null>(null);
  
  // Exporter Product Listings and Export Trades
  const [exportListings, setExportListings] = useState<ExportListing[]>(INITIAL_EXPORT_LISTINGS);
  const [exportRequests, setExportRequests] = useState<ExportRequest[]>(INITIAL_EXPORT_REQUESTS);
  
  // Notification indicator state for trade updates (counteroffers, status changes)
  const [hasUnreadTradeUpdates, setHasUnreadTradeUpdates] = useState<boolean>(true);

  const refreshListings = useCallback(async () => {
    setListingsLoading(true);
    setListingsError(null);
    try {
      const records = await aiService.getListings({ status: "ACTIVE" });
      setListings(records.map(toUiListing));
    } catch (err) {
      setListingsError(err instanceof Error ? err.message : "Could not load marketplace listings.");
      setListings([]);
    } finally {
      setListingsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshListings();
  }, []);

  const handleAddListing = (newListing: Listing) => {
    setListings((prev) => [newListing, ...prev]);
  };

  const handleAddExportListing = (newListing: ExportListing) => {
    setExportListings((prev) => [newListing, ...prev]);
  };

  const handleUpdateExportListing = (id: string, changes: Partial<ExportListing>) => {
    setExportListings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...changes } : item))
    );
  };

  const updateExportRequest = (requestId: string, changes: Partial<ExportRequest>) => {
    setExportRequests((prev) =>
      prev.map((req) => (req.id === requestId ? { ...req, ...changes } : req))
    );
  };

  const addExportRequest = (request: ExportRequest) => {
    setExportRequests((prev) => [request, ...prev]);
  };

  const handleSetActiveDirection = (direction: TradeDirection) => {
    setPreferredDirection(direction);
    localStorage.setItem("globex_active_direction", direction);
  };

  const user: WorkspaceUser = {
    userId: appUser?.id || "",
    organizationId: organization?.id || "",
    name: [appUser?.firstName, appUser?.lastName].filter(Boolean).join(" ") || appUser?.email || "User",
    email: appUser?.email || "",
    roleTitle: organization ? ROLE_TITLES[organization.organizationRole] : "Member",
    companyName: organization?.legalName || "",
    country: organization?.country || "",
  };

  const businessType: BusinessType = organization?.businessType || "EXPORTER";
  const canSwitchDirection = businessType === "BOTH";

  const activeDirection: TradeDirection =
    businessType === "EXPORTER"
      ? "Export"
      : businessType === "IMPORTER"
        ? "Import"
        : preferredDirection;

  const isExporterView = activeDirection === "Export";
  const isImporterView = activeDirection === "Import";

  return (
    <WorkspaceContext.Provider
      value={{
        user,
        businessType,
        activeDirection,
        setActiveDirection: handleSetActiveDirection,
        canSwitchDirection,
        isImporterView,
        isExporterView,
        listings,
        listingsLoading,
        listingsError,
        refreshListings,
        addListing: handleAddListing,
        exportListings,
        addExportListing: handleAddExportListing,
        updateExportListing: handleUpdateExportListing,
        exportRequests,
        updateExportRequest,
        addExportRequest,
        logout: signOut,
        hasUnreadTradeUpdates,
        setHasUnreadTradeUpdates,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};
