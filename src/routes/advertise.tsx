import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SiteShell } from "@/components/layout/SiteShell";
import { createAdPurchase, getAdStatus } from "@/lib/ads.functions";
import { AD_DURATIONS, AD_PLACEMENTS, adPrice } from "@/lib/ads";
import { formatKes } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/advertise")({
  head: () => ({
    meta: [
      { title: "Advertise with KROKO DILE — Book a Placement" },
      {
        name: "description",
        content: "Book a banner on Kenya's luxury leather house. Pay by M-Pesa, no account needed.",
      },
      { property: "og:title", content: "Advertise with KROKO DILE" },
      { property: "og:description", content: "Guest advert booking with instant M-Pesa payment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Advertise,
});

function Advertise() {
  const create = useServerFn(createAdPurchase);
  const status = useServerFn(getAdStatus);
  const [form, setForm] = useState({
    advertiserName: "",
    email: "",
    phone: "",
    title: "",
    body: "",
    targetUrl: "",
  });
  const [placement, setPlacement] = useState<string>(AD_PLACEMENTS[0].id);
  const [days, setDays] = useState<number>(7);
  const [adCode, setAdCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: live } = useQuery({
    queryKey: ["ad", adCode],
    enabled: !!adCode,
    queryFn: () => status({ data: { adCode: adCode as string } }),
    refetchInterval: (q) => {
      const r = q.state.data;
      return r && r.ok && r.ad.payment_status === "processing" ? 4000 : false;
    },
  });

  const amount = adPrice(placement, days);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await create({
        data: { ...form, imageUrl: "", placement: placement as never, days: days as never },
      });
      if (!res.ok) {
        toast.error("Could not book advert");
        return;
      }
      setAdCode(res.adCode);
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="font-display text-5xl">Advertise with us</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Put your brand in front of Kenya's luxury shoppers. No account needed — pay with M-Pesa.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {AD_PLACEMENTS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlacement(p.id)}
              className={cn(
                "rounded-sm border p-4 text-left",
                placement === p.id ? "border-accent bg-secondary/40" : "border-border",
              )}
            >
              <p className="font-display text-xl">{p.label}</p>
              <p className="text-xs text-muted-foreground">{p.note}</p>
              <p className="mt-2 text-[10px] tracking-luxe text-accent">{formatKes(p.perDay)} / day</p>
            </button>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          {AD_DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                "rounded-full border px-4 py-2 text-[10px] tracking-luxe",
                days === d ? "border-accent bg-gold-gradient text-accent-foreground" : "border-border",
              )}
            >
              {d} days
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Input placeholder="Your name" value={form.advertiserName} onChange={(e) => setForm({ ...form, advertiserName: e.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="M-Pesa phone e.g. 0712345678" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder="Advert headline" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input placeholder="Link (optional)" value={form.targetUrl} onChange={(e) => setForm({ ...form, targetUrl: e.target.value })} />
          <Textarea className="sm:col-span-2" placeholder="Advert copy" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </div>

        <div className="mt-6 flex items-center justify-between rounded-sm border border-border p-4">
          <span className="text-[10px] tracking-luxe text-muted-foreground">Total</span>
          <span className="font-display text-3xl text-accent">{formatKes(amount)}</span>
        </div>

        <Button disabled={busy} onClick={() => void submit()} className="mt-4 w-full bg-gold-gradient text-accent-foreground">
          {busy ? "Sending STK push…" : "Pay with M-Pesa"}
        </Button>

        {live?.ok && (
          <div className="mt-6 rounded-sm border border-border p-4 text-sm">
            <p className="font-medium">Advert {live.ad.ad_code}</p>
            <p className="text-muted-foreground">Payment: {live.ad.payment_status}</p>
            <p className="text-muted-foreground">{live.ad.payment_message}</p>
            <p className="text-muted-foreground">Review status: {live.ad.status}</p>
          </div>
        )}
      </div>
    </SiteShell>
  );
}
