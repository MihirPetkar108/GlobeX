-- ============================================================================
-- GlobeXAI Trade OS — Complete Supabase PostgreSQL Schema Setup Script
-- Execute this script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Organizations / Trade Partners Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    business_type VARCHAR(50) DEFAULT 'EXPORTER', -- EXPORTER, IMPORTER, FREIGHT_FORWARDER
    is_verified BOOLEAN DEFAULT TRUE,
    trust_score NUMERIC(5,2) DEFAULT 92.50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Trust Scores Table
CREATE TABLE IF NOT EXISTS public.trust_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    composite_score NUMERIC(5,2) DEFAULT 90.00,
    trade_volume_usd NUMERIC(15,2) DEFAULT 500000.00,
    completed_trades INT DEFAULT 12,
    dispute_count INT DEFAULT 0,
    risk_level VARCHAR(20) DEFAULT 'LOW',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Trade Analysis & AI Opportunity Log Table
CREATE TABLE IF NOT EXISTS public.trade_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id VARCHAR(100) UNIQUE NOT NULL,
    product_name TEXT NOT NULL,
    hs6_code INT NOT NULL,
    origin_country VARCHAR(3) NOT NULL,
    destination_country VARCHAR(3) NOT NULL,
    quantity_kg NUMERIC(15,2) NOT NULL,
    forecast_demand_mt NUMERIC(15,2),
    expected_fob_price NUMERIC(10,2),
    opportunity_score NUMERIC(5,2),
    risk_level VARCHAR(20),
    anomaly_flag BOOLEAN DEFAULT FALSE,
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Trades & Escrow Agreements Table
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id VARCHAR(100) UNIQUE NOT NULL,
    exporter_id UUID REFERENCES public.organizations(id),
    importer_id UUID REFERENCES public.organizations(id),
    product_name TEXT NOT NULL,
    hs6_code INT NOT NULL,
    quantity_kg NUMERIC(15,2) NOT NULL,
    unit_price_usd NUMERIC(10,2) NOT NULL,
    total_value_usd NUMERIC(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING_DOCUMENT_VERIFICATION', -- PENDING, ESCROW_LOCKED, SHIPPED, COMPLETED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Escrow Accounts Table
CREATE TABLE IF NOT EXISTS public.escrow_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id VARCHAR(100) NOT NULL,
    escrow_vault_address VARCHAR(100) NOT NULL,
    token_symbol VARCHAR(10) DEFAULT 'USDC',
    amount_locked NUMERIC(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'LOCKED', -- LOCKED, RELEASED, DISPUTED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Blockchain Records & Bill of Lading Anchors Table
CREATE TABLE IF NOT EXISTS public.blockchain_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id VARCHAR(100) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_hash VARCHAR(100) NOT NULL,
    tx_hash VARCHAR(100) NOT NULL,
    chain_id INT DEFAULT 137, -- Polygon Mainnet
    anchored_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Trade Documents & OCR Verification Table
CREATE TABLE IF NOT EXISTS public.trade_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id VARCHAR(100) NOT NULL,
    document_name TEXT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    sha256_hash VARCHAR(100) NOT NULL,
    ocr_status VARCHAR(50) DEFAULT 'VERIFIED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Shipments & Maritime Tracking Table
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id VARCHAR(100) UNIQUE NOT NULL,
    trade_id VARCHAR(100) NOT NULL,
    vessel_name TEXT DEFAULT 'MV GLOBEX MARINER',
    imo_number VARCHAR(20) DEFAULT 'IMO 9812345',
    origin_port VARCHAR(50) DEFAULT 'INNSA',
    destination_port VARCHAR(50) DEFAULT 'AEJEA',
    current_lat NUMERIC(10,6) DEFAULT 24.8607,
    current_lng NUMERIC(10,6) DEFAULT 67.0011,
    status VARCHAR(50) DEFAULT 'IN_TRANSIT',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Enable Row Level Security (RLS) & Grant Public Read/Write Access for n8n API
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blockchain_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policies for public anon key access
CREATE POLICY "Allow public select on organizations" ON public.organizations FOR SELECT USING (true);
CREATE POLICY "Allow public insert on organizations" ON public.organizations FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select on trust_scores" ON public.trust_scores FOR SELECT USING (true);
CREATE POLICY "Allow public insert on trust_scores" ON public.trust_scores FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select on trade_analysis" ON public.trade_analysis FOR SELECT USING (true);
CREATE POLICY "Allow public insert on trade_analysis" ON public.trade_analysis FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select on trades" ON public.trades FOR SELECT USING (true);
CREATE POLICY "Allow public insert on trades" ON public.trades FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select on escrow_accounts" ON public.escrow_accounts FOR SELECT USING (true);
CREATE POLICY "Allow public insert on escrow_accounts" ON public.escrow_accounts FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select on blockchain_records" ON public.blockchain_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert on blockchain_records" ON public.blockchain_records FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select on trade_documents" ON public.trade_documents FOR SELECT USING (true);
CREATE POLICY "Allow public insert on trade_documents" ON public.trade_documents FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select on shipments" ON public.shipments FOR SELECT USING (true);
CREATE POLICY "Allow public insert on shipments" ON public.shipments FOR INSERT WITH CHECK (true);

-- Seed Sample Institutional Exporters & Importers
INSERT INTO public.organizations (name, country_code, business_type, is_verified, trust_score)
VALUES 
    ('Acme Exports Ltd', 'IND', 'EXPORTER', true, 94.50),
    ('Malabar Spices & Extracts Co.', 'IND', 'EXPORTER', true, 91.20),
    ('Al-Hamad Global Foods Trading LLC', 'ARE', 'IMPORTER', true, 96.00),
    ('Tokyo Commodities Import Corp', 'JPN', 'IMPORTER', true, 98.40),
    ('American Rice & Agri Import LLC', 'USA', 'IMPORTER', true, 97.10)
ON CONFLICT DO NOTHING;
