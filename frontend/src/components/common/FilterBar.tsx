import React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  categories: readonly string[] | string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search...",
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#0C121D] border border-white/[0.07]",
        className
      )}
    >
      {/* Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onSelectCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-sans whitespace-nowrap transition-all cursor-pointer",
                isSelected
                  ? "bg-white/[0.1] text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Search Input (if enabled) */}
      {onSearchChange && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#070A0E] border border-white/[0.07] focus-within:border-white/[0.2] w-full sm:w-64 shrink-0 transition-colors">
          <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <input
            type="text"
            value={searchQuery || ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full bg-transparent border-none outline-none text-xs text-white placeholder:text-slate-500 font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
