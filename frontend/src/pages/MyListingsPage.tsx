import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useWorkspace } from "@/context/WorkspaceContext";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/common/PageHeader";
import { MetricStrip } from "@/components/common/MetricStrip";
import { FilterBar } from "@/components/common/FilterBar";
import SpecularButton from "@/components/ui/SpecularButton";
import LineSidebar from "@/components/ui/LineSidebar";
import {
  PlusCircle,
  DollarSign,
  Boxes,
  Globe2,
  Award,
  Trash2,
  ArrowUpRight,
  X,
  Info,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface OrganizationExportProduct {
  id: string;
  title: string;
  category: string;
  hsCode: string;
  unitPriceUSD: number;
  unit: string;
  availableStock: number;
  minOrderQty: number;
  originPort: string;
  certifications: string[];
  status: "active" | "low_stock" | "paused";
  inquiriesCount: number;
  topInquiry: string;
}

const DEMO_ORG_PRODUCTS: OrganizationExportProduct[] = [
  {
    id: "org_prod_01",
    title: "1121 Steam Extra Long Grain Aged Basmati Rice",
    category: "Agriculture",
    hsCode: "1006.30.20",
    unitPriceUSD: 1100,
    unit: "MT",
    availableStock: 2500,
    minOrderQty: 100,
    originPort: "JNPT Nhava Sheva (INNSA)",
    certifications: ["ISO 22000", "APEDA", "FSSAI", "Halal"],
    status: "active",
    inquiriesCount: 5,
    topInquiry: "Example Global Trading Ltd. (Dubai) requested 500 MT quote",
  },
  {
    id: "org_prod_02",
    title: "Traditional Sugandha White Sella Basmati Rice",
    category: "Agriculture",
    hsCode: "1006.30.10",
    unitPriceUSD: 940,
    unit: "MT",
    availableStock: 1800,
    minOrderQty: 80,
    originPort: "Mundra Port (INMUN)",
    certifications: ["APEDA", "FSSAI", "Global G.A.P."],
    status: "active",
    inquiriesCount: 3,
    topInquiry: "Jeddah Food Merchants requested 200 MT CIF",
  },
  {
    id: "org_prod_03",
    title: "Organic Durum Wheat Grain Milling Grade-A",
    category: "Agriculture",
    hsCode: "1001.19.00",
    unitPriceUSD: 360,
    unit: "MT",
    availableStock: 4200,
    minOrderQty: 250,
    originPort: "Kandla Port (INIXY)",
    certifications: ["NPOP Organic", "USDA Organic", "ISO 9001"],
    status: "active",
    inquiriesCount: 4,
    topInquiry: "Bremen Mills Germany requested sample inspection",
  },
  {
    id: "org_prod_04",
    title: "Non-Basmati PR-11 Raw White Rice (5% Broken)",
    category: "Agriculture",
    hsCode: "1006.30.90",
    unitPriceUSD: 520,
    unit: "MT",
    availableStock: 800,
    minOrderQty: 150,
    originPort: "Kakinada Deepwater Port (INKAK)",
    certifications: ["FSSAI", "ISO 22000"],
    status: "low_stock",
    inquiriesCount: 2,
    topInquiry: "Abidjan Grains Consortium inquiry pending",
  },
  {
    id: "org_prod_05",
    title: "Cold-Pressed Mustard Oil (Kachi Ghani Grade)",
    category: "Agriculture",
    hsCode: "1514.91.00",
    unitPriceUSD: 1450,
    unit: "MT",
    availableStock: 650,
    minOrderQty: 25,
    originPort: "JNPT Nhava Sheva (INNSA)",
    certifications: ["AGMARK Grade 1", "FSSAI", "ISO 22000"],
    status: "active",
    inquiriesCount: 2,
    topInquiry: "UK Indian Grocery Wholesalers FOB inquiry",
  },
];

const CATEGORIES = ["All Commodities", "Agriculture", "Spices", "Textiles", "Chemicals"];

export const MyListingsPage: React.FC = () => {
  const { user } = useWorkspace();
  const [products, setProducts] = useState<OrganizationExportProduct[]>(DEMO_ORG_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState<string>("All Commodities");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Add Product Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Agriculture");
  const [newHsCode, setNewHsCode] = useState("1006.30");
  const [newPrice, setNewPrice] = useState(1200);
  const [newUnit, setNewUnit] = useState("MT");
  const [newStock, setNewStock] = useState(1000);
  const [newMinOrder, setNewMinOrder] = useState(50);
  const [newPort, setNewPort] = useState("JNPT Nhava Sheva (INNSA)");
  const [newCerts, setNewCerts] = useState("APEDA, FSSAI, ISO 22000");

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === "All Commodities" || p.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      q === "" ||
      p.title.toLowerCase().includes(q) ||
      p.hsCode.includes(q) ||
      p.originPort.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const created: OrganizationExportProduct = {
      id: `org_prod_${Date.now()}`,
      title: newTitle || "Export Commodity Batch",
      category: newCategory,
      hsCode: newHsCode || "1006.30.20",
      unitPriceUSD: Number(newPrice) || 1000,
      unit: newUnit,
      availableStock: Number(newStock) || 500,
      minOrderQty: Number(newMinOrder) || 50,
      originPort: newPort || "JNPT Nhava Sheva (INNSA)",
      certifications: newCerts.split(",").map((c) => c.trim()),
      status: "active",
      inquiriesCount: 1,
      topInquiry: "Published to Global Exporter Marketplace. Awaiting buyer matching.",
    };

    setProducts((prev) => [created, ...prev]);
    setShowAddModal(false);
    setNewTitle("");
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <AppShell maxWidth="full" className="space-y-5">
      {/* ── Page Header (Section 12: No redundant breadcrumb hierarchy) ── */}
      <PageHeader
            title="Organization Export Catalog"
            subtitle={`Active export listings, available inventory stock, and international buyer inquiries for ${user.companyName}.`}
            badge={
              <span className="text-xs font-mono text-slate-400">
                {products.length} active listings
              </span>
            }
            action={
              <div className="flex items-center gap-2">
                <Link to="/trade-requests?duty=export">
                  <SpecularButton
                    variant="outline"
                    size="sm"
                    radius={10}
                  >
                    View Inbound RFQs →
                  </SpecularButton>
                </Link>

                <SpecularButton
                  onClick={() => setShowAddModal(true)}
                  icon={<PlusCircle className="w-4 h-4" />}
                  iconPosition="left"
                  size="sm"
                  radius={10}
                >
                  Add Export Product
                </SpecularButton>
              </div>
            }
          />

      {/* ── Demo Data Notice ─────────────────────────────────────────── */}
      <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 flex items-center gap-2 text-amber-300 text-[11px] font-mono">
        <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50 font-bold shrink-0">
          DEMO DATA — NOT LIVE
        </span>
        <span>These export listings are illustrative sample data — not yet connected to your organization's real catalogue.</span>
      </div>

          {/* ── Large Business Numbers / Compact Metric Strip ──────────────── */}
          <MetricStrip
            columns={4}
            metrics={[
              {
                label: "Catalog Valuation",
                value: "$5.48M FOB",
                subtext: `Across ${products.length} verified listings`,
                icon: DollarSign,
                accentColor: "emerald",
              },
              {
                label: "Available Stock",
                value: "9,950 MT",
                subtext: "Staged for port dispatch",
                icon: Boxes,
                accentColor: "slate",
              },
              {
                label: "Active Inquiries",
                value: "16 Quotes",
                subtext: "UAE, Saudi, Germany",
                icon: Globe2,
                accentColor: "sky",
              },
              {
                label: "Export Compliance",
                value: "100% Passed",
                subtext: "APEDA, FSSAI & COO",
                icon: Award,
                accentColor: "emerald",
              },
            ]}
          />

          {/* ── Filter Bar & Search ─────────────────────────────────────────── */}
          <FilterBar
            categories={CATEGORIES}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search catalog by title, port, HS code..."
          />

          {/* ── Compact Entity List Rows ───────────────────────────────────── */}
          <div className="space-y-2.5">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-[#0C121D] border border-white/[0.07] hover:border-white/[0.14] transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 group"
              >
                {/* Product Info */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-display font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {prod.title}
                    </h3>
                    
                    {/* Level B Info Popover */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 cursor-pointer"
                          aria-label="Product specification details"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="top"
                        align="start"
                        className="w-64 p-3 bg-[#0C121D] border border-white/[0.1] text-xs space-y-1.5 text-slate-300 shadow-xl rounded-xl"
                      >
                        <div className="font-display font-semibold text-white text-xs border-b border-white/[0.06] pb-1">
                          HS {prod.hsCode} · {prod.category}
                        </div>
                        <div className="text-[11px] font-mono space-y-1 text-slate-300">
                          <div>Origin Port: <span className="text-white">{prod.originPort}</span></div>
                          <div>Certifications: <span className="text-emerald-400">{prod.certifications.join(", ")}</span></div>
                          <div>Top Inquiry: <span className="text-sky-300">{prod.topInquiry}</span></div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="text-xs text-slate-400 font-sans flex items-center gap-1.5">
                    <span>{prod.category}</span>
                    <span>·</span>
                    <span className="text-slate-500 font-mono">HS {prod.hsCode}</span>
                  </div>
                </div>

                {/* Price, Stock & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/[0.04]">
                  <div className="text-left md:text-right">
                    <div className="text-sm sm:text-base font-mono font-bold text-white">
                      ${prod.unitPriceUSD.toLocaleString()}{" "}
                      <span className="text-xs font-sans text-slate-400 font-normal">
                        / {prod.unit}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      Stock: {prod.availableStock.toLocaleString()} {prod.unit} (MOQ: {prod.minOrderQty})
                    </div>
                  </div>

                  {/* Inquiries & Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      to="/trade-requests?duty=export"
                      className="flex items-center gap-1 text-xs font-sans text-sky-400 hover:text-sky-300 bg-sky-950/40 border border-sky-500/30 px-2.5 py-1.5 rounded-xl transition-colors font-medium"
                    >
                      <span>{prod.inquiriesCount} Inquiries</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(prod.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/[0.04] transition-colors cursor-pointer"
                      title="Remove product listing"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredProducts.length === 0 && (
              <div className="p-12 text-center rounded-2xl border border-dashed border-white/[0.08] bg-[#0C121D] space-y-2">
                <p className="text-xs text-slate-400">No export listings match the selected filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("All Commodities");
                    setSearchQuery("");
                  }}
                  className="text-xs text-emerald-400 hover:underline font-mono cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>

          {/* ── Add Product Modal ────────────────────────────────────────────── */}
          {showAddModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-lg p-6 rounded-3xl bg-[#0C121D] border border-white/[0.12] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                
                <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
                  <h3 className="font-display font-bold text-white text-base">
                    Add Product to Export Catalog
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="p-1 rounded-lg text-slate-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddProduct} className="space-y-3.5 text-xs font-sans">
                  <div className="space-y-1">
                    <label className="text-slate-300">Commodity Title</label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Sona Masoori Raw Rice 100% Sortexed"
                      className="w-full p-2.5 rounded-xl bg-[#070A0E] border border-white/[0.08] text-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-300">Category</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-[#070A0E] border border-white/[0.08] text-white outline-none cursor-pointer"
                      >
                        <option value="Agriculture">Agriculture</option>
                        <option value="Spices">Spices</option>
                        <option value="Textiles">Textiles</option>
                        <option value="Chemicals">Chemicals</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-300">HS Code</label>
                      <input
                        type="text"
                        required
                        value={newHsCode}
                        onChange={(e) => setNewHsCode(e.target.value)}
                        placeholder="1006.30.20"
                        className="w-full p-2.5 rounded-xl bg-[#070A0E] border border-white/[0.08] text-white outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-300">Unit Price ($ USD)</label>
                      <input
                        type="number"
                        required
                        value={newPrice}
                        onChange={(e) => setNewPrice(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl bg-[#070A0E] border border-white/[0.08] text-white outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-300">Unit</label>
                      <input
                        type="text"
                        value={newUnit}
                        onChange={(e) => setNewUnit(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-[#070A0E] border border-white/[0.08] text-white outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-300">Stock (MT)</label>
                      <input
                        type="number"
                        value={newStock}
                        onChange={(e) => setNewStock(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl bg-[#070A0E] border border-white/[0.08] text-white outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-300">Minimum Order Qty</label>
                      <input
                        type="number"
                        value={newMinOrder}
                        onChange={(e) => setNewMinOrder(Number(e.target.value))}
                        className="w-full p-2.5 rounded-xl bg-[#070A0E] border border-white/[0.08] text-white outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-300">Origin Port</label>
                      <input
                        type="text"
                        value={newPort}
                        onChange={(e) => setNewPort(e.target.value)}
                        className="w-full p-2.5 rounded-xl bg-[#070A0E] border border-white/[0.08] text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300">Certifications (comma separated)</label>
                    <input
                      type="text"
                      value={newCerts}
                      onChange={(e) => setNewCerts(e.target.value)}
                      placeholder="APEDA, FSSAI, ISO 22000"
                      className="w-full p-2.5 rounded-xl bg-[#070A0E] border border-white/[0.08] text-white outline-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <SpecularButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      radius={10}
                      onClick={() => setShowAddModal(false)}
                    >
                      Cancel
                    </SpecularButton>
                    <SpecularButton type="submit" size="sm" radius={10}>
                      Publish Listing
                    </SpecularButton>
                  </div>
                </form>

              </div>
            </div>
          )}
    </AppShell>
  );
};

export default MyListingsPage;
