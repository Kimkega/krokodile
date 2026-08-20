import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SeoSettings = {
  id: string;
  default_title: string;
  title_suffix: string | null;
  default_description: string;
  default_keywords: string | null;
  og_image_url: string | null;
  canonical_base_url: string | null;
  google_site_verification: string | null;
  bing_site_verification: string | null;
  robots_extra: string | null;
  twitter_handle: string | null;
  organization_name: string | null;
  organization_logo_url: string | null;
  sitemap_enabled: boolean;
  indexing_enabled: boolean;
};

export type SeoPage = {
  id: string;
  path: string;
  label: string;
  title: string | null;
  description: string | null;
  keywords: string | null;
  priority: number;
  changefreq: string;
  in_sitemap: boolean;
  indexed: boolean;
  sort_order: number;
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  active: boolean;
};

export const seoSettingsQuery = {
  queryKey: ["seo-settings"],
  queryFn: async (): Promise<SeoSettings | null> => {
    const { data } = await supabase.from("seo_settings").select("*").limit(1).maybeSingle();
    return (data as SeoSettings | null) ?? null;
  },
  staleTime: 5 * 60_000,
};

export const faqsQuery = {
  queryKey: ["faqs"],
  queryFn: async (): Promise<Faq[]> => {
    const { data } = await supabase
      .from("faqs")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    return (data as Faq[] | null) ?? [];
  },
  staleTime: 10 * 60_000,
};

export function useSeoSettings() {
  return useQuery(seoSettingsQuery).data ?? null;
}

export function useFaqs() {
  return useQuery(faqsQuery).data ?? [];
}
