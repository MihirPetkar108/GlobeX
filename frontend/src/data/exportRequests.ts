export type ListingStatus = "active" | "draft" | "paused" | "out_of_stock";

export interface ExportListing {
  id: string;
  productName: string;
  category: string;
  description: string;
  images: string[];
  origin: string;
  port: string;
  price: number;
  currency: string;
  unit: string;
  availableQuantity: number;
  moq: number;
  specifications: string;
  hsCode: string;
  incoterm: string;
  paymentTerms: string;
  certifications: string[];
  requiredDocuments: string[];
  status: ListingStatus;
  destinationMarkets: string[];
  deliveryTime: string;
  packaging: string;
  createdAt: string;
}

export type ExportTradeStatus =
  | "NEW REQUEST"
  | "NEGOTIATING"
  | "PAYMENT PENDING"
  | "READY TO SHIP"
  | "IN TRANSIT"
  | "DELIVERED"
  | "DISPUTED"
  | "SETTLED"
  | "REJECTED";

export interface ExportNegotiationOffer {
  role: "Buyer" | "Exporter";
  price: number;
  quantity: number;
  time: string;
  note?: string;
}

export interface DisputeTimelineEntry {
  date: string;
  author: string;
  note: string;
}

export interface ExportRequest {
  id: string;
  listingId: string;
  buyer: string;
  country: string;
  flag: string;
  product: string;
  category: string;
  hsCode: string;
  quantity: number;
  unit: string;
  originalPrice: number;
  originalTradeValue: number;
  buyerProposedPrice?: number;
  buyerProposedTradeValue?: number;
  exporterCounterPrice?: number;
  exporterCounterTradeValue?: number;
  finalAgreedPrice?: number;
  finalTradeValue?: number;
  status: ExportTradeStatus;
  negotiationHistory: ExportNegotiationOffer[];
  origin: string;
  destination: string;
  destinationPort: string;
  transit: string;
  incoterm: string;
  paymentTerms: string;
  paymentStatus: "Pending" | "Confirmed" | "Released";
  shipmentId?: string;
  carrier?: string;
  billOfLading?: string;
  etd?: string;
  eta?: string;
  currentLocation?: string;
  deliveryDate?: string;
  deliveryStatus?: "Pending" | "Confirmed" | "Disputed";
  disputeReason?: string;
  disputeDetails?: string;
  disputeTimeline?: DisputeTimelineEntry[];
  buyerRisk: string;
  requiredLicenses: string;
  createdAt: string;
}

