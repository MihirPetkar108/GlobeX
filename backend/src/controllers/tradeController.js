const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin, useMock } = require('../config/db');

let mockTrades = [];

const PLATFORM_ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN']);

const resolveAppUser = async (authUserId) => {
  if (useMock) return { id: authUserId, platform_role: 'ADMIN' };

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('id, platform_role')
    .eq('auth_id', authUserId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
};

const getMembership = async (authUserId) => {
  if (useMock) {
    return { organization_id: authUserId, app_user_id: authUserId, platform_role: 'ADMIN' };
  }

  const appUser = await resolveAppUser(authUserId);
  if (!appUser) return null;

  const { data, error } = await supabaseAdmin
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', appUser.id)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;
  return { ...data, app_user_id: appUser.id, platform_role: appUser.platform_role };
};

const attachTradeDetails = async (trades) => {
  if (!trades.length) return [];

  const listingIds = [...new Set(trades.map((t) => t.listing_id).filter(Boolean))];
  const orgIds = [...new Set(trades.flatMap((t) => [t.importer_id, t.exporter_id]).filter(Boolean))];

  let listingsById = {};
  let orgsById = {};

  if (!useMock) {
    if (listingIds.length) {
      const { data } = await supabaseAdmin
        .from('listings')
        .select('id, product_name, product_category, hs_code, unit, origin_port, price, incoterms, currency')
        .in('id', listingIds);
      listingsById = Object.fromEntries((data || []).map((row) => [row.id, row]));
    }
    if (orgIds.length) {
      const { data } = await supabaseAdmin
        .from('organizations')
        .select('id, legal_name, trade_name, country')
        .in('id', orgIds);
      orgsById = Object.fromEntries((data || []).map((row) => [row.id, row]));
    }
  }

  return trades.map((trade) => ({
    ...trade,
    listing: listingsById[trade.listing_id] || trade.listing || null,
    importer: orgsById[trade.importer_id] || trade.importer || null,
    exporter: orgsById[trade.exporter_id] || trade.exporter || null
  }));
};

exports.createTrade = async (req, res) => {
  const listingId = req.body.listing_id || req.body.listingId;
  const quantity = Number(req.body.quantity);
  const agreedPrice = Number(req.body.agreed_price ?? req.body.agreedPrice ?? req.body.unit_price);
  const currency = req.body.currency || 'USD';

  console.log('[Trade Creation] Request received:', {
    listingId,
    quantity,
    agreedPrice,
    currency,
    userId: req.user?.id
  });

  if (!listingId) return res.status(400).json({ message: 'listing_id is required.' });
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return res.status(400).json({ message: 'quantity must be a positive number.' });
  }
  if (!Number.isFinite(agreedPrice) || agreedPrice < 0) {
    return res.status(400).json({ message: 'agreed_price must be a non-negative number.' });
  }

  try {
    const member = await getMembership(req.user.id);
    console.log('[Trade Creation] User membership:', member);
    
    // Check if user has organization membership
    if (!member?.organization_id) {
      console.error('[Trade Creation] No organization membership found for user:', req.user?.id);
      // For testing: allow requests without organization by using user ID as fallback
      if (useMock) {
        console.warn('[Trade Creation] Using mock mode fallback - allowing request without organization');
      } else {
        return res.status(403).json({ message: 'Only organization members can send trade requests.' });
      }
    }

    // Use the requesting user's organization as the importer
    // Platform admins can optionally specify a different importer organization
    let importerId = member?.organization_id;
    
    // Fallback for testing without proper organization setup
    if (!importerId && useMock) {
      importerId = req.user.id; // Use user ID as organization ID in mock mode
      console.warn('[Trade Creation] Using user ID as organization ID for mock mode');
    }
    
    if (PLATFORM_ADMIN_ROLES.has(member?.platform_role) && req.body.importer_id) {
      importerId = req.body.importer_id;
    }
    
    if (!importerId) {
      return res.status(400).json({ message: 'Unable to determine importer organization.' });
    }

    const now = new Date().toISOString();
    const totalAmount = Number((quantity * agreedPrice).toFixed(2));

    if (useMock) {
      const listing = { id: listingId, product_name: req.body.product_name, organization_id: req.body.exporter_id };
      const trade = {
        id: uuidv4(),
        listing_id: listingId,
        exporter_id: req.body.exporter_id || listing.organization_id,
        importer_id: importerId,
        status: 'CREATED',
        total_amount: totalAmount,
        currency,
        quantity,
        agreed_price: agreedPrice,
        created_at: now,
        updated_at: now,
        listing,
        importer: { legal_name: 'Buyer', country: 'UAE' }
      };
      mockTrades.unshift(trade);
      return res.status(201).json({ message: 'Trade request created.', trade });
    }

    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('id, organization_id, product_name, product_category, hs_code, unit, origin_port, price, incoterms, currency')
      .eq('id', listingId)
      .maybeSingle();

    if (listingError || !listing) return res.status(404).json({ message: 'Listing not found.' });
    if (!listing.organization_id) {
      return res.status(400).json({ message: 'Listing is missing an exporter organization.' });
    }

    const trade = {
      id: uuidv4(),
      listing_id: listing.id,
      exporter_id: listing.organization_id,
      importer_id: importerId,
      status: 'CREATED',
      total_amount: totalAmount,
      currency,
      quantity,
      agreed_price: agreedPrice,
      created_at: now,
      updated_at: now
    };

    const { data, error } = await supabaseAdmin.from('trades').insert(trade).select('*').single();
    if (error) return res.status(500).json({ message: 'Failed to create trade request.', error: error.message });

    const [hydrated] = await attachTradeDetails([data]);
    return res.status(201).json({ message: 'Trade request created.', trade: hydrated });
  } catch (error) {
    console.error('[Trades] Create error:', error.message);
    return res.status(500).json({ message: 'Failed to create trade request.' });
  }
};

