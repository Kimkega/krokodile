-- 1. Ads: stop exposing advertiser contact details publicly
DROP POLICY IF EXISTS "ads public read live" ON public.ads;

CREATE OR REPLACE VIEW public.ads_public
WITH (security_invoker = off) AS
SELECT id, title, body, image_url, target_url, placement, starts_at, ends_at
FROM public.ads
WHERE status = 'approved'
  AND payment_status = 'paid'
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at > now());

GRANT SELECT ON public.ads_public TO anon, authenticated;

-- 2. Couriers: hide phone numbers from the public
DROP POLICY IF EXISTS "couriers public read" ON public.couriers;

CREATE OR REPLACE VIEW public.couriers_public
WITH (security_invoker = off) AS
SELECT id, name, kind, active
FROM public.couriers
WHERE active = true;

GRANT SELECT ON public.couriers_public TO anon, authenticated;

-- 3. Lock down security definer helpers that end users must never call
REVOKE ALL ON FUNCTION public.gen_certificate_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.products_issue_certificate() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- 4. SEO configuration
CREATE TABLE IF NOT EXISTS public.seo_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  default_title text NOT NULL DEFAULT 'KROKO DILE — Luxury Leather Bags in Kenya',
  title_suffix text DEFAULT ' | KROKO DILE',
  default_description text NOT NULL DEFAULT 'Hand-finished luxury leather bags for men and women. M-Pesa checkout and countrywide delivery in Kenya.',
  default_keywords text DEFAULT 'luxury bags Kenya, leather handbags Nairobi, men bags Kenya, women handbags',
  og_image_url text,
  canonical_base_url text,
  google_site_verification text,
  bing_site_verification text,
  robots_extra text,
  twitter_handle text,
  organization_name text DEFAULT 'KROKO DILE',
  organization_logo_url text,
  sitemap_enabled boolean NOT NULL DEFAULT true,
  indexing_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seo_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seo_settings TO authenticated;
GRANT ALL ON public.seo_settings TO service_role;
ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo settings public read" ON public.seo_settings FOR SELECT USING (true);
CREATE POLICY "seo settings admin write" ON public.seo_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER seo_settings_touch BEFORE UPDATE ON public.seo_settings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.seo_settings (id) SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.seo_settings);

-- 5. Per-page SEO mapping (sitemap + meta overrides)
CREATE TABLE IF NOT EXISTS public.seo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL UNIQUE,
  label text NOT NULL,
  title text,
  description text,
  keywords text,
  priority numeric NOT NULL DEFAULT 0.6,
  changefreq text NOT NULL DEFAULT 'weekly',
  in_sitemap boolean NOT NULL DEFAULT true,
  indexed boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seo_pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.seo_pages TO authenticated;
GRANT ALL ON public.seo_pages TO service_role;
ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo pages public read" ON public.seo_pages FOR SELECT USING (true);
CREATE POLICY "seo pages admin write" ON public.seo_pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER seo_pages_touch BEFORE UPDATE ON public.seo_pages
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.seo_pages (path, label, title, description, priority, changefreq, sort_order) VALUES
  ('/', 'Home', 'KROKO DILE — Luxury Leather Bags for Men & Women in Kenya', 'Hand-finished luxury bags from Nairobi. Pay with M-Pesa, delivered to every county in Kenya.', 1.0, 'daily', 1),
  ('/shop', 'Shop', 'Shop Luxury Leather Bags — KROKO DILE', 'Browse handcrafted leather bags for men and women. Filter by category, price and material.', 0.9, 'daily', 2),
  ('/verify', 'Verify authenticity', 'Verify Your KROKO DILE Authenticity Certificate', 'Scan or enter your certificate code to confirm your bag is a genuine KROKO DILE piece.', 0.7, 'monthly', 3),
  ('/track', 'Track order', 'Track Your KROKO DILE Order', 'Track your order with the email and phone number used at checkout.', 0.6, 'weekly', 4),
  ('/advertise', 'Advertise', 'Advertise on KROKO DILE', 'Buy a banner placement on Kenya''s luxury leather store.', 0.4, 'monthly', 5),
  ('/terms', 'Terms & Policies', 'Terms, Privacy & Delivery Policy — KROKO DILE', 'Our terms of sale, privacy policy, delivery, returns and payment terms.', 0.3, 'yearly', 6)
ON CONFLICT (path) DO NOTHING;

-- 6. FAQ content for search engines (FAQPage rich results)
CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.faqs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faqs TO authenticated;
GRANT ALL ON public.faqs TO service_role;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faqs public read" ON public.faqs FOR SELECT USING (active = true);
CREATE POLICY "faqs admin write" ON public.faqs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER faqs_touch BEFORE UPDATE ON public.faqs
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.faqs (question, answer, category, sort_order) VALUES
  ('Are KROKO DILE bags genuine leather?', 'Yes. Every bag is cut and stitched by hand from full-grain leather in Nairobi, and ships with a unique authenticity certificate you can verify online.', 'product', 1),
  ('How do I pay?', 'Checkout uses M-Pesa Express (STK push). Enter your phone number, approve the prompt, and your receipt is generated instantly. If a payment fails you can retry from your order page.', 'payment', 2),
  ('Do you deliver outside Nairobi?', 'We deliver to every county, sub-county and ward in Kenya through our courier and matatu SACCO partners. Shipping fees are shown at checkout.', 'delivery', 3),
  ('How long does delivery take?', 'Nairobi orders arrive within 24-48 hours. Upcountry deliveries typically take 2-4 working days depending on the courier.', 'delivery', 4),
  ('How do I verify my bag is original?', 'Scan the QR code on your authenticity card, or enter the KD- code on our Verify page. You will see the buyer name, order and payment date.', 'authenticity', 5),
  ('Can I return or exchange a bag?', 'Unused bags in original packaging can be exchanged within 7 days of delivery. Contact us with your order code to arrange it.', 'returns', 6)
ON CONFLICT DO NOTHING;

-- 7. Storage: scope public media reads to public content prefixes only
DROP POLICY IF EXISTS "media public read" ON storage.objects;
CREATE POLICY "media public prefixes read" ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] IN ('products', 'branding', 'ads', 'categories', 'public')
);