export const INITIAL_EXPORT_LISTINGS: ExportListing[] = [
  {
    id: "EXP-LST-1121",
    productName: "1121 Steam Extra Long Grain Basmati Rice",
    category: "Agriculture",
    description: "Premium aromatic 1121 steam basmati rice with average grain length of 8.35mm, perfect elongation ratio, and moisture content < 12.5%. Ideal for Gulf & European markets.",
    images: [
      "https://pngimg.com/uploads/rice/rice_PNG13.png",
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80"
    ],
    origin: "India",
    port: "Nhava Sheva",
    price: 1100,
    currency: "USD",
    unit: "MT",
    availableQuantity: 2000,
    moq: 100,
    specifications: "Length: 8.35mm+, Moisture: max 12.5%, Broken: max 1%, Purity: 95%",
    hsCode: "1006.30",
    incoterm: "CIF",
    paymentTerms: "100% LC at sight or 30% Advance / 70% against BL",
    certifications: ["APEDA", "FSSAI", "ISO 22000", "Phytosanitary"],
    requiredDocuments: ["Certificate of Origin", "Bill of Lading", "Commercial Invoice", "Fumigation Certificate"],
    status: "active",
    destinationMarkets: ["UAE", "Saudi Arabia", "Qatar", "Kuwait", "Germany"],
    deliveryTime: "10-15 Days",
    packaging: "25kg / 50kg Non-Woven / BOPP Poly Bags",
    createdAt: "2026-08-15",
  },
  {
    id: "EXP-LST-PEPPER",
    productName: "Tellicherry Extra Bold Black Pepper (TGSEB)",
    category: "Spices",
    description: "Grade 1 TGSEB extra bold sun-dried black pepper from the Malabar coast with piperine content > 4.5% and high bulk density.",
    images: [
      "https://pngimg.com/uploads/black_pepper/black_pepper_PNG20.png",
      "https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=600&q=80"
    ],
    origin: "India",
    port: "Cochin Port",
    price: 7000,
    currency: "USD",
    unit: "MT",
    availableQuantity: 500,
    moq: 20,
    specifications: "Moisture: max 11%, Density: 570 g/L, Piperine: min 4.5%, Extraneous: < 0.5%",
    hsCode: "0904.11",
    incoterm: "FOB",
    paymentTerms: "30% Advance / 70% against documents or Escrow",
    certifications: ["Spice Board of India", "USFDA", "HACCP"],
    requiredDocuments: ["Certificate of Origin", "Phytosanitary", "Quality Lab Certificate"],
    status: "active",
    destinationMarkets: ["UAE", "USA", "Netherlands", "United Kingdom"],
    deliveryTime: "7-12 Days",
    packaging: "25kg Vacuum Sealed Craft Paper Bags",
    createdAt: "2026-08-18",
  },
  {
    id: "EXP-LST-YARN",
    productName: "Combed Ring-Spun Cotton Yarn 30s Ne",
    category: "Textiles",
    description: "High-tenacity 100% virgin combed organic cotton yarn suitable for high-speed weaving and circular knitting.",
    images: [
      "https://cdn-icons-png.flaticon.com/512/2965/2965567.png",
      "https://images.unsplash.com/photo-1604014237800-1c9102c219da?auto=format&fit=crop&w=600&q=80"
    ],
    origin: "India",
    port: "Mundra Port",
    price: 880,
    currency: "USD",
    unit: "MT",
    availableQuantity: 1200,
    moq: 50,
    specifications: "Count: 30s Ne Combed, CSP: 3100+, Uster IPI: < 80, Twist: 28.5 TPI",
    hsCode: "5205.11",
    incoterm: "CIF",
    paymentTerms: "LC at sight / Escrow release on port inspection",
    certifications: ["GOTS Organic", "OEKO-TEX Standard 100"],
    requiredDocuments: ["GOTS TC", "Certificate of Origin", "BL", "Packing List"],
    status: "active",
    destinationMarkets: ["Italy", "Turkey", "Portugal", "Bangladesh"],
    deliveryTime: "18-22 Days",
    packaging: "Carton Box of 24 Cones (45.36 kg net)",
    createdAt: "2026-08-10",
  },
  {
    id: "EXP-LST-TURMERIC",
    productName: "Alleppey Finger Turmeric (High Curcumin)",
    category: "Spices",
    description: "Deep yellow whole Alleppey finger turmeric with natural curcumin content exceeding 5.2%.",
    images: [
      "https://pngimg.com/uploads/turmeric/turmeric_PNG8.png"
    ],
    origin: "India",
    port: "Chennai Port",
    price: 2400,
    currency: "USD",
    unit: "MT",
    availableQuantity: 800,
    moq: 25,
    specifications: "Curcumin: 5.2%+, Moisture: max 10%, Length: 3-5 cm, Polish: Double Polished",
    hsCode: "0910.30",
    incoterm: "FOB",
    paymentTerms: "Letter of Credit",
    certifications: ["Spice Board", "FSSAI", "ISO 9001"],
    requiredDocuments: ["Certificate of Analysis", "Certificate of Origin"],
    status: "paused",
    destinationMarkets: ["USA", "Germany", "Japan"],
    deliveryTime: "15 Days",
    packaging: "50kg Jute Bags",
    createdAt: "2026-08-01",
  }
];

