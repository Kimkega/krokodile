import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Megaphone, Package, Receipt, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatKes, orderStatusLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Overview,
});

function Overview() {
  const { data } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const [orders, products, ads] = await Promise.all([
        supabase
          .from("orders")
          .select("order_code, customer_name, total, status, payment_status, county, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase.from("products").select("id, name, stock, low_stock_threshold, active"),
        supabase.from("ads").select("id, status, payment_status, amount"),
      ]);
      return {
        orders: orders.data ?? [],
        products: products.data ?? [],
        ads: ads.data ?? [],
      };
    },
  });

  const orders = data?.orders ?? [];
  const products = data?.products ?? [];
  const revenue = orders
    .filter((o) => o.payment_status === "paid")
    .reduce((sum, o) => sum + Number(o.total), 0);
  const lowStock = products.filter((p) => p.stock <= (p.low_stock_threshold ?? 3));

  const cards = [
    { icon: Receipt, label: "Recent orders", value: String(orders.length) },
    { icon: Wallet, label: "Paid (recent)", value: formatKes(revenue) },
    { icon: Package, label: "Products", value: String(products.length) },
    { icon: Megaphone, label: "Adverts", value: String(data?.ads.length ?? 0) },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">The state of the house at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-sm border border-border p-4">
            <c.icon className="size-4 text-accent" />
            <p className="mt-3 font-display text-3xl">{c.value}</p>
            <p className="text-[10px] tracking-luxe text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      {lowStock.length > 0 && (
        <div className="rounded-sm border border-destructive/40 bg-destructive/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="size-4 text-destructive" /> {lowStock.length} product
            {lowStock.length === 1 ? "" : "s"} low on stock
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {lowStock.slice(0, 6).map((p) => (
              <li key={p.id}>
                {p.name} — {p.stock} left
              </li>
            ))}
          </ul>
          <Link to="/admin/products" className="mt-3 inline-block text-[10px] tracking-luxe text-accent">
            Restock now
          </Link>
        </div>
      )}

      <div className="overflow-x-auto rounded-sm border border-border">
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
            {orders.map((o) => (
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
        {orders.length === 0 && <p className="p-6 text-sm text-muted-foreground">No orders yet.</p>}
      </div>
    </div>
  );
}
