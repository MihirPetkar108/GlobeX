const { randomUUID } = require('crypto');
const { supabaseAdmin, useMock } = require('../config/db');

const listings = [];
const trades = [];
const blockchainRecords = [];

function now() { return new Date().toISOString(); }

function mapListing(row) {
  return {
    ...row,
    organization_id: row.organization_id,
    certifications: row.certifications || [],
    specs: row.specs || {},
  };
}

async function listListings(filters = {}) {
  if (!useMock && supabaseAdmin) {
    let query = supabaseAdmin.from('listings').select('*, organizations(legal_name,country,city)').order('created_at', { ascending: false });
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.category) query = query.eq('product_category', filters.category);
    if (filters.organization_id) query = query.eq('organization_id', filters.organization_id);
    const { data, error } = await query;
    if (error) { console.warn(`[TradeStore] listings read failed, using local cache: ${error.message}`); return listings.filter((row) => (!filters.status || row.status === filters.status) && (!filters.category || row.product_category === filters.category) && (!filters.organization_id || row.organization_id === filters.organization_id)); }
    return (data || []).map((row) => ({ ...mapListing(row), exporter_name: row.organizations?.legal_name || null, exporter_country: row.organizations?.country || null, exporter_city: row.organizations?.city || null }));
  }
  return listings.filter((row) => (!filters.status || row.status === filters.status) && (!filters.category || row.product_category === filters.category) && (!filters.organization_id || row.organization_id === filters.organization_id));
}

async function createListing(payload) {
  const row = {
    id: randomUUID(), organization_id: payload.organization_id, created_by: payload.created_by || null,
    product_name: payload.product_name, product_category: payload.product_category || null, hs_code: payload.hs_code || null,
    description: payload.description || null, quantity_available: payload.quantity_available ?? null, unit: payload.unit || null,
    price: payload.price ?? null, currency: payload.currency || 'USD', incoterms: payload.incoterms || null,
    status: payload.status || 'ACTIVE', origin_port: payload.origin_port || null, certifications: payload.certifications || [],
    lead_time_days: payload.lead_time_days ?? null, minimum_order_quantity: payload.minimum_order_quantity ?? null,
    specs: payload.specs || {}, created_at: now(), updated_at: now(),
  };
  if (!useMock && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from('listings').insert(row).select().single();
    if (error) { console.warn(`[TradeStore] trades read failed, using local cache: ${error.message}`); return trades.filter((row) => !filters.status || row.status === filters.status).slice(filters.offset || 0, (filters.offset || 0) + (filters.limit || 100)); }
    return data;
  }
  listings.unshift(row);
  return row;
}

async function listTrades(filters = {}) {
  if (!useMock && supabaseAdmin) {
    let query = supabaseAdmin.from('trades').select('*').order('created_at', { ascending: false }).range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 100) - 1);
    if (filters.status) query = query.eq('status', filters.status);
    const { data, error } = await query;
    if (error) return null;
    return data || [];
  }
  return trades.filter((row) => !filters.status || row.status === filters.status).slice(filters.offset || 0, (filters.offset || 0) + (filters.limit || 100));
}

async function getTrade(id) {
  if (!useMock && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from('trades').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }
  return trades.find((row) => row.id === id) || null;
}

async function createTrade(payload) {
  const row = { id: randomUUID(), listing_id: payload.listing_id || null, exporter_id: payload.exporter_id, importer_id: payload.importer_id, status: payload.status || 'CREATED', total_amount: payload.total_amount ?? null, currency: payload.currency || 'USD', quantity: payload.quantity ?? null, agreed_price: payload.agreed_price ?? null, created_at: now(), updated_at: now() };
  if (!useMock && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from('trades').insert(row).select().single();
    if (error) throw error;
    return data;
  }
  trades.unshift(row);
  return row;
}

async function recordBlockchain(row) {
  blockchainRecords.unshift(row);
  if (!useMock && supabaseAdmin) {
    const { error } = await supabaseAdmin.from('blockchain_records').insert(row);
    if (error) throw error;
  }
  return row;
}

async function getLedger(limit = 100) {
  if (!useMock && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from('blockchain_records').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data || [];
  }
  return blockchainRecords.slice(0, limit);
}

module.exports = { listListings, createListing, listTrades, getTrade, createTrade, recordBlockchain, getLedger };
