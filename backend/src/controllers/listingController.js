const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin, useMock } = require('../config/db');

const LISTING_STATUSES = new Set(['ACTIVE', 'SOLD_OUT']);
const PAGE_SIZE_LIMIT = 100;

let mockListings = [];

const getListingInput = (body = {}) => ({
  product_name: body.product_name ?? body.productName,
  product_category: body.product_category ?? body.productCategory,
  hs_code: body.hs_code ?? body.hsCode,
  description: body.description,
  quantity_available: body.quantity_available ?? body.quantityAvailable,
  unit: body.unit,
  price: body.price,
  currency: body.currency,
  incoterms: body.incoterms,
  origin_port: body.origin_port ?? body.originPort,
  certifications: body.certifications,
  lead_time_days: body.lead_time_days ?? body.leadTimeDays,
  minimum_order_quantity: body.minimum_order_quantity ?? body.minimumOrderQuantity,
  specs: body.specs
});

const validateListing = (listing, { partial = false } = {}) => {
  const requiredFields = [
    'product_name',
    'product_category',
    'quantity_available',
    'unit',
    'price',
    'currency',
    'incoterms'
  ];

  if (!partial) {
    const missingField = requiredFields.find((field) => {
      return listing[field] === undefined || listing[field] === null || listing[field] === '';
    });
    if (missingField) return `Missing required field: ${missingField}.`;
  }

  if (listing.quantity_available !== undefined &&
      (!Number.isFinite(Number(listing.quantity_available)) || Number(listing.quantity_available) <= 0)) {
    return 'quantity_available must be a positive number.';
  }

  if (listing.price !== undefined &&
      (!Number.isFinite(Number(listing.price)) || Number(listing.price) < 0)) {
    return 'price must be a non-negative number.';
  }

  if (listing.status !== undefined && !LISTING_STATUSES.has(listing.status)) {
    return 'status must be ACTIVE or SOLD_OUT.';
  }

  return null;
};

const getPagination = (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), PAGE_SIZE_LIMIT);
  return { page, limit, offset: (page - 1) * limit };
};

const getAuthenticatedOrganization = async (userId) => {
  if (useMock) {
    return {
      organization_id: null,
      organization_role: 'ORGANIZATION_ADMIN',
      organizations: { business_type: 'EXPORTER' }
    };
  }

  const { data, error } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id, organization_role, organizations(business_type, verification_status)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !data) return null;
  return data;
};

const canManageListings = (member) => {
  if (!member) return false;
  return ['ORGANIZATION_ADMIN', 'SALES'].includes(member.organization_role) &&
    ['EXPORTER', 'BOTH'].includes(member.organizations?.business_type);
};

const formatListingResponse = (listing) => ({
  ...listing,
  productName: listing.product_name,
  productCategory: listing.product_category,
  hsCode: listing.hs_code,
  quantityAvailable: listing.quantity_available,
  organization: listing.organizations || undefined
});

exports.getListings = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const { category, product_category: productCategory, status = 'ACTIVE', search, currency, organization_id: organizationId } = req.query;

  if (status && !LISTING_STATUSES.has(status)) {
    return res.status(400).json({ message: 'status must be ACTIVE or SOLD_OUT.' });
  }

  try {
    if (useMock) {
      let results = mockListings.filter((listing) => listing.status === status);
      if (organizationId) results = results.filter((listing) => listing.organization_id === organizationId);
      const requestedCategory = category || productCategory;
      if (requestedCategory) results = results.filter((listing) => listing.product_category === requestedCategory);
      if (currency) results = results.filter((listing) => listing.currency === currency);
      if (search) {
        const query = search.toLowerCase();
        results = results.filter((listing) => `${listing.product_name} ${listing.description || ''}`.toLowerCase().includes(query));
      }

      const total = results.length;
      return res.status(200).json({
        listings: results.slice(offset, offset + limit).map(formatListingResponse),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      });
    }

    let query = supabaseAdmin
      .from('listings')
      .select('*, organizations(id, legal_name, trade_name, country, verification_status)', { count: 'exact' })
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const requestedCategory = category || productCategory;
    if (organizationId) query = query.eq('organization_id', organizationId);
    if (requestedCategory) query = query.eq('product_category', requestedCategory);
    if (currency) query = query.eq('currency', currency);
    if (search) query = query.ilike('product_name', `%${search}%`);

    const { data, count, error } = await query;
    if (error) return res.status(500).json({ message: 'Failed to fetch marketplace listings.', error: error.message });

    return res.status(200).json({
      listings: (data || []).map(formatListingResponse),
      pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) }
    });
  } catch (error) {
    console.error('[Listings] Fetch error:', error.message);
    return res.status(500).json({ message: 'Failed to fetch marketplace listings.' });
  }
};

