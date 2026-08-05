-- products: low stock threshold
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 3;

-- site settings: whatsapp follow-up template
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS whatsapp_template text;

-- guest advertising purchases
CREATE TABLE IF NOT EXISTS public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_code text NOT NULL UNIQUE,
  advertiser_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  title text NOT NULL,
  body text,
  image_url text,
  target_url text,
  placement text NOT NULL DEFAULT 'home_banner',
  days integer NOT NULL DEFAULT 7,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'pending',
  payment_message text,
  mpesa_receipt text,
  checkout_request_id text,
  merchant_request_id text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ads TO authenticated;
GRANT SELECT ON public.ads TO anon;
GRANT ALL ON public.ads TO service_role;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads public read live" ON public.ads FOR SELECT TO anon, authenticated
  USING (status = 'approved' AND payment_status = 'paid' AND (ends_at IS NULL OR ends_at > now()));
CREATE POLICY "ads admin write" ON public.ads FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER ads_touch BEFORE UPDATE ON public.ads FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- brand authenticity certificates
CREATE TABLE IF NOT EXISTS public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  serial text,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  issued_to text,
  notes text,
  status text NOT NULL DEFAULT 'active',
  scans integer NOT NULL DEFAULT 0,
  last_scanned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certificates admin all" ON public.certificates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));