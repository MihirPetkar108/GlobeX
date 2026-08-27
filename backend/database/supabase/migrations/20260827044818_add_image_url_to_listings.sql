ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS image_url TEXT;

UPDATE storage.buckets
SET public = true
WHERE id = 'product_images';

CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
	SELECT om.organization_id
	FROM public.organization_members om
	JOIN public.users u ON u.id = om.user_id
	WHERE u.auth_id = auth.uid()
		AND om.is_active = true;
$$;

CREATE POLICY product_images_insert
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
	bucket_id = 'product_images'
	AND (storage.foldername(name))[1] IN (SELECT organization_id::text FROM public.user_org_ids() AS organization_id)
);

CREATE POLICY product_images_update
ON storage.objects
FOR UPDATE TO authenticated
USING (
	bucket_id = 'product_images'
	AND (storage.foldername(name))[1] IN (SELECT organization_id::text FROM public.user_org_ids() AS organization_id)
)
WITH CHECK (
	bucket_id = 'product_images'
	AND (storage.foldername(name))[1] IN (SELECT organization_id::text FROM public.user_org_ids() AS organization_id)
);

CREATE POLICY product_images_delete
ON storage.objects
FOR DELETE TO authenticated
USING (
	bucket_id = 'product_images'
	AND (storage.foldername(name))[1] IN (SELECT organization_id::text FROM public.user_org_ids() AS organization_id)
);

CREATE POLICY product_images_select
ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'product_images');