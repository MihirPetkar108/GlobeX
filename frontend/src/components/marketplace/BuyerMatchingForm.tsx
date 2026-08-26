import React, { useState } from "react";
import { Search, Sparkles, ArrowRight, Layers, Globe2, ShieldCheck } from "lucide-react";
import { BuyerMatchQuery } from "@/services/api/aiService";
import { cn } from "@/lib/utils";

interface BuyerMatchingFormProps {
  onSearch: (query: BuyerMatchQuery) => void;
  isLoading?: boolean;
  className?: string;
}

const POPULAR_COMMODITIES = [
  "1121 Steam Basmati Rice",
  "Organic Sharbati Wheat",
  "Tellicherry Black Pepper",
  "Premium W320 Cashews",
  "Organic Combed Cotton Yarn",
];

const DESTINATIONS = [
  "UAE",
  "Saudi Arabia",
  "Germany",
  "Singapore",
  "United Kingdom",
  "Japan",
  "Italy",
  "Global / Any",
];

const UNITS = ["MT", "kg", "Tonnes", "Units"] as const;

export const BuyerMatchingForm: React.FC<BuyerMatchingFormProps> = ({
  onSearch,
  isLoading = false,
  className = "",
}) => {
  const [commodity, setCommodity] = useState<string>("1121 Steam Basmati Rice");
  const [quantity, setQuantity] = useState<number>(1000);
  const [unit, setUnit] = useState<string>("MT");
  const [destinationCountry, setDestinationCountry] = useState<string>("UAE");
  const [requirements, setRequirements] = useState<string>("ISO 22000, 0% CEPA Duty, Escrow Ready");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commodity.trim()) return;

    onSearch({
      commodity: commodity.trim(),
      quantity: Number(quantity) || 1000,
      unit,
      destinationCountry,
      requirements: requirements
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean),
    });
  };

  return (
    <div
      className={cn(
        "w-full rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 sm:p-6 space-y-4 shadow-lg font-sans select-none",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--brand-teal)]" />
            <h3 className="font-display font-bold text-sm text-[var(--text-primary)] tracking-wide uppercase">
              What Are You Looking For?
            </h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Query verified institutional buyers and matching import demand across 7,420+ global organizations.
          </p>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-mono text-[var(--brand-teal-dark)] bg-[var(--success-bg)] border border-[var(--brand-teal)]/30 px-2 py-0.5 rounded-lg shrink-0 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-[var(--brand-teal)]" />
          <span>ML Candidate Filter</span>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          
          {/* 1. Commodity Name (5 cols) */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)] flex items-center justify-between">
              <span>Commodity / Product</span>
              <span className="text-[10px] text-[var(--text-tertiary)] font-sans">e.g. Basmati Rice</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                placeholder="e.g. 1121 Steam Basmati Rice, Organic Wheat..."
                className="w-full h-10 px-3.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--brand-teal)] transition-colors"
              />
            </div>
          </div>

          {/* 2. Quantity & Unit (4 cols) */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">
              Quantity & Volume
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                placeholder="1000"
                className="w-full h-10 px-3.5 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--brand-teal)] font-mono"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="h-10 px-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs outline-none cursor-pointer focus:border-[var(--brand-teal)] shrink-0 font-mono"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Destination Country (3 cols) */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">
              Destination Market
            </label>
            <select
              value={destinationCountry}
              onChange={(e) => setDestinationCountry(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs outline-none cursor-pointer focus:border-[var(--brand-teal)]"
            >
              {DESTINATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
          <span className="text-[var(--text-tertiary)] text-[10px] font-mono mr-1">Quick Select:</span>
          {POPULAR_COMMODITIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCommodity(item)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer border",
                commodity === item
                  ? "bg-[var(--success-bg)] border-[var(--brand-teal)]/40 text-[var(--brand-teal-dark)] font-medium"
                  : "bg-[var(--bg-surface-subtle)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-muted)]"
              )}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Submit & Requirements Bar */}
        <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <span className="text-[11px] font-mono text-[var(--text-tertiary)] shrink-0">Specifications:</span>
            <input
              type="text"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="e.g. ISO 22000, Halal, SGS Inspection"
              className="w-full h-8 px-2.5 rounded-lg bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--brand-teal)]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              "h-10 px-5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shrink-0",
              isLoading
                ? "bg-[var(--bg-surface-muted)] text-[var(--text-disabled)] cursor-not-allowed"
                : "bg-[var(--brand-teal-dark)] hover:bg-[var(--brand-teal)] text-white active:scale-[0.98]"
            )}
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Filtering 7,420 Organizations...</span>
              </>
            ) : (
              <>
                <span>Find Matching Buyers</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BuyerMatchingForm;
