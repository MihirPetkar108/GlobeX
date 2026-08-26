import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShieldCheck, Scale, FileCheck2, AlertCircle } from "lucide-react";

interface RiskBreakdownProps {
  transactionRisk?: string;
  regulatoryRisk?: string;
  documentIntegrity?: string;
  shippingRisk?: string;
}

export function RiskBreakdown({
  transactionRisk = "Risk score is low (12/100). The transaction value ($550k) and historical counterparty trade volume ($16.4M) are fully aligned.",
  regulatoryRisk = "Preferential India-UAE CEPA tariff (0.0% duty) verified. Mandatory APEDA and Phytosanitary certificates valid through 2027.",
  documentIntegrity = "100% OCR cross-verification score. Commercial invoice, Bill of Lading, and SGS inspection parameters match with zero discrepancies.",
  shippingRisk = "Maritime corridor active. Vessel MSC ANNA currently transit Arabian Sea under normal weather conditions with no choke point delays.",
}: RiskBreakdownProps) {
  return (
    <Accordion type="single" collapsible className="w-full space-y-2 font-sans">
      <AccordionItem value="transaction" className="border border-white/[0.08] bg-[#0C121D]/80 rounded-xl px-4 overflow-hidden">
        <AccordionTrigger className="text-xs font-medium text-white hover:text-emerald-400 py-3">
          <div className="flex items-center gap-2">
            <Scale className="w-3.5 h-3.5 text-emerald-400" />
            <span>Transaction & Payment Risk</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="text-xs text-[var(--text-secondary)] pb-3 leading-relaxed">
          {transactionRisk}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="regulatory" className="border border-white/[0.08] bg-[#0C121D]/80 rounded-xl px-4 overflow-hidden">
        <AccordionTrigger className="text-xs font-medium text-white hover:text-cyan-400 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Regulatory & Tariff Compliance</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="text-xs text-[var(--text-secondary)] pb-3 leading-relaxed">
          {regulatoryRisk}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="documents" className="border border-white/[0.08] bg-[#0C121D]/80 rounded-xl px-4 overflow-hidden">
        <AccordionTrigger className="text-xs font-medium text-white hover:text-emerald-400 py-3">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Document Integrity & OCR Match</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="text-xs text-[var(--text-secondary)] pb-3 leading-relaxed">
          {documentIntegrity}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="shipping" className="border border-white/[0.08] bg-[#0C121D]/80 rounded-xl px-4 overflow-hidden">
        <AccordionTrigger className="text-xs font-medium text-white hover:text-amber-400 py-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Corridor Route & Choke Point Telemetry</span>
          </div>
        </AccordionTrigger>
        <AccordionContent className="text-xs text-[var(--text-secondary)] pb-3 leading-relaxed">
          {shippingRisk}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export default RiskBreakdown;
