import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import SpecularButton from "@/components/ui/SpecularButton";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ArrowRight, Heart } from "lucide-react";
import { toast } from "sonner";

interface DemoTrade {
  id: string;
  title: string;
  category: string;
  image: string;
  originCountry: string;
  originFlag: string;
  destCountry: string;
  destFlag: string;
  supplierName: string;
  buyerName: string;
  quantity: string;
  unitPrice: number;
  totalAmount: number;
  status: "Requested" | "Confirmed" | "In Progress" | "Done";
  timeAgo: string;
  isWishlisted?: boolean;
}

const INITIAL_TRADES: DemoTrade[] = [
  {
    id: "TRD-2026-89412",
    title: "1121 Steam Extra Long Grain Basmati Rice",
    category: "Agriculture",
    image: "https://pngimg.com/uploads/rice/rice_PNG13.png",
    originCountry: "India",
    originFlag: "in",
    destCountry: "UAE",
    destFlag: "ae",
    supplierName: "Acme Exports Ltd",
    buyerName: "Demo Exports Pvt Ltd",
    quantity: "600 tonnes",
    unitPrice: 1100,
    totalAmount: 681600,
    status: "Confirmed",
    timeAgo: "Updated 10m ago",
    isWishlisted: true,
  },
  {
    id: "TRD-2026-74910",
    title: "Tellicherry Black Pepper TGSEB High Essential Oil",
    category: "Spices",
    image: "https://pngimg.com/uploads/black_pepper/black_pepper_PNG20.png",
    originCountry: "India",
    originFlag: "in",
    destCountry: "United States",
    destFlag: "us",
    supplierName: "Malabar Spice Co.",
    buyerName: "Demo Exports Pvt Ltd",
    quantity: "250 tonnes",
    unitPrice: 6200,
    totalAmount: 1559000,
    status: "Requested",
    timeAgo: "Requested 2h ago",
    isWishlisted: true,
  },
  {
    id: "TRD-2026-61204",
    title: "Organic Salem Turmeric Finger (Curcumin 4.5%+)",
    category: "Spices",
    image: "https://pngimg.com/uploads/turmeric/turmeric_PNG8.png",
    originCountry: "India",
    originFlag: "in",
    destCountry: "Netherlands",
    destFlag: "nl",
    supplierName: "Salem Agri Global",
    buyerName: "Demo Exports Pvt Ltd",
    quantity: "400 tonnes",
    unitPrice: 1850,
    totalAmount: 754400,
    status: "In Progress",
    timeAgo: "Updated Aug 20, 2026",
    isWishlisted: false,
  },
  {
    id: "TRD-2026-50119",
    title: "Sannam S4 Dry Red Chili Whole Stemless",
    category: "Spices",
    image: "https://pngimg.com/uploads/chilli/chilli_PNG15.png",
    originCountry: "India",
    originFlag: "in",
    destCountry: "Singapore",
    destFlag: "sg",
    supplierName: "Guntur Chili Traders",
    buyerName: "Demo Exports Pvt Ltd",
    quantity: "150 tonnes",
    unitPrice: 2400,
    totalAmount: 365400,
    status: "Done",
    timeAgo: "Completed Aug 14, 2026",
    isWishlisted: true,
  },
  {
    id: "TRD-2026-42091",
    title: "Assam Orthodox Black Tea Grade FTGFOP1",
    category: "Beverages",
    image: "https://pngimg.com/uploads/tea/tea_PNG16.png",
    originCountry: "India",
    originFlag: "in",
    destCountry: "Germany",
    destFlag: "de",
    supplierName: "Assam Heritage Teas",
    buyerName: "Demo Exports Pvt Ltd",
    quantity: "100 tonnes",
    unitPrice: 4200,
    totalAmount: 423600,
    status: "Done",
    timeAgo: "Completed Aug 02, 2026",
    isWishlisted: false,
  },
];

type FilterTab = "All" | "Wishlist" | "Requested" | "Confirmed" | "In Progress" | "Done";

export const TradesIndexPage: React.FC = () => {
  const { user, hasUnreadTradeUpdates } = useWorkspace();
  const [trades, setTrades] = useState<DemoTrade[]>(INITIAL_TRADES);
  const [activeTab, setActiveTab] = useState<FilterTab>("All");

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTrades((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextState = !t.isWishlisted;
          if (nextState) {
            toast.success(`Saved "${t.title}" to Wishlist`, { icon: "❤️" });
          } else {
            toast.info(`Removed "${t.title}" from Wishlist`);
          }
          return { ...t, isWishlisted: nextState };
        }
        return t;
      })
    );
  };

  const filteredTrades = trades.filter((t) => {
    if (activeTab === "All") return true;
    if (activeTab === "Wishlist") return t.isWishlisted;
    return t.status === activeTab;
  });

  const getStatusBadgeStyle = (status: DemoTrade["status"]) => {
    switch (status) {
      case "Requested":
        return "bg-amber-50 text-amber-800 border-amber-200/90";
      case "Confirmed":
        return "bg-sky-50 text-sky-800 border-sky-200/90";
      case "In Progress":
        return "bg-indigo-50 text-indigo-800 border-indigo-200/90";
      case "Done":
        return "bg-emerald-50 text-emerald-800 border-emerald-200/90";
    }
  };

  const getCtaText = (status: DemoTrade["status"]) => {
    switch (status) {
      case "Requested":
        return "View Request";
      case "Confirmed":
        return "View Trade";
      case "In Progress":
        return "Track Trade";
      case "Done":
        return "View Trade";
    }
  };

  return (
    <AppShell maxWidth="lg">
      <div className="space-y-6 select-none font-sans">
        
        {/* Page Header */}
        <PageHeader
          breadcrumbs={[{ label: "Dashboard", href: "/home" }, { label: "Trades" }]}
          title="All Trades"
          subtitle="View all your requested, confirmed, in-progress, completed, and wishlisted trades."
        />

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto">
          {(["All", "Wishlist", "Requested", "Confirmed", "In Progress", "Done"] as FilterTab[]).map((tab) => {
            const count = trades.filter((t) => {
              if (tab === "All") return true;
              if (tab === "Wishlist") return t.isWishlisted;
              return t.status === tab;
            }).length;

            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100/80 hover:bg-slate-200/80 text-slate-600"
                }`}
              >
                {tab === "Wishlist" ? (
                  <span className="flex items-center gap-1">
                    <Heart className={`w-3.5 h-3.5 ${isActive ? "fill-rose-400 text-rose-400" : "fill-rose-500 text-rose-500"}`} />
                    <span>Wishlist</span>
                  </span>
                ) : tab === "In Progress" ? (
                  <span className="flex items-center gap-1.5">
                    <span>In Progress</span>
                    {hasUnreadTradeUpdates && (
                      <span className="flex h-2 w-2 relative shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    )}
                  </span>
                ) : (
                  <span>{tab === "All" ? "All Trades" : tab}</span>
                )}
                
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Minimal Trades List */}
        <div className="space-y-3">
          {filteredTrades.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200/80 rounded-3xl space-y-3">
              <Heart className="w-10 h-10 text-rose-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">No Wishlisted Trades Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Click the heart icon on any trade card to save it to your Wishlist.
              </p>
            </div>
          ) : (
            filteredTrades.map((trade) => (
              <motion.div
                key={trade.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden"
              >
                {/* Product Image & Details */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Product Image */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-50 border border-slate-200/80 p-2 flex items-center justify-center shrink-0 relative">
                    <img
                      src={trade.image}
                      alt={trade.title}
                      className="w-full h-full object-contain filter drop-shadow-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://cdn-icons-png.flaticon.com/512/3174/3174880.png";
                      }}
                    />
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    {/* Status Badge + Notification Banner + Requested/Updated Time */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${getStatusBadgeStyle(trade.status)}`}>
                        {trade.status}
                      </span>

                      {/* Subtly show REQUEST SENT → WAITING FOR SELLER for Requested status */}
                      {trade.status === "Requested" && (
                        <span className="text-[10px] font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md uppercase tracking-wide">
                          Request Sent → Waiting for Seller
                        </span>
                      )}

                      {/* Notification banner for In Progress trade status update (e.g. Counteroffer / Accepted / Declined) */}
                      {trade.status === "In Progress" && hasUnreadTradeUpdates && (
                        <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-wide flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          <span>Counter-offer Received • Action Needed</span>
                        </span>
                      )}

                      <span className="text-[11px] text-slate-400 font-medium">{trade.timeAgo}</span>
                    </div>

                    {/* Product Name + Wishlist Heart Button */}
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-slate-900 truncate">
                        {trade.title}
                      </h3>

                      {/* Heart Button */}
                      <button
                        type="button"
                        onClick={(e) => toggleWishlist(trade.id, e)}
                        className={`p-1.5 rounded-full border transition-all cursor-pointer shrink-0 ${
                          trade.isWishlisted
                            ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                        }`}
                        title={trade.isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                      >
                        <Heart className={`w-4 h-4 ${trade.isWishlisted ? "fill-rose-600" : ""}`} />
                      </button>
                    </div>

                    {/* Country Flags + Route & Trader/Company + Quantity */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium flex-wrap">
                      <span className="flex items-center gap-1.5 text-slate-800 font-semibold">
                        <img src={`https://flagcdn.com/w40/${trade.originFlag}.png`} className="w-4 h-3 object-cover rounded-xs" />
                        <span>{trade.originCountry}</span>
                        <span>➔</span>
                        <img src={`https://flagcdn.com/w40/${trade.destFlag}.png`} className="w-4 h-3 object-cover rounded-xs" />
                        <span>{trade.destCountry}</span>
                      </span>
                      <span>•</span>
                      <span className="text-slate-700">{trade.supplierName}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-800">{trade.quantity}</span>
                    </div>
                  </div>
                </div>

                {/* Price & Action CTA */}
                <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL VALUE</div>
                    <div className="text-lg font-black text-slate-900 font-sans">
                      ${trade.totalAmount.toLocaleString()}
                    </div>
                  </div>

                  <Link to={trade.status === "Requested" ? `/requests?listingId=lst-demo-101` : `/trades/${trade.id}`}>
                    <SpecularButton
                      size="sm"
                      radius={12}
                      variant={trade.status === "Requested" ? "secondary" : "emerald"}
                      className="px-4 py-2 font-bold text-xs font-sans group-hover:shadow-md"
                      icon={<ChevronRight className="w-4 h-4" />}
                      iconPosition="right"
                    >
                      {getCtaText(trade.status)}
                    </SpecularButton>
                  </Link>
                </div>
              </motion.div>
            ))
          )}
        </div>

      </div>
    </AppShell>
  );
};

export default TradesIndexPage;
