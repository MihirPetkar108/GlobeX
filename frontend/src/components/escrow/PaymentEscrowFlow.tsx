import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FLAGSHIP_DEMO_TRADE } from "@/data/mockTradeData";
import { PrimaryAction } from "@/components/common/PrimaryAction";
import { notifyN8nWorkflow } from "@/utils/jingle";
import { cn } from "@/lib/utils";
import {
  Coins,
  Lock,
  Unlock,
  CreditCard,
  Wallet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";

interface PaymentEscrowFlowProps {
  tradeId?: string;
  amountUSD?: number;
  sellerName?: string;
}

type Step = "idle" | "method" | "details" | "review" | "success";
type PaymentMethod = "razorpay" | "web3";
type EscrowStatus = "Awaiting Deposit" | "Funded / Locked";

const STEP_ORDER: { key: Exclude<Step, "idle">; label: string }[] = [
  { key: "method", label: "Method" },
  { key: "details", label: "Details" },
  { key: "review", label: "Review" },
  { key: "success", label: "Done" },
];

function randomToken(prefix: string, len: number, hex = false) {
  const chars = hex ? "0123456789abcdef" : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}${out}`;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const PaymentEscrowFlow: React.FC<PaymentEscrowFlowProps> = ({
  tradeId = FLAGSHIP_DEMO_TRADE.id,
  amountUSD = FLAGSHIP_DEMO_TRADE.contractValueUSD,
  sellerName = FLAGSHIP_DEMO_TRADE.exporterName,
}) => {
  const [step, setStep] = useState<Step>("idle");
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [upiId, setUpiId] = useState("");
  const [escrowStatus, setEscrowStatus] = useState<EscrowStatus>("Awaiting Deposit");
  const [isProcessing, setIsProcessing] = useState(false);
  const [txRef, setTxRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const walletAddress = "0x4B0897b0513fdC7C541B6d9D7E929C4e5364D2dB";
  const escrowContract = FLAGSHIP_DEMO_TRADE.smartContractAddress || "0x789b91c491209bAcB28Da0a7C9d0F8372658A409";

  const currentStepIndex = STEP_ORDER.findIndex((s) => s.key === step);

  const handleConfirmPay = async () => {
    setIsProcessing(true);
    await delay(1100);
    const ref = method === "web3" ? randomToken("0x", 64, true) : randomToken("pay_", 14);
    setTxRef(ref);
    setEscrowStatus("Funded / Locked");
    notifyN8nWorkflow({
      workflowName: "Escrow Funding Settlement",
      latencyMs: 240,
      summary: `$${amountUSD.toLocaleString()} received and locked in the smart escrow contract for ${tradeId}.`,
    });
    setIsProcessing(false);
    setStep("success");
  };

  const handleCopy = async () => {
    if (!txRef) return;
    try {
      await navigator.clipboard.writeText(txRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — no-op
    }
  };

  const resetFlow = () => {
    setStep("idle");
    setMethod(null);
    setUpiId("");
    setTxRef(null);
  };

  return (
    <div className="p-5 sm:p-6 bg-white border border-slate-200/90 rounded-2xl shadow-2xs select-none">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shrink-0">
          <Coins className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-display font-bold text-base text-slate-900">Payment &amp; Escrow</h3>
          <p className="text-xs text-slate-500 font-sans">Secure, milestone-gated settlement for this trade.</p>
        </div>
      </div>

      {/* Step indicator (hidden on the idle / opening state) */}
      {step !== "idle" && (
        <div className="flex items-center gap-2 mb-6">
          {STEP_ORDER.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border transition-colors",
                    i < currentStepIndex
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : i === currentStepIndex
                      ? "bg-slate-900 border-slate-900 text-white"
                      : "bg-white border-slate-200 text-slate-400"
                  )}
                >
                  {i < currentStepIndex ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-mono font-semibold hidden sm:inline",
                    i <= currentStepIndex ? "text-slate-900" : "text-slate-400"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < STEP_ORDER.length - 1 && (
                <div className={cn("flex-1 h-px", i < currentStepIndex ? "bg-emerald-300" : "bg-slate-200")} />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── IDLE: trade value, escrow status, Make Payment ─────────────── */}
        {step === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-slate-50 border border-sky-200/80 p-5 sm:p-6 text-center space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-sky-700 font-bold">
                Agreed Trade Value
              </span>
              <div className="text-3xl sm:text-4xl font-display font-black text-slate-900">
                ${amountUSD.toLocaleString()}
              </div>
              <div className="flex items-center justify-center gap-1.5 pt-1">
                {escrowStatus === "Funded / Locked" ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono font-bold">
                    <Unlock className="w-3.5 h-3.5" /> {escrowStatus}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-mono font-bold">
                    <Lock className="w-3.5 h-3.5" /> {escrowStatus}
                  </span>
                )}
              </div>
            </div>

            {escrowStatus === "Funded / Locked" ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/90 flex items-center gap-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-emerald-800 font-sans leading-relaxed">
                  Funds are locked in the smart escrow contract and will release to <strong>{sellerName}</strong> once
                  delivery conditions are met.
                </p>
              </div>
            ) : (
              <PrimaryAction size="md" className="w-full justify-center" onClick={() => setStep("method")}>
                Make Payment
              </PrimaryAction>
            )}
          </motion.div>
        )}

        {/* ── METHOD SELECTION ────────────────────────────────────────────── */}
        {step === "method" && (
          <motion.div
            key="method"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            <p className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
              Choose a payment method
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  {
                    id: "razorpay" as const,
                    icon: CreditCard,
                    title: "Razorpay",
                    desc: "UPI, cards & netbanking checkout.",
                  },
                  {
                    id: "web3" as const,
                    icon: Wallet,
                    title: "Web3 Wallet",
                    desc: "Fund escrow directly on-chain.",
                  },
                ] as const
              ).map((opt) => {
                const selected = method === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMethod(opt.id)}
                    className={cn(
                      "text-left p-4 rounded-2xl border transition-all flex items-start gap-3",
                      selected
                        ? "bg-slate-900 border-slate-900 text-white shadow-md"
                        : "bg-white border-slate-200 hover:border-slate-300 text-slate-900"
                    )}
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                        selected ? "bg-white/10 border-white/20 text-white" : "bg-sky-50 border-sky-200 text-sky-600"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold">{opt.title}</div>
                      <div className={cn("text-[11px] font-sans", selected ? "text-white/70" : "text-slate-500")}>
                        {opt.desc}
                      </div>
                    </div>
                    {selected && <Check className="w-4 h-4 ml-auto shrink-0 text-white" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setStep("idle")}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <PrimaryAction
                size="sm"
                disabled={!method}
                onClick={() => setStep("details")}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Continue
              </PrimaryAction>
            </div>
          </motion.div>
        )}

        {/* ── METHOD-SPECIFIC ESSENTIAL DETAILS ───────────────────────────── */}
        {step === "details" && method && (
          <motion.div
            key="details"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            <p className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">
              {method === "razorpay" ? "Razorpay checkout details" : "Wallet payment details"}
            </p>

            {method === "razorpay" ? (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between">
                  <span className="text-xs font-sans text-slate-500">Amount to pay</span>
                  <span className="text-lg font-display font-bold text-slate-900">${amountUSD.toLocaleString()}</span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">UPI ID</label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@upi"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-medium text-sm bg-white text-slate-900 outline-none focus:border-sky-400"
                  />
                  <p className="text-[11px] text-slate-400 font-sans">
                    You'll be redirected to Razorpay's secure checkout to complete this payment.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-sans text-slate-500">Connected Wallet</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {walletAddress.slice(0, 8)}…{walletAddress.slice(-6)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-sans text-slate-500">Network</span>
                    <span className="font-mono font-semibold text-slate-900">Ethereum Sepolia</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-sans text-slate-500">Est. Gas Fee</span>
                    <span className="font-mono font-semibold text-slate-900">~0.0021 ETH</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 font-sans px-1">
                  Funds transfer directly from your wallet into the trade's smart escrow contract.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setStep("method")}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <PrimaryAction
                size="sm"
                disabled={method === "razorpay" && upiId.trim().length === 0}
                onClick={() => setStep("review")}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Continue
              </PrimaryAction>
            </div>
          </motion.div>
        )}

        {/* ── REVIEW / CONFIRMATION ────────────────────────────────────────── */}
        {step === "review" && method && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            <p className="text-xs font-mono uppercase tracking-wider text-slate-500 font-bold">Review &amp; confirm</p>

            <div className="rounded-2xl border border-slate-200/90 divide-y divide-slate-100 overflow-hidden">
              <div className="p-4 flex items-center justify-between bg-slate-50/60">
                <span className="text-xs font-sans text-slate-500">Amount</span>
                <span className="text-base font-display font-bold text-slate-900">${amountUSD.toLocaleString()}</span>
              </div>
              <div className="p-4 flex items-center justify-between text-xs">
                <span className="font-sans text-slate-500">Payment Method</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  {method === "razorpay" ? <CreditCard className="w-3.5 h-3.5" /> : <Wallet className="w-3.5 h-3.5" />}
                  {method === "razorpay" ? "Razorpay" : "Web3 Wallet"}
                </span>
              </div>
              <div className="p-4 flex items-center justify-between text-xs">
                <span className="font-sans text-slate-500">{method === "razorpay" ? "UPI ID" : "From Wallet"}</span>
                <span className="font-mono font-semibold text-slate-900 truncate max-w-[55%]">
                  {method === "razorpay" ? upiId : `${walletAddress.slice(0, 8)}…${walletAddress.slice(-6)}`}
                </span>
              </div>
              <div className="p-4 flex items-center justify-between text-xs">
                <span className="font-sans text-slate-500">Destination</span>
                <span className="font-mono font-semibold text-slate-900 truncate max-w-[55%]">
                  Escrow Contract {escrowContract.slice(0, 6)}…{escrowContract.slice(-4)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setStep("details")}
                disabled={isProcessing}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 disabled:opacity-40"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <PrimaryAction size="md" variant="emerald" isLoading={isProcessing} onClick={handleConfirmPay}>
                {isProcessing ? "Processing Payment..." : `Confirm & Pay $${amountUSD.toLocaleString()}`}
              </PrimaryAction>
            </div>
          </motion.div>
        )}

        {/* ── SUCCESS ──────────────────────────────────────────────────────── */}
        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            <div className="flex flex-col items-center text-center gap-2 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-lg font-display font-bold text-slate-900">Payment Successful</h4>
              <p className="text-xs text-slate-500 font-sans max-w-xs">
                Your payment has been received and locked in the trade's smart escrow contract.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 divide-y divide-slate-100 overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <span className="text-xs font-sans text-slate-500">Amount Paid</span>
                <span className="text-base font-display font-bold text-slate-900">${amountUSD.toLocaleString()}</span>
              </div>
              <div className="p-4 flex items-center justify-between text-xs">
                <span className="font-sans text-slate-500">Payment Method</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  {method === "razorpay" ? <CreditCard className="w-3.5 h-3.5" /> : <Wallet className="w-3.5 h-3.5" />}
                  {method === "razorpay" ? "Razorpay" : "Web3 Wallet"}
                </span>
              </div>
              <div className="p-4 flex items-center justify-between text-xs">
                <span className="font-sans text-slate-500">Escrow Status</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono font-bold text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5" /> {escrowStatus}
                </span>
              </div>
              <div className="p-4 flex items-center justify-between text-xs gap-3">
                <span className="font-sans text-slate-500 shrink-0">Reference ID</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="font-mono font-semibold text-slate-900 truncate flex items-center gap-1.5 hover:text-sky-600 min-w-0"
                >
                  <span className="truncate">{txRef}</span>
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PaymentEscrowFlow;
