import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import SpecularButton from "@/components/ui/SpecularButton";
import { motion, AnimatePresence } from "framer-motion";
import NumberFlow from "@number-flow/react";
import {
  ArrowRight,
  Ship,
  Minus,
  Plus,
  MessageSquare,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  Check,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { tradesService, mapTradeToExportRequest } from "@/services/api/tradesService";

const COUNTRY_INFO: Record<string, { iso2: string; iso3: string }> = {
  "India": { iso2: "in", iso3: "IND" },
  "United States": { iso2: "us", iso3: "USA" },
  "Germany": { iso2: "de", iso3: "DEU" },
  "Netherlands": { iso2: "nl", iso3: "NLD" },
  "Singapore": { iso2: "sg", iso3: "SGP" },
  "Australia": { iso2: "au", iso3: "AUS" },
  "Canada": { iso2: "ca", iso3: "CAN" },
  "Brazil": { iso2: "br", iso3: "BRA" },
  "Egypt": { iso2: "eg", iso3: "EGY" },
  "Chile": { iso2: "cl", iso3: "CHL" },
  "UAE": { iso2: "ae", iso3: "ARE" },
  "United Arab Emirates": { iso2: "ae", iso3: "ARE" },
};

const getCountryIso2 = (country: string) => COUNTRY_INFO[country]?.iso2 || "un";

const getProductImage = (title: string, category: string) => {
  const t = title.toLowerCase();
  const c = category.toLowerCase();

  if (t.includes("rice") || c.includes("rice")) {
    return "https://pngimg.com/uploads/rice/rice_PNG13.png";
  }
  if (t.includes("pepper") || t.includes("spice")) {
    return "https://pngimg.com/uploads/black_pepper/black_pepper_PNG20.png";
  }
  if (t.includes("turmeric")) {
    return "https://pngimg.com/uploads/turmeric/turmeric_PNG8.png";
  }
  if (t.includes("chili") || t.includes("chilli")) {
    return "https://pngimg.com/uploads/chilli/chilli_PNG15.png";
  }
  if (t.includes("tea")) {
    return "https://pngimg.com/uploads/tea/tea_PNG16.png";
  }
  if (t.includes("coffee")) {
    return "https://pngimg.com/uploads/coffee_beans/coffee_beans_PNG9273.png";
  }
  if (t.includes("cashew") || t.includes("nut")) {
    return "https://pngimg.com/uploads/cashew/cashew_PNG31.png";
  }
  return "https://cdn-icons-png.flaticon.com/512/3174/3174880.png";
};

type NegotiationStatus = "none" | "proposed" | "countered" | "accepted" | "declined";

export const RequestsPage: React.FC = () => {
  const { isExporterView, listings, user, addExportRequest } = useWorkspace();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const listingId = searchParams.get("listingId");

  // Fallback demo listing if none selected
  const defaultListing = listings[0] || {
    id: "lst-demo-101",
    title: "1121 Steam Extra Long Grain Basmati Rice",
    category: "Agriculture",
    unitPriceUSD: 1100,
    unit: "tonne",
    minimumOrderQuantity: 100,
    exporterName: "Acme Exports Ltd",
    exporterCountry: "India",
    exporterCity: "Mumbai",
    originPort: "Nhava Sheva (JNPT), Mumbai",
    aiMatchScore: 94,
  };

  const selectedListing = listingId
    ? listings.find((l) => l.id === listingId) || defaultListing
    : defaultListing;

  // Form State
  const [quantity, setQuantity] = useState<number>(
    selectedListing.minimumOrderQuantity ? Math.max(500, selectedListing.minimumOrderQuantity) : 500
  );
  const [unitPrice, setUnitPrice] = useState<number>(selectedListing.unitPriceUSD || 1100);

  // Negotiation State
  const [negotiateOpen, setNegotiateOpen] = useState(false);
  const [offerInput, setOfferInput] = useState<string>(String(selectedListing.unitPriceUSD || 1100));
  const [negStatus, setNegStatus] = useState<NegotiationStatus>("none");
  const [counterPrice, setCounterPrice] = useState<number>(1075);
  const [isSimulating, setIsSimulating] = useState(false);

  // Review Modal State & Success Modal State
  const [reviewOpen, setReviewOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Derived Financial Calculations
  const unit = selectedListing.unit || "tonne";
  const subtotal = quantity * unitPrice;
  const shippingRatePerUnit = 36; // $36/tonne shipping estimate
  const shippingCost = Math.round(quantity * shippingRatePerUnit);
  const tariffCost = 0; // CEPA 0% Tariff Rate
  const totalLandedCost = subtotal + shippingCost + tariffCost;

  // Handlers
  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(selectedListing.minimumOrderQuantity || 10, prev + delta));
  };

  const handleNegotiateSubmit = () => {
    const numOffer = parseFloat(offerInput);
    if (isNaN(numOffer) || numOffer <= 0) return;

    setNegStatus("proposed");
    setIsSimulating(true);

    // Simulate seller review response
    setTimeout(() => {
      setIsSimulating(false);
      if (numOffer >= unitPrice * 0.95) {
        // Accept directly if within 5%
        setUnitPrice(numOffer);
        setNegStatus("accepted");
      } else {
        // Counteroffer halfway
        const counter = Math.round((numOffer + unitPrice) / 2);
        setCounterPrice(counter);
        setNegStatus("countered");
      }
    }, 1200);
  };

  const handleAcceptCounter = () => {
    setUnitPrice(counterPrice);
    setNegStatus("accepted");
    setNegotiateOpen(false);
  };

  const handleConfirmSendRequest = async () => {
    if (!user.organizationId) {
      toast.error("Complete organization onboarding before sending a trade request.");
      return;
    }
    if (!selectedListing.id) {
      toast.error("Select a listing from the marketplace first.");
      return;
    }

    setIsSending(true);
    try {
      const trade = await tradesService.createTradeRequest({
        listingId: selectedListing.id,
        quantity,
        agreedPrice: unitPrice,
        currency: "USD",
      });
      addExportRequest(mapTradeToExportRequest(trade));
      setReviewOpen(false);
      setSuccessOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the trade request.");
    } finally {
      setIsSending(false);
    }
  };

  const productImage = getProductImage(selectedListing.title, selectedListing.category);
  const originIso2 = getCountryIso2(selectedListing.exporterCountry || "India");
  const destIso2 = "ae"; // Destination UAE

  return (
    <AppShell maxWidth="lg">
      <div className="space-y-6 select-none font-sans">
        
        {/* Page Header */}
        <PageHeader
          breadcrumbs={[{ label: "Dashboard", href: "/home" }, { label: "Request Trade" }]}
          title="Configure & Request Trade"
          subtitle="Review shipping corridor, customize trade volume, calculate landed cost, and negotiate price."
        />

        {/* ── MAIN CONFIGURATION CONTAINER MATCHING SKETCH LAYOUT ────────────── */}
        <div className="space-y-5">

          {/* SINGLE 100% PASTEL BLUE HERO CARD (NO SECTIONS, NO EXTRA BOXES) */}
          <div className="bg-gradient-to-br from-sky-50/90 via-blue-50/60 to-sky-50/90 border border-sky-200/90 rounded-3xl p-5 sm:p-6 space-y-6 shadow-xs font-sans">
            
            {/* Header Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping" />
                <span className="font-bold text-xs tracking-wider text-sky-950 uppercase font-sans">
                  Live Maritime Shipping Corridor
                </span>
              </div>
              <span className="px-3.5 py-1.5 rounded-full bg-white/90 border border-sky-200/80 text-sky-900 font-sans font-bold text-xs shadow-2xs flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-sky-600 fill-sky-600" />
                Est. Transit: 5–7 Days
              </span>
            </div>

            {/* Dotted Route Map Visualizer Card */}
            <div className="py-5 px-4 sm:px-8 bg-white/95 rounded-2xl border border-sky-200/70 shadow-xs flex items-center justify-between gap-4">
              {/* Origin Port (Left) */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-sky-50/80 border border-sky-200/80 p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
                  <img
                    src={`https://flagcdn.com/w40/${originIso2}.png`}
                    alt={selectedListing.exporterCountry}
                    className="w-7 h-5 object-cover rounded-xs"
                  />
                </div>
                <div>
                  <div className="text-[10px] font-sans font-bold text-sky-700 uppercase tracking-wider">ORIGIN PORT</div>
                  <div className="text-base font-bold text-slate-900 truncate max-w-[130px] sm:max-w-[180px]">
                    {selectedListing.originPort || "Cochin Port"}
                  </div>
                  <div className="text-xs text-slate-500 font-medium">{selectedListing.exporterCountry} · Terminal 1</div>
                </div>
              </div>

              {/* Full-Path Dotted Transit Line & Moving Vessel (Ship travels from 0% to 95% full path) */}
              <div className="flex-1 flex flex-col items-center justify-center space-y-2 px-4 min-w-0">
                <div className="text-xs font-sans text-sky-900 font-bold tracking-tight flex items-center gap-1.5">
                  <Ship className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>2,450 NM (Arabian Sea Route)</span>
                </div>

                {/* Full-Path Dotted Line */}
                <div className="w-full relative py-1.5 flex items-center justify-center">
                  <div className="w-full border-b-2 border-dashed border-sky-300" />
                  <motion.div
                    initial={{ left: "0%" }}
                    animate={{ left: "95%" }}
                    transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                    className="absolute -top-3 w-7 h-7 rounded-full bg-white border border-sky-300 shadow-xs flex items-center justify-center text-sky-600"
                  >
                    <Ship className="w-4 h-4 text-sky-600" />
                  </motion.div>
                </div>

                <div className="text-[10px] font-sans text-sky-600 font-bold uppercase tracking-wider">CEPA Duty-Free Trade Corridor</div>
              </div>

              {/* Destination Port (Right) */}
              <div className="flex items-center gap-3.5 text-right">
                <div>
                  <div className="text-[10px] font-sans font-bold text-sky-700 uppercase tracking-wider">DESTINATION PORT</div>
                  <div className="text-base font-bold text-slate-900 truncate max-w-[130px] sm:max-w-[180px]">
                    Jebel Ali Port
                  </div>
                  <div className="text-xs text-slate-500 font-medium">United Arab Emirates · Pier 4</div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-sky-50/80 border border-sky-200/80 p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
                  <img
                    src={`https://flagcdn.com/w40/${destIso2}.png`}
                    alt="UAE"
                    className="w-7 h-5 object-cover rounded-xs"
                  />
                </div>
              </div>
            </div>

            {/* Integrated Product & Trader Data (Inside Blue Container, No Separate Boxes, No 'Verified' Text) */}
            <div className="flex items-center gap-5 pt-2">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border border-sky-200/80 p-2.5 flex items-center justify-center shrink-0 shadow-xs">
                <img
                  src={productImage}
                  alt={selectedListing.title}
                  className="w-full h-full object-contain filter drop-shadow-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3174/3174880.png";
                  }}
                />
              </div>

              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 font-sans text-xs font-bold shadow-2xs">
                    {selectedListing.aiMatchScore || 94}% MATCH SCORE
                  </span>
                  <span className="text-xs font-sans text-sky-700 font-bold uppercase tracking-wider">{selectedListing.category}</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold font-sans text-slate-900 leading-tight">
                  {selectedListing.title}
                </h2>

                {/* Supplier & Buyer placed right beside title in the open whitespace */}
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 flex-wrap pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <img 
                      src={`https://flagcdn.com/w40/${originIso2}.png`}
                      alt={selectedListing.exporterCountry}
                      className="w-4.5 h-3.5 object-cover rounded-xs shadow-2xs shrink-0"
                    />
                    <span>Supplier: <strong className="text-slate-900 font-bold">{selectedListing.exporterName}</strong></span>
                  </div>
                  <span className="text-sky-300 font-bold">•</span>
                  <div className="flex items-center gap-1.5">
                    <img 
                      src={`https://flagcdn.com/w40/${destIso2}.png`}
                      alt="UAE"
                      className="w-4.5 h-3.5 object-cover rounded-xs shadow-2xs shrink-0"
                    />
                    <span>Buyer: <strong className="text-slate-900 font-bold">{user.companyName || "Demo Exports Pvt Ltd"}</strong></span>
                  </div>
                </div>
              </div>
            </div>

          </div>


          {/* BOX 3: 2-COLUMN GRID (ORDER QUANTITY vs DYNAMIC LANDED COST) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-sans">
            
            {/* LEFT COLUMN: ORDER QUANTITY */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-sm font-bold text-slate-900 font-sans">
                    Order Volume &amp; Quantity
                  </span>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                    MOQ: {selectedListing.minimumOrderQuantity || 100} {unit}s
                  </span>
                </div>

                <div className="pt-6 space-y-5 text-center">
                  <div className="text-xs text-slate-500 font-medium">
                    Adjust order volume in metric tonnes:
                  </div>

                  {/* Quantity Controller Input */}
                  <div className="flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(-50)}
                      className="w-12 h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center font-bold text-base transition-transform active:scale-95 cursor-pointer shadow-md"
                      title="Decrease by 50"
                    >
                      <Minus className="w-5 h-5" />
                    </button>

                    <div className="px-6 py-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center gap-2 shadow-2xs min-w-[170px]">
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                        className="text-3xl font-black text-slate-900 font-sans text-center w-24 bg-transparent outline-none"
                      />
                      <span className="text-sm font-semibold text-slate-500">{unit}s</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuantityChange(50)}
                      className="w-12 h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center font-bold text-base transition-transform active:scale-95 cursor-pointer shadow-md"
                      title="Increase by 50"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    {[100, 250, 500, 1000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQuantity(preset)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          quantity === preset
                            ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {preset} {unit}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 font-sans flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verified supplier inventory available for immediate dispatch.</span>
              </div>
            </div>


            {/* RIGHT COLUMN: DYNAMIC LANDED COST BREAKDOWN */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] space-y-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <span className="text-sm font-bold text-slate-900 font-sans">
                    Dynamic Landed Cost Breakdown
                  </span>
                  {negStatus === "accepted" ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Agreed Rate
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-600">
                      FOB ${unitPrice.toLocaleString()} / {unit}
                    </span>
                  )}
                </div>

                <div className="pt-3 space-y-3 text-xs font-sans">
                  
                  {/* Row 1: Subtotal */}
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-medium">Product Subtotal ({quantity} {unit}s)</span>
                    <span className="font-bold text-slate-900 text-sm">
                      $<NumberFlow value={subtotal} />
                    </span>
                  </div>

                  {/* Row 2: Shipping */}
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-medium flex items-center gap-1">
                      <span>Shipping &amp; Logistics</span>
                      <span className="text-[11px] text-slate-400 font-sans">(${shippingRatePerUnit}/{unit})</span>
                    </span>
                    <span className="font-semibold text-slate-800">
                      +${shippingCost.toLocaleString()}
                    </span>
                  </div>

                  {/* Row 3: Duty */}
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-medium flex items-center gap-1">
                      <span>Tariff &amp; Customs Duty</span>
                      <span className="text-[11px] text-emerald-600 font-bold">(0% CEPA)</span>
                    </span>
                    <span className="font-semibold text-emerald-600">
                      $0.00
                    </span>
                  </div>

                  {/* Row 4: Total Landed Cost Callout */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-emerald-500/10 border border-emerald-500/20 flex items-center justify-between mt-2 shadow-xs">
                    <div>
                      <div className="text-xs font-bold text-emerald-950 font-sans tracking-wide uppercase">
                        ESTIMATED LANDED COST
                      </div>
                      <div className="text-[11px] text-emerald-700 font-medium">Includes port clearance &amp; freight</div>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black font-sans text-emerald-950 tracking-tight">
                      $<NumberFlow value={totalLandedCost} />
                    </div>
                  </div>

                </div>
              </div>

              <div className="text-xs text-slate-500 font-sans flex items-center justify-between pt-1">
                <span>Currency: USD ($)</span>
                <span className="font-semibold text-slate-700">Secured via Escrow</span>
              </div>
            </div>

          </div>


          {/* BOTTOM ACTION BUTTONS */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3 font-sans">
            {/* Negotiate Price (Bargain) Button */}
            <SpecularButton
              size="md"
              radius={12}
              variant="secondary"
              onClick={() => setNegotiateOpen(true)}
              className="w-full sm:w-auto px-6 py-3 font-semibold text-sm font-sans justify-center"
              icon={<MessageSquare className="w-4 h-4 text-emerald-600" />}
              iconPosition="left"
            >
              {negStatus === "accepted" ? "Price Agreed ($" + unitPrice + "/t)" : "Negotiate Price (Bargain)"}
            </SpecularButton>

            {/* Send Trade Request Button */}
            <SpecularButton
              size="md"
              radius={12}
              variant="emerald"
              onClick={() => setReviewOpen(true)}
              className="w-full sm:w-auto px-8 py-3 font-bold text-sm font-sans justify-center shadow-lg"
              icon={<ArrowRight className="w-4 h-4 stroke-[2.5]" />}
              iconPosition="right"
            >
              Review &amp; Send Request →
            </SpecularButton>
          </div>

        </div>


        {/* ── STEP 2: NEGOTIATION MODAL (BARGAIN STATE MACHINE) ─────────────── */}
        <AnimatePresence>
          {negotiateOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setNegotiateOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity cursor-pointer"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="relative w-full max-w-md bg-white border border-slate-200/90 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col font-sans select-none"
              >
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Price Negotiation (Bargain)</h3>
                      <p className="text-xs text-slate-500 font-medium">Submit counter-proposal to exporter</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNegotiateOpen(false)}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="text-slate-500">Exporter List Price:</div>
                    <div className="text-lg font-bold text-slate-900 font-sans">
                      ${selectedListing.unitPriceUSD} / {unit}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 font-sans block">
                      YOUR OFFER PRICE (USD / {unit.toUpperCase()})
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-slate-400 font-bold">$</span>
                      <input
                        type="number"
                        value={offerInput}
                        onChange={(e) => setOfferInput(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 font-sans font-bold text-base text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="1050"
                      />
                    </div>
                  </div>

                  {/* Status Banner */}
                  {isSimulating && (
                    <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2.5 animate-pulse">
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>Sending counter-proposal to Acme Exports Ltd...</span>
                    </div>
                  )}

                  {negStatus === "countered" && !isSimulating && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-xs text-amber-900 space-y-2">
                      <div className="font-bold flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>Supplier Counteroffer Received</span>
                      </div>
                      <p>
                        Acme Exports Ltd counter-proposed <strong>${counterPrice} / {unit}</strong> (Original: ${selectedListing.unitPriceUSD}, Your offer: ${offerInput}).
                      </p>
                      <button
                        type="button"
                        onClick={handleAcceptCounter}
                        className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer"
                      >
                        Accept Counteroffer (${counterPrice} / {unit})
                      </button>
                    </div>
                  )}

                  {negStatus === "accepted" && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Price agreed at <strong>${unitPrice} / {unit}</strong>!</span>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setNegotiateOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <SpecularButton
                    size="sm"
                    radius={10}
                    variant="emerald"
                    onClick={handleNegotiateSubmit}
                    disabled={isSimulating}
                  >
                    Submit Offer →
                  </SpecularButton>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>


        {/* ── STEP 3: PRE-FLIGHT REVIEW MODAL ─────────────────────────────── */}
        <AnimatePresence>
          {reviewOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setReviewOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity cursor-pointer"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="relative w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col font-sans select-none"
              >
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Review Trade Terms</h3>
                      <p className="text-xs text-slate-500 font-medium">Verify order summary before dispatch</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReviewOpen(false)}
                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4 font-sans">
                  
                  {/* Summary Grid */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 text-xs">
                    <div className="font-bold text-slate-900 text-sm pb-1.5 border-b border-slate-200/60">
                      {selectedListing.title}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Supplier:</span>
                      <strong className="text-slate-900">{selectedListing.exporterName}</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Route:</span>
                      <strong className="text-slate-900">{selectedListing.originPort} ➔ Jebel Ali, UAE</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Quantity:</span>
                      <strong className="text-slate-900">{quantity} {unit}s</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Agreed Unit Price:</span>
                      <strong className="text-slate-900">${unitPrice} / {unit}</strong>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                      <span className="font-bold text-slate-900">Total Landed Cost:</span>
                      <strong className="text-base font-black text-emerald-800">${totalLandedCost.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Clicking confirm creates the binding trade proposal in your Active Workspace.</span>
                  </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setReviewOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Back to Edit
                  </button>

                  <SpecularButton
                    size="md"
                    radius={12}
                    variant="emerald"
                    onClick={handleConfirmSendRequest}
                    disabled={isSending}
                    className="px-6 py-2.5 font-bold text-xs font-sans"
                    icon={<ArrowRight className="w-4 h-4" />}
                    iconPosition="right"
                  >
                    {isSending ? "Sending…" : "Confirm & Send Trade Request →"}
                  </SpecularButton>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>


        {/* ── STEP 4: CLEAN SUCCESS MODAL ("Trade Request Sent ✓") ──────────── */}
        <AnimatePresence>
          {successOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="relative w-full max-w-md bg-white border border-slate-200/90 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col font-sans text-center p-6 space-y-5"
              >
                {/* Success Icon */}
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200/80 mx-auto flex items-center justify-center text-emerald-600 shadow-2xs">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                {/* Title */}
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900 font-sans">
                    Trade Request Sent ✓
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Your proposal has been submitted to the supplier.
                  </p>
                </div>

                {/* Short Summary Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-left space-y-2 font-sans">
                  <div className="font-bold text-slate-900 text-sm pb-1.5 border-b border-slate-200/60 truncate">
                    {selectedListing.title}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Supplier:</span>
                    <strong className="text-slate-900 font-semibold">{selectedListing.exporterName}</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Route:</span>
                    <strong className="text-slate-900 font-semibold">{selectedListing.originPort || "Cochin Port"} ➔ Jebel Ali, UAE</strong>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Quantity:</span>
                    <strong className="text-slate-900 font-semibold">{quantity} {unit}s</strong>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <span className="font-bold text-slate-900">Estimated Total Value:</span>
                    <strong className="text-base font-black text-emerald-800">${totalLandedCost.toLocaleString()}</strong>
                  </div>
                </div>

                {/* One Primary Button "Back to Marketplace →" */}
                <div className="pt-2">
                  <SpecularButton
                    size="md"
                    radius={12}
                    variant="emerald"
                    onClick={() => navigate("/discover")}
                    className="w-full py-3 font-bold text-sm font-sans justify-center shadow-lg"
                    icon={<ArrowRight className="w-4 h-4" />}
                    iconPosition="right"
                  >
                    Back to Marketplace →
                  </SpecularButton>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </AppShell>
  );
};

export default RequestsPage;
