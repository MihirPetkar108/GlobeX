import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, Award, FileCheck2, TrendingUp, AlertCircle, ArrowRight } from "lucide-react";
import NumberFlow from "@number-flow/react";

export interface TrustProfile {
  companyName: string;
  country: string;
  port: string;
  trustScore: number;
  totalTrades: number;
  disputeRate: string;
  subscores: {
    counterpartyReliability: number;
    fulfillmentRate: number;
    documentIntegrity: number;
    regulatoryCompliance: number;
  };
  certifications: string[];
  historicalVolumeUSD: string;
  activeStatus: string;
}

interface TrustBreakdownDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: TrustProfile | null;
}

export const TrustBreakdownDrawer = ({
  isOpen,
  onClose,
  profile = {
    companyName: "Arvind Global Agro Exports Ltd",
    country: "India",
    port: "JNPT Nhava Sheva (INNSA)",
    trustScore: 94,
    totalTrades: 128,
    disputeRate: "0.0%",
    subscores: {
      counterpartyReliability: 96,
      fulfillmentRate: 93,
      documentIntegrity: 97,
      regulatoryCompliance: 91,
    },
    certifications: ["ISO 22000:2018", "FSSAI Food Safety", "APEDA Registered", "Halal Certified"],
    historicalVolumeUSD: "$16.4M USDC",
    activeStatus: "Tier-1 Verified Exporter",
  },
}: TrustBreakdownDrawerProps) => {
  if (!profile) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          />

          {/* Slide-Over Drawer */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-[#0A0F18] border-l border-white/[0.08] p-6 shadow-2xl z-50 overflow-y-auto flex flex-col justify-between font-sans select-none"
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">
                      TRUST DOSSIER
                    </span>
                  </div>
                  <h2 className="text-xl font-display font-bold text-white">{profile.companyName}</h2>
                  <p className="text-xs text-[var(--text-secondary)]">{profile.country} · {profile.port}</p>
                </div>

                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-[var(--text-secondary)] hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Composite Trust Anchor */}
              <div className="p-5 rounded-2xl bg-[#0F1724] border border-white/[0.08] flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-mono uppercase text-[var(--text-secondary)]">Composite Trust Score</span>
                  <div className="text-3xl font-display font-extrabold text-emerald-400">
                    <NumberFlow value={profile.trustScore} /> <span className="text-sm font-sans text-[var(--text-tertiary)]">/ 100</span>
                  </div>
                  <span className="text-xs text-emerald-400/90 font-medium">{profile.activeStatus}</span>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-xs font-mono text-white font-bold">{profile.totalTrades} Completed</div>
                  <div className="text-[11px] font-mono text-[var(--text-secondary)]">Dispute Rate: <strong className="text-emerald-400">{profile.disputeRate}</strong></div>
                  <div className="text-[11px] font-mono text-[var(--text-secondary)]">Volume: {profile.historicalVolumeUSD}</div>
                </div>
              </div>

              {/* Subscores Breakdown (Rule 13 in Design Standards) */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-semibold uppercase text-[var(--text-secondary)] tracking-wider">
                  Verification Breakdown
                </h3>

                <div className="space-y-2.5">
                  {[
                    { label: "Counterparty Reliability", score: profile.subscores.counterpartyReliability, desc: "KYC/AML cleared, active corporate registration" },
                    { label: "Fulfillment & On-Time Rate", score: profile.subscores.fulfillmentRate, desc: "100% on-time delivery across 128 shipments" },
                    { label: "Document Integrity & Accuracy", score: profile.subscores.documentIntegrity, desc: "Zero OCR discrepancy penalty on bill of ladings" },
                    { label: "Regulatory & Food Safety", score: profile.subscores.regulatoryCompliance, desc: "APEDA & Phytosanitary certifications valid" },
                  ].map((sub) => (
                    <div key={sub.label} className="p-3.5 rounded-xl bg-[#0E1520] border border-white/[0.04] space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-white">{sub.label}</span>
                        <span className="font-mono font-bold text-emerald-400">{sub.score} / 100</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${sub.score}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-[var(--text-tertiary)]">{sub.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Certifications */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-semibold uppercase text-[var(--text-secondary)] tracking-wider">
                  Active Certifications
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.certifications.map((cert) => (
                    <span
                      key={cert}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono"
                    >
                      ✓ {cert}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Primary Action */}
            <div className="pt-6 border-t border-white/[0.08]">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <span>Done Reviewing</span>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default TrustBreakdownDrawer;
