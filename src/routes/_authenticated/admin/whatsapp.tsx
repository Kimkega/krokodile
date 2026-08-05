import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  DEFAULT_WHATSAPP_TEMPLATE,
  SAMPLE_ORDER,
  TEMPLATE_TOKENS,
  renderTemplate,
} from "@/lib/whatsapp-template";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/admin/whatsapp")({
  component: AdminWhatsApp,
});

function AdminWhatsApp() {
  const qc = useQueryClient();
  const settings = useSiteSettings();
  const [template, setTemplate] = useState<string | null>(null);
  const value = template ?? settings?.whatsapp_template ?? DEFAULT_WHATSAPP_TEMPLATE;

  const { data: latestOrder } = useQuery({
    queryKey: ["admin", "whatsapp", "sample"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select(
          "order_code, customer_name, phone, email, subtotal, shipping_fee, total, payment_status, mpesa_receipt, status, tracking_ref, county, sub_county, ward, town",
        )
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const sample = latestOrder
    ? {
        ...SAMPLE_ORDER,
        site_name: settings?.site_name ?? "KROKO DILE",
        order_code: latestOrder.order_code,
        customer_name: latestOrder.customer_name,
        phone: latestOrder.phone,
        email: latestOrder.email,
        subtotal: Number(latestOrder.subtotal),
        shipping_fee: Number(latestOrder.shipping_fee),
        total: Number(latestOrder.total),
        address: [latestOrder.town, latestOrder.ward, latestOrder.sub_county, latestOrder.county]
          .filter(Boolean)
          .join(", "),
        payment_status: latestOrder.payment_status,
        mpesa_receipt: latestOrder.mpesa_receipt ?? "",
        status: latestOrder.status,
        tracking_ref: latestOrder.tracking_ref ?? "",
      }
    : SAMPLE_ORDER;

  const preview = renderTemplate(value, sample);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">WhatsApp follow-up</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The message customers send you after paying, and the one you send on courier updates.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <Textarea rows={14} value={value} onChange={(e) => setTemplate(e.target.value)} className="font-mono text-xs" />
          <div className="flex flex-wrap gap-2">
            {TEMPLATE_TOKENS.map((t) => (
              <button
                key={t}
                className="rounded-full border border-border px-3 py-1 text-[10px] tracking-luxe hover:border-accent"
                onClick={() => setTemplate(`${value}{{${t}}}`)}
              >
                {`{{${t}}}`}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-gold-gradient text-accent-foreground"
              onClick={async () => {
                if (!settings?.id) return toast.error("Site settings not initialised");
                const { error } = await supabase
                  .from("site_settings")
                  .update({ whatsapp_template: value })
                  .eq("id", settings.id);
                if (error) return toast.error(error.message);
                toast.success("Template saved");
                void qc.invalidateQueries({ queryKey: ["site-settings"] });
              }}
            >
              Save template
            </Button>
            <Button variant="outline" onClick={() => setTemplate(DEFAULT_WHATSAPP_TEMPLATE)}>
              Reset to default
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-secondary/30 p-4">
            <p className="text-[10px] tracking-luxe text-muted-foreground">Live preview</p>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-success/10 p-4 text-sm">{preview}</pre>
          </div>
          <details className="rounded-sm border border-border p-4">
            <summary className="cursor-pointer text-[10px] tracking-luxe text-muted-foreground">
              Order JSON used for the preview
            </summary>
            <pre className="mt-3 overflow-x-auto text-[10px]">{JSON.stringify(sample, null, 2)}</pre>
          </details>
        </div>
      </div>
    </div>
  );
}
