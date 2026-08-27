import React, { useState, useRef } from "react";
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
  Building2,
  ImagePlus,
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

  const [imageFiles, setImageFiles] = useState<Array<{ file: File; url: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setImageFiles([]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setImageFiles((prev) => [...prev, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    e.target.value = "";
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <div className="lg:col-span-2 flex flex-col">
              <div className="p-6 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] space-y-5 flex-1 flex flex-col">
                <div className="flex items-center gap-2 border-b border-[var(--hairline)] pb-3">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-display font-bold text-[var(--text-primary)] uppercase tracking-wider">
                    Product Overview
                  </h3>
                </div>

                <div className="space-y-4 flex-1 flex flex-col">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">
                      Product Title <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. 1121 Steam Extra Long Grain Aged Basmati Rice"
                      className="w-full p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none focus:border-emerald-500/50 text-sm transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-[var(--text-secondary)]">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as Listing["category"])}
                        className="w-full p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none focus:border-emerald-500/50 text-sm transition-colors cursor-pointer"
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
                      <label className="text-sm font-medium text-[var(--text-secondary)]">
                        HS Code <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={hsCode}
                        onChange={(e) => setHsCode(e.target.value)}
                        placeholder="e.g. 1006.30.20"
                        className="w-full p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none focus:border-emerald-500/50 text-sm font-mono transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Product Description</label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Quality parameters, processing methods, packaging..."
                      className="w-full p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none focus:border-emerald-500/50 text-sm leading-relaxed transition-colors resize-none"
                    />
                  </div>

                  {/* Product Images — fills the space freed up by removing the old Specifications card */}
                  <div className="space-y-1.5 flex-1 flex flex-col">
                    <label className="text-sm font-medium text-[var(--text-secondary)]">Product Images</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 min-h-[120px] w-full rounded-xl border-2 border-dashed border-[var(--hairline-strong)] bg-[var(--surface-2)] hover:bg-emerald-500/5 hover:border-emerald-500/50 transition-colors flex flex-col items-center justify-center gap-2 text-center cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                        <ImagePlus className="w-5 h-5 text-emerald-600" />
                      </div>
                      <span className="text-sm font-medium text-[var(--text-primary)]">Click to upload product images</span>
                      <span className="text-xs text-[var(--text-tertiary)]">PNG or JPG, up to 5MB each</span>
                    </button>

                    {imageFiles.length > 0 && (
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-1">
                        {imageFiles.map((img, idx) => (
                          <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-[var(--hairline)]">
                            <img src={img.url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              aria-label="Remove image"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <SpecularButton
              type="submit"
              size="md"
              radius={12}
              variant="emerald"
              className="px-12 py-3 justify-center"
              icon={<PlusCircle className="w-4.5 h-4.5" />}
              iconPosition="left"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Publishing..." : "Publish Listing"}
            </SpecularButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateListingModal;
