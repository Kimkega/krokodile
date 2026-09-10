import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { seoSettingsQuery, type SeoSettings, type SeoPage, type Faq } from "@/hooks/useSeo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/kingdanstore/seo")({
  component: AdminSeo,
});

const SETTING_FIELDS: [keyof SeoSettings, string, string?][] = [
  ["default_title", "Default page title", "Under 60 characters"],
  ["title_suffix", "Title suffix", "e.g. | KROKO DILE"],
  ["default_description", "Default description", "Under 160 characters"],
  ["default_keywords", "Default keywords", "Comma separated"],
  ["canonical_base_url", "Canonical website address", "https://yourdomain.com"],
  ["og_image_url", "Share image address", "Used when links are shared"],
  ["organization_name", "Business name", ""],
  ["organization_logo_url", "Business logo address", ""],
  ["twitter_handle", "X / Twitter handle", "@krokodile"],
  ["google_site_verification", "Google verification code", ""],
  ["bing_site_verification", "Bing verification code", ""],
];

function AdminSeo() {
  const qc = useQueryClient();
  const { data: settings } = useQuery(seoSettingsQuery);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const { data: pages } = useQuery({
    queryKey: ["admin", "seo-pages"],
    queryFn: async () => {
      const { data } = await supabase.from("seo_pages").select("*").order("sort_order");
      return (data as SeoPage[] | null) ?? [];
    },
  });

  const { data: faqs } = useQuery({
    queryKey: ["admin", "faqs"],
    queryFn: async () => {
      const { data } = await supabase.from("faqs").select("*").order("sort_order");
      return (data as Faq[] | null) ?? [];
    },
  });

  const val = (key: keyof SeoSettings) =>
    draft[key as string] ?? ((settings as unknown as Record<string, string | null>)?.[key as string] ?? "");

  const saveSettings = async () => {
    if (!settings?.id) {
      toast.error("SEO settings not initialised");
      return;
    }
    const { error } = await supabase.from("seo_settings").update(draft as never).eq("id", settings.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("SEO settings saved");
    setDraft({});
    void qc.invalidateQueries({ queryKey: ["seo-settings"] });
  };

  const toggleSetting = async (key: "sitemap_enabled" | "indexing_enabled", value: boolean) => {
    if (!settings?.id) return;
    const { error } = await supabase
      .from("seo_settings")
      .update({ [key]: value } as never)
      .eq("id", settings.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["seo-settings"] });
  };

  const savePage = async (page: SeoPage, patch: Partial<SeoPage>) => {
    const { error } = await supabase.from("seo_pages").update(patch as never).eq("id", page.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${page.label} updated`);
    void qc.invalidateQueries({ queryKey: ["admin", "seo-pages"] });
  };

  const addFaq = async () => {
    const { error } = await supabase.from("faqs").insert({
      question: "New question",
      answer: "Answer shown on the site and to search engines.",
      category: "General",
      sort_order: (faqs?.length ?? 0) + 1,
      active: false,
    } as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin", "faqs"] });
  };

  const saveFaq = async (faq: Faq, patch: Partial<Faq>) => {
    const { error } = await supabase.from("faqs").update(patch as never).eq("id", faq.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin", "faqs"] });
    void qc.invalidateQueries({ queryKey: ["faqs"] });
  };

  const deleteFaq = async (id: string) => {
    const { error } = await supabase.from("faqs").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin", "faqs"] });
    void qc.invalidateQueries({ queryKey: ["faqs"] });
  };

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-4xl">Search engines</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Titles, descriptions, page map and the questions Google shows under your listing.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-[10px] tracking-luxe">
          <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent">
            View sitemap <ExternalLink className="size-3" />
          </a>
          <a href="/robots.txt" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent">
            View robots file <ExternalLink className="size-3" />
          </a>
        </div>
      </div>

      {/* Global settings */}
      <section className="rounded-sm border border-border p-4">
        <h2 className="font-display text-2xl">Global settings</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {SETTING_FIELDS.map(([key, label, hint]) => (
            <div key={key as string} className={key === "default_description" ? "md:col-span-2" : ""}>
              <label className="text-[10px] tracking-luxe text-muted-foreground">{label}</label>
              {key === "default_description" ? (
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={val(key)}
                  onChange={(e) => setDraft({ ...draft, [key as string]: e.target.value })}
                />
              ) : (
                <Input
                  className="mt-1"
                  placeholder={hint}
                  value={val(key)}
                  onChange={(e) => setDraft({ ...draft, [key as string]: e.target.value })}
                />
              )}
              {key === "default_title" && (
                <p className="mt-1 text-[10px] text-muted-foreground">{val(key).length}/60 characters</p>
              )}
              {key === "default_description" && (
                <p className="mt-1 text-[10px] text-muted-foreground">{val(key).length}/160 characters</p>
              )}
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="text-[10px] tracking-luxe text-muted-foreground">Extra robots rules</label>
            <Textarea
              className="mt-1 font-mono text-xs"
              rows={3}
              placeholder="Disallow: /private"
              value={val("robots_extra")}
              onChange={(e) => setDraft({ ...draft, robots_extra: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-xs">
            <Switch
              checked={settings?.indexing_enabled ?? true}
              onCheckedChange={(v) => void toggleSetting("indexing_enabled", v)}
            />
            Allow search engines to index the site
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Switch
              checked={settings?.sitemap_enabled ?? true}
              onCheckedChange={(v) => void toggleSetting("sitemap_enabled", v)}
            />
            Publish sitemap.xml
          </label>
          <Button className="ml-auto bg-gold-gradient text-accent-foreground" onClick={() => void saveSettings()}>
            Save settings
          </Button>
        </div>

        {/* Google result preview */}
        <div className="mt-6 rounded-sm border border-border bg-secondary/30 p-4">
          <p className="text-[10px] tracking-luxe text-muted-foreground">Google preview</p>
          <p className="mt-2 truncate text-xs text-muted-foreground">
            {val("canonical_base_url") || "https://your-domain.com"}
          </p>
          <p className="truncate text-lg text-accent">
            {val("default_title") || "KROKO DILE"}
            {val("title_suffix") ? ` ${val("title_suffix")}` : ""}
          </p>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {val("default_description") || "Add a description so search engines show the right summary."}
          </p>
        </div>
      </section>

      {/* Page map */}
      <section className="rounded-sm border border-border p-4">
        <h2 className="font-display text-2xl">Page map</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Per-page titles, descriptions and sitemap priority.
        </p>
        <div className="mt-4 space-y-4">
          {pages?.map((p) => (
            <PageRow key={p.id} page={p} onSave={savePage} />
          ))}
          {pages?.length === 0 && <p className="text-sm text-muted-foreground">No pages mapped yet.</p>}
        </div>
      </section>

      {/* FAQs */}
      <section className="rounded-sm border border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Questions &amp; answers</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Shown on the home page and sent to Google as rich results.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void addFaq()}>
            <Plus className="mr-1 size-3" /> Add question
          </Button>
        </div>
        <div className="mt-4 space-y-4">
          {faqs?.map((f) => (
            <FaqRow key={f.id} faq={f} onSave={saveFaq} onDelete={deleteFaq} />
          ))}
        </div>
      </section>
    </div>
  );
}

function PageRow({
  page,
  onSave,
}: {
  page: SeoPage;
  onSave: (p: SeoPage, patch: Partial<SeoPage>) => Promise<unknown>;
}) {
  const [patch, setPatch] = useState<Partial<SeoPage>>({});
  const field = <K extends keyof SeoPage>(key: K) => (patch[key] ?? page[key] ?? "") as string;

  return (
    <div className="grid gap-3 rounded-sm border border-border p-3 md:grid-cols-[160px_1fr_auto]">
      <div>
        <p className="text-sm">{page.label}</p>
        <p className="font-mono text-[10px] text-muted-foreground">{page.path}</p>
      </div>
      <div className="grid gap-2">
        <Input
          placeholder="Page title"
          value={field("title")}
          onChange={(e) => setPatch({ ...patch, title: e.target.value })}
        />
        <Textarea
          rows={2}
          placeholder="Meta description"
          value={field("description")}
          onChange={(e) => setPatch({ ...patch, description: e.target.value })}
        />
        <Input
          placeholder="Keywords"
          value={field("keywords")}
          onChange={(e) => setPatch({ ...patch, keywords: e.target.value })}
        />
        <div className="flex flex-wrap items-center gap-4 text-[10px] tracking-luxe text-muted-foreground">
          <label className="flex items-center gap-2">
            Priority
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1"
              className="h-7 w-20"
              value={String(patch.priority ?? page.priority)}
              onChange={(e) => setPatch({ ...patch, priority: Number(e.target.value) })}
            />
          </label>
          <label className="flex items-center gap-2">
            <Switch
              checked={patch.in_sitemap ?? page.in_sitemap}
              onCheckedChange={(v) => setPatch({ ...patch, in_sitemap: v })}
            />
            In sitemap
          </label>
          <label className="flex items-center gap-2">
            <Switch
              checked={patch.indexed ?? page.indexed}
              onCheckedChange={(v) => setPatch({ ...patch, indexed: v })}
            />
            Indexed
          </label>
        </div>
      </div>
      <Button
        size="sm"
        className="h-9 self-start bg-gold-gradient text-accent-foreground"
        onClick={() => void onSave(page, patch).then(() => setPatch({}))}
      >
        Save
      </Button>
    </div>
  );
}

function FaqRow({
  faq,
  onSave,
  onDelete,
}: {
  faq: Faq;
  onSave: (f: Faq, patch: Partial<Faq>) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
}) {
  const [patch, setPatch] = useState<Partial<Faq>>({});

  return (
    <div className="grid gap-2 rounded-sm border border-border p-3">
      <Input
        value={(patch.question ?? faq.question) as string}
        onChange={(e) => setPatch({ ...patch, question: e.target.value })}
      />
      <Textarea
        rows={3}
        value={(patch.answer ?? faq.answer) as string}
        onChange={(e) => setPatch({ ...patch, answer: e.target.value })}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="h-8 w-40"
          placeholder="Category"
          value={(patch.category ?? faq.category) as string}
          onChange={(e) => setPatch({ ...patch, category: e.target.value })}
        />
        <Input
          className="h-8 w-24"
          type="number"
          value={String(patch.sort_order ?? faq.sort_order)}
          onChange={(e) => setPatch({ ...patch, sort_order: Number(e.target.value) })}
        />
        <label className="flex items-center gap-2 text-[10px] tracking-luxe text-muted-foreground">
          <Switch
            checked={patch.active ?? faq.active}
            onCheckedChange={(v) => setPatch({ ...patch, active: v })}
          />
          Visible
        </label>
        <Button
          size="sm"
          className="ml-auto bg-gold-gradient text-accent-foreground"
          onClick={() => void onSave(faq, patch).then(() => setPatch({}))}
        >
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={() => void onDelete(faq.id)}>
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  );
}
