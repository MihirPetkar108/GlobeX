import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { NotModelledState } from "@/components/common/NotModelledState";
import SpecularButton from "@/components/ui/SpecularButton";
import { Listing } from "@/types/trade";
import { aiService } from "@/services/api/aiService";
import { toast } from "sonner";
import {
  PlusCircle,
  FileText,
  DollarSign,
  Package,
  Anchor,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowLeft,
} from "lucide-react";

/**
 * Exporter side only — creating a listing is an exporter-shaped action (see
 * NotModelledState below for importer). Ported from the old CreateListingPage.tsx,
 * with its organizationId bug fixed (was passing the user id, not the org id).
 */
const ExporterListingForm: React.FC = () => {
  const { user, refreshListings } = useWorkspace();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Listing["category"]>("Agriculture");
  const [hsCode, setHsCode] = useState("");
  const [unitPriceUSD, setUnitPriceUSD] = useState<number>(1000);
  const [unit, setUnit] = useState("MT");
  const [minimumOrderQuantity, setMinimumOrderQuantity] = useState<number>(50);
  const [availableQuantity, setAvailableQuantity] = useState<number>(1000);
  const [originPort, setOriginPort] = useState("");
  const [certifications, setCertifications] = useState("ISO 22000, FSSAI, FDA");
  const [leadTimeDays, setLeadTimeDays] = useState<number>(15);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [specs, setSpecs] = useState<Array<{ key: string; value: string }>>([
    { key: "Moisture", value: "Max 12%" },
    { key: "Broken Grain", value: "Max 2%" },
    { key: "Admixture", value: "Max 0.5%" },
  ]);

  const handleAddSpecRow = () => {
    setSpecs((prev) => [...prev, { key: "", value: "" }]);
  };

  const handleSpecChange = (index: number, field: "key" | "value", val: string) => {
    setSpecs((prev) => {
      const updated = [...prev];
      updated[index][field] = val;
      return updated;
    });
  };

  const handleRemoveSpecRow = (index: number) => {
    setSpecs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !hsCode.trim() || !originPort.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!user.organizationId) {
      toast.error("No organization on this account yet — complete onboarding first.");
      return;
    }

    const specRecord: Record<string, string> = {};
    specs.forEach((s) => {
      if (s.key.trim() && s.value.trim()) {
        specRecord[s.key.trim()] = s.value.trim();
      }
    });

    setIsSubmitting(true);
    try {
      await aiService.createListing({
        organizationId: user.organizationId,
        productName: title.trim(),
        productCategory: category,
        hsCode: hsCode.trim(),
        description: description.trim() || undefined,
        quantityAvailable: availableQuantity,
        unit: unit.trim(),
        price: unitPriceUSD,
        incoterms: undefined,
        originPort: originPort.trim(),
        certifications: certifications.split(",").map((c) => c.trim()).filter(Boolean),
        leadTimeDays,
        minimumOrderQuantity,
        specs: specRecord,
      });

      // Catalog reads listings back from the database (no local fabrication)
      // — refetch so the new row shows up immediately.
      await refreshListings();
      toast.success("Listing published to the catalog.");
      navigate("/catalog");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? `Could not publish listing: ${err.message}`
          : "Could not publish listing — backend unreachable."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Information Card */}
          <div className="p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--hairline)] pb-3">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Product Overview
              </h3>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Product Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 1121 Steam Extra Long Grain Aged Basmati Rice"
                  className="w-full p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none focus:border-emerald-500/50 text-xs transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Listing["category"])}
                    className="w-full p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none focus:border-emerald-500/50 text-xs transition-colors cursor-pointer"
                  >
                    <option value="Agriculture">Agriculture</option>
                    <option value="Spices">Spices</option>
                    <option value="Textiles">Textiles</option>
                    <option value="Pharmaceuticals">Pharmaceuticals</option>
                    <option value="Metals">Metals</option>
                    <option value="Chemicals">Chemicals</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">
                    HS Code <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={hsCode}
                    onChange={(e) => setHsCode(e.target.value)}
                    placeholder="e.g. 1006.30.20"
                    className="w-full p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none focus:border-emerald-500/50 text-xs font-mono transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Product Description</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide details about quality parameters, processing methods, packaging types, and storage conditions..."
                  className="w-full p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none focus:border-emerald-500/50 text-xs leading-relaxed transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Product Specifications */}
          <div className="p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Specifications & Analysis Parameters
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddSpecRow}
                className="text-xs text-emerald-600 hover:text-emerald-300 font-medium transition-colors cursor-pointer"
              >
                + Add Parameter
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-7 gap-3 text-[10px] font-mono uppercase text-[var(--text-tertiary)] font-bold px-1">
                <div className="col-span-3">Spec Parameter</div>
                <div className="col-span-3">Required Value / Threshold</div>
                <div className="col-span-1"></div>
              </div>

              {specs.map((spec, idx) => (
                <div key={idx} className="grid grid-cols-7 gap-3 items-center">
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={spec.key}
                      onChange={(e) => handleSpecChange(idx, "key", e.target.value)}
                      placeholder="e.g. Moisture"
                      className="w-full p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none focus:border-emerald-500/50 text-xs transition-colors font-mono"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={spec.value}
                      onChange={(e) => handleSpecChange(idx, "value", e.target.value)}
                      placeholder="e.g. Max 12%"
                      className="w-full p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none focus:border-emerald-500/50 text-xs transition-colors font-mono"
                    />
                  </div>
                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveSpecRow(idx)}
                      className="text-xs text-rose-600 hover:text-rose-300 transition-colors p-1 cursor-pointer"
                      title="Remove row"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing, Logistics & Verification Side Panel */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--hairline)] pb-3">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Pricing & Volume
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[var(--text-secondary)]">FOB Price ($ USD)</label>
                  <input
                    type="number"
                    required
                    value={unitPriceUSD}
                    onChange={(e) => setUnitPriceUSD(Number(e.target.value))}
                    className="w-full p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none focus:border-emerald-500/50 font-mono transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[var(--text-secondary)]">Trading Unit</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="e.g. MT"
                    className="w-full p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none focus:border-emerald-500/50 font-mono transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[var(--text-secondary)]">Min Order Qty</label>
                  <input
                    type="number"
                    required
                    value={minimumOrderQuantity}
                    onChange={(e) => setMinimumOrderQuantity(Number(e.target.value))}
                    className="w-full p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none focus:border-emerald-500/50 font-mono transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[var(--text-secondary)]">Available Stock</label>
                  <input
                    type="number"
                    required
                    value={availableQuantity}
                    onChange={(e) => setAvailableQuantity(Number(e.target.value))}
                    className="w-full p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none focus:border-emerald-500/50 font-mono transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--hairline)] pb-3">
              <Anchor className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Logistics & Compliance
              </h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[var(--text-secondary)]">
                  Origin Sea/Air Port <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={originPort}
                  onChange={(e) => setOriginPort(e.target.value)}
                  placeholder="e.g. Mundra Port (INMUN)"
                  className="w-full p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[var(--text-secondary)]">Lead Time (Days)</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-3.5" />
                  <input
                    type="number"
                    required
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(Number(e.target.value))}
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] focus:border-emerald-500/50 text-[var(--text-primary)] outline-none font-mono transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[var(--text-secondary)]">Certifications (comma separated)</label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={certifications}
                    onChange={(e) => setCertifications(e.target.value)}
                    placeholder="e.g. ISO 22000, FSSAI, Halal"
                    className="w-full h-11 pl-9 pr-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] focus:border-emerald-500/50 text-[var(--text-primary)] outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--surface-1)]/50 border border-[var(--hairline)] text-[11px] text-[var(--text-secondary)] space-y-1 font-mono">
            <div className="text-[10px] text-[var(--text-tertiary)] font-bold uppercase">Exporter Entity Context</div>
            <div>Org: <span className="text-[var(--text-primary)]">{user.companyName}</span></div>
            <div>Location: <span className="text-[var(--text-primary)]">{user.country}</span></div>
          </div>

          <SpecularButton
            type="submit"
            size="md"
            radius={12}
            variant="emerald"
            className="w-full justify-center py-3"
            icon={<PlusCircle className="w-4.5 h-4.5" />}
            iconPosition="left"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Publishing..." : "Publish Catalog Listing"}
          </SpecularButton>
        </div>
      </div>
    </form>
  );
};

