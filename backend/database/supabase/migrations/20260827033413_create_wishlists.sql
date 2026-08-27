CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_user_listing_wishlist UNIQUE (user_id, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user_id
    ON public.wishlists(user_id);

CREATE INDEX IF NOT EXISTS idx_wishlists_listing_id
    ON public.wishlists(listing_id);

COMMENT ON TABLE public.wishlists IS
    'Saved/bookmarked marketplace listings for importer and exporter users.';

COMMENT ON COLUMN public.wishlists.user_id IS
    'References public.users(id) of the user who saved the listing.';

COMMENT ON COLUMN public.wishlists.listing_id IS
    'References public.listings(id) of the saved commodity/product.';

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wishlist items"
    ON public.wishlists
    FOR SELECT
    TO authenticated
    USING (user_id = public.current_app_user_id());

CREATE POLICY "Users can add items to their wishlist"
    ON public.wishlists
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = public.current_app_user_id());

CREATE POLICY "Users can remove items from their wishlist"
    ON public.wishlists
    FOR DELETE
    TO authenticated
    USING (user_id = public.current_app_user_id());