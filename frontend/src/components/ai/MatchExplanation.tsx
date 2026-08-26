import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MatchExplanationProps {
  matchScore?: number;
  tradeRelationship?: number;
  costEfficiency?: number;
  logistics?: number;
  marketCompatibility?: number;
}

const ProgressBarItem = ({ label, value }: { label: string; value: number }) => (
  <div className="flex items-center justify-between gap-3 text-xs">
    <span className="w-36 font-medium text-slate-600 truncate">{label}</span>
    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "h-full rounded-full transition-all",
          value >= 90 ? "bg-emerald-500" : value >= 80 ? "bg-emerald-400" : "bg-amber-400"
        )}
      />
    </div>
    <span className="w-9 text-right font-mono font-bold text-slate-800">{value}%</span>
  </div>
);

export function MatchExplanation({
  matchScore = 89,
  tradeRelationship = 91,
  costEfficiency = 84,
  logistics = 88,
  marketCompatibility = 95,
}: MatchExplanationProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <CollapsibleTrigger className="flex items-center justify-between w-full py-1 text-xs font-mono text-emerald-700 hover:text-emerald-800 transition-colors group cursor-pointer">
        <span className="flex items-center gap-2 font-bold">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <span>Why this match? ({matchScore}%)</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? "transform rotate-180 text-emerald-600" : "text-slate-400"
          }`}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-3 space-y-2.5 border-t border-slate-100 mt-2">
        <ProgressBarItem label="Trade Relationship" value={tradeRelationship} />
        <ProgressBarItem label="Cost Efficiency" value={costEfficiency} />
        <ProgressBarItem label="Logistics" value={logistics} />
        <ProgressBarItem label="Market Compatibility" value={marketCompatibility} />
      </CollapsibleContent>
    </Collapsible>
  );
}

export default MatchExplanation;