exports.getListingById = async (req, res) => {
  try {
    if (useMock) {
      const listing = mockListings.find((item) => item.id === req.params.id);
      return listing
        ? res.status(200).json({ listing: formatListingResponse(listing) })
        : res.status(404).json({ message: 'Listing not found.' });
    }

    const { data, error } = await supabaseAdmin
      .from('listings')
      .select('*, organizations(id, legal_name, trade_name, country, verification_status)')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ message: 'Listing not found.' });
    return res.status(200).json({ listing: formatListingResponse(data) });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch listing.' });
  }
};

exports.createListing = async (req, res) => {
  const listingInput = getListingInput(req.body);
  if (!listingInput.currency) listingInput.currency = 'USD';
  if (!listingInput.incoterms) listingInput.incoterms = 'FOB';
  const validationError = validateListing(listingInput);
  if (validationError) return res.status(400).json({ message: validationError });

  try {
    const member = await getAuthenticatedOrganization(req.user.id);
    if (!canManageListings(member)) {
      return res.status(403).json({ message: 'Only active exporter organization members can create listings.' });
    }

    const now = new Date().toISOString();
    const listing = {
      id: uuidv4(),
      ...listingInput,
      quantity_available: Number(listingInput.quantity_available),
      price: Number(listingInput.price),
      organization_id: member.organization_id,
      created_by: req.user.id,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now
    };

    if (useMock) {
      listing.organization_id = req.user.orgId || req.user.id;
      mockListings.push(listing);
      return res.status(201).json({ message: 'Trade request created as a marketplace listing.', listing: formatListingResponse(listing) });
    }

    const { data, error } = await supabaseAdmin.from('listings').insert(listing).select('*').single();
    if (error) return res.status(500).json({ message: 'Failed to create marketplace listing.', error: error.message });
    return res.status(201).json({ message: 'Trade request created as a marketplace listing.', listing: formatListingResponse(data) });
  } catch (error) {
    console.error('[Listings] Create error:', error.message);
    return res.status(500).json({ message: 'Failed to create marketplace listing.' });
  }
};

const updateListing = async (req, res) => {
  const updates = getListingInput(req.body);
  if (req.body.status !== undefined) updates.status = req.body.status;
  const validationError = validateListing(updates, { partial: true });
  if (validationError) return res.status(400).json({ message: validationError });

  try {
    const member = await getAuthenticatedOrganization(req.user.id);
    if (!canManageListings(member)) return res.status(403).json({ message: 'You cannot manage marketplace listings.' });

    if (useMock) {
      const listing = mockListings.find((item) => item.id === req.params.id && item.created_by === req.user.id);
      if (!listing) return res.status(404).json({ message: 'Listing not found.' });
      Object.assign(listing, updates, { updated_at: new Date().toISOString() });
      return res.status(200).json({ listing: formatListingResponse(listing) });
    }

    const { data, error } = await supabaseAdmin
      .from('listings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('organization_id', member.organization_id)
      .select('*')
      .single();
    if (error || !data) return res.status(404).json({ message: 'Listing not found.' });
    return res.status(200).json({ listing: formatListingResponse(data) });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update listing.' });
  }
};

exports.updateListing = updateListing;

exports.deleteListing = async (req, res) => {
  try {
    const member = await getAuthenticatedOrganization(req.user.id);
    if (!canManageListings(member)) return res.status(403).json({ message: 'You cannot manage marketplace listings.' });

    if (useMock) {
      const listingIndex = mockListings.findIndex((item) => item.id === req.params.id && item.created_by === req.user.id);
      if (listingIndex === -1) return res.status(404).json({ message: 'Listing not found.' });
      mockListings.splice(listingIndex, 1);
      return res.status(204).send();
    }

    const { error } = await supabaseAdmin
      .from('listings')
      .delete()
      .eq('id', req.params.id)
      .eq('organization_id', member.organization_id);
    if (error) return res.status(500).json({ message: 'Failed to delete listing.', error: error.message });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete listing.' });
  }
};