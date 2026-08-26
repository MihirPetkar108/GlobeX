export type GlobeMode = "market-intel" | "trade-partners" | "active-trades" | "shipments";

export type UserRole = "exporter" | "buyer" | "arbitrator" | "admin";

export interface Company {
  id: string;
  name: string;
  legalType: "Private Limited" | "Public Limited" | "LLC" | "Sole Proprietorship";
  country: string;
  city: string;
  coordinates: [number, number]; // [lat, lng]
  gstin?: string;
  pan?: string;
  registrationNumber: string;
  businessType: "Exporter" | "Importer" | "Both";
  certifications: string[];
  kycStatus: "Pending" | "Under Review" | "Verified" | "Rejected";
  trustScore: number; // 0-100
  riskScore: number;  // 0-100
  yearsActive: number;
  tradeHistoryCount: number;
  disputeCount: number;
  totalTradeVolumeUSD: number;
  avatarUrl?: string;
  primaryProducts: string[];
  contactEmail: string;
  description: string;
}

export interface Listing {
  id: string;
  exporterId: string;
  exporterName: string;
  exporterCountry: string;
  exporterCity: string;
  title: string;
  category: "Agriculture" | "Textiles" | "Pharmaceuticals" | "Industrial" | "Metals" | "Chemicals" | "Spices";
  hsCode: string;
  unitPriceUSD: number;
  unit: string;
  minimumOrderQuantity: number;
  availableQuantity: number;
  originPort: string;
  certifications: string[];
  leadTimeDays: number;
  trustScore: number;
  riskScore: number;
  aiMatchScore?: number;
  description: string;
  specs: Record<string, string>;
  isTopTrusted: boolean;
  imageUrl?: string;
  featured?: boolean;
}

export type TradeLifecycleStage =
  | "DISCOVER"
  | "MATCH"
  | "ASSESS"
  | "COMPLY"
  | "VERIFY"
  | "ESCROW"
  | "SHIP"
  | "SETTLE"
  | "DISPUTE";

export interface Trade {
  id: string;
  title: string;
  exporterId: string;
  exporterName: string;
  exporterCountry: string;
  exporterPort: string;
  exporterAddress: string;
  importerId: string;
  importerName: string;
  importerCountry: string;
  importerPort: string;
  importerAddress: string;
  productId: string;
  productName: string;
  hsCode: string;
  quantity: number;
  unit: string;
  unitPriceUSD: number;
  contractValueUSD: number;
  currency: "USDC" | "USD";
  lifecycleStage: TradeLifecycleStage;
  status: "Draft" | "Negotiation" | "Escrow Locked" | "In Transit" | "Customs Cleared" | "Completed" | "In Dispute";
  tradeScore: number;
  riskScore: number;
  complianceScore: number;
  trustScore: number;
  routeCoordinates: {
    origin: [number, number];
    destination: [number, number];
  };
  smartContractAddress?: string;
  escrowStatus?: "Awaiting Deposit" | "Funded / Locked" | "Released" | "Refunded" | "Disputed";
  documentsCount: number;
  verifiedDocumentsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TradeDocument {
  id: string;
  tradeId: string;
  type:
    | "Commercial Invoice"
    | "Bill of Lading"
    | "Packing List"
    | "Certificate of Origin"
    | "Phytosanitary Certificate"
    | "Inspection Certificate";
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  extractedFields: {
    goodsDescription?: string;
    grossWeightKg?: number;
    netWeightKg?: number;
    declaredValueUSD?: number;
    hsCode?: string;
    originCountry?: string;
    destinationCountry?: string;
    containerNumber?: string;
    vesselName?: string;
    billNumber?: string;
  };
  sha256Hash: string;
  blockchainTxHash?: string;
  blockNumber?: number;
  verificationStatus: "Verified" | "Discrepancy" | "Pending" | "Failed";
  anomalies: string[];
}

export interface EscrowContract {
  id: string;
  tradeId: string;
  contractAddress: string;
  buyerAddress: string;
  sellerAddress: string;
  arbitratorAddress: string;
  amountUSDC: number;
  network: "Ethereum Sepolia" | "Arbitrum Sepolia";
  status: "Awaiting Deposit" | "Funded / Locked" | "Released" | "Refunded" | "Disputed";
  conditions: {
    buyerVerified: boolean;
    sellerVerified: boolean;
    documentsVerified: boolean;
    shipmentDispatched: boolean;
    shipmentDelivered: boolean;
    inspectionAccepted: boolean;
    noActiveDispute: boolean;
  };
  fundedAt?: string;
  releasedAt?: string;
  txHashDeposit?: string;
  txHashRelease?: string;
}

export interface ShipmentEvent {
  id: string;
  tradeId: string;
  status: "Order Confirmed" | "Dispatched" | "In Transit" | "Customs Cleared" | "Arrived" | "Inspected";
  location: string;
  coordinates: [number, number];
  timestamp: string;
  vesselName: string;
  voyageNumber: string;
  eta: string;
  temperatureCelsius?: number;
  humidityPercent?: number;
  carrier: string;
  milestones: {
    title: string;
    location: string;
    time: string;
    completed: boolean;
    current?: boolean;
  }[];
}

export interface DisputeCase {
  id: string;
  tradeId: string;
  tradeTitle: string;
  filedBy: "Buyer" | "Exporter";
  filerName: string;
  reason: "Weight Discrepancy" | "Quality Defect" | "Delivery Delay" | "Damaged Cargo" | "Documentation Mismatch";
  claimAmountUSD: number;
  evidenceSummary: string;
  evidenceFiles: { name: string; url: string; sha256: string }[];
  aiAnalysis: {
    confidenceScore: number;
    detectedAnomalies: string[];
    contractReference: string;
    recommendedVerdict: "Release 90% to Seller, 10% refund to Buyer" | "Full Refund to Buyer" | "Full Release to Seller";
    reasoning: string;
  };
  arbitratorVerdict?: {
    ruling: "Full Release" | "Full Refund" | "Partial Split";
    splitRatio?: { seller: number; buyer: number };
    arbitratorNotes: string;
    decidedAt: string;
    arbitratorName: string;
  };
  status: "Filed" | "Under Review" | "AI Synthesized" | "Arbitrated" | "Settled";
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  event:
    | "Trade Created"
    | "Document Registered"
    | "Document Verified"
    | "Escrow Funded"
    | "Shipment Dispatched"
    | "Customs Cleared"
    | "Shipment Received"
    | "Inspection Accepted"
    | "Payment Released"
    | "Dispute Arbitrated";
  tradeId: string;
  timestamp: string;
  txHash: string;
  blockNumber: number;
  signerAddress: string;
  status: "Confirmed" | "Finalized";
  gasUsed: string;
}

export interface AIMatchScore {
  matchScore: number;
  breakdown: {
    productFit: number;
    quantityFit: number;
    priceFit: number;
    certificationFit: number;
    trustScoreWeight: number;
    riskDeduction: number;
  };
  explanation: string;
}

export interface MarketOpportunityCountry {
  country: string;
  iso: string;
  opportunityScore: number;
  demandGrowth: string;
  tariffRate: string;
  riskScore: number;
  topImportCategories: string[];
  bilateralTradeVolumeUSD: number;
  coordinates: [number, number];
}
