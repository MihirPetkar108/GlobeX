# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Four primary user roles use the dashboard:
- **Exporters**: Monitor outbound trades, shipments in transit, escrow releases, and fulfillment status
- **Importers/Buyers**: Track inbound trades, customs status, receiving logistics, and escrow milestones
- **Compliance Officers**: Monitor regulatory compliance, document verification, sanctions flags, and anomaly detection
- **Escrow Arbitrators**: Review disputes, multi-sig fund releases, and transaction arbitration cases

All roles share the same dashboard interface; the layout adapts per role and active trade direction (Import/Export).

## Product Purpose

GLOBEX dashboard is the operational command center for cross-border B2B trade execution. It enables users to monitor active trades, shipment status, smart escrow vaults, document verification, and vessel telemetry in real time. The dashboard surfaces trade details, milestones, payment status, and risk alerts at a glance, allowing users to manage complex multi-stage trade lifecycles without context switching.

Success means users can:
- See active trades organized by direction (Import/Export) and status
- Drill into trade details, shipment tracking, and escrow milestones
- Act on documents, disputes, and risk flags in real time
- Navigate to specialized workflows (marketplace, create listing, documents, blockchain ledger) from a single entry point

## Positioning

GLOBEX's trade command center combines a 3D WebGL globe visualization of global trade flows with a structured card-based dashboard. The globe provides intuitive spatial understanding of route complexity and port positioning; the cards present actionable trade and escrow state. The dashboard is the only unified view across four user roles and a 7-stage automated trade pipeline—competitors show static lists or per-module siloed workflows.

## Operating Context

Trade transactions flow through 7 automated stages:
1. Persona onboarding & role selection
2. Trade intent & marketplace listing
3. AI HS classification & preferential tariff calculation
4. AI counterparty matching & anomaly audit
5. Smart escrow vault creation & fund locking
6. Document OCR verification & vessel telemetry
7. Port inspection/geofence check → escrow release or arbitration

The dashboard surfaces trades at stages 2–7. Users interact with the dashboard continuously during a trade's lifecycle: checking status, approving milestones, reviewing documents, monitoring vessel position, and resolving disputes.

Active trades are persisted in Supabase; the dashboard queries live trade records and escrow state. Users can pivot between the dashboard and specialized pages (Marketplace, Trade Intent Wizard, Documents, Shipments, Blockchain Ledger, Disputes) without losing context.

## Capabilities and Constraints

**Capabilities:**
- Display import and export trades separately; toggle between directions
- Render 3D WebGL globe with trade route arcs, port markers, and camera interactions
- Show trade card details: product, origin/destination, value, status, and CTA
- Link to escrow, shipments, documents pages for each trade
- Responsive design: desktop (1920+px), tablet (768–1024px), mobile (320–767px)
- Light theme (not dark)

**Constraints:**
- Dashboard only; does not create trades (creation is Trade Intent Wizard)
- Does not calculate HS codes, tariffs, or anomalies (backend APIs handle this)
- Escrow vault state controlled by smart contracts; dashboard displays only
- Document uploads and OCR extraction are separate pages, not inline
- Trade data sourced from Supabase; no fallback if DB is unavailable (seed data for demo only)

**Intentionally Undecided:**
- Mobile-first vs. desktop-first build approach (to be confirmed during visual planning)
- Number of trades to surface on dashboard vs. paginate/scroll (to be confirmed in UX design)

## Brand Commitments

- Website is light-themed (not dark)
- Uses shadcn/Tailwind component system and design tokens for consistency
- Company name: GLOBEX
- No rigid brand guidelines provided; design is unrestricted except light theme requirement

## Evidence on Hand

- Working React + TypeScript codebase with 22+ pages and functional trade lifecycle
- Existing DashboardPage, TradeGlobe, AppShell, TopActionBar, StatsPanels, RecentTradesSection components
- Mock trade data in place; integration with Supabase when available
- Existing nav, escrow, shipment, document, and blockchain ledger pages

## Product Principles

1. **Multi-role unity**: One dashboard for four user roles; surface relevant actions per role without cluttering the interface.
2. **Glance-ability**: Trade state, milestones, and flags must be scannable in <3 seconds; details drillable via cards.
3. **Trade-centric workflow**: Every action (escrow approval, document review, dispute filing) flows from trade context, never orphaned.
4. **Responsive integrity**: Mobile, tablet, and desktop all show complete information; no features stripped for screen size, only layout adapted.

## Accessibility & Inclusion

No product-specific accessibility requirements stated. Standard WCAG 2.1 AA compliance assumed (inherited from shadcn/Radix UI primitives).
