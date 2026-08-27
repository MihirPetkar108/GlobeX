import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import { Listing } from "@/types/trade";
import { aiService } from "@/services/api/aiService";
import { AppShell } from "@/components/layout/AppShell";
import ListingDetailDrawer from "@/components/marketplace/ListingDetailDrawer";
import CreateTradeRequestDrawer from "@/components/marketplace/CreateTradeRequestDrawer";
import { n8nWorkflowService } from "@/services/n8n/workflowService";
import { Search, Heart, Check } from "lucide-react";
import { cn } from "@/lib/utils";

import { toast } from "sonner";

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
const getCountryIso3 = (country: string) => COUNTRY_INFO[country]?.iso3 || country.toUpperCase().slice(0, 3);

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

const TraderCard = ({
  listing,
  onInspect,
  onRequest,
}: {
  listing: Listing;
  onInspect: (l: Listing) => void;
  onRequest: (l: Listing) => void;
}) => {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  const matchScore = listing.aiMatchScore || listing.trustScore || 88;

  let bgTint = "bg-rose-50/50 hover:bg-rose-50/80 border-rose-100/80";
  let scoreTextColor = "text-rose-700";
  if (matchScore >= 85) {
    bgTint = "bg-emerald-50/50 hover:bg-emerald-50/80 border-emerald-100/80";
    scoreTextColor = "text-emerald-600";
  } else if (matchScore >= 70) {
    bgTint = "bg-amber-50/50 hover:bg-amber-50/80 border-amber-100/80";
    scoreTextColor = "text-amber-600";
  }

  const productImage = getProductImage(listing.title, listing.category);

  return (
    <div 
      onClick={() => onInspect(listing)}
      className={cn(
        "cursor-pointer transition-all duration-300 rounded-3xl p-5 sm:p-6 border shadow-sm hover:shadow-md flex flex-col justify-between gap-4 group relative overflow-hidden select-none",
        bgTint
      )}
    >
      {/* Top Row: Large Unboxed Product Graphic + Flag/ISO Badge + Interactive Buttons */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: Product Graphic + Country ISO Badge */}
        <div className="flex items-center gap-3">
          <div className="h-16 sm:h-20 w-24 sm:w-28 flex items-center justify-center shrink-0 pointer-events-none">
            <img 
              src={productImage}
              alt={listing.title}
              className="h-full w-full object-contain filter drop-shadow-md group-hover:scale-110 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3174/3174880.png";
              }}
            />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-slate-200/80 shadow-2xs">
            <img 
              src={`https://flagcdn.com/w40/${getCountryIso2(listing.exporterCountry)}.png`}
              alt={listing.exporterCountry}
              className="w-4 h-3 object-cover rounded-xs shadow-2xs shrink-0"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
            <span className="text-[11px] font-mono font-black text-slate-700 uppercase tracking-widest">
              {getCountryIso3(listing.exporterCountry)}
            </span>
          </div>
        </div>

        {/* Right: Evident Interactive Heart & Tick buttons */}
        <div className="flex items-center gap-2">
          {/* Wishlist Heart Button (Lighter by default, solid RED when active, click again to unselect) */}
          <button 
            type="button"
            onClick={(e) => { 
              e.stopPropagation(); 
              const nextState = !isWishlisted;
              setIsWishlisted(nextState);
              if (nextState) {
                toast.success(`Saved ${listing.exporterName} to Wishlist`, { icon: "❤️" });
              } else {
                toast.info(`Removed from Wishlist`);
              }
            }} 
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center border transition-all shadow-2xs cursor-pointer",
              isWishlisted
                ? "bg-rose-500 border-rose-600 text-white shadow-rose-200"
                : "bg-rose-500/10 border-rose-200/60 text-rose-500 hover:bg-rose-500/20"
            )}
            title={isWishlisted ? "In Wishlist (Click to remove)" : "Add to Wishlist"}
          >
            <Heart className={cn("w-4 h-4 transition-all", isWishlisted ? "fill-white text-white" : "fill-rose-500/20 text-rose-500")} />
          </button>

          {/* Check / Select Button (Lighter green by default, solid GREEN when active, click again to unselect) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const nextState = !isSelected;
              setIsSelected(nextState);
              if (nextState) {
                toast.success(`Selected ${listing.exporterName} for Trade`, { icon: "✅" });
              } else {
                toast.info(`Unselected ${listing.exporterName}`);
              }
              onInspect(listing);
            }}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center border transition-all shadow-2xs cursor-pointer",
              isSelected
                ? "bg-emerald-600 border-emerald-700 text-white shadow-emerald-200"
                : "bg-emerald-500/10 border-emerald-200/60 text-emerald-600 hover:bg-emerald-500/20"
            )}
            title={isSelected ? "Selected (Click to unselect)" : "Select Trader"}
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* Middle: Trader Name & Product Subtitle */}
      <div className="mt-1 space-y-1 flex-1">
        <h3 className="text-xl font-display font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1 leading-snug">
          {listing.exporterName}
        </h3>
        <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
          {listing.title}
        </p>
      </div>

      {/* Bottom: Price & Huge Bold Match Score */}
      <div className="flex items-end justify-between mt-2 pt-3 border-t border-slate-200/60">
        <div>
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">PRICE</span>
          <span className="text-lg font-black font-mono text-slate-900 mt-0.5 block">
            ${listing.unitPriceUSD.toFixed(2)}
            <span className="text-xs font-sans text-slate-500 font-medium">/{listing.unit}</span>
          </span>
        </div>

        {/* Huge Bold Match Score Display (Un-cluttered and ultra-visible) */}
        <div className="text-right shrink-0">
          <span className="text-[9px] font-mono font-black uppercase tracking-widest text-slate-400 block mb-0.5">MATCH</span>
          <span className={cn("text-3xl sm:text-4xl font-black font-mono tracking-tighter leading-none", scoreTextColor)}>
            {matchScore}%
          </span>
        </div>
      </div>
    </div>
  );
};

