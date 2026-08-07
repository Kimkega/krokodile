import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Clock, MessageCircle, RefreshCw, XCircle, Copy } from "lucide-react";
import { SiteShell } from "@/components/layout/SiteShell";
import { getOrder, retryPayment } from "@/lib/checkout.functions";
import { formatKes, orderStatusLabel } from "@/lib/format";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { whatsappLink } from "@/components/WhatsAppFab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { orderUrl } from "@/lib/site-url";

export const Route = createFileRoute("/order/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Receipt ${params.code} — KROKO DILE` },
      { name: "description", content: "Your KROKO DILE order receipt and M-Pesa payment status." },
      { property: "og:title", content: `Receipt ${params.code} — KROKO DILE` },
      { property: "og:description", content: "Order receipt and live M-Pesa payment status." },
    ],
  }),
  component: Receipt,
});

function Receipt() {
  const { code } = Route.useParams();
  const settings = useSiteSettings();

  const { data } = useQuery({
    queryKey: ["order", code],
    queryFn: () => getOrder({ data: { orderCode: code } }),
    refetchInterval: (q) => {
      const res = q.state.data;
      return res && "order" in res && res.order?.payment_status === "processing" ? 4000 : false;
    },
  });

  if (!data) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-md px-6 py-24 text-sm text-muted-foreground">Loading receipt…</div>
      </SiteShell>
    );
  }

  if (!data.ok) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <h1 className="font-display text-3xl">Receipt not found</h1>
          <Link to="/shop" className="mt-4 inline-block text-[10px] tracking-luxe text-accent">
            Back to shop
          </Link>
        </div>
      </SiteShell>
    );
  }

  const { order, items } = data;
  const paid = order.payment_status === "paid";
  const failed = order.payment_status === "failed";

  const wa = whatsappLink(
    settings?.whatsapp_number,
    `Hello ${settings?.site_name ?? "KROKO DILE"}!\nOrder: ${order.order_code}\nName: ${order.customer_name}\nItems:\n${items
      .map((i) => `• ${i.name} x${i.quantity} — ${formatKes(Number(i.unit_price) * i.quantity)}`)
      .join("\n")}\nTotal: ${formatKes(Number(order.total))}\nDeliver to: ${order.town || order.ward}, ${order.sub_county}, ${order.county}\nPayment: ${order.payment_status}${order.mpesa_receipt ? ` (${order.mpesa_receipt})` : ""}`,
  );

  return (
    <SiteShell>
      <div className="mx-auto max-w-sm px-4 py-10">
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-lux">
          <div className="croc-texture bg-cocoa-gradient px-6 py-7 text-center text-sidebar-foreground">
            <p className="font-display text-3xl text-gold-gradient">{settings?.site_name ?? "KROKO DILE"}</p>
            <p className="mt-1 text-[9px] tracking-luxe text-sidebar-foreground/70">Digital receipt</p>
            <p className="mt-4 font-display text-2xl">{order.order_code}</p>
          </div>

          <div className="flex items-center gap-2 border-b border-border px-6 py-4">
            {paid ? (
              <CheckCircle2 className="size-5 text-success" />
            ) : failed ? (
              <XCircle className="size-5 text-destructive" />
            ) : (
              <Clock className="size-5 animate-pulse text-accent" />
            )}
            <div>
              <p className="text-sm font-medium">
                {paid ? "Payment received" : failed ? "Payment not completed" : "Waiting for your M-Pesa PIN…"}
              </p>
              <p className="text-xs text-muted-foreground">{order.payment_message}</p>
            </div>
          </div>

          <ul className="space-y-3 px-6 py-5 text-sm">
            {items.map((i, idx) => (
              <li key={idx} className="flex justify-between gap-3">
                <span>
                  {i.name} × {i.quantity}
                </span>
                <span>{formatKes(Number(i.unit_price) * i.quantity)}</span>
              </li>
            ))}
          </ul>

          <dl className="space-y-2 border-t border-dashed border-border px-6 py-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatKes(Number(order.subtotal))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd>{formatKes(Number(order.shipping_fee))}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2">
              <dt className="text-[10px] tracking-luxe">Total</dt>
              <dd className="font-display text-2xl text-accent">{formatKes(Number(order.total))}</dd>
            </div>
            {order.mpesa_receipt && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">M-Pesa code</dt>
                <dd>{order.mpesa_receipt}</dd>
              </div>
            )}
          </dl>

          <div className="border-t border-dashed border-border px-6 py-4 text-xs text-muted-foreground">
            <p className="text-[10px] tracking-luxe text-foreground">Delivering to</p>
            <p className="mt-1">
              {order.customer_name} · {order.phone}
            </p>
            <p>
              {[order.town, order.ward, order.sub_county, order.county].filter(Boolean).join(", ")}
            </p>
            <p className="mt-2">Status: {orderStatusLabel(order.status)}</p>
          </div>

          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-success px-6 py-4 text-sm font-medium text-primary-foreground"
            >
              <MessageCircle className="size-4" /> Follow up on WhatsApp
            </a>
          )}
        </div>

        <div className="mt-6 flex justify-center gap-4 text-[10px] tracking-luxe">
          <Link to="/shop" className="text-accent">
            Continue shopping
          </Link>
          <Link to="/track" className="text-muted-foreground">
            Track order
          </Link>
        </div>
      </div>
    </SiteShell>
  );
}
