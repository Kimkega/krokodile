import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/layout/SiteShell";
import { formatKes, orderStatusLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — KROKO DILE" },
      { name: "description", content: "Manage KROKO DILE orders, products, couriers and M-Pesa settings." },
      { property: "og:title", content: "Admin Dashboard — KROKO DILE" },
      { property: "og:description", content: "Internal dashboard for the KROKO DILE store." },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { data: orders } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("order_code, customer_name, total, status, payment_status, county, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display text-4xl">Admin dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Latest orders across the store.</p>

        <div className="mt-8 overflow-x-auto rounded-sm border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left text-[10px] tracking-luxe text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">County</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((o) => (
                <tr key={o.order_code} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{o.order_code}</td>
                  <td className="px-4 py-3">{o.customer_name}</td>
                  <td className="px-4 py-3">{o.county}</td>
                  <td className="px-4 py-3">{formatKes(Number(o.total))}</td>
                  <td className="px-4 py-3">{o.payment_status}</td>
                  <td className="px-4 py-3">{orderStatusLabel(o.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders?.length === 0 && <p className="p-6 text-sm text-muted-foreground">No orders yet.</p>}
        </div>
      </div>
    </SiteShell>
  );
}
