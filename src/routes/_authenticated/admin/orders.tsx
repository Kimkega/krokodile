import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { updateOrderProgress } from "@/lib/admin.functions";
import { formatKes, orderStatusLabel, ORDER_STATUSES } from "@/lib/format";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { DEFAULT_WHATSAPP_TEMPLATE, renderTemplate } from "@/lib/whatsapp-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: AdminOrders,
});

function AdminOrders() {
  const qc = useQueryClient();
  const settings = useSiteSettings();
  const update = useServerFn(updateOrderProgress);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: orders } = useQuery({
    queryKey: ["admin", "orders", "full"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select(
          "order_code, customer_name, email, phone, total, subtotal, shipping_fee, status, payment_status, mpesa_receipt, county, sub_county, ward, town, courier_id, tracking_ref, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const { data: couriers } = useQuery({
    queryKey: ["admin", "couriers"],
    queryFn: async () => {
      const { data } = await supabase.from("couriers").select("id, name, kind").eq("active", true).order("name");
      return data ?? [];
    },
  });

  const mutation = useMutation({
    mutationFn: (vars: {
      orderCode: string;
      status: string;
      courierId: string | null;
      trackingRef: string;
      note: string;
    }) => update({ data: vars as never }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ["admin", "orders", "full"] });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success("Order updated");
      const o = res.order;
      const message = renderTemplate(settings?.whatsapp_template || DEFAULT_WHATSAPP_TEMPLATE, {
        site_name: settings?.site_name ?? "KROKO DILE",
        order_code: o.order_code,
        customer_name: o.customer_name,
        phone: o.phone,
        email: o.email,
        items: res.items,
        subtotal: Number(o.subtotal),
        shipping_fee: Number(o.shipping_fee),
        total: Number(o.total),
        address: [o.town, o.ward, o.sub_county, o.county].filter(Boolean).join(", "),
        payment_status: o.payment_status,
        mpesa_receipt: o.mpesa_receipt ?? "",
        status: o.status,
        courier: o.couriers?.name ?? "",
        tracking_ref: o.tracking_ref ?? "",
      });
      window.open(`https://wa.me/${o.phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Update failed"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign couriers and push status updates — a pre-filled WhatsApp note opens for the customer.
        </p>
      </div>

      <div className="space-y-3">
        {orders?.map((o) => (
          <div key={o.order_code} className="rounded-sm border border-border">
            <button
              className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
              onClick={() => setExpanded(expanded === o.order_code ? null : o.order_code)}
            >
              <span className="font-medium">{o.order_code}</span>
              <span className="text-sm">{o.customer_name}</span>
              <span className="text-xs text-muted-foreground">
                {[o.town, o.sub_county, o.county].filter(Boolean).join(", ")}
              </span>
              <span className="text-sm">{formatKes(Number(o.total))}</span>
              <span className="rounded-full border border-border px-3 py-1 text-[10px] tracking-luxe">
                {o.payment_status}
              </span>
              <span className="text-[10px] tracking-luxe text-accent">{orderStatusLabel(o.status)}</span>
            </button>

            {expanded === o.order_code && (
              <OrderPanel
                order={o}
                couriers={couriers ?? []}
                busy={mutation.isPending}
                onSubmit={(vars) => mutation.mutate({ orderCode: o.order_code, ...vars })}
              />
            )}
          </div>
        ))}
        {orders?.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
      </div>
    </div>
  );
}

type OrderRow = {
  order_code: string;
  status: string;
  courier_id: string | null;
  tracking_ref: string | null;
  email: string;
  phone: string;
};

function OrderPanel({
  order,
  couriers,
  busy,
  onSubmit,
}: {
  order: OrderRow;
  couriers: { id: string; name: string; kind: string }[];
  busy: boolean;
  onSubmit: (vars: { status: string; courierId: string | null; trackingRef: string; note: string }) => void;
}) {
  const [status, setStatus] = useState(order.status);
  const [courierId, setCourierId] = useState(order.courier_id ?? "");
  const [trackingRef, setTrackingRef] = useState(order.tracking_ref ?? "");
  const [note, setNote] = useState("");

  return (
    <div className="grid gap-3 border-t border-border bg-secondary/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="text-[10px] tracking-luxe text-muted-foreground">Status</label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {orderStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-[10px] tracking-luxe text-muted-foreground">Courier / SACCO</label>
        <Select value={courierId} onValueChange={setCourierId}>
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Assign courier" />
          </SelectTrigger>
          <SelectContent>
            {couriers.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} · {c.kind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-[10px] tracking-luxe text-muted-foreground">Tracking ref</label>
        <Input className="mt-1" value={trackingRef} onChange={(e) => setTrackingRef(e.target.value)} />
      </div>
      <div>
        <label className="text-[10px] tracking-luxe text-muted-foreground">Note to customer</label>
        <Input className="mt-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <Button
          disabled={busy}
          className="bg-gold-gradient text-accent-foreground"
          onClick={() => onSubmit({ status, courierId: courierId || null, trackingRef, note })}
        >
          <MessageCircle className="mr-2 size-4" /> Save &amp; notify on WhatsApp
        </Button>
      </div>
    </div>
  );
}
