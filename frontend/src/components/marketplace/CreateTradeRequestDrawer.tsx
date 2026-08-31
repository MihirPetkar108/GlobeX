import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Listing } from "@/types/trade";
import { useWorkspace } from "@/context/WorkspaceContext";
import { aiService, TradeIntakePayload } from "@/services/api/aiService";
import SpecularButton from "@/components/ui/SpecularButton";
import {
  X,
  Package,
  Route,
  ShieldCheck,
  Coins,
  CheckCircle2,
  AlertCircle,
  Building2,
  ArrowRight,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { TopBuyer } from "@/data/mockTradeData";

interface CreateTradeRequestDrawerProps {
  listing?: Listing | null;
  buyer?: TopBuyer | null;
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_CERTIFICATIONS = [
  "ISO 22000",
  "FSSAI",
  "APEDA",
  "Halal",
  "Phytosanitary",
  "GOTS Organic",
  "OEKO-TEX 100",
  "GMP Certified",
];

export const CreateTradeRequestDrawer: React.FC<CreateTradeRequestDrawerProps> = ({
  listing,
  buyer,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const { user, addExportRequest } = useWorkspace();

  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [form, setForm] = useState<TradeIntakePayload>({
    role: "importer",
    productName: "1121 Steam Extra Long Grain Basmati Rice",
    hsCode: "1006.30.20",
    quantity: 500,
    unit: "tonne",
    targetPriceUSD: 1100,
    originCountry: "India",
    originPort: "Nhava Sheva (JNPT), Mumbai",
    destinationCountry: "United Arab Emirates",
    destinationPort: "Jebel Ali Port, Dubai",
    incoterm: "CIF",
    requiredCertifications: ["ISO 22000", "FSSAI", "APEDA", "Halal"],
    escrowToken: "USDC",
    inspectionRequired: true,
    inspectionAgent: "SGS International",
  });

  useEffect(() => {
    if (listing) {
      setForm((prev) => ({
        ...prev,
        productName: listing.title,
        hsCode: listing.hsCode,
        quantity: listing.minimumOrderQuantity || 500,
        unit: listing.unit || "tonne",
        targetPriceUSD: listing.unitPriceUSD,
        originCountry: listing.exporterCountry || "India",
        originPort: listing.originPort || "Nhava Sheva (JNPT), Mumbai",
        requiredCertifications: listing.certifications || ["ISO 22000", "FSSAI"],
      }));
      setStep(1);
    } else if (buyer) {
      setForm((prev) => ({
        ...prev,
        productName: buyer.acceptedCommodities?.[0] || "1121 Steam Extra Long Grain Basmati Rice",
        destinationCountry: buyer.country,
        destinationPort: `${buyer.city} Commercial Port`,
        requiredCertifications: buyer.certifications || ["ISO 22000", "Halal"],
      }));
      setStep(1);
    }
  }, [listing, buyer]);

  if (!isOpen) return null;

  const estimatedTotalUSD = (form.quantity || 0) * (form.targetPriceUSD || 0);

  const toggleCert = (cert: string) => {
    const current = form.requiredCertifications || [];
    if (current.includes(cert)) {
      setForm({
        ...form,
        requiredCertifications: current.filter((c) => c !== cert),
      });
    } else {
      setForm({
        ...form,
        requiredCertifications: [...current, cert],
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
      return;
    }

    setIsSubmitting(true);
    try {
      await aiService.analyzeTradeIntake(form);
      const newId = `EXP-REQ-${Date.now().toString().slice(-6)}`;
      const newReq: any = {
        id: newId,
        listingId: listing?.id || "",
        buyer: user.companyName || "Global Imports LLC",
        country: form.destinationCountry || user.country || "United Arab Emirates",
        flag: "🇦🇪",
        product: form.productName,
        category: listing?.category || "Agriculture",
        hsCode: form.hsCode || "1006.30",
        quantity: form.quantity || 500,
        unit: form.unit || "tonne",
        originalPrice: form.targetPriceUSD || 1100,
        originalTradeValue: (form.quantity || 500) * (form.targetPriceUSD || 1100),
        buyerProposedPrice: form.targetPriceUSD || 1100,
        buyerProposedTradeValue: (form.quantity || 500) * (form.targetPriceUSD || 1100),
        status: "NEW REQUEST",
        negotiationHistory: [
          {
            role: "Buyer",
            price: form.targetPriceUSD || 1100,
            quantity: form.quantity || 500,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            note: "Trade request created from Marketplace Drawer.",
          },
        ],
        origin: form.originPort || "Nhava Sheva (JNPT), Mumbai",
        destination: form.destinationCountry || "United Arab Emirates",
        destinationPort: form.destinationPort || "Jebel Ali Port, Dubai",
        transit: "5-7 days",
        incoterm: form.incoterm || "CIF",
        paymentTerms: "Escrow Secured",
        paymentStatus: "Pending",
        buyerRisk: "Low Risk (Grade A+)",
        requiredLicenses: form.requiredCertifications?.join(", ") || "APEDA Phytosanitary",
        createdAt: new Date().toISOString().split("T")[0],
      };
      addExportRequest(newReq);
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
        navigate(`/trades/${newId}`);
      }, 400);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden select-none font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        />

        {/* Slide-over Drawer Panel */}
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="w-screen max-w-lg bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] shadow-2xl flex flex-col justify-between"
          >
            {/* Header */}
            <div className="p-5 border-b border-[var(--border-subtle)] flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--success-bg)] text-[var(--brand-teal-dark)] border border-[var(--brand-teal)]/30 flex items-center gap-1 font-semibold">
                    <Lock className="w-3 h-3" />
                    CREATE TRADE REQUEST · 4-STEP WIZARD
                  </span>
                </div>
                <h2 className="text-lg font-display font-bold text-[var(--text-primary)] leading-snug">
                  {listing ? listing.title : "Trade Request Configuration"}
                </h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Direct inquiry to {listing?.exporterName || "Verified Supplier"} · Escrow Secured
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-[var(--bg-surface-subtle)] hover:bg-[var(--bg-surface-muted)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0 cursor-pointer shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div className="px-5 py-3 bg-[var(--bg-surface-subtle)] border-b border-[var(--border-subtle)] grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
              {[
                { num: 1, label: "Product", icon: Package },
                { num: 2, label: "Route", icon: Route },
                { num: 3, label: "Compliance", icon: ShieldCheck },
                { num: 4, label: "Escrow", icon: Coins },
              ].map((s) => (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => setStep(s.num)}
                  className={cn(
                    "py-1.5 px-2 rounded-lg border transition-all flex items-center justify-center gap-1 cursor-pointer",
                    step === s.num
                      ? "bg-[var(--success-bg)] border-[var(--brand-teal)] text-[var(--brand-teal-dark)] font-bold shadow-sm"
                      : step > s.num
                      ? "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                      : "bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] text-[var(--text-tertiary)]"
                  )}
                >
                  <span>{s.num}.</span>
                  <span>{s.label}</span>
                </button>
              ))}
            </div>

            {/* Form Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs">
              <form id="drawer-trade-form" onSubmit={handleSubmit} className="space-y-4">
                {/* ── STEP 1: PRODUCT & QUANTITY ────────────────────────── */}
                {step === 1 && (
                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-[var(--text-secondary)] uppercase">Product Commodity Title</label>
                      <input
                        type="text"
                        required
                        value={form.productName}
                        onChange={(e) => setForm({ ...form, productName: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-[var(--text-secondary)] uppercase">HS Code</label>
                        <input
                          type="text"
                          required
                          value={form.hsCode}
                          onChange={(e) => setForm({ ...form, hsCode: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-[var(--text-secondary)] uppercase">Target FOB Price (USD)</label>
                        <input
                          type="number"
                          required
                          value={form.targetPriceUSD}
                          onChange={(e) => setForm({ ...form, targetPriceUSD: Number(e.target.value) })}
                          className="w-full p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-[var(--text-secondary)] uppercase">Requested Quantity</label>
                        <input
                          type="number"
                          required
                          value={form.quantity}
                          onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                          className="w-full p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-[var(--text-secondary)] uppercase">Unit of Measure</label>
                        <select
                          value={form.unit}
                          onChange={(e) => setForm({ ...form, unit: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none"
                        >
                          <option value="tonne">Tonnes (MT)</option>
                          <option value="kg">Kilograms (kg)</option>
                          <option value="meters">Meters</option>
                          <option value="units">Units / Pieces</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: ROUTE & PORTS ─────────────────────────────── */}
                {step === 2 && (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-[var(--text-secondary)] uppercase">Origin Country</label>
                        <input
                          type="text"
                          required
                          value={form.originCountry}
                          onChange={(e) => setForm({ ...form, originCountry: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-[var(--text-secondary)] uppercase">Destination Country</label>
                        <input
                          type="text"
                          required
                          value={form.destinationCountry}
                          onChange={(e) => setForm({ ...form, destinationCountry: e.target.value })}
                          className="w-full p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-[var(--text-secondary)] uppercase">Origin Port of Loading</label>
                      <input
                        type="text"
                        required
                        value={form.originPort}
                        onChange={(e) => setForm({ ...form, originPort: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-[var(--text-secondary)] uppercase">Destination Port of Discharge</label>
                      <input
                        type="text"
                        required
                        value={form.destinationPort}
                        onChange={(e) => setForm({ ...form, destinationPort: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-[var(--text-secondary)] uppercase">Incoterm Agreement</label>
                      <select
                        value={form.incoterm}
                        onChange={(e) => setForm({ ...form, incoterm: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none"
                      >
                        <option value="CIF">CIF — Cost, Insurance and Freight</option>
                        <option value="FOB">FOB — Free on Board</option>
                        <option value="CFR">CFR — Cost and Freight</option>
                        <option value="DAP">DAP — Delivered at Place</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: COMPLIANCE & CERTIFICATIONS ───────────────── */}
                {step === 3 && (
                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-[var(--text-secondary)] uppercase block">
                        Required Compliance Certifications
                      </label>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {AVAILABLE_CERTIFICATIONS.map((cert) => {
                          const isChecked = form.requiredCertifications?.includes(cert);
                          return (
                            <button
                              key={cert}
                              type="button"
                              onClick={() => toggleCert(cert)}
                              className={cn(
                                "p-2 rounded-xl border text-left flex items-center justify-between text-xs transition-colors cursor-pointer",
                                isChecked
                                  ? "bg-[var(--status-verified-bg)] border-emerald-500/50 text-emerald-300 font-semibold"
                                  : "bg-[var(--surface-1)] border-[var(--hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              )}
                            >
                              <span>{cert}</span>
                              {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[var(--status-verified-bg)] border border-emerald-500/30 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                        <ShieldCheck className="w-4 h-4" />
                        <span>CEPA Schedule Rules Fast-Track</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        0% Preferential duty automatically applied for bilateral trade route under India-UAE CEPA.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: PAYMENT & ESCROW SETTLEMENT ───────────────── */}
                {step === 4 && (
                  <div className="space-y-3.5">
                    <div className="p-4 rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-[var(--text-secondary)]">Total Contract Value</span>
                        <span className="text-emerald-600 font-mono text-xl font-bold">
                          ${estimatedTotalUSD.toLocaleString()} USD
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] border-t border-[var(--hairline)] pt-2 flex items-center justify-between">
                        <span>Settlement Currency</span>
                        <strong className="text-[var(--text-primary)] font-mono">USDC (Arbitrum / Sepolia L2)</strong>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-[var(--text-secondary)] uppercase">Independent Joint Inspection Surveyor</label>
                      <select
                        value={form.inspectionAgent}
                        onChange={(e) => setForm({ ...form, inspectionAgent: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[var(--text-primary)] outline-none"
                      >
                        <option value="SGS International">SGS International (Certified Maritime Inspection)</option>
                        <option value="Bureau Veritas">Bureau Veritas Global</option>
                        <option value="Intertek">Intertek Agri-Testing</option>
                      </select>
                    </div>

                    <div className="p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      Escrow collateral is locked in non-custodial smart contracts until AIS berth sensors and SGS joint inspection verify discharge.
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Bottom Actions */}
            <div className="p-5 border-t border-[var(--hairline)] bg-[var(--surface-1)] flex items-center justify-between gap-3">
              {step > 1 ? (
                <SpecularButton
                  type="button"
                  variant="outline"
                  size="sm"
                  radius={10}
                  onClick={() => setStep(step - 1)}
                >
                  ← Back
                </SpecularButton>
              ) : (
                <SpecularButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  radius={10}
                  onClick={onClose}
                >
                  Cancel
                </SpecularButton>
              )}

              <SpecularButton
                type="submit"
                form="drawer-trade-form"
                size="md"
                radius={12}
                variant="emerald"
                isLoading={isSubmitting}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                {step === 4 ? `Lock Escrow & Submit ($${(estimatedTotalUSD / 1000).toFixed(0)}k)` : "Continue →"}
              </SpecularButton>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default CreateTradeRequestDrawer;
