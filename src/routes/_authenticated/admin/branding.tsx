import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { mediaUrl } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin/branding")({
  component: AdminBranding,
});

const FIELDS = [
  ["site_name", "Website name"],
  ["tagline", "Tagline"],
  ["whatsapp_number", "WhatsApp number"],
  ["contact_phone", "Contact phone"],
  ["contact_email", "Contact email"],
  ["instagram_url", "Instagram URL"],
  ["facebook_url", "Facebook URL"],
  ["tiktok_url", "TikTok URL"],
  ["x_url", "X URL"],
] as const;

function AdminBranding() {
  const qc = useQueryClient();
  const settings = useSiteSettings();
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [logo, setLogo] = useState<string | null>(null);

  const value = (key: string) =>
    draft[key] ?? ((settings as unknown as Record<string, string | null>)?.[key] ?? "");
  const logoPath = logo ?? settings?.logo_url ?? "";

  const save = async () => {
    if (!settings?.id) {
      toast.error("Settings not initialised");
      return;
    }
    const patch: Record<string, unknown> = { ...draft };
    if (logo) patch["logo_url"] = logo;
    const { error } = await supabase.from("site_settings").update(patch as never).eq("id", settings.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Branding updated");
    void qc.invalidateQueries({ queryKey: ["site-settings"] });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Branding</h1>
        <p className="mt-1 text-sm text-muted-foreground">Logo, name and socials across the whole store.</p>
      </div>

      <div className="grid gap-4 rounded-sm border border-border p-4 md:grid-cols-2">
        <div className="md:col-span-2 flex flex-wrap items-center gap-4">
          {logoPath && <img src={mediaUrl(logoPath)} alt="Current logo" className="size-20 object-contain" />}
          <ImageUploader folder="branding" label="Upload logo (medium size)" onUploaded={setLogo} className="flex-1" />
        </div>
        {FIELDS.map(([key, label]) => (
          <div key={key}>
            <label className="text-[10px] tracking-luxe text-muted-foreground">{label}</label>
            <Input
              className="mt-1"
              value={value(key)}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
            />
          </div>
        ))}
        <div>
          <label className="text-[10px] tracking-luxe text-muted-foreground">Free shipping threshold (KES)</label>
          <Input
            className="mt-1"
            type="number"
            value={draft["free_shipping_threshold"] ?? String(settings?.free_shipping_threshold ?? 0)}
            onChange={(e) => setDraft({ ...draft, free_shipping_threshold: e.target.value })}
          />
        </div>
        <Button className="bg-gold-gradient text-accent-foreground md:col-span-2" onClick={() => void save()}>
          Save branding
        </Button>
      </div>
    </div>
  );
}
