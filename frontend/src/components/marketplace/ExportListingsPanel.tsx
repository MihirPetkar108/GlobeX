import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import { ExportListing, ListingStatus, ExportRequest } from "@/data/exportRequests";
import { DetailDrawer } from "@/components/common/DetailDrawer";
import { SpecularButton } from "@/components/ui/SpecularButton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Plus,
  Edit,
  Eye,
  ArrowRight,
  Package,
  Layers,
  PauseCircle,
  PlayCircle,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Globe,
  Anchor,
  FileCheck,
  CheckCircle2,
  Inbox,
  X,
} from "lucide-react";

type ListingFilter = "ALL" | "active" | "draft" | "paused" | "out_of_stock";

const FILTER_LABELS: Record<ListingFilter, string> = {
  ALL: "All Listings",
  active: "Active",
  draft: "Drafts",
  paused: "Paused",
  out_of_stock: "Out of Stock",
};

interface CreateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing?: ExportListing | null;
  onSave: (listing: ExportListing) => void;
}

const CreateEditListingDrawer: React.FC<CreateEditModalProps> = ({
  isOpen,
  onClose,
  listing,
  onSave,
}) => {
  const [productName, setProductName] = useState(listing?.productName || "");
  const [category, setCategory] = useState(listing?.category || "Agriculture");
  const [description, setDescription] = useState(listing?.description || "");
  const [imageUrl, setImageUrl] = useState(listing?.images?.[0] || "");
  const [hsCode, setHsCode] = useState(listing?.hsCode || "");
  const [specifications, setSpecifications] = useState(listing?.specifications || "");
  
  const [price, setPrice] = useState(listing?.price ? String(listing.price) : "");
  const [currency, setCurrency] = useState(listing?.currency || "USD");
  const [unit, setUnit] = useState(listing?.unit || "MT");
  const [availableQuantity, setAvailableQuantity] = useState(
    listing?.availableQuantity ? String(listing.availableQuantity) : ""
  );
  const [moq, setMoq] = useState(listing?.moq ? String(listing.moq) : "");

  const [origin, setOrigin] = useState(listing?.origin || "India");
  const [port, setPort] = useState(listing?.port || "Nhava Sheva");
  const [destinationMarkets, setDestinationMarkets] = useState(
    listing?.destinationMarkets?.join(", ") || "UAE, Saudi Arabia, Europe"
  );
  const [incoterm, setIncoterm] = useState(listing?.incoterm || "CIF");
  const [deliveryTime, setDeliveryTime] = useState(listing?.deliveryTime || "10-15 Days");

  const [paymentTerms, setPaymentTerms] = useState(
    listing?.paymentTerms || "100% LC at sight or 30% Advance / 70% against BL"
  );
  const [packaging, setPackaging] = useState(listing?.packaging || "25kg / 50kg Export Standard Bags");
  const [certifications, setCertifications] = useState(
    listing?.certifications?.join(", ") || "APEDA, FSSAI, ISO 22000"
  );
  const [requiredDocuments, setRequiredDocuments] = useState(
    listing?.requiredDocuments?.join(", ") || "Certificate of Origin, Bill of Lading, Packing List"
  );

  if (!isOpen) return null;

  const handleSubmit = (targetStatus: ListingStatus) => {
    if (!productName.trim()) {
      toast.error("Please enter a product name.");
      return;
    }

    const newListing: ExportListing = {
      id: listing?.id || `EXP-LST-${Date.now().toString().slice(-4)}`,
      productName,
      category,
      description,
      images: imageUrl.trim()
        ? [imageUrl.trim()]
        : [listing?.images?.[0] || "https://pngimg.com/uploads/rice/rice_PNG13.png"],
      origin,
      port,
      price: parseFloat(price) || 0,
      currency,
      unit,
      availableQuantity: parseFloat(availableQuantity) || 0,
      moq: parseFloat(moq) || 0,
      specifications,
      hsCode,
      incoterm,
      paymentTerms,
      certifications: certifications.split(",").map((s) => s.trim()).filter(Boolean),
      requiredDocuments: requiredDocuments.split(",").map((s) => s.trim()).filter(Boolean),
      status: targetStatus,
      destinationMarkets: destinationMarkets.split(",").map((s) => s.trim()).filter(Boolean),
      deliveryTime,
      packaging,
      createdAt: listing?.createdAt || new Date().toISOString().split("T")[0],
    };

    onSave(newListing);
    toast.success(
      targetStatus === "draft"
        ? "Listing saved as draft."
        : listing
        ? "Listing updated and published."
        : "New product listing published successfully!"
    );
    onClose();
  };

  return (
    <DetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={listing ? "Edit Export Listing" : "Create New Export Product Listing"}
      subtitle="Publish your export commodities and products to international verified buyers."
      maxWidth="xl"
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit("draft")}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
            >
              Save Draft
            </button>
            <SpecularButton
              variant="emerald"
              size="sm"
              onClick={() => handleSubmit("active")}
              icon={<CheckCircle2 className="w-4 h-4 stroke-[2.5]" />}
              iconPosition="left"
            >
              {listing ? "Update & Publish" : "Publish Listing"}
            </SpecularButton>
          </div>
        </div>
      }
    >
      <div className="space-y-6 text-slate-800 py-1">
        {/* Section 1: Product Information */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider text-emerald-700">
            <Package className="w-4 h-4 text-emerald-600" />
            <span>Product Information</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Product Name *
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. 1121 Steam Extra Long Grain Basmati Rice"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="Agriculture">Agriculture &amp; Grains</option>
                <option value="Spices">Spices &amp; Seasonings</option>
                <option value="Textiles">Textiles &amp; Apparel</option>
                <option value="Pharmaceuticals">Pharmaceuticals &amp; APIs</option>
                <option value="Minerals & Metals">Minerals &amp; Metals</option>
                <option value="Renewable Energy">Renewable Energy</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">HS Code</label>
              <input
                type="text"
                value={hsCode}
                onChange={(e) => setHsCode(e.target.value)}
                placeholder="e.g. 1006.30"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Product Image URL
              </label>
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="e.g. https://pngimg.com/uploads/rice/rice_PNG13.png"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Description &amp; Specifications
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed quality metrics, grain length, purity, moisture, and key export features..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Technical Specifications Summary
              </label>
              <input
                type="text"
                value={specifications}
                onChange={(e) => setSpecifications(e.target.value)}
                placeholder="e.g. Length: 8.35mm+, Moisture: max 12.5%, Broken: max 1%"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Commercial Information */}
        <div className="space-y-3 pt-3 border-t border-slate-200/80">
          <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider text-emerald-700">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Commercial Information</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Price per Unit ($)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1100"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Available Qty ({unit})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={availableQuantity}
                onChange={(e) => setAvailableQuantity(e.target.value)}
                placeholder="2000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Minimum Order (MOQ)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={moq}
                onChange={(e) => setMoq(e.target.value)}
                placeholder="100"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Shipping & Logistics */}
        <div className="space-y-3 pt-3 border-t border-slate-200/80">
          <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider text-emerald-700">
            <Anchor className="w-4 h-4 text-emerald-600" />
            <span>Shipping &amp; Logistics</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Country of Origin</label>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Port of Loading</label>
              <input
                type="text"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="Nhava Sheva / Mundra"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Incoterm</label>
              <select
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
              >
                <option value="CIF">CIF (Cost, Insurance &amp; Freight)</option>
                <option value="FOB">FOB (Free on Board)</option>
                <option value="CFR">CFR (Cost &amp; Freight)</option>
                <option value="EXW">EXW (Ex Works)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Estimated Delivery Time</label>
              <input
                type="text"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                placeholder="10-15 Days"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Trade Terms & Certifications */}
        <div className="space-y-3 pt-3 border-t border-slate-200/80">
          <div className="flex items-center gap-2 text-xs font-bold font-mono uppercase tracking-wider text-emerald-700">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <span>Trade Terms &amp; Compliance</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="LC at sight / Escrow deposit"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Certifications (comma separated)</label>
              <input
                type="text"
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                placeholder="APEDA, FSSAI, ISO 22000"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Packaging Standards</label>
              <input
                type="text"
                value={packaging}
                onChange={(e) => setPackaging(e.target.value)}
                placeholder="25kg / 50kg Non-Woven Bags"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>
        </div>
      </div>
    </DetailDrawer>
  );
};

