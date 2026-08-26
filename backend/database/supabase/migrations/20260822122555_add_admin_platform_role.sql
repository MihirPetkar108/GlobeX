-- Add ADMIN role to public.platform_role enum, positioned after SUPER_ADMIN.
ALTER TYPE public.platform_role ADD VALUE 'ADMIN' AFTER 'SUPER_ADMIN';
