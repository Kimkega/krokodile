-- site settings additions
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS public_base_url text,
  ADD COLUMN IF NOT EXISTS courier_contact_note text;

-- order additions
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS courier_contact text,
  ADD COLUMN IF NOT EXISTS delivery_note_no text;

-- certificates link to a real order
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS order_code text,
  ADD COLUMN IF NOT EXISTS buyer_name text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- SMTP configuration (service role only)
CREATE TABLE IF NOT EXISTS public.smtp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host text,
  port integer NOT NULL DEFAULT 587,
  secure boolean NOT NULL DEFAULT false,
  username text,
  password text,
  from_name text,
  from_email text,
  reply_to text,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.smtp_config TO service_role;
ALTER TABLE public.smtp_config ENABLE ROW LEVEL SECURITY;

-- Email templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read email templates" ON public.email_templates;
CREATE POLICY "Admins read email templates" ON public.email_templates
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS smtp_config_touch ON public.smtp_config;
CREATE TRIGGER smtp_config_touch BEFORE UPDATE ON public.smtp_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS email_templates_touch ON public.email_templates;
CREATE TRIGGER email_templates_touch BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.email_templates (key, label, subject, body) VALUES
  ('order_placed', 'Order placed', 'Order {{order_code}} received — {{site_name}}',
   'Hello {{customer_name}},

We have received your order {{order_code}}.

{{items}}

Total: {{total}}
Payment: {{payment_status}}

If payment did not go through you can complete it here: {{pay_url}}

Thank you,
{{site_name}}'),
  ('payment_received', 'Payment received', 'Payment confirmed for {{order_code}}',
   'Hello {{customer_name}},

We have received {{total}} for order {{order_code}}. M-Pesa code: {{mpesa_receipt}}.

Track your delivery: {{track_url}}

{{site_name}}'),
  ('payment_failed', 'Payment not completed', 'Complete your payment for {{order_code}}',
   'Hello {{customer_name}},

Your payment for order {{order_code}} was not completed.

Retry securely here: {{pay_url}}

{{site_name}}'),
  ('order_packed', 'Order packed', 'Order {{order_code}} is packed',
   'Hello {{customer_name}},

Order {{order_code}} has been packed and is being prepared for dispatch.

{{site_name}}'),
  ('courier_assigned', 'Courier assigned', 'Courier assigned for {{order_code}}',
   'Hello {{customer_name}},

{{courier}} will handle delivery of order {{order_code}}. Reference: {{tracking_ref}}.
Courier contact: {{courier_contact}}

Track: {{track_url}}

{{site_name}}'),
  ('in_transit', 'Out for delivery', 'Order {{order_code}} is on the way',
   'Hello {{customer_name}},

Order {{order_code}} is in transit with {{courier}} ({{tracking_ref}}).

Track: {{track_url}}

{{site_name}}'),
  ('delivered', 'Delivered', 'Order {{order_code}} delivered',
   'Hello {{customer_name}},

Order {{order_code}} has been delivered. Thank you for choosing {{site_name}}.

Verify your authenticity card: {{verify_url}}'),
  ('cancelled', 'Order cancelled', 'Order {{order_code}} cancelled',
   'Hello {{customer_name}},

Order {{order_code}} has been cancelled. Talk to us if this is unexpected.

{{site_name}}')
ON CONFLICT (key) DO NOTHING;