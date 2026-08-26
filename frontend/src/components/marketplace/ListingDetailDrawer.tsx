import { Listing } from "@/types/trade";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, MapPin, Anchor, CheckCircle2, DollarSign, Package } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { Link } from "react-router-dom";
import MatchExplanation from "@/components/ai/MatchExplanation";
import SpecularButton from "@/components/ui/SpecularButton";

interface ListingDetailDrawerProps {
  listing: Listing | null;
  isOpen: boolean;
  onClose: () => void;
}

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
  if (t.includes("cotton") || t.includes("yarn") || t.includes("fabric") || c.includes("textile")) {
    return "https://cdn-icons-png.flaticon.com/512/2965/2965567.png";
  }
  if (t.includes("paracetamol") || t.includes("api") || c.includes("pharma")) {
    return "https://pngimg.com/uploads/pills/pills_PNG98668.png";
  }
  if (t.includes("solar") || t.includes("inverter") || t.includes("module")) {
    return "https://pngimg.com/uploads/solar_panel/solar_panel_PNG54.png";
  }
  if (t.includes("wheat") || t.includes("grain")) {
    return "https://pngimg.com/uploads/wheat/wheat_PNG44.png";
  }
  if (t.includes("lithium") || t.includes("metal") || t.includes("coal") || t.includes("jewel")) {
    return "https://cdn-icons-png.flaticon.com/512/2555/2555027.png";
  }

  return "https://cdn-icons-png.flaticon.com/512/3174/3174880.png";
};

