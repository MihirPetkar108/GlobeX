import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Store,
  Workflow,
  PlusCircle,
  Package,
  FileCheck2,
  Coins,
  Ship,
  Scale,
  Database,
  Layers,
  Sparkles,
  Globe2,
  TrendingUp,
  Building2,
} from "lucide-react";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const runCommand = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="bg-[var(--surface-1)] border border-[var(--hairline-strong)] rounded-[var(--radius-lg)] overflow-hidden shadow-xl text-[var(--text-primary)] font-sans">
        <CommandInput placeholder="Type a command or search workspace..." />
        <CommandList className="max-h-[340px] p-2 space-y-1">
          <CommandEmpty className="py-6 text-center text-xs text-[var(--text-tertiary)]">
            No matching actions or destinations found.
          </CommandEmpty>

          <CommandGroup heading="Primary Workspaces">
            <CommandItem
              onSelect={() => runCommand(() => navigate("/home"))}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-400" />
              <span>Operations Command Center</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate("/discover"))}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <Store className="w-4 h-4 text-sky-400" />
              <span>Discover</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate("/trades"))}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <Workflow className="w-4 h-4 text-indigo-400" />
              <span>Active Trades</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate("/requests"))}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <span>Trade Requests & RFQs</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator className="my-1 bg-[var(--hairline)]" />

          <CommandGroup heading="Catalog & Operations">
            <CommandItem
              onSelect={() => runCommand(() => navigate("/catalog"))}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <Package className="w-4 h-4 text-emerald-400" />
              <span>My Catalog</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate("/trades"))}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4 text-teal-400" />
              <span>Document Verification & OCR Studio</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate("/requests?duty=import"))}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-sky-400" />
              <span>Post New Import RFQ</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate("/assess"))}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Trade Analysis</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate("/counterparties"))}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-sky-400" />
              <span>Counterparties</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator className="my-1 bg-[var(--hairline)]" />

          <CommandGroup heading="Platform Tools & Protocols">
            <CommandItem
              onSelect={() => runCommand(() => navigate("/escrow"))}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Smart Escrow Multi-Sig Vault</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate("/trades"))}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <Ship className="w-4 h-4 text-sky-400" />
              <span>Live AIS Shipment Telemetry</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate("/disputes"))}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <Scale className="w-4 h-4 text-rose-400" />
              <span>Disputes & Arbitration Portal</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate("/ledger"))}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <Database className="w-4 h-4 text-emerald-400" />
              <span>On-Chain Evidence Audit Ledger</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate("/admin"))}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <Layers className="w-4 h-4 text-slate-400" />
              <span>System Health & Node Status</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate("/"))}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)] text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-3)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <Globe2 className="w-4 h-4 text-emerald-400" />
              <span>Interactive 3D Globe Radar</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </div>
    </CommandDialog>
  );
};

export default CommandPalette;