export const CatalogEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { isExporterView } = useWorkspace();

  return (
    <AppShell maxWidth="lg" className="flex flex-col items-center">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <PageHeader
          breadcrumbs={[{ label: "Catalog", href: "/catalog" }, { label: "New" }]}
          title={isExporterView ? "Create Export Listing" : "New Requirement"}
          subtitle={
            isExporterView
              ? "Add your organization's export products to the catalog to match with international buyer demand."
              : undefined
          }
          badge={
            isExporterView ? (
              <span className="text-xs font-mono text-emerald-600 border border-emerald-500/30 px-2 py-0.5 rounded bg-[var(--status-verified-bg)]">
                Publish Catalog Item
              </span>
            ) : undefined
          }
          action={
            <SpecularButton
              variant="outline"
              size="sm"
              radius={10}
              icon={<ArrowLeft className="w-4 h-4" />}
              iconPosition="left"
              onClick={() => navigate("/catalog")}
            >
              Back to Catalog
            </SpecularButton>
          }
        />

        {isExporterView ? (
          <ExporterListingForm />
        ) : (
          <NotModelledState
            missingCapability="requirement/RFQ-posting endpoint"
            whatWouldClose="a backend endpoint for importers to post sourcing requirements — today `POST /api/v1/listings` only models exporter-side catalog items"
          />
        )}
      </div>
    </AppShell>
  );
};

export default CatalogEditorPage;
