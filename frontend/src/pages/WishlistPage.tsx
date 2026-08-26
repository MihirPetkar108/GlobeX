import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  Trash2,
  ArrowRight,
  Package,
  MapPin,
  Tag,
  TrendingUp,
  Star,
  ShieldCheck,
  Globe,
  Filter,
  SortAsc,
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";

const DEMO_WISHLIST_ITEMS = [
  {
    id: "WL-001",
    productName: "Tellicherry Black Pepper (Grade A)",
    origin: "India (Kochi)",
    destination: "Netherlands (Rotterdam)",
    hsCode: "HS 0904.11",
    category: "Spices & Condiments",
    valueUSD: 180000,
    quantity: "150 MT",
    unitPrice: "$1,200 / MT",
    seller: "Kerala Spice Exports Pvt. Ltd.",
    sellerRating: 4.8,
    sellerVerified: true,
    status: "available",
    cepaSaving: "0% (India-EU FTA)",
    addedOn: "2026-08-18",
    priceAlert: true,
    imageGradient: "from-amber-500 to-orange-600",
    marketplaceHref: "/marketplace/WL-001",
  },
  {
    id: "WL-002",
    productName: "Semi-Milled Basmati Rice 1121",
    origin: "India (JNPT)",
    destination: "UAE (Jebel Ali)",
    hsCode: "HS 1006.30",
    category: "Agri-Commodities",
    valueUSD: 550000,
    quantity: "500 MT",
    unitPrice: "$1,100 / MT",
    seller: "Punjab Agro International",
    sellerRating: 4.6,
    sellerVerified: true,
    status: "negotiating",
    cepaSaving: "0% CEPA (India-UAE)",
    addedOn: "2026-08-15",
    priceAlert: false,
    imageGradient: "from-yellow-400 to-amber-500",
    marketplaceHref: "/marketplace/WL-002",
  },
  {
    id: "WL-003",
    productName: "Combed Cotton Yarn (Ne 40s)",
    origin: "India (Surat)",
    destination: "Italy (Genoa Port)",
    hsCode: "HS 5205.12",
    category: "Textiles & Yarn",
    valueUSD: 880000,
    quantity: "300 MT",
    unitPrice: "$2,933 / MT",
    seller: "Surat Textile Mills Ltd.",
    sellerRating: 4.9,
    sellerVerified: true,
    status: "available",
    cepaSaving: "Eligible for GSP",
    addedOn: "2026-08-10",
    priceAlert: true,
    imageGradient: "from-sky-400 to-blue-600",
    marketplaceHref: "/marketplace/WL-003",
  },
  {
    id: "WL-004",
    productName: "Lithium Carbonate (Battery Grade 99.5%)",
    origin: "Chile (Valparaiso)",
    destination: "India (JNPT)",
    hsCode: "HS 2836.91",
    category: "Industrial Chemicals",
    valueUSD: 3200000,
    quantity: "200 MT",
    unitPrice: "$16,000 / MT",
    seller: "Atacama Minerals S.A.",
    sellerRating: 4.7,
    sellerVerified: true,
    status: "price_drop",
    cepaSaving: "MFN 5% — No FTA",
    addedOn: "2026-08-05",
    priceAlert: true,
    imageGradient: "from-violet-500 to-purple-700",
    marketplaceHref: "/marketplace/WL-004",
  },
  {
    id: "WL-005",
    productName: "Organic Hard Red Wheat (CWRS)",
    origin: "Canada (Vancouver)",
    destination: "India (Nhava Sheva)",
    hsCode: "HS 1001.19",
    category: "Agri-Commodities",
    valueUSD: 920000,
    quantity: "1,200 MT",
    unitPrice: "$767 / MT",
    seller: "Prairie Gold Grains Inc.",
    sellerRating: 4.5,
    sellerVerified: false,
    status: "available",
    cepaSaving: "MFN 10% — No FTA",
    addedOn: "2026-08-01",
    priceAlert: false,
    imageGradient: "from-green-500 to-emerald-600",
    marketplaceHref: "/marketplace/WL-005",
  },
];

const STATUS_CONFIG = {
  available: { label: "Available", icon: CheckCircle2, color: "text-slate-700 bg-slate-100 border-slate-300" },
  negotiating: { label: "In Negotiation", icon: Clock, color: "text-slate-600 bg-slate-100 border-slate-300" },
  price_drop: { label: "Price Dropped", icon: TrendingUp, color: "text-[#FF5500] bg-orange-50 border-orange-200" },
};

