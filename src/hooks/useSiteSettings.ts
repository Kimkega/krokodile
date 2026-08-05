import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  id: string;
  site_name: string;
  tagline: string | null;
  logo_url: string | null;
  whatsapp_number: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  x_url: string | null;
  free_shipping_threshold: number | null;
  whatsapp_template: string | null;
};

export const siteSettingsQuery = {
  queryKey: ["site-settings"],
  queryFn: async (): Promise<SiteSettings | null> => {
    const { data } = await supabase.from("site_settings").select("*").limit(1).maybeSingle();
    return (data as SiteSettings | null) ?? null;
  },
  staleTime: 60_000,
};

export function useSiteSettings() {
  const { data } = useQuery(siteSettingsQuery);
  return data ?? null;
}
