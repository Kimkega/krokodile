DROP VIEW IF EXISTS public.ads_public;
DROP VIEW IF EXISTS public.couriers_public;

-- Ads: public may read live adverts, but only the display columns (no email/phone)
REVOKE SELECT ON public.ads FROM anon;
GRANT SELECT (id, title, body, image_url, target_url, placement, starts_at, ends_at, status, payment_status)
  ON public.ads TO anon;
CREATE POLICY "ads public read live" ON public.ads FOR SELECT TO anon
USING (status = 'approved' AND payment_status = 'paid' AND (ends_at IS NULL OR ends_at > now()));

-- Couriers: public may read the directory, but not phone numbers
REVOKE SELECT ON public.couriers FROM anon, authenticated;
GRANT SELECT (id, name, kind, active, created_at) ON public.couriers TO anon;
GRANT SELECT (id, name, kind, active, created_at, notes, phone) ON public.couriers TO authenticated;
CREATE POLICY "couriers public read" ON public.couriers FOR SELECT TO anon USING (active = true);
CREATE POLICY "couriers staff read" ON public.couriers FOR SELECT TO authenticated USING (true);