-- 1. Allow anonymous read of the media bucket so images work on any host without a service key
DROP POLICY IF EXISTS "media public read" ON storage.objects;
CREATE POLICY "media public read" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'media');

-- 2. Certificates carry buyer + delivery detail
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS certificates_code_key ON public.certificates (code);

-- 3. Every product automatically gets an authenticity certificate on creation
CREATE OR REPLACE FUNCTION public.gen_certificate_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  part1 text := '';
  part2 text := '';
  i int;
BEGIN
  FOR i IN 1..4 LOOP
    part1 := part1 || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    part2 := part2 || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  RETURN 'KD-' || part1 || '-' || part2;
END;
$$;

CREATE OR REPLACE FUNCTION public.products_issue_certificate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  tries int := 0;
BEGIN
  LOOP
    new_code := public.gen_certificate_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.certificates WHERE code = new_code) OR tries > 10;
    tries := tries + 1;
  END LOOP;

  INSERT INTO public.certificates (code, serial, product_id, product_name, status, notes)
  VALUES (
    new_code,
    to_char(now(), 'YYYY') || '-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 6)),
    NEW.id,
    NEW.name,
    'active',
    'Auto-issued when the product was created.'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_issue_certificate ON public.products;
CREATE TRIGGER products_issue_certificate
  AFTER INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.products_issue_certificate();

INSERT INTO public.certificates (code, serial, product_id, product_name, status, notes)
SELECT public.gen_certificate_code(),
       to_char(now(), 'YYYY') || '-' || upper(substr(replace(p.id::text, '-', ''), 1, 6)),
       p.id, p.name, 'active', 'Auto-issued backfill.'
FROM public.products p
WHERE NOT EXISTS (SELECT 1 FROM public.certificates c WHERE c.product_id = p.id);