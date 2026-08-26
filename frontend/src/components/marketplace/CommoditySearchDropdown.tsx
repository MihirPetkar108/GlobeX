import React, { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Package, Check, Sparkles, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommodityOption {
  hs6: number;
  hsCodeFormatted: string;
  name: string;
  category: "Agriculture" | "Spices" | "Textiles" | "Pharmaceuticals" | "Metals" | "Chemicals" | "Minerals" | "Electronics" | "Machinery" | "Automotive" | "Precious";
  description: string;
  commonUnits: string;
  typicalQty: number;
  aliases: string[];
}

export const COMMODITY_CATALOGUE: CommodityOption[] = [
  {
    hs6: 100630,
    hsCodeFormatted: "1006.30",
    name: "Basmati Rice",
    category: "Agriculture",
    description: "Semi-milled or wholly milled rice, polished or glazed (1121 Steam / Traditional Basmati)",
    commonUnits: "kg / MT",
    typicalQty: 1000,
    aliases: ["basmati", "rice", "1121 steam", "paddy", "chawal", "milled rice", "long grain"]
  },
  {
    hs6: 90411,
    hsCodeFormatted: "0904.11",
    name: "Black Pepper",
    category: "Spices",
    description: "Pepper of the genus Piper; neither crushed nor ground (Tellicherry Garbled TGSEB)",
    commonUnits: "kg / MT",
    typicalQty: 500,
    aliases: ["black pepper", "pepper", "kali mirch", "tellicherry", "piper", "spices"]
  },
  {
    hs6: 90240,
    hsCodeFormatted: "0902.40",
    name: "Black Tea / Green Tea",
    category: "Agriculture",
    description: "Black tea (fermented) and partly fermented tea (Darjeeling / Assam CTC)",
    commonUnits: "kg / MT",
    typicalQty: 1000,
    aliases: ["tea", "black tea", "green tea", "chai", "darjeeling", "assam", "fermented tea"]
  },
  {
    hs6: 90121,
    hsCodeFormatted: "0901.21",
    name: "Roasted Coffee Beans",
    category: "Agriculture",
    description: "Coffee, roasted, not decaffeinated (Monsooned Malabar AA Arabica / Robusta)",
    commonUnits: "kg / MT",
    typicalQty: 1000,
    aliases: ["coffee", "arabica", "robusta", "coffee beans", "monsooned malabar", "roasted coffee"]
  },
  {
    hs6: 120999,
    hsCodeFormatted: "1209.99",
    name: "Basil Seeds / Sowing Seeds",
    category: "Agriculture",
    description: "Seeds, fruit and spores of a kind used for sowing (Sabja / Medicinal Seeds)",
    commonUnits: "kg / MT",
    typicalQty: 500,
    aliases: ["basil", "seeds", "basil seeds", "sabja", "tukmaria", "medicinal seeds", "sowing seeds"]
  },
  {
    hs6: 30617,
    hsCodeFormatted: "0306.17",
    name: "Frozen Shrimps & Prawns",
    category: "Agriculture",
    description: "Frozen shrimps and prawns (Vannamei / Black Tiger Shrimp)",
    commonUnits: "kg / MT",
    typicalQty: 2000,
    aliases: ["shrimp", "shrimps", "prawn", "prawns", "vannamei", "black tiger", "seafood", "jhinga"]
  },
  {
    hs6: 520512,
    hsCodeFormatted: "5205.12",
    name: "Cotton Yarn (Ne 30s/40s)",
    category: "Textiles",
    description: "Single cotton yarn, of uncombed/combed fibres, measuring < 714.29 dtex",
    commonUnits: "kg / MT",
    typicalQty: 5000,
    aliases: ["cotton yarn", "cotton", "yarn", "textiles", "thread", "combed cotton", "ne 30"]
  },
  {
    hs6: 610910,
    hsCodeFormatted: "6109.10",
    name: "Cotton T-Shirts & Apparel",
    category: "Textiles",
    description: "T-shirts, singlets and other vests, knitted or crocheted, of cotton",
    commonUnits: "pcs / kg",
    typicalQty: 1000,
    aliases: ["t-shirt", "t-shirts", "tshirt", "apparel", "garments", "clothing", "cotton vests"]
  },
  {
    hs6: 620342,
    hsCodeFormatted: "6203.42",
    name: "Men's Cotton Trousers & Denim",
    category: "Textiles",
    description: "Men's or boys' trousers, bib and brace overalls, of cotton",
    commonUnits: "pcs / kg",
    typicalQty: 1000,
    aliases: ["trousers", "trouser", "pants", "jeans", "denim", "cotton trousers", "overalls"]
  },
  {
    hs6: 300490,
    hsCodeFormatted: "3004.90",
    name: "Medicaments & Formulations",
    category: "Pharmaceuticals",
    description: "Medicaments consisting of mixed or unmixed products for therapeutic uses",
    commonUnits: "kg / packs",
    typicalQty: 500,
    aliases: ["medicaments", "medicine", "pharma", "pharmaceuticals", "formulations", "drugs", "tablets"]
  },
  {
    hs6: 293339,
    hsCodeFormatted: "2933.39",
    name: "Active Pharmaceutical Ingredients (APIs)",
    category: "Pharmaceuticals",
    description: "Heterocyclic compounds with nitrogen hetero-atom(s) only (Bulk APIs)",
    commonUnits: "kg / MT",
    typicalQty: 500,
    aliases: ["api", "apis", "active pharmaceutical", "heterocyclic", "bulk drugs", "raw pharma"]
  },
  {
    hs6: 710239,
    hsCodeFormatted: "7102.39",
    name: "Cut & Polished Diamonds",
    category: "Precious",
    description: "Diamonds, non-industrial, worked, but not mounted or set",
    commonUnits: "carats / kg",
    typicalQty: 100,
    aliases: ["diamonds", "diamond", "cut diamonds", "polished diamonds", "gems", "heera"]
  },
  {
    hs6: 711319,
    hsCodeFormatted: "7113.19",
    name: "Gold & Precious Jewellery",
    category: "Precious",
    description: "Articles of jewellery and parts thereof, of precious metal other than silver",
    commonUnits: "kg / grams",
    typicalQty: 50,
    aliases: ["jewellery", "jewelry", "gold", "gold jewellery", "precious metal", "ornaments"]
  },
  {
    hs6: 690721,
    hsCodeFormatted: "6907.21",
    name: "Ceramic & Porcelain Tiles",
    category: "Minerals",
    description: "Ceramic flags and paving, hearth or wall tiles (Water absorption <= 0.5%)",
    commonUnits: "sqm / MT",
    typicalQty: 10000,
    aliases: ["tiles", "ceramic", "porcelain", "wall tiles", "floor tiles", "vitrified tiles"]
  },
  {
    hs6: 720839,
    hsCodeFormatted: "7208.39",
    name: "Hot-Rolled Steel Coils",
    category: "Metals",
    description: "Flat-rolled products of iron or non-alloy steel, hot-rolled, in coils",
    commonUnits: "MT",
    typicalQty: 25000,
    aliases: ["steel", "steel coils", "hot rolled steel", "flat rolled", "iron", "metal coils"]
  },
  {
    hs6: 730890,
    hsCodeFormatted: "7308.90",
    name: "Structural Steel & Towers",
    category: "Metals",
    description: "Structures and parts of structures of iron or steel (Infrastructure & Telecom Towers)",
    commonUnits: "MT",
    typicalQty: 10000,
    aliases: ["structures", "towers", "infrastructure steel", "telecom towers", "steel structures"]
  },
  {
    hs6: 760110,
    hsCodeFormatted: "7601.10",
    name: "Unwrought Aluminium Ingots",
    category: "Metals",
    description: "Aluminium, not alloyed, unwrought (Pure Aluminium Ingots & Billets)",
    commonUnits: "MT",
    typicalQty: 20000,
    aliases: ["aluminium", "aluminum", "unwrought aluminium", "aluminium ingots", "billets"]
  },
  {
    hs6: 854143,
    hsCodeFormatted: "8541.43",
    name: "Solar PV Cells & Modules",
    category: "Electronics",
    description: "Photovoltaic cells assembled in modules or made up into panels (Solar Panels)",
    commonUnits: "kW / pcs",
    typicalQty: 5000,
    aliases: ["solar", "solar panels", "photovoltaic", "pv modules", "solar cells", "renewable"]
  },
  {
    hs6: 851713,
    hsCodeFormatted: "8517.13",
    name: "Smartphones & Cellular Devices",
    category: "Electronics",
    description: "Smartphones for cellular networks or for other wireless networks",
    commonUnits: "pcs",
    typicalQty: 500,
    aliases: ["smartphones", "smartphone", "phones", "mobile phones", "cellular", "handsets"]
  },
  {
    hs6: 847130,
    hsCodeFormatted: "8471.30",
    name: "Laptops & Portable Computers",
    category: "Electronics",
    description: "Portable automatic data processing machines, weighing not more than 10 kg",
    commonUnits: "pcs",
    typicalQty: 200,
    aliases: ["laptops", "laptop", "computers", "notebooks", "tablets", "portable pcs"]
  },
  {
    hs6: 850440,
    hsCodeFormatted: "8504.40",
    name: "Inverters & Static Converters",
    category: "Electronics",
    description: "Static converters (Solar Inverters, Power Supplies, Semiconductor Rectifiers)",
    commonUnits: "pcs / units",
    typicalQty: 500,
    aliases: ["inverter", "inverters", "static converters", "power supplies", "rectifiers"]
  },
  {
    hs6: 151190,
    hsCodeFormatted: "1511.90",
    name: "RBD Palm Olein & Edible Oil",
    category: "Chemicals",
    description: "Palm oil and its fractions, refined but not chemically modified (RBD Palm Olein)",
    commonUnits: "MT / Litres",
    typicalQty: 5000,
    aliases: ["palm oil", "oil", "rbd", "edible oil", "palm olein", "vegetable oil"]
  },
  {
    hs6: 271019,
    hsCodeFormatted: "2710.19",
    name: "Diesel Fuel & Medium Petroleum Oils",
    category: "Chemicals",
    description: "Medium oils and preparations, of petroleum or bituminous minerals (Gas Oil / Diesel)",
    commonUnits: "MT / Barrels",
    typicalQty: 10000,
    aliases: ["diesel", "gas oil", "petroleum oil", "fuel", "refined petroleum", "medium oils"]
  },
  {
    hs6: 270900,
    hsCodeFormatted: "2709.00",
    name: "Crude Petroleum Oils",
    category: "Chemicals",
    description: "Petroleum oils and oils obtained from bituminous minerals, crude",
    commonUnits: "Barrels / MT",
    typicalQty: 20000,
    aliases: ["crude", "crude oil", "petroleum", "mineral oils", "unrefined crude"]
  },
  {
    hs6: 310520,
    hsCodeFormatted: "3105.20",
    name: "NPK Mineral & Chemical Fertilisers",
    category: "Chemicals",
    description: "Mineral or chemical fertilisers containing nitrogen, phosphorus and potassium",
    commonUnits: "MT",
    typicalQty: 10000,
    aliases: ["fertiliser", "fertilizer", "npk", "chemical fertiliser", "crop nutrients"]
  },
  {
    hs6: 390110,
    hsCodeFormatted: "3901.10",
    name: "Polyethylene Polymers (LDPE/LLDPE)",
    category: "Chemicals",
    description: "Polyethylene having a specific gravity of less than 0.94 (Plastics in primary forms)",
    commonUnits: "MT",
    typicalQty: 5000,
    aliases: ["plastics", "polyethylene", "ldpe", "lldpe", "polymers", "plastic granules"]
  },
  {
    hs6: 870322,
    hsCodeFormatted: "8703.22",
    name: "Motor Passenger Vehicles (1000-1500cc)",
    category: "Automotive",
    description: "Motor cars and vehicles for transport of persons (1000cc - 1500cc engines)",
    commonUnits: "units",
    typicalQty: 50,
    aliases: ["cars", "motor cars", "vehicles", "passenger cars", "automobiles", "sedans"]
  },
  {
    hs6: 870829,
    hsCodeFormatted: "8708.29",
    name: "Motor Vehicle Body Parts & Accessories",
    category: "Automotive",
    description: "Parts and accessories of bodies for motor vehicles (OEM stampings & assemblies)",
    commonUnits: "pcs / sets",
    typicalQty: 1000,
    aliases: ["auto parts", "motor parts", "vehicle accessories", "body parts", "car components"]
  },
  {
    hs6: 841199,
    hsCodeFormatted: "8411.99",
    name: "Gas Turbine & Turbo-Jet Parts",
    category: "Machinery",
    description: "Parts of turbo-jets or turbo-propellers (Aerospace & Gas Turbine Components)",
    commonUnits: "pcs / sets",
    typicalQty: 100,
    aliases: ["turbines", "turbo", "aerospace parts", "gas turbines", "turbo-jets", "engine components"]
  },
  {
    hs6: 847989,
    hsCodeFormatted: "8479.89",
    name: "Industrial Automation Machinery",
    category: "Machinery",
    description: "Machines and mechanical appliances having individual functions (Robotics & Assembly)",
    commonUnits: "units",
    typicalQty: 25,
    aliases: ["automation", "machinery", "industrial machines", "robotics", "mechanical appliances"]
  }
];

interface CommoditySearchDropdownProps {
  value: string;
  onChange: (commodityName: string, selectedOption?: CommodityOption) => void;
  onSelect: (option: CommodityOption) => void;
  placeholder?: string;
  className?: string;
}

export const CommoditySearchDropdown: React.FC<CommoditySearchDropdownProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = "Type to search commodities (e.g. 'b' -> Basmati Rice, Black Pepper...)",
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter recommendations based on current user query (prefix, substring, HS code, aliases)
  const query = value.trim().toLowerCase();
  
  const filteredOptions = React.useMemo(() => {
    if (!query) {
      // Return popular / default 5 options
      return COMMODITY_CATALOGUE.slice(0, 6);
    }

    const cleanDigits = query.replace(/[^0-9]/g, "");

    const scored = COMMODITY_CATALOGUE.map((item) => {
      let score = 0;
      const lowerName = item.name.toLowerCase();
      const lowerDesc = item.description.toLowerCase();
      const hsStr = item.hs6.toString();
      const hsFormatted = item.hsCodeFormatted.toLowerCase();

      // 1. Direct HS code matching
      if (cleanDigits && (hsStr.startsWith(cleanDigits) || hsStr.includes(cleanDigits))) {
        score += 100;
      }
      if (hsFormatted.includes(query)) {
        score += 90;
      }

      // 2. Exact prefix matching on commodity name
      if (lowerName.startsWith(query)) {
        score += 80;
      } else if (lowerName.split(" ").some(word => word.startsWith(query))) {
        score += 65;
      } else if (lowerName.includes(query)) {
        score += 50;
      }

      // 3. Alias matches
      for (const alias of item.aliases) {
        if (alias === query) {
          score += 85;
          break;
        } else if (alias.startsWith(query)) {
          score += 60;
          break;
        } else if (alias.includes(query)) {
          score += 40;
          break;
        }
      }

      // 4. Description matching
      if (lowerDesc.includes(query)) {
        score += 20;
      }

      return { item, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.item)
      .slice(0, 6);
  }, [query]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
      setIsOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, filteredOptions.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % Math.max(1, filteredOptions.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        handleSelectOption(filteredOptions[highlightedIndex] || filteredOptions[0]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelectOption = (option: CommodityOption) => {
    onChange(option.name, option);
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-[var(--surface-1)] border border-[var(--hairline-strong)] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-sky-500 transition-colors shadow-inner"
        />
        <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-3.5 pointer-events-none" />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          tabIndex={-1}
        >
          <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>
      </div>

      {/* ── Dropdown Suggestions ─────────────────────────────────────── */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-[var(--surface-1)] border border-sky-500/30 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3.5 py-2 border-b border-[var(--hairline)] flex items-center justify-between bg-sky-500/5">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-sky-600 uppercase tracking-wider font-semibold">
              <Sparkles className="w-3 h-3" />
              <span>{query ? `Suggestions for "${query}"` : "Popular Export Commodities"}</span>
            </div>
            <span className="text-[10px] font-mono text-[var(--text-secondary)]">
              {filteredOptions.length} matched
            </span>
          </div>

          {filteredOptions.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--text-secondary)] font-sans">
              No matching commodity found for &ldquo;{value}&rdquo;. Press Enter to search custom query.
            </div>
          ) : (
            <ul className="py-1 max-h-64 overflow-y-auto divide-y divide-white/[0.04]">
              {filteredOptions.map((opt, idx) => {
                const isSelected = value.toLowerCase() === opt.name.toLowerCase() || value.toLowerCase() === opt.hsCodeFormatted;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={opt.hs6}
                    onClick={() => handleSelectOption(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      "px-4 py-2.5 cursor-pointer flex items-center justify-between transition-colors",
                      isHighlighted ? "bg-sky-500/15 text-[var(--text-primary)]" : "hover:bg-[var(--surface-3)] text-[var(--text-primary)]",
                      isSelected && "bg-sky-500/20 font-medium"
                    )}
                  >
                    <div className="space-y-0.5 min-w-0 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
                          {opt.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[10px] font-mono font-bold">
                          HS {opt.hsCodeFormatted}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-secondary)] text-[10px] font-mono">
                          {opt.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate max-w-md font-sans">
                        {opt.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono text-[var(--text-secondary)] hidden sm:inline">
                        Default: {opt.typicalQty.toLocaleString()} {opt.commonUnits}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4 text-sky-600 shrink-0" />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
