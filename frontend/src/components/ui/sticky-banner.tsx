"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface StickyBannerProps {
  children: React.ReactNode;
  className?: string;
  closable?: boolean;
}

export const StickyBanner = ({
  children,
  className,
  closable = false,
}: StickyBannerProps) => {
  const [open, setOpen] = useState(true);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={cn(
          "w-full bg-secondary/80 border-b border-white/[0.08] backdrop-blur-md px-4 py-2 text-xs text-muted-foreground flex items-center justify-between z-40",
          className
        )}
      >
        <div className="flex items-center justify-center w-full">{children}</div>
        {closable && (
          <button
            onClick={() => setOpen(false)}
            className="p-1 hover:text-foreground transition-colors ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default StickyBanner;