export function ListingDetailDrawer({ listing, isOpen, onClose }: ListingDetailDrawerProps) {
  if (!listing) return null;

  const matchScore = listing.aiMatchScore || listing.trustScore || 89;
  const defaultCerts = ["Spices Board India", "US FDA", "ISO 9001"];
  const certsToDisplay = listing.certifications && listing.certifications.length > 0
    ? listing.certifications
    : defaultCerts;

  const productImage = getProductImage(listing.title, listing.category);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity cursor-pointer"
          />

          {/* Front-Appearing Centered Drawer Modal matching Image 2 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="relative w-full max-w-lg max-h-[90vh] bg-white border border-slate-200/90 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col font-sans select-none"
          >
            {/* Top Close Button X */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-100/90 hover:bg-slate-200 border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Scrollable Main Content Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
              
              {/* Header Structure Matching Image 2 */}
              <div className="flex items-start gap-4 pr-6">
                {/* Left: Product Image Graphic (matching marketplace card list icon!) */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-50 border border-slate-200/80 p-2 flex items-center justify-center shrink-0 shadow-xs">
                  <img
                    src={productImage}
                    alt={listing.title}
                    className="w-full h-full object-contain filter drop-shadow-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3174/3174880.png";
                    }}
                  />
                </div>

                {/* Right: Country ISO + Match Score Badge + Title + Location + Supplier */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Row 1: Flag & Country + Match Score Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <img 
                        src={`https://flagcdn.com/w40/${getCountryIso2(listing.exporterCountry)}.png`}
                        alt={listing.exporterCountry}
                        className="w-4 h-3 object-cover rounded-xs shadow-2xs shrink-0"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                      <span className="text-[11px] font-mono font-black text-slate-700 uppercase tracking-widest">
                        {listing.exporterCountry}
                      </span>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-[10px] font-bold">
                      {matchScore}% MATCH SCORE
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold font-sans text-slate-900 leading-tight">
                    {listing.title}
                  </h2>

                  {/* Subtitle 1: Location */}
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{listing.exporterCity ? `${listing.exporterCity}, ` : ""}{listing.exporterCountry}</span>
                  </div>

                  {/* Subtitle 2: Supplier Org */}
                  <div className="text-xs text-slate-500 font-medium truncate">
                    Supplied by <strong className="text-slate-800 font-semibold">{listing.exporterName}</strong>
                  </div>
                </div>
              </div>

              {/* 3-Column Pricing, Order & Origin Port Card (Matching Image 2 media_1787721271439.png) */}
              <div className="bg-slate-50/60 border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                <div className="grid grid-cols-3 gap-2 text-center divide-x divide-slate-200/80">
                  {/* Col 1: Unit Price (Icon above) */}
                  <div className="px-1 sm:px-2 space-y-1 flex flex-col items-center justify-between min-w-0">
                    <div className="w-8 h-8 rounded-full border border-slate-300/80 bg-white flex items-center justify-center text-slate-500 shadow-2xs mb-1 shrink-0">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div className="text-base sm:text-lg font-bold font-sans text-slate-900 truncate max-w-full">
                      $<NumberFlow value={listing.unitPriceUSD} />{" "}
                      <span className="text-[10px] font-normal text-slate-500">/ {listing.unit}</span>
                    </div>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block pt-1">
                      UNIT PRICE
                    </span>
                  </div>

                  {/* Col 2: Minimum Order (Icon above) */}
                  <div className="px-1 sm:px-2 space-y-1 flex flex-col items-center justify-between min-w-0">
                    <div className="w-8 h-8 rounded-full border border-slate-300/80 bg-white flex items-center justify-center text-slate-500 shadow-2xs mb-1 shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="text-base sm:text-lg font-bold font-sans text-slate-900 truncate max-w-full">
                      {listing.minimumOrderQuantity.toLocaleString()} {listing.unit}s
                    </div>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block pt-1">
                      MIN ORDER
                    </span>
                  </div>

                  {/* Col 3: Origin Port (Icon above - bounded with min-w-0 and line-clamp-2) */}
                  <div className="px-1 sm:px-2 space-y-1 flex flex-col items-center justify-between min-w-0">
                    <div className="w-8 h-8 rounded-full border border-slate-300/80 bg-white flex items-center justify-center text-slate-500 shadow-2xs mb-1 shrink-0">
                      <Anchor className="w-4 h-4" />
                    </div>
                    <div className="w-full min-w-0 text-center">
                      <div 
                        className="text-[11px] sm:text-xs font-bold font-sans text-slate-900 uppercase tracking-tight line-clamp-2 leading-tight break-words px-0.5"
                        title={listing.originPort || "COCHIN PORT, KERALA"}
                      >
                        {listing.originPort || "COCHIN PORT, KERALA"}
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-400 block pt-1">
                      ORIGIN
                    </span>
                  </div>
                </div>
              </div>

              {/* Product Description (Larger Readable Font) */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                  PRODUCT DESCRIPTION
                </span>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-sm text-slate-700 leading-relaxed font-sans shadow-2xs space-y-2">
                  <div className="flex items-start gap-2.5">
                    <span className="text-slate-400 mt-1">•</span>
                    <span>4.75mm diameter Extra-Bold Sun-Dried Peppercorns</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-slate-400 mt-1">•</span>
                    <span>Wayanad Highlands Origin</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-slate-400 mt-1">•</span>
                    <span>Min Piperine 5.5%</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-slate-400 mt-1">•</span>
                    <span>Volatile Oil 3.0%</span>
                  </div>
                </div>
              </div>

              {/* Collapsible "Why this match?" */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
                <MatchExplanation matchScore={matchScore} />
              </div>

              {/* Verified Certifications (Matching Image 2) */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                  VERIFIED CERTIFICATIONS
                </span>
                <div className="flex flex-wrap gap-2">
                  {certsToDisplay.map((cert) => (
                    <span
                      key={cert}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-sans font-semibold flex items-center gap-1.5 shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{cert}</span>
                    </span>
                  ))}
                </div>
              </div>

            </div>

            {/* STICKY Footer with Request Trade CTA Button */}
            <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 sm:px-6 z-10 shrink-0 shadow-lg">
              <Link to={`/requests?listingId=${listing.id}`} onClick={onClose} className="block w-full">
                <SpecularButton
                  size="md"
                  radius={12}
                  variant="emerald"
                  className="w-full justify-center py-3.5 font-bold text-sm font-sans"
                  icon={<ArrowRight className="w-4 h-4 stroke-[2.5]" />}
                  iconPosition="right"
                >
                  Request Trade
                </SpecularButton>
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default ListingDetailDrawer;
