import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, ShieldCheck, FileCheck2, Ship, Coins, Database } from "lucide-react";
import React from "react";

interface TradeTabsProps {
  defaultValue?: string;
  onTabChange?: (tab: string) => void;
  overviewContent?: React.ReactNode;
  trustContent?: React.ReactNode;
  documentsContent?: React.ReactNode;
  shipmentContent?: React.ReactNode;
  escrowContent?: React.ReactNode;
  auditContent?: React.ReactNode;
  children?: React.ReactNode;
}

export function TradeTabs({
  defaultValue = "overview",
  onTabChange,
  overviewContent,
  trustContent,
  documentsContent,
  shipmentContent,
  escrowContent,
  auditContent,
  children,
}: TradeTabsProps) {
  return (
    <Tabs
      defaultValue={defaultValue}
      onValueChange={onTabChange}
      className="w-full space-y-6 select-none font-sans"
    >
      <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full h-auto p-1.5 rounded-2xl bg-[#090E17]/90 border border-white/[0.08] backdrop-blur-xl gap-1">
        <TabsTrigger
          value="overview"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold data-[state=active]:bg-white/[0.1] data-[state=active]:text-white data-[state=active]:shadow-sm text-[var(--text-secondary)] hover:text-white transition-all"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Overview</span>
        </TabsTrigger>

        <TabsTrigger
          value="trust"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold data-[state=active]:bg-white/[0.1] data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm text-[var(--text-secondary)] hover:text-white transition-all"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Trust & Risk</span>
        </TabsTrigger>

        <TabsTrigger
          value="documents"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold data-[state=active]:bg-white/[0.1] data-[state=active]:text-cyan-400 data-[state=active]:shadow-sm text-[var(--text-secondary)] hover:text-white transition-all"
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Documents</span>
        </TabsTrigger>

        <TabsTrigger
          value="shipment"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold data-[state=active]:bg-white/[0.1] data-[state=active]:text-blue-400 data-[state=active]:shadow-sm text-[var(--text-secondary)] hover:text-white transition-all"
        >
          <Ship className="w-3.5 h-3.5" />
          <span>Shipment</span>
        </TabsTrigger>

        <TabsTrigger
          value="escrow"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold data-[state=active]:bg-white/[0.1] data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm text-[var(--text-secondary)] hover:text-white transition-all"
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Escrow</span>
        </TabsTrigger>

        <TabsTrigger
          value="audit"
          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold data-[state=active]:bg-white/[0.1] data-[state=active]:text-purple-400 data-[state=active]:shadow-sm text-[var(--text-secondary)] hover:text-white transition-all"
        >
          <Database className="w-3.5 h-3.5" />
          <span>Audit Trail</span>
        </TabsTrigger>
      </TabsList>

      {overviewContent && <TabsContent value="overview">{overviewContent}</TabsContent>}
      {trustContent && <TabsContent value="trust">{trustContent}</TabsContent>}
      {documentsContent && <TabsContent value="documents">{documentsContent}</TabsContent>}
      {shipmentContent && <TabsContent value="shipment">{shipmentContent}</TabsContent>}
      {escrowContent && <TabsContent value="escrow">{escrowContent}</TabsContent>}
      {auditContent && <TabsContent value="audit">{auditContent}</TabsContent>}

      {children}
    </Tabs>
  );
}

export default TradeTabs;
