import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, ShieldCheck, Truck, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/layout/SiteShell";
import { ProductCard, type ProductCardData } from "@/components/products/ProductCard";
import { Hero3DCarousel } from "@/components/home/Hero3DCarousel";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { mediaUrl } from "@/lib/media";
import logoAsset from "@/assets/kroko-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KROKO DILE — Luxury Leather Bags for Men & Women in Kenya" },
      {
        name: "description",
        content:
          "Hand-finished luxury bags from Nairobi. Shop men's and women's leather bags, pay with M-Pesa and track delivery to every county in Kenya.",
      },
      { property: "og:title", content: "KROKO DILE — Luxury Leather Bags" },
      {
        property: "og:description",
        content: "Hand-finished luxury bags from Nairobi. M-Pesa checkout, countrywide delivery.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const settings = useSiteSettings();
  const { data: featured } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, price, compare_at_price, material, product_images(url, sort_order)")
        .eq("active", true)
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(8);
      return (data ?? []) as ProductCardData[];
    },
  });

  const showcase = (featured ?? []).slice(0, 6).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price),
    image: [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null,
  }));

  const logoSrc = settings?.logo_url ? mediaUrl(settings.logo_url) : logoAsset.url;

  return (
    <SiteShell>
      <section className="relative overflow-hidden bg-cocoa-gradient">
        {/* Softer scale texture so the gold monogram keeps its glow */}
        <div className="croc-texture-soft">
          <div className="pointer-events-none absolute -left-24 top-1/4 size-96 rounded-full bg-sidebar-primary/10 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
            <div className="min-w-0">
              <img
                src={logoSrc}
                alt={`${settings?.site_name ?? "KROKO DILE"} gold crocodile monogram`}
                width={112}
                height={112}
                className="mb-6 h-24 w-auto drop-shadow-[0_14px_30px_rgba(0,0,0,0.6)] sm:h-28"
              />
              <p className="text-[10px] tracking-luxe text-sidebar-primary">Nairobi · Est. leather house</p>
              <h1 className="mt-4 font-display text-4xl leading-[1.05] text-sidebar-foreground sm:text-5xl md:text-6xl">
                Bags with a <span className="text-gold-gradient">spine of gold</span>
              </h1>
              <p className="mt-5 max-w-md text-sm leading-relaxed text-sidebar-foreground/80">
                Crocodile-textured luxury for men and women. Cut, stitched and burnished by hand — then
                delivered to your ward anywhere in Kenya.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-7 py-3 text-[11px] tracking-luxe text-accent-foreground shadow-gold"
                >
                  Shop the collection <ArrowRight className="size-3.5" />
                </Link>
                <Link
                  to="/verify"
                  className="inline-flex items-center gap-2 rounded-full border border-sidebar-border px-7 py-3 text-[11px] tracking-luxe text-sidebar-foreground"
                >
                  <BadgeCheck className="size-3.5" /> Verify a bag
                </Link>
              </div>
            </div>

            <div className="min-w-0">
              {showcase.length > 0 ? (
                <Hero3DCarousel items={showcase} />
              ) : (
                <div className="flex justify-center">
                  <img
                    src={logoSrc}
                    alt=""
                    className="w-56 opacity-90 drop-shadow-[0_20px_45px_rgba(0,0,0,0.55)] md:w-72"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Fresh arrivals immediately under the hero */}
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-3xl sm:text-4xl">The current edit</h2>
          <Link to="/shop" className="text-[10px] tracking-luxe text-accent">
            View all bags
          </Link>
        </div>
        <div className="mt-8 grid gap-6 grid-cols-2 lg:grid-cols-4">
          {featured?.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
        {featured?.length === 0 && (
          <p className="mt-10 text-sm text-muted-foreground">
            The collection is being photographed. Please check back shortly.
          </p>
        )}
      </section>

      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Smartphone, title: "M-Pesa express", copy: "Pay by STK push in seconds" },
            { icon: Truck, title: "Countrywide", copy: "Every county, sub-county and ward" },
            { icon: ShieldCheck, title: "Genuine leather", copy: "Hand-finished, guaranteed" },
            { icon: BadgeCheck, title: "Authenticity card", copy: "Scan the QR to verify your piece" },
          ].map((f) => (
            <div key={f.title} className="flex items-center gap-3">
              <f.icon className="size-5 shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="text-xs tracking-luxe">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
