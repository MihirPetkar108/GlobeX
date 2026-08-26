import React from "react";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";

interface SourceRefProps {
  /** e.g. "CEPA Schedule Rule 4(b)" or "trade_anomaly model v2, TreeSHAP attribution" */
  citation: string;
  href?: string;
  className?: string;
}

/** Visible citation shown next to any legal/compliance statement — never omitted, never a tooltip. */
export const SourceRef: React.FC<SourceRefProps> = ({ citation, href, className }) => {
  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] font-mono",
        href && "hover:text-[var(--brand)] underline decoration-dotted underline-offset-2",
        className
      )}
    >
      <FileText className="w-3 h-3 shrink-0" />
      <span>{citation}</span>
    </span>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {content}
      </a>
    );
  }
  return content;
};

export default SourceRef;
