-- GLOBEX — Marketplace demo listings
-- Adds a small set of active products for the frontend marketplace.

insert into public.listings (
  id,
  organization_id,
  created_by,
  product_name,
  product_category,
  hs_code,
  description,
  quantity_available,
  unit,
  price,
  currency,
  incoterms,
  status,
  origin_port,
  certifications,
  lead_time_days,
  minimum_order_quantity,
  specs,
  created_at,
  updated_at
)
values
  ('00000004-0000-0000-0000-00000000012d', '00000002-0000-0000-0000-000000000001', '00000001-0000-0000-0000-00000000000f', 'Premium Organic Basmati Rice 1121', 'Agriculture', '1006.30', 'Aged extra-long grain basmati rice for wholesale export.', 250, 'MT', 1320, 'USD', 'CIF', 'ACTIVE', 'Mundra Port', '{APEDA,FSSAI,ISO 22000}', 14, 25, '{"Grain Length":"8.35 mm+","Moisture":"Max 12%"}', now(), now()),
  ('00000004-0000-0000-0000-00000000012e', '00000002-0000-0000-0000-000000000002', '00000001-0000-0000-0000-000000000012', 'Tellicherry Black Pepper TGSEB', 'Spices', '0904.11', 'Bold whole black peppercorns with high volatile oil content.', 80, 'MT', 6450, 'USD', 'FOB', 'ACTIVE', 'Cochin Port', '{Spices Board,ISO 22000}', 10, 10, '{"Grade":"TGSEB","Moisture":"Max 11%"}', now(), now()),
  ('00000004-0000-0000-0000-00000000012f', '00000002-0000-0000-0000-000000000006', '00000001-0000-0000-0000-00000000001e', 'Organic Cotton Yarn 30s/1', 'Textiles', '5205.22', 'GOTS-ready combed cotton yarn for textile manufacturers.', 120, 'MT', 3890, 'USD', 'CIF', 'ACTIVE', 'Chennai Port', '{GOTS,GRS,ISO 9001}', 21, 20, '{"Count":"30s/1","Material":"100% combed cotton"}', now(), now()),
  ('00000004-0000-0000-0000-000000000130', '00000002-0000-0000-0000-00000000000d', '00000001-0000-0000-0000-000000000033', 'Virgin HDPE Film Grade Granules', 'Chemicals', '3901.20', 'Consistent melt-flow virgin HDPE resin for flexible packaging.', 300, 'MT', 1095, 'USD', 'FOB', 'ACTIVE', 'Nhava Sheva Port', '{ISO 9001,REACH}', 18, 25, '{"MFI":"0.05 g/10 min","Grade":"Film grade"}', now(), now()),
  ('00000004-0000-0000-0000-000000000131', '00000002-0000-0000-0000-00000000001a', '00000001-0000-0000-0000-000000000051', 'Grade A Electrolytic Copper Cathodes', 'Metals', '7403.11', 'LME-grade copper cathodes suitable for industrial processing.', 100, 'MT', 8620, 'USD', 'CIF', 'ACTIVE', 'Mundra Port', '{LME Registered,ISO 14001}', 28, 10, '{"Purity":"99.99%","Form":"Cathodes"}', now(), now())
on conflict (id) do nothing;