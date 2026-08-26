import { Link } from "react-router-dom";
import { Company } from "@/types/trade";
import { Award, MapPin, ArrowRight, ShieldCheck } from "lucide-react";
import NumberFlow from "@number-flow/react";

interface TrustedPartnerShelfProps {
  partners: Company[];
  showHeader?: boolean;
}

export const TrustedPartnerShelf = ({ partners, showHeader = false }: TrustedPartnerShelfProps) => {
  return (
    <div className="space-y-3">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-950/80 border border-emerald-700/60 text-emerald-400">
              <Award className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Top 10 Trusted Trade Partners
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Ranked by AI Trust Score (0–100), verified corporate KYC filings, and on-chain escrow completions.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-800/60">
            10 / 10 Verified Tier-1
          </span>
        </div>
      )}

      {/* Horizontal Scrolling Partner Shelf */}
      <div className="flex gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {partners.map((partner, index) => (
          <div
            key={partner.id}
            className="flex-shrink-0 w-72 sm:w-80 glass-panel p-4 bg-[var(--panel)] hover:bg-[var(--panel-raised)] border border-[var(--hairline)] hover:border-emerald-500/40 transition-all rounded-xl flex flex-col justify-between group shadow-lg"
          >
            <div className="space-y-3">
              {/* Partner Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-[var(--panel-raised)] border border-[var(--hairline)] flex items-center justify-center text-xs font-mono font-bold text-[var(--text-secondary)] flex-shrink-0">
                    #{index + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                      {partner.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-[var(--text-secondary)] truncate">
                      <MapPin className="w-3 h-3 text-[var(--accent)] flex-shrink-0" /> {partner.city}, {partner.country}
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-mono font-bold text-[var(--emerald)]">
                    <NumberFlow value={partner.trustScore} />/100
                  </div>
                  <div className="text-[9px] font-mono text-[var(--text-tertiary)] uppercase">Trust Score</div>
                </div>
              </div>

              {/* Badges and Product highlights */}
              <div className="p-2.5 rounded-lg bg-[var(--ink)] border border-[var(--hairline)] space-y-1 text-xs">
                <div className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase">Primary Goods:</div>
                <div className="font-medium text-[var(--text-primary)] line-clamp-1">
                  {partner.primaryProducts.join(", ")}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)] pt-0.5">
                <span>{partner.yearsActive} Yrs Active</span>
                <span>{partner.tradeHistoryCount} Trades</span>
                <span className="text-[var(--emerald)]">{partner.disputeCount} Disputes</span>
              </div>
            </div>

            {/* Inspect Dossier Action */}
            <div className="pt-3 mt-3 border-t border-[var(--hairline)] flex items-center justify-between">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[rgba(52,199,149,0.12)] text-[var(--emerald)] border border-[rgba(52,199,149,0.25)] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> KYC VERIFIED
              </span>
              <Link
                to={`/counterparties/${partner.id}`}
                className="flex items-center gap-1 text-xs font-mono text-[var(--accent)] hover:underline group-hover:translate-x-0.5 transition-transform"
              >
                <span>View Dossier</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustedPartnerShelf;
