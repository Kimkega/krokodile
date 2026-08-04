import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/lib/cart";
import { formatKes, isValidKenyanPhone } from "@/lib/format";
import { counties, subCountiesOf, wardsOf } from "@/lib/kenya";
import { createOrder } from "@/lib/checkout.functions";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — KROKO DILE" },
      { name: "description", content: "Guest checkout with M-Pesa express and countrywide delivery in Kenya." },
      { property: "og:title", content: "Checkout — KROKO DILE" },
      { property: "og:description", content: "Pay with M-Pesa and get your bag delivered anywhere in Kenya." },
    ],
  }),
  component: Checkout,
});

function Checkout() {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    email: "",
    phone: "",
    county: "",
    subCounty: "",
    ward: "",
    town: "",
    addressNotes: "",
  });

  const subCounties = useMemo(() => subCountiesOf(form.county), [form.county]);
  const wards = useMemo(() => wardsOf(form.county, form.subCounty), [form.county, form.subCounty]);

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({
      ...f,
      [key]: value,
      ...(key === "county" ? { subCounty: "", ward: "" } : {}),
      ...(key === "subCounty" ? { ward: "" } : {}),
    }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return toast.error("Your cart is empty.");
    if (!isValidKenyanPhone(form.phone)) return toast.error("Enter a valid Safaricom number.");
    if (!form.county || !form.subCounty) return toast.error("Select your county and sub-county.");
    setSubmitting(true);
    try {
      const res = await createOrder({
        data: { ...form, items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })) },
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      clear();
      navigate({ to: "/order/$code", params: { code: res.orderCode } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SiteShell>
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1.3fr_1fr]">
        <form onSubmit={submit} className="space-y-8">
          <div>
            <h1 className="font-display text-4xl">Checkout</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              No account needed. Pay with M-Pesa express on your phone.
            </p>
          </div>

          <section className="space-y-4">
            <h2 className="text-[10px] tracking-luxe text-muted-foreground">Your details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  required
                  maxLength={100}
                  value={form.customerName}
                  onChange={(e) => set("customerName", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">M-Pesa phone</Label>
                <Input
                  id="phone"
                  required
                  placeholder="07XX XXX XXX"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-[10px] tracking-luxe text-muted-foreground">Delivery in Kenya</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="county">County</Label>
                <select
                  id="county"
                  required
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.county}
                  onChange={(e) => set("county", e.target.value)}
                >
                  <option value="">Select county</option>
                  {counties.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="subcounty">Sub-county</Label>
                <select
                  id="subcounty"
                  required
                  disabled={!form.county}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.subCounty}
                  onChange={(e) => set("subCounty", e.target.value)}
                >
                  <option value="">Select sub-county</option>
                  {subCounties.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="ward">Ward</Label>
                <select
                  id="ward"
                  disabled={!form.subCounty}
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.ward}
                  onChange={(e) => set("ward", e.target.value)}
                >
                  <option value="">Select ward</option>
                  {wards.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="town">Town / stage</Label>
                <Input id="town" value={form.town} onChange={(e) => set("town", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="notes">Delivery notes</Label>
                <Textarea
                  id="notes"
                  maxLength={500}
                  value={form.addressNotes}
                  onChange={(e) => set("addressNotes", e.target.value)}
                />
              </div>
            </div>
          </section>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-gold-gradient py-6 text-accent-foreground shadow-gold hover:opacity-90"
          >
            {submitting ? "Sending M-Pesa request…" : `Pay ${formatKes(subtotal)} + delivery`}
          </Button>
        </form>

        <aside className="h-fit rounded-sm border border-border bg-card p-6">
          <h2 className="font-display text-2xl">Your selection</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {items.map((i) => (
              <li key={i.productId} className="flex justify-between gap-3">
                <span>
                  {i.name} × {i.quantity}
                </span>
                <span>{formatKes(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex justify-between border-t border-border pt-4">
            <span className="text-[10px] tracking-luxe text-muted-foreground">Subtotal</span>
            <span className="font-display text-2xl">{formatKes(subtotal)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Delivery is calculated from your county at the final step.
          </p>
        </aside>
      </div>
    </SiteShell>
  );
}