export const INITIAL_EXPORT_REQUESTS: ExportRequest[] = [
  {
    id: "EXP-TRD-001",
    listingId: "EXP-LST-1121",
    buyer: "Emirates Food Trading",
    country: "UAE",
    flag: "🇦🇪",
    product: "1121 Steam Extra Long Grain Basmati Rice",
    category: "Agriculture",
    hsCode: "1006.30",
    quantity: 25000,
    unit: "MT",
    originalPrice: 1100,
    originalTradeValue: 27500000,
    buyerProposedPrice: 1050,
    buyerProposedTradeValue: 26250000,
    status: "NEW REQUEST",
    negotiationHistory: [
      { role: "Buyer", price: 1050, quantity: 25000, time: "Today, 08:30", note: "Targeting large annual volume contract." }
    ],
    origin: "Nhava Sheva, India",
    destination: "UAE",
    destinationPort: "Jebel Ali Port, UAE",
    transit: "5-7 days",
    incoterm: "CIF",
    paymentTerms: "LC at sight",
    paymentStatus: "Pending",
    buyerRisk: "Low counterparty risk (Tier 1 Importer)",
    requiredLicenses: "APEDA registration and phytosanitary certificate",
    createdAt: "2026-08-26",
  },
  {
    id: "EXP-TRD-002",
    listingId: "EXP-LST-PEPPER",
    buyer: "Dubai Global Foods LLC",
    country: "UAE",
    flag: "🇦🇪",
    product: "Tellicherry Extra Bold Black Pepper (TGSEB)",
    category: "Spices",
    hsCode: "0904.11",
    quantity: 10000,
    unit: "MT",
    originalPrice: 7000,
    originalTradeValue: 70000000,
    buyerProposedPrice: 6800,
    buyerProposedTradeValue: 68000000,
    exporterCounterPrice: 6900,
    exporterCounterTradeValue: 69000000,
    status: "NEGOTIATING",
    negotiationHistory: [
      { role: "Buyer", price: 6800, quantity: 10000, time: "Yesterday, 16:40", note: "Initial volume offer." },
      { role: "Exporter", price: 6900, quantity: 10000, time: "Today, 10:06", note: "Best counter considering TGSEB premium grade." }
    ],
    origin: "Cochin Port, India",
    destination: "UAE",
    destinationPort: "Jebel Ali Port, UAE",
    transit: "6-8 days",
    incoterm: "FOB",
    paymentTerms: "30% advance / 70% against documents",
    paymentStatus: "Pending",
    buyerRisk: "Established buyer with 42 completed trades",
    requiredLicenses: "Spice Board certificate",
    createdAt: "2026-08-25",
  },
  {
    id: "EXP-TRD-003",
    listingId: "EXP-LST-1121",
    buyer: "Al-Baraka General Trading Co.",
    country: "Saudi Arabia",
    flag: "🇸🇦",
    product: "1121 Steam Extra Long Grain Basmati Rice",
    category: "Agriculture",
    hsCode: "1006.30",
    quantity: 15000,
    unit: "MT",
    originalPrice: 1100,
    originalTradeValue: 16500000,
    buyerProposedPrice: 1060,
    buyerProposedTradeValue: 15900000,
    exporterCounterPrice: 1075,
    exporterCounterTradeValue: 16125000,
    finalAgreedPrice: 1075,
    finalTradeValue: 16125000,
    status: "PAYMENT PENDING",
    negotiationHistory: [
      { role: "Buyer", price: 1060, quantity: 15000, time: "Aug 22, 14:00" },
      { role: "Exporter", price: 1075, quantity: 15000, time: "Aug 23, 11:20" },
      { role: "Buyer", price: 1075, quantity: 15000, time: "Aug 24, 09:15", note: "Commercial Agreement Accepted" }
    ],
    origin: "Nhava Sheva, India",
    destination: "Saudi Arabia",
    destinationPort: "Jeddah Islamic Port",
    transit: "7-9 days",
    incoterm: "CIF",
    paymentTerms: "Escrow Deposit via GlobeX Smart Contract",
    paymentStatus: "Pending",
    buyerRisk: "Verified Saudi Importer",
    requiredLicenses: "SFDA & Phytosanitary Certificate",
    createdAt: "2026-08-22",
  },
  {
    id: "EXP-TRD-004",
    listingId: "EXP-LST-YARN",
    buyer: "Milano Textile Imports",
    country: "Italy",
    flag: "🇮🇹",
    product: "Combed Ring-Spun Cotton Yarn 30s Ne",
    category: "Textiles",
    hsCode: "5205.11",
    quantity: 20000,
    unit: "MT",
    originalPrice: 880,
    originalTradeValue: 17600000,
    finalAgreedPrice: 880,
    finalTradeValue: 17600000,
    status: "READY TO SHIP",
    negotiationHistory: [
      { role: "Buyer", price: 880, quantity: 20000, time: "Aug 18, 11:00", note: "Accepted at full listed price" }
    ],
    origin: "Mundra Port, India",
    destination: "Italy",
    destinationPort: "Port of Genoa, Italy",
    transit: "18-22 days",
    incoterm: "CIF",
    paymentTerms: "Escrow release on port inspection",
    paymentStatus: "Confirmed",
    buyerRisk: "Verified counterparty",
    requiredLicenses: "Certificate of Origin, GOTS TC",
    createdAt: "2026-08-18",
  },
  {
    id: "EXP-TRD-005",
    listingId: "EXP-LST-1121",
    buyer: "Gulf Grain Distribution Corp",
    country: "Qatar",
    flag: "🇶🇦",
    product: "1121 Steam Extra Long Grain Basmati Rice",
    category: "Agriculture",
    hsCode: "1006.30",
    quantity: 12000,
    unit: "MT",
    originalPrice: 1100,
    originalTradeValue: 13200000,
    finalAgreedPrice: 1090,
    finalTradeValue: 13080000,
    status: "IN TRANSIT",
    negotiationHistory: [
      { role: "Buyer", price: 1090, quantity: 12000, time: "Aug 12, 10:00" },
      { role: "Exporter", price: 1090, quantity: 12000, time: "Aug 12, 15:00", note: "Accepted" }
    ],
    origin: "Nhava Sheva, India",
    destination: "Qatar",
    destinationPort: "Hamad Port, Qatar",
    transit: "6 days",
    incoterm: "CIF",
    paymentTerms: "LC at Sight / Escrow Secured",
    paymentStatus: "Confirmed",
    shipmentId: "SHP-GULF-8821",
    carrier: "Maersk Line (Vessel: MSC OSCAR)",
    billOfLading: "MEDUIND982310",
    etd: "2026-08-22",
    eta: "2026-08-28",
    currentLocation: "Arabian Sea (Lat 22.4, Lon 64.1)",
    buyerRisk: "Top Trusted Buyer",
    requiredLicenses: "APEDA & Certificate of Origin",
    createdAt: "2026-08-12",
  },
  {
    id: "EXP-TRD-006",
    listingId: "EXP-LST-PEPPER",
    buyer: "Rotterdam Spice Merchants BV",
    country: "Netherlands",
    flag: "🇳🇱",
    product: "Tellicherry Extra Bold Black Pepper (TGSEB)",
    category: "Spices",
    hsCode: "0904.11",
    quantity: 5000,
    unit: "MT",
    originalPrice: 7000,
    originalTradeValue: 35000000,
    finalAgreedPrice: 6950,
    finalTradeValue: 34750000,
    status: "DELIVERED",
    negotiationHistory: [
      { role: "Buyer", price: 6900, quantity: 5000, time: "Aug 05, 09:00" },
      { role: "Exporter", price: 6950, quantity: 5000, time: "Aug 06, 11:30" },
      { role: "Buyer", price: 6950, quantity: 5000, time: "Aug 06, 14:00", note: "Accepted" }
    ],
    origin: "Cochin Port, India",
    destination: "Netherlands",
    destinationPort: "Port of Rotterdam",
    transit: "16 days",
    incoterm: "CIF",
    paymentTerms: "30% Advance, 70% Escrow on Arrival",
    paymentStatus: "Confirmed",
    shipmentId: "SHP-ROT-5412",
    carrier: "Hapag-Lloyd (Vessel: AL MURABBA)",
    billOfLading: "HLCUCO993821",
    deliveryDate: "2026-08-24",
    deliveryStatus: "Pending",
    buyerRisk: "Verified European Trader",
    requiredLicenses: "Spice Board & Phytosanitary",
    createdAt: "2026-08-05",
  },
  {
    id: "EXP-TRD-007",
    listingId: "EXP-LST-TURMERIC",
    buyer: "Hamburg Organic Foods GmbH",
    country: "Germany",
    flag: "🇩🇪",
    product: "Alleppey Finger Turmeric (High Curcumin)",
    category: "Spices",
    hsCode: "0910.30",
    quantity: 8000,
    unit: "MT",
    originalPrice: 2400,
    originalTradeValue: 19200000,
    finalAgreedPrice: 2350,
    finalTradeValue: 18800000,
    status: "DISPUTED",
    negotiationHistory: [
      { role: "Buyer", price: 2350, quantity: 8000, time: "Jul 28, 10:00" },
      { role: "Exporter", price: 2350, quantity: 8000, time: "Jul 28, 16:00" }
    ],
    origin: "Chennai Port, India",
    destination: "Germany",
    destinationPort: "Port of Hamburg",
    transit: "20 days",
    incoterm: "CIF",
    paymentTerms: "Escrow Release after Lab Inspection",
    paymentStatus: "Confirmed",
    shipmentId: "SHP-HAM-1902",
    deliveryDate: "2026-08-20",
    deliveryStatus: "Disputed",
    disputeReason: "Quality / Curcumin level discrepancy (Lab measured 4.8% vs 5.2% specification)",
    disputeDetails: "Eurofins lab test report shows curcumin concentration at 4.85%. Buyer requests a 4% commercial discount or partial credit note before releasing escrow.",
    disputeTimeline: [
      { date: "2026-08-21", author: "Buyer (Hamburg Organic)", note: "Dispute raised: Attached Eurofins test report #EF-9921." },
      { date: "2026-08-23", author: "Exporter", note: "Counter-evidence provided: Government Agmark certified sample retention report." }
    ],
    buyerRisk: "EU Certified Bio Importer",
    requiredLicenses: "Spice Board of India",
    createdAt: "2026-07-28",
  },
  {
    id: "EXP-TRD-008",
    listingId: "EXP-LST-1121",
    buyer: "Jeddah Commodities Import Co.",
    country: "Saudi Arabia",
    flag: "🇸🇦",
    product: "1121 Steam Extra Long Grain Basmati Rice",
    category: "Agriculture",
    hsCode: "1006.30",
    quantity: 30000,
    unit: "MT",
    originalPrice: 1100,
    originalTradeValue: 33000000,
    finalAgreedPrice: 1100,
    finalTradeValue: 33000000,
    status: "SETTLED",
    negotiationHistory: [
      { role: "Buyer", price: 1100, quantity: 30000, time: "Jul 10, 09:00", note: "Accepted list price." }
    ],
    origin: "Nhava Sheva, India",
    destination: "Saudi Arabia",
    destinationPort: "Jeddah Islamic Port",
    transit: "7 days",
    incoterm: "CIF",
    paymentTerms: "100% Escrow Released",
    paymentStatus: "Released",
    shipmentId: "SHP-JED-0092",
    deliveryDate: "2026-08-02",
    deliveryStatus: "Confirmed",
    buyerRisk: "Top Trusted Buyer",
    requiredLicenses: "APEDA Certificate",
    createdAt: "2026-07-10",
  }
];

export const getExportRequest = (requestId: string): ExportRequest | undefined => {
  return INITIAL_EXPORT_REQUESTS.find((req) => req.id === requestId);
};