export const WishlistPage = () => {
  const [items, setItems] = useState(DEMO_WISHLIST_ITEMS);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "price_alert" | "available">("all");

  const handleRemove = (id: string) => {
    setRemovingId(id);
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
      setRemovingId(null);
    }, 300);
  };

  const filtered = items.filter((item) => {
    if (filter === "price_alert") return item.priceAlert;
    if (filter === "available") return item.status === "available";
    return true;
  });

  const totalValue = filtered.reduce((acc, i) => acc + i.valueUSD, 0);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Page Header */}
        <div className="p-6 sm:p-8 rounded-[30px] bg-white border border-slate-300 shadow-[0_10px_30px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center justify-between gap-5 select-none overflow-hidden">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] font-mono text-[#FF5500] font-black uppercase">
              <Heart className="w-3.5 h-3.5 fill-[#FF5500]" />
              <span>Trade Wishlist</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0A0F1D] tracking-tight uppercase leading-tight">
              Saved <span className="text-[#FF5500]">Products</span>
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              {items.length} products saved · Pipeline value{" "}
              <span className="text-[#FF5500] font-black">${(totalValue / 1_000_000).toFixed(1)}M</span>
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-3 rounded-2xl bg-[#E8EDF5] border border-slate-300 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.05),inset_-3px_-3px_6px_rgba(255,255,255,0.9)] text-center min-w-[72px]">
              <div className="text-lg font-black text-[#FF5500] font-mono">{items.length}</div>
              <div className="text-[9px] font-black text-slate-600 uppercase">Saved</div>
            </div>
            <div className="p-3 rounded-2xl bg-[#E8EDF5] border border-slate-300 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.05),inset_-3px_-3px_6px_rgba(255,255,255,0.9)] text-center min-w-[72px]">
              <div className="text-lg font-black text-slate-800 font-mono">{items.filter((i) => i.priceAlert).length}</div>
              <div className="text-[9px] font-black text-slate-600 uppercase">Alerts</div>
            </div>
            <div className="p-3 rounded-2xl bg-[#E8EDF5] border border-slate-300 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.05),inset_-3px_-3px_6px_rgba(255,255,255,0.9)] text-center min-w-[72px]">
              <div className="text-lg font-black text-slate-800 font-mono">{items.filter((i) => i.status === "price_drop").length}</div>
              <div className="text-[9px] font-black text-slate-600 uppercase">Drops</div>
            </div>
          </div>
        </div>

        {/* Demo Data Notice */}
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-300 flex items-center gap-2 text-amber-800 text-xs font-medium">
          <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 border border-amber-400 font-mono font-black text-[10px] shrink-0">
            DEMO DATA — NOT LIVE
          </span>
          <span>These wishlist items are illustrative sample data — not yet connected to your organization's real catalogue.</span>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between gap-2.5 pb-3">
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-[11px] font-mono font-black border bg-white border-slate-300 text-slate-700 shadow-[3px_5px_12px_rgba(0,0,0,0.05)]">
            <Filter className="w-3.5 h-3.5" />
            <span>All Items</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 font-bold">
            <SortAsc className="w-3.5 h-3.5" />
            <span>{filtered.length} results</span>
          </div>
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <div className="p-16 rounded-[30px] bg-white border border-slate-300 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-orange-100 border border-orange-300 flex items-center justify-center">
              <Heart className="w-8 h-8 text-[#FF5500]" />
            </div>
            <div>
              <p className="font-black text-[#0A0F1D] text-base">No items in this filter</p>
              <p className="text-xs text-slate-500 mt-1">Try switching to "All Items"</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => {
              const statusCfg = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];
              const StatusIcon = statusCfg.icon;
              const isRemoving = removingId === item.id;
              return (
                <div key={item.id}
                  className={cn(
                    "p-5 sm:p-6 rounded-[24px] bg-white border border-slate-300 shadow-[0_8px_20px_rgba(0,0,0,0.02)] transition-all duration-300 overflow-hidden",
                    isRemoving && "opacity-0 scale-95 translate-x-4"
                  )}
                >
                  <div className="flex flex-col sm:flex-row gap-5">
                    {/* Swatch — greyscale */}
                    <div className="w-full sm:w-16 h-14 sm:h-auto sm:min-h-[80px] rounded-2xl bg-[#E2E7F0] shrink-0 flex items-center justify-center border border-slate-300 shadow-[inset_2px_2px_6px_rgba(0,0,0,0.05)]">
                      <Package className="w-7 h-7 text-slate-500" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-3">
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-3 overflow-hidden">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[9px] font-mono font-black text-slate-500 bg-[#E8EDF5] px-2 py-0.5 rounded-full border border-slate-300">{item.hsCode}</span>
                            <span className="text-[9px] font-mono font-black text-slate-500 bg-[#E8EDF5] px-2 py-0.5 rounded-full border border-slate-300">{item.category}</span>
                            {item.priceAlert && (
                              <span className="text-[9px] font-mono font-black text-[#FF5500] bg-orange-100 px-2 py-0.5 rounded-full border border-orange-300 flex items-center gap-1">
                                <Bell className="w-2.5 h-2.5" /> Alert On
                              </span>
                            )}
                          </div>
                          <h2 className="mt-1.5 text-sm font-black text-[#0A0F1D] leading-tight truncate">{item.productName}</h2>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn("text-[9px] font-mono font-black px-2.5 py-1 rounded-full border flex items-center gap-1 whitespace-nowrap", statusCfg.color)}>
                            <StatusIcon className="w-2.5 h-2.5" />{statusCfg.label}
                          </span>
                          <button type="button" onClick={() => handleRemove(item.id)}
                            className="p-1.5 rounded-xl bg-[#E8EDF5] border border-slate-300 text-slate-500 hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-all cursor-pointer shadow-[2px_3px_6px_rgba(0,0,0,0.04)]"
                            aria-label="Remove from wishlist">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Meta grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="p-2.5 rounded-xl bg-[#E8EDF5] border border-slate-300/80 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.04),inset_-2px_-2px_4px_rgba(255,255,255,0.9)] overflow-hidden">
                          <div className="text-[8px] font-mono font-black text-slate-500 uppercase">Route</div>
                          <div className="text-[10px] font-black text-[#0A0F1D] flex items-center gap-1 mt-0.5 truncate">
                            <MapPin className="w-2.5 h-2.5 text-[#FF5500] shrink-0" /><span className="truncate">{item.origin}</span>
                          </div>
                          <div className="text-[9px] text-slate-500 font-bold truncate pl-3.5">{item.destination}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#E8EDF5] border border-slate-300/80 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.04),inset_-2px_-2px_4px_rgba(255,255,255,0.9)] overflow-hidden">
                          <div className="text-[8px] font-mono font-black text-slate-500 uppercase">Value</div>
                          <div className="text-sm font-black text-[#0A0F1D] font-mono mt-0.5 truncate">${(item.valueUSD / 1000).toFixed(0)}K</div>
                          <div className="text-[9px] text-slate-500 font-bold truncate">{item.quantity} · {item.unitPrice}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#E8EDF5] border border-slate-300/80 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.04),inset_-2px_-2px_4px_rgba(255,255,255,0.9)] overflow-hidden">
                          <div className="text-[8px] font-mono font-black text-slate-500 uppercase">Duty Saving</div>
                          <div className="text-[10px] font-black text-slate-800 mt-0.5 truncate">{item.cepaSaving}</div>
                          <div className="text-[9px] text-slate-500 font-bold truncate flex items-center gap-1"><Tag className="w-2.5 h-2.5 shrink-0" />{item.hsCode}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#E8EDF5] border border-slate-300/80 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.04),inset_-2px_-2px_4px_rgba(255,255,255,0.9)] overflow-hidden">
                          <div className="text-[8px] font-mono font-black text-slate-500 uppercase">Seller</div>
                          <div className="text-[10px] font-black text-[#0A0F1D] mt-0.5 truncate flex items-center gap-1">
                            {item.sellerVerified && <ShieldCheck className="w-2.5 h-2.5 text-slate-500 shrink-0" />}
                            <span className="truncate">{item.seller.split(" ").slice(0, 2).join(" ")}</span>
                          </div>
                          <div className="text-[9px] text-slate-600 font-black flex items-center gap-0.5 mt-0.5">
                            <Star className="w-2.5 h-2.5 fill-slate-400 text-slate-400" />{item.sellerRating}
                          </div>
                        </div>
                      </div>

                      {/* Action row */}
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 font-bold">
                          <Globe className="w-3 h-3" />Added {item.addedOn} · ID {item.id}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button type="button"
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#E8EDF5] border border-slate-300 text-[10px] font-mono font-black text-slate-700 hover:border-[#FF5500] hover:text-[#FF5500] transition-all cursor-pointer shadow-[3px_5px_10px_rgba(0,0,0,0.04)]">
                            <Bell className="w-3 h-3" />{item.priceAlert ? "Alert On" : "Set Alert"}
                          </button>
                          <Link to={item.marketplaceHref}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF5500] to-[#FF7700] text-white text-[10px] font-mono font-black shadow-[4px_6px_16px_rgba(255,85,0,0.35),inset_0_2px_3px_rgba(255,255,255,0.3)] hover:shadow-[6px_8px_20px_rgba(255,85,0,0.5)] transition-all whitespace-nowrap">
                            View Product<ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom CTA */}
        {items.length > 0 && (
          <div className="p-5 rounded-[24px] bg-white border border-slate-300 shadow-[8px_12px_28px_rgba(0,0,0,0.06)] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-sm font-black uppercase tracking-tight text-[#0A0F1D]">Ready to source?</p>
              <p className="text-[11px] font-mono text-slate-500">Initiate trade requests for all {items.length} saved products</p>
            </div>
            <Link to="/trade-requests"
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF5500] to-[#FF7700] text-white text-xs font-mono font-black shadow-[4px_6px_16px_rgba(255,85,0,0.3)] hover:scale-[1.02] transition-transform whitespace-nowrap shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />Start Trade Request
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default WishlistPage;
