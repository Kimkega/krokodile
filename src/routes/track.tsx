import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackOrders } from "@/lib/checkout.functions";
import { formatKes, orderStatusLabel } from "@/lib/format";

type TrackedOrder = {
  order_code: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
  tracking_ref: string | null;
  courier_contact: string | null;
  county: string | null;
  sub_county: string | null;
  town: string | null;
  couriers: { name: string; phone: string | null } | null;
  events: { status: string; note: string | null; created_at: string }[];
  certificates: { code: string; product_name: string | null }[];
};


export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Track Your Order — KROKO DILE" },
      { name: "description", content: "Track your KROKO DILE delivery using the email and phone you paid with." },
      { property: "og:title", content: "Track Your Order — KROKO DILE" },
      { property: "og:description", content: "Enter your email and M-Pesa phone number to see delivery status." },
    ],
  }),
  component: Track,
});

function Track() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await trackOrders({ data: { email, phone } });
      setOrders(res.orders as unknown as TrackedOrder[]);
      if (res.orders.length === 0) toast.info("No orders found for those details.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-2xl px-6 py-14">
        <h1 className="font-display text-5xl">Track your order</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Use the email address and the phone number you paid with.
        </p>

        <form onSubmit={submit} className="mt-8 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="t-email">Email</Label>
            <Input id="t-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="t-phone">M-Pesa phone</Label>
            <Input id="t-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="sm:col-span-2 bg-gold-gradient text-accent-foreground shadow-gold hover:opacity-90"
          >
            {loading ? "Searching…" : "Find my orders"}
          </Button>
        </form>

        <div className="mt-10 space-y-4">
          {orders?.map((o) => {
            const paid = o.payment_status === "paid";
            return (
              <div key={o.order_code} className="rounded-sm border border-border bg-card p-5">
                <Link to="/order/$code" params={{ code: o.order_code }} className="block">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-2xl">{o.order_code}</p>
                    <span className="text-sm text-accent">{formatKes(Number(o.total))}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {orderStatusLabel(o.status)} · {new Date(o.created_at).toLocaleDateString("en-KE")}
                  </p>
                  {o.couriers && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Courier: {o.couriers.name}
                      {o.couriers.phone ? ` · ${o.couriers.phone}` : ""}
                      {o.tracking_ref ? ` · Ref ${o.tracking_ref}` : ""}
                    </p>
                  )}
                  {o.courier_contact && <p className="mt-1 text-xs text-muted-foreground">{o.courier_contact}</p>}
                </Link>

                {!paid && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-sm border border-destructive/40 bg-destructive/5 px-4 py-3">
                    <p className="text-xs text-destructive">Payment not completed</p>
                    <Button asChild size="sm" className="ml-auto bg-gold-gradient text-accent-foreground">
                      <Link to="/order/$code" params={{ code: o.order_code }}>
                        Retry payment
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </SiteShell>
  );
}