export const ExportListingsPanel: React.FC = () => {
  const navigate = useNavigate();
  const { exportListings, addExportListing, updateExportListing, exportRequests } = useWorkspace();
  const [filter, setFilter] = useState<ListingFilter>("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<ExportListing | null>(null);
  const [viewingListing, setViewingListing] = useState<ExportListing | null>(null);

  const filterTabs: ListingFilter[] = ["ALL", "active", "draft", "paused", "out_of_stock"];

  const getFilterCount = (f: ListingFilter): number => {
    if (f === "ALL") return exportListings.length;
    return exportListings.filter((l) => l.status === f).length;
  };

  const filteredListings = exportListings.filter(
    (l) => filter === "ALL" || l.status === filter
  );

  // Helper to compute buyer interest breakdown for a listing
  const getBuyerInterest = (listing: ExportListing) => {
    const matching = exportRequests.filter(
      (req) => req.listingId === listing.id || req.product.toLowerCase().includes(listing.productName.toLowerCase())
    );

    const totalRequests = matching.length;
    const newRequests = matching.filter((r) => r.status === "NEW REQUEST").length;
    const negotiating = matching.filter((r) => r.status === "NEGOTIATING").length;
    const paymentPending = matching.filter((r) => r.status === "PAYMENT PENDING").length;
    const readyToShip = matching.filter((r) => r.status === "READY TO SHIP").length;
    const inTransit = matching.filter((r) => r.status === "IN TRANSIT").length;
    const delivered = matching.filter((r) => r.status === "DELIVERED").length;
    const disputed = matching.filter((r) => r.status === "DISPUTED").length;
    const settled = matching.filter((r) => r.status === "SETTLED").length;

    return {
      totalRequests,
      newRequests,
      negotiating,
      paymentPending,
      readyToShip,
      inTransit,
      delivered,
      disputed,
      settled,
      matching,
    };
  };

  const handleSaveListing = (saved: ExportListing) => {
    const exists = exportListings.some((l) => l.id === saved.id);
    if (exists) {
      updateExportListing(saved.id, saved);
    } else {
      addExportListing(saved);
    }
  };

  const toggleStatus = (e: React.MouseEvent, listing: ExportListing, newStatus: ListingStatus) => {
    e.stopPropagation();
    updateExportListing(listing.id, { status: newStatus });
    toast.success(`Listing status updated to ${newStatus}.`);
  };

  const handleViewInterest = (e: React.MouseEvent, listing: ExportListing) => {
    e.stopPropagation();
    navigate(`/export-trades?listingId=${listing.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls: Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {filterTabs.map((f) => {
          const count = getFilterCount(f);
          const isActive = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer",
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80"
              )}
            >
              <span>{FILTER_LABELS[f]}</span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono",
                  isActive
                    ? "bg-white/20 text-white"
                    : count > 0
                    ? "bg-slate-100 text-slate-700"
                    : "text-slate-400"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Product Listings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredListings.length > 0 ? (
          filteredListings.map((listing) => {
            const interest = getBuyerInterest(listing);
            const primaryImage = listing.images?.[0] || "https://pngimg.com/uploads/rice/rice_PNG13.png";

            return (
              <div
                key={listing.id}
                onClick={() => setViewingListing(listing)}
                className="bg-white rounded-3xl border border-slate-200/90 hover:border-slate-300 hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer group"
              >
                <div>
                  {/* Prominent Product Image with Status Pill */}
                  <div className="relative w-full h-48 bg-slate-100 flex items-center justify-center p-4 overflow-hidden border-b border-slate-100">
                    <img
                      src={primaryImage}
                      alt={listing.productName}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 drop-shadow-md"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />

                    {/* Status Badge Over Image */}
                    <div className="absolute top-3 left-3">
                      <span
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm backdrop-blur-md",
                          listing.status === "active"
                            ? "bg-emerald-500 text-white"
                            : listing.status === "draft"
                            ? "bg-slate-700 text-white"
                            : listing.status === "paused"
                            ? "bg-amber-500 text-white"
                            : "bg-rose-500 text-white"
                        )}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        {listing.status.replace("_", " ")}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-lg border border-slate-200/60 text-[10px] font-mono text-slate-500 font-semibold">
                      {listing.id}
                    </div>
                  </div>

                  {/* Body Details */}
                  <div className="p-5 space-y-4">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold mb-1">
                        <span>🇮🇳 {listing.origin}</span>
                        <span>•</span>
                        <span>{listing.category}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base leading-snug group-hover:text-emerald-700 transition-colors line-clamp-2">
                        {listing.productName}
                      </h3>
                    </div>

                    {/* Pricing and Capacity Grid */}
                    <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[11px]">List Price</span>
                        <span className="font-extrabold text-slate-900 text-sm">
                          ${listing.price.toLocaleString()}{" "}
                          <span className="text-slate-500 text-xs font-normal">/ {listing.unit}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Available Stock</span>
                        <span className="font-bold text-slate-800">
                          {listing.availableQuantity.toLocaleString()} {listing.unit}
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200/60">
                        <span className="text-slate-400 block text-[10px]">Min. Order (MOQ)</span>
                        <span className="font-medium text-slate-700">
                          {listing.moq.toLocaleString()} {listing.unit}
                        </span>
                      </div>
                      <div className="pt-1.5 border-t border-slate-200/60">
                        <span className="text-slate-400 block text-[10px]">Port of Loading</span>
                        <span className="font-medium text-slate-700 truncate block">
                          {listing.port}
                        </span>
                      </div>
                    </div>

                    {/* Buyer Interest Section (Connected to Export Trades) */}
                    <div
                      onClick={(e) => handleViewInterest(e, listing)}
                      className="p-3 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/80 transition-colors space-y-1.5"
                      title="Click to view related trade requests in Export Trades"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <Inbox className="w-3.5 h-3.5 text-emerald-600" />
                          Buyer Interest
                        </span>
                        <span className="text-xs font-extrabold font-mono text-emerald-800 bg-white/80 px-2 py-0.5 rounded-full border border-emerald-200">
                          {interest.totalRequests} {interest.totalRequests === 1 ? "Request" : "Requests"}
                        </span>
                      </div>

                      {interest.totalRequests > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-semibold">
                          {interest.newRequests > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              {interest.newRequests} New
                            </span>
                          )}
                          {interest.negotiating > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              {interest.negotiating} Negotiating
                            </span>
                          )}
                          {interest.paymentPending > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                              {interest.paymentPending} Payment Pending
                            </span>
                          )}
                          {interest.readyToShip > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                              {interest.readyToShip} Ready to Ship
                            </span>
                          )}
                          {interest.inTransit > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                              {interest.inTransit} In Transit
                            </span>
                          )}
                          {interest.delivered > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                              {interest.delivered} Delivered
                            </span>
                          )}
                          {interest.disputed > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                              {interest.disputed} Disputed
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-emerald-800/80">
                          No buyer trade requests yet. Active on marketplace discovery.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 pt-0 flex items-center justify-between gap-2 border-t border-slate-100 mt-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingListing(listing);
                        setIsCreateModalOpen(true);
                      }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Edit Listing"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {listing.status === "active" && (
                      <button
                        type="button"
                        onClick={(e) => toggleStatus(e, listing, "paused")}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 text-xs font-semibold transition-colors"
                        title="Pause Listing"
                      >
                        <PauseCircle className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {listing.status === "paused" && (
                      <button
                        type="button"
                        onClick={(e) => toggleStatus(e, listing, "active")}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-800 text-xs font-semibold transition-colors"
                        title="Resume Listing"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <SpecularButton
                    variant="primary"
                    size="xs"
                    onClick={(e) => handleViewInterest(e, listing)}
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                    iconPosition="right"
                  >
                    View Buyer Interest
                  </SpecularButton>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center text-slate-400 font-medium bg-white rounded-3xl border border-slate-100 border-dashed">
            No export listings found for {FILTER_LABELS[filter]}.
          </div>
        )}
      </div>

      {/* Create / Edit Listing Drawer */}
      <CreateEditListingDrawer
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingListing(null);
        }}
        listing={editingListing}
        onSave={handleSaveListing}
      />

      {/* Listing Detail Drawer */}
      {viewingListing && (
        <DetailDrawer
          isOpen={true}
          onClose={() => setViewingListing(null)}
          title={viewingListing.productName}
          subtitle={`${viewingListing.id} • ${viewingListing.category} • ${viewingListing.origin}`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between gap-3 w-full">
              <button
                type="button"
                onClick={() => setViewingListing(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                Close
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingListing(viewingListing);
                    setViewingListing(null);
                    setIsCreateModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm"
                >
                  Edit Listing
                </button>
                <SpecularButton
                  variant="emerald"
                  size="sm"
                  onClick={() => {
                    navigate(`/export-trades?listingId=${viewingListing.id}`);
                    setViewingListing(null);
                  }}
                  icon={<ArrowRight className="w-4 h-4" />}
                  iconPosition="right"
                >
                  View Related Buyer Trades
                </SpecularButton>
              </div>
            </div>
          }
        >
          <div className="space-y-5 text-slate-800">
            {/* Main Image */}
            <div className="w-full h-56 bg-slate-100 rounded-2xl flex items-center justify-center p-4 border border-slate-200/80">
              <img
                src={viewingListing.images?.[0] || "https://pngimg.com/uploads/rice/rice_PNG13.png"}
                alt={viewingListing.productName}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">{viewingListing.description}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-slate-400 block text-[11px]">Price</span>
                <span className="font-bold text-slate-900 text-sm">
                  ${viewingListing.price.toLocaleString()} / {viewingListing.unit}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-slate-400 block text-[11px]">Available</span>
                <span className="font-bold text-slate-900 text-sm">
                  {viewingListing.availableQuantity.toLocaleString()} {viewingListing.unit}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-slate-400 block text-[11px]">MOQ</span>
                <span className="font-bold text-slate-900 text-sm">
                  {viewingListing.moq.toLocaleString()} {viewingListing.unit}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="text-slate-400 block text-[11px]">HS Code</span>
                <span className="font-bold text-slate-900 text-sm">{viewingListing.hsCode}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Port of Loading:</span>
                <span className="font-semibold text-slate-800">{viewingListing.port}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Incoterm:</span>
                <span className="font-semibold text-slate-800">{viewingListing.incoterm}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Terms:</span>
                <span className="font-medium text-slate-800">{viewingListing.paymentTerms}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Certifications:</span>
                <span className="font-medium text-emerald-700">{viewingListing.certifications.join(", ")}</span>
              </div>
            </div>
          </div>
        </DetailDrawer>
      )}
    </div>
  );
};

export default ExportListingsPanel;
