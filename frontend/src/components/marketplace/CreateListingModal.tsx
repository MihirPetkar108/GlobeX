import React, { useState } from "react";
import { useWorkspace } from "@/context/WorkspaceContext";
import { aiService } from "@/services/api/aiService";
import { Listing } from "@/types/trade";
import SpecularButton from "@/components/ui/SpecularButton";
import { toast } from "sonner";
import {
  X,
  PlusCircle,
  FileText,
  DollarSign,
  Anchor,
  ShieldCheck,
  Calendar,
  Layers,
  Building2,
} from "lucide-react";

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Fired after a listing is successfully published, in addition to onClose. */
  onCreated?: () => void;
}

/**
 * Large popup form for creating a new export listing. Field set, labels, and
 * price convention are ported verbatim from CatalogEditorPage.tsx's
 * ExporterListingForm — same "FOB Price ($ USD)" + free-text "Trading Unit"
 * (default "MT") convention already used across the app, just presented as a
 * modal instead of a full page. Writes to the Listing/listings model via
 * aiService.createListing + addListing/refreshListings (not ExportListing).
 */
export const CreateListingModal: React.FC<CreateListingModalProps> = ({ isOpen, onClose, onCreated }) => {
  const { user, refreshListings } = useWorkspace();

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
  ]);

  const resetForm = () => {
    setTitle("");
    setCategory("Agriculture");
    setHsCode("");
    setUnitPriceUSD(1000);
    setUnit("MT");
    setMinimumOrderQuantity(50);
    setAvailableQuantity(1000);
    setOriginPort("");
    setCertifications("ISO 22000, FSSAI, FDA");
    setLeadTimeDays(15);
    setDescription("");
    setSpecs([{ key: "Moisture", value: "Max 12%" }]);
  };

  const handleAddSpecRow = () => setSpecs((prev) => [...prev, { key: "", value: "" }]);
  const handleSpecChange = (index: number, field: "key" | "value", val: string) => {
    setSpecs((prev) => {
      const updated = [...prev];
      updated[index][field] = val;
      return updated;
    });
  };
  const handleRemoveSpecRow = (index: number) => setSpecs((prev) => prev.filter((_, i) => i !== index));

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

      await refreshListings();
      toast.success("Listing published to the catalog.");
      resetForm();
      onCreated?.();
      onClose();
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-4xl bg-[var(--surface-0)] rounded-3xl border border-[var(--hairline-strong)] shadow-2xl my-6 sm:my-0">
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-[var(--hairline)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <PlusCircle className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-[var(--text-primary)]">Create Export Listing</h2>
              <p className="text-xs text-[var(--text-tertiary)]">Publish a new product to the buyer-facing catalog.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Organization context — read-only, pre-filled from the signed-in org */}
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-xs font-mono">
            <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="text-[var(--text-tertiary)]">Listing as:</span>
            <span className="text-[var(--text-primary)] font-bold truncate">
              {user.companyName || "No organization yet"}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] space-y-4">
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
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Quality parameters, processing methods, packaging..."
                      className="w-full p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none focus:border-emerald-500/50 text-xs leading-relaxed transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider">
                      Specifications
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSpecRow}
                    className="text-xs text-emerald-600 hover:text-emerald-500 font-medium transition-colors cursor-pointer"
                  >
                    + Add Parameter
                  </button>
                </div>

                <div className="space-y-3">
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
                          className="text-xs text-rose-600 hover:text-rose-400 transition-colors p-1 cursor-pointer"
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

            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] space-y-4">
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

              <div className="p-5 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] space-y-4">
                <div className="flex items-center gap-2 border-b border-[var(--hairline)] pb-3">
                  <Anchor className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-display font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Logistics
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
                {isSubmitting ? "Publishing..." : "Publish Listing"}
              </SpecularButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateListingModal;