export const DiscoverPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { listings } = useWorkspace();

  const activeListings = listings;

  // Filters State
  const [filterProduct, setFilterProduct] = useState("");
  const [filterQty, setFilterQty] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const [inspectListing, setInspectListing] = useState<Listing | null>(null);
  const [requestListing, setRequestListing] = useState<Listing | null>(null);

  // Extract clean unique product list for the product dropdown
  const productOptions = useMemo(() => {
    const set = new Set<string>();
    activeListings.forEach((l) => {
      if (l.title) set.add(l.title);
    });
    return Array.from(set);
  }, [activeListings]);

  // Execute Search / Fetch (forces API refresh if needed)
  const handleFetchList = () => {
    aiService.semanticMatch(filterProduct || "Basmati Rice", undefined, parseFloat(filterQty) || 1000, "IND", 100630).catch(() => {});
  };

  // Initial load API execution
  useEffect(() => {
    n8nWorkflowService.checkHealth().catch(() => {});
    aiService.semanticMatch("Basmati Rice", undefined, 1000, "IND", 100630).catch(() => {});
  }, []);

  // Derived filtered items
  const filteredListings = useMemo(() => {
    return activeListings.filter((l) => {
      const q = filterProduct.toLowerCase().trim();
      const p = parseFloat(filterQty);
      const minP = parseFloat(minPrice);
      const maxP = parseFloat(maxPrice);

      if (q && !l.title.toLowerCase().includes(q) && !l.exporterName.toLowerCase().includes(q) && !l.category.toLowerCase().includes(q)) return false;
      if (filterCountry && l.exporterCountry !== filterCountry) return false;
      if (!isNaN(p) && p > 0 && l.availableQuantity < p) return false;
      if (!isNaN(minP) && l.unitPriceUSD < minP) return false;
      if (!isNaN(maxP) && l.unitPriceUSD > maxP) return false;
      
      return true;
    });
  }, [activeListings, filterProduct, filterQty, filterCountry, minPrice, maxPrice]);

  // Helper to prevent negative numbers
  const handleNonNegativeChange = (setter: (val: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      setter("");
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setter(val);
    }
  };

  const preventNegativeKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "-" || e.key === "e" || e.key === "E") {
      e.preventDefault();
    }
    if (e.key === "Enter") {
      handleFetchList();
    }
  };

  return (
    <AppShell maxWidth="full" hideRail={true}>
      <div className="w-full min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8 selection:bg-emerald-100">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
            <div>
              <h1 className="text-3xl sm:text-4xl font-display font-black text-slate-900 tracking-tight">Marketplace</h1>
              <p className="text-sm text-slate-500 mt-2 font-medium">
                Discover and connect with verified global traders.
              </p>
            </div>
          </div>

          <>
              {/* Full-width Filter Control with Product Dropdown & Icon-Only Green Search Button */}
              <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-3 w-full">
                
                {/* Product Dropdown */}
                <div className="flex-1 w-full">
                  <select 
                    value={filterProduct} 
                    onChange={e => setFilterProduct(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all cursor-pointer truncate"
                  >
                    <option value="">All Products</option>
                    {productOptions.map((prod) => (
                      <option key={prod} value={prod}>{prod}</option>
                    ))}
                  </select>
                </div>

                {/* Quantity (Non-negative) */}
                <div className="w-full md:w-[130px]">
                  <input 
                    type="number" 
                    min="0"
                    placeholder="Qty (kg)" 
                    value={filterQty} 
                    onKeyDown={preventNegativeKeys}
                    onChange={handleNonNegativeChange(setFilterQty)} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all" 
                  />
                </div>

                {/* Country Dropdown */}
                <div className="w-full md:w-[170px]">
                  <select 
                    value={filterCountry} 
                    onChange={e => setFilterCountry(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all cursor-pointer"
                  >
                    <option value="">Any Country</option>
                    <option value="India">IND</option>
                    <option value="United States">USA</option>
                    <option value="Germany">DEU</option>
                    <option value="Netherlands">NLD</option>
                    <option value="Singapore">SGP</option>
                    <option value="Australia">AUS</option>
                    <option value="Canada">CAN</option>
                    <option value="Brazil">BRA</option>
                    <option value="Egypt">EGY</option>
                    <option value="Chile">CHL</option>
                    <option value="UAE">ARE</option>
                  </select>
                </div>

                {/* Price Min / Max (Non-negative) */}
                <div className="flex items-center gap-1.5 w-full md:w-[220px] bg-slate-50 border border-slate-100 rounded-xl px-2">
                  <input 
                    type="number" 
                    min="0"
                    placeholder="Min $" 
                    value={minPrice} 
                    onKeyDown={preventNegativeKeys}
                    onChange={handleNonNegativeChange(setMinPrice)} 
                    className="w-full px-2 py-3 bg-transparent text-sm font-medium text-slate-800 focus:outline-none text-center" 
                  />
                  <span className="text-slate-300 font-bold">-</span>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="Max $" 
                    value={maxPrice} 
                    onKeyDown={preventNegativeKeys}
                    onChange={handleNonNegativeChange(setMaxPrice)} 
                    className="w-full px-2 py-3 bg-transparent text-sm font-medium text-slate-800 focus:outline-none text-center" 
                  />
                </div>

                {/* Icon-Only Green Search Button */}
                <button
                  type="button"
                  onClick={handleFetchList}
                  title="Search / Fetch Traders"
                  className="w-full md:w-auto h-[46px] px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold flex items-center justify-center transition-all shadow-sm shrink-0 cursor-pointer"
                >
                  <Search className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Trader Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
                {filteredListings.length > 0 ? (
                  filteredListings.map(listing => (
                    <TraderCard 
                      key={listing.id} 
                      listing={listing} 
                      onInspect={setInspectListing} 
                      onRequest={setRequestListing} 
                    />
                  ))
                ) : (
                  <div className="col-span-full py-16 text-center text-slate-400 font-medium bg-white rounded-3xl border border-slate-100 border-dashed">
                    No traders found matching your criteria. Try adjusting the filters and clicking Fetch.
                  </div>
                )}
              </div>
          </>
        </div>

        <ListingDetailDrawer 
          isOpen={!!inspectListing} 
          onClose={() => setInspectListing(null)} 
          listing={inspectListing} 
        />

        <CreateTradeRequestDrawer 
          isOpen={!!requestListing} 
          onClose={() => setRequestListing(null)} 
          listing={requestListing} 
        />
      </div>
    </AppShell>
  );
};

export default DiscoverPage;
