import React from "react";
import { Listing } from "@/types/trade";
import { MapPin, ShieldCheck, Info, HelpCircle } from "lucide-react";
import SpecularButton from "@/components/ui/SpecularButton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ListingCardProps {
  listing: Listing;
  onInspect?: (listing: Listing) => void;
  onRequest?: (listing: Listing) => void;
  isHovered?: boolean;
  isDimmed?: boolean;
  onHover?: () => void;
  onLeave?: () => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onInspect,
  onRequest,
  isHovered = false,
  isDimmed = false,
  onHover,
  onLeave,
}) => {
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      tabIndex={0}
      className={cn(
        "p-4 sm:p-5 rounded-2xl border flex flex-col justify-between h-full select-none space-y-4 focus-visible:ring-1 focus-visible:ring-[var(--brand-teal)] focus-visible:outline-none transition-[opacity,filter,transform] duration-180 ease-out",
        isHovered
          ? "bg-[var(--bg-surface-subtle)] border-[var(--brand-teal)]/40 opacity-100 filter-none -translate-y-0.5 shadow-lg"
          : isDimmed
          ? "bg-[var(--bg-surface)] border-[var(--border-subtle)] opacity-60 blur-[1px]"
          : "bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-default)] opacity-100 filter-none"
      )}
    >
      {listing.imageUrl && (
        <img
          src={listing.imageUrl}
          alt={listing.title}
          className="w-full aspect-[16/9] object-cover rounded-xl border border-[var(--border-subtle)]"
        />
      )}
      {/* 1. Level A: Product Title & Supplier Info */}
      <div className="space-y-1.5">
        <h3 className="font-display font-bold text-base text-[var(--text-primary)] transition-colors leading-snug line-clamp-2">
          {listing.title}
        </h3>

        {/* 2. Level A: Supplier Name & Location · Level B: Tooltip for HS / Certs */}
        <div className="text-xs text-[var(--text-secondary)] font-sans flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-medium text-[var(--text-primary)] truncate max-w-[140px]">
              {listing.exporterName}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 text-[var(--text-secondary)] truncate">
              <MapPin className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />
              {listing.exporterCity}, {listing.exporterCountry}
            </span>
          </div>

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-0.5 cursor-pointer"
                  aria-label="View specifications summary"
                >
                  <Info className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-[var(--bg-surface)] border border-[var(--border-default)] text-[11px] font-mono text-[var(--text-secondary)] p-2 space-y-1 shadow-lg">
                <div>HS Code: {listing.hsCode}</div>
                <div>Port: {listing.originPort || "Origin Port"}</div>
                {listing.certifications && (
                  <div>Certs: {listing.certifications.slice(0, 3).join(", ")}</div>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* 3. Level A: Price, MOQ, and Verification */}
      <div className="pt-3 border-t border-[var(--border-subtle)] flex items-end justify-between">
        <div>
          <div className="font-mono text-lg font-bold text-[var(--text-primary)] leading-tight">
            ${listing.unitPriceUSD.toLocaleString()}{" "}
            <span className="text-xs font-sans text-[var(--text-secondary)] font-normal">
              / {listing.unit}
            </span>
          </div>
          <div className="text-[11px] font-mono text-[var(--text-tertiary)] mt-0.5">
            MOQ: {listing.minimumOrderQuantity.toLocaleString()} {listing.unit}
          </div>
        </div>

        {/* Verification Status */}
        <div className="text-right flex items-center gap-1.5 text-xs font-mono text-[var(--brand-teal)] font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified</span>
        </div>
      </div>

      {/* 4. Level A Actions */}
      <div className="pt-1 flex gap-2 items-center">
        <SpecularButton
          type="button"
          variant="emerald"
          size="sm"
          radius={10}
          className="flex-1 justify-center font-semibold"
          onClick={() => onRequest && onRequest(listing)}
        >
          <span>Create Request</span>
        </SpecularButton>

        <div
          onMouseEnter={() => onInspect && onInspect(listing)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--surface-3)] border border-[var(--hairline)] hover:bg-[var(--surface-3)] hover:border-emerald-500/40 text-[var(--text-secondary)] hover:text-emerald-600 transition-all cursor-help shrink-0"
          title="Inspect trade information"
        >
          <HelpCircle className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