exports.getTrades = async (req, res) => {
  try {
    const member = await getMembership(req.user.id);
    
    // Platform admins can view all trades or filter by organization
    if (PLATFORM_ADMIN_ROLES.has(member?.platform_role)) {
      const listingId = req.query.listing_id || req.query.listingId;
      const organizationId = req.query.organization_id;

      if (useMock) {
        let results = mockTrades;
        if (listingId) results = results.filter((trade) => trade.listing_id === listingId);
        if (organizationId) {
          results = results.filter((trade) => 
            trade.importer_id === organizationId || trade.exporter_id === organizationId
          );
        }
        return res.status(200).json({ trades: results });
      }

      let query = supabaseAdmin
        .from('trades')
        .select('*')
        .order('created_at', { ascending: false });

      if (listingId) query = query.eq('listing_id', listingId);
      if (organizationId) {
        query = query.or(`importer_id.eq.${organizationId},exporter_id.eq.${organizationId}`);
      }

      const { data, error } = await query;
      if (error) return res.status(500).json({ message: 'Failed to fetch trades.', error: error.message });

      const trades = await attachTradeDetails(data || []);
      return res.status(200).json({ trades });
    }

    // Regular users can only view their organization's trades
    if (!member?.organization_id) {
      return res.status(403).json({ message: 'Only organization members can view trade requests.' });
    }

    const role = req.query.role === 'importer' ? 'importer' : 'exporter';
    const listingId = req.query.listing_id || req.query.listingId;

    if (useMock) {
      let results = mockTrades.filter((trade) =>
        role === 'importer'
          ? trade.importer_id === member.organization_id
          : trade.exporter_id === member.organization_id
      );
      if (listingId) results = results.filter((trade) => trade.listing_id === listingId);
      return res.status(200).json({ trades: results });
    }

    let query = supabaseAdmin
      .from('trades')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by organization ID based on role
    if (role === 'importer') {
      query = query.eq('importer_id', member.organization_id);
    } else {
      // For exporters, show trades where their organization is the exporter
      query = query.eq('exporter_id', member.organization_id);
    }
    
    if (listingId) query = query.eq('listing_id', listingId);

    const { data, error } = await query;
    if (error) return res.status(500).json({ message: 'Failed to fetch trades.', error: error.message });

    const trades = await attachTradeDetails(data || []);
    return res.status(200).json({ trades });
  } catch (error) {
    console.error('[Trades] Fetch error:', error.message);
    return res.status(500).json({ message: 'Failed to fetch trades.' });
  }
};
