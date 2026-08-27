import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe2,
  Building2,
  ShieldCheck,
  Coins,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

export interface AuthContextPanelProps {
  mode: "signin" | "register";
}

export const AuthContextPanel: React.FC<AuthContextPanelProps> = ({ mode }) => {
  return (
    <div className="flex flex-col justify-between h-full p-6 sm:p-8 relative overflow-hidden select-none">
      {/* Background ambient gradient glow */}
      <div
        className="absolute -top-12 -left-12 w-64 h-64 rounded-full pointer-events-none opacity-30 -z-10"
        style={{
          background:
            mode === "signin"
              ? "radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(52, 199, 149, 0.25) 0%, transparent 70%)",
        }}
      />

      {/* Brand Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-sky-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Globe2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-display font-black text-sm tracking-wider text-blue-900">
              GLOBEX
            </span>
          </div>
        </div>

        {/* Dynamic Contextual Text & Stepper based on authMode */}
        <AnimatePresence mode="wait">
          {mode === "signin" ? (
            <motion.div
              key="context-signin"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-bold">
                  WORKSPACE ACCESS
                </span>
                <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight leading-snug">
                  RETURN TO YOUR TRADE NETWORK
                </h2>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Continue from your active trade corridors, verified contracts, shipping manifests, and programmable settlement state.
              </p>

              {/* Active Hub Corridor Indicator */}
              <div className="p-3.5 rounded-xl bg-[#070A0E]/80 border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Primary Gateway</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Mumbai Hub (INNSA)
                  </span>
                </div>
                <div className="text-xs font-sans text-white font-medium flex items-center gap-1.5">
                  <span>India</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <span>UAE · Saudi · EU</span>
                </div>
                <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-white/[0.04] flex items-center justify-between">
                  <span>CEPA 0% Preferential</span>
                  <span className="text-slate-400">EVM Smart Escrow</span>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="context-register"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                  NEW INSTITUTIONAL ONBOARDING
                </span>
                <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-tight leading-snug">
                  ENTER THE GLOBEX TRADE NETWORK
                </h2>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Create an institutional enterprise workspace for cross-border import/export operations, counterparty discovery, and multi-sig settlement.
              </p>

              {/* 3-Step Onboarding Guidance Indicator */}
              <div className="space-y-2 pt-1">
                {[
                  { step: "01", title: "Organization & Role Setup", desc: "Corporate KYC & access governance" },
                  { step: "02", title: "CEPA Corridor Verification", desc: "Preferential tariff duty classification" },
                  { step: "03", title: "Smart Vault Provisioning", desc: "Multi-sig USDC programmable escrow" },
                ].map((item, idx) => (
                  <div
                    key={item.step}
                    className="p-2.5 rounded-xl bg-[#070A0E]/70 border border-white/[0.06] flex items-start gap-3"
                  >
                    <span className="text-[10px] font-mono font-bold text-emerald-400 mt-0.5">
                      {item.step}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white leading-tight">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Security Badges */}
      <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-500">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>EVM Verified</span>
        </div>
        <span>256-bit TLS</span>
      </div>
    </div>
  );
};

export default AuthContextPanel;
