import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, Truck, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/layout/SiteShell";
import { ProductCard, type ProductCardData } from "@/components/products/ProductCard";
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
    ],
  }),
  component: Home,
});

function Home() {
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

  const { data: categories } = useQuery({
    queryKey: ["categories", "home"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("name, slug, description, image_url")
        .eq("active", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  return (
    <SiteShell>
      <section className="relative overflow-hidden bg-cocoa-gradient">
        <div className="croc-texture">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-24 md:grid-cols-2 md:py-32">
            <div>
              <p className="text-[10px] tracking-luxe text-sidebar-primary">Nairobi · Est. leather house</p>
              <h1 className="mt-5 font-display text-5xl leading-[1.05] text-sidebar-foreground md:text-7xl">
                Bags with a <span className="text-gold-gradient">spine of gold</span>
              </h1>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-sidebar-foreground/70">
                Crocodile-textured luxury for men and women. Cut, stitched and burnished by hand — then
                delivered to your ward anywhere in Kenya.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-7 py-3 text-[11px] tracking-luxe text-accent-foreground shadow-gold"
                >
                  Shop the collection <ArrowRight className="size-3.5" />
                </Link>
                <Link
                  to="/track"
                  className="inline-flex items-center gap-2 rounded-full border border-sidebar-border px-7 py-3 text-[11px] tracking-luxe text-sidebar-foreground"
                >
                  Track my order
                </Link>
              </div>
            </div>
            <div className="flex justify-center">
              <img
                src={logoAsset.url}
                alt="KROKO DILE gold crocodile monogram"
                className="w-64 drop-shadow-[0_20px_45px_rgba(0,0,0,0.55)] md:w-80"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-secondary/40">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 sm:grid-cols-3">
          {[
            { icon: Smartphone, title: "M-Pesa express", copy: "Pay by STK push in seconds" },
            { icon: Truck, title: "Countrywide", copy: "Every county, sub-county and ward" },
            { icon: ShieldCheck, title: "Genuine leather", copy: "Hand-finished, guaranteed" },
          ].map((f) => (
            <div key={f.title} className="flex items-center gap-3">
              <f.icon className="size-5 text-accent" />
              <div>
                <p className="text-xs tracking-luxe">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {(categories?.length ?? 0) > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="font-display text-4xl">Shop by house</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories?.map((c) => (
              <Link
                key={c.slug}
                to="/shop"
                search={{ category: c.slug }}
                className="group relative flex h-56 items-end overflow-hidden rounded-sm bg-cocoa-gradient p-6"
              >
                {c.image_url && (
                  <img
                    src={mediaUrl(c.image_url)}
                    alt={c.name}
                    className="absolute inset-0 size-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
                  />
                )}
                <div className="relative">
                  <p className="font-display text-3xl text-sidebar-foreground">{c.name}</p>
                  <p className="text-xs text-sidebar-foreground/70">{c.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-4xl">The current edit</h2>
          <Link to="/shop" className="text-[10px] tracking-luxe text-accent">
            View all
          </Link>
        </div>
        <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {featured?.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
        {featured?.length === 0 && (
          <p className="mt-10 text-sm text-muted-foreground">
            The collection is being photographed. Please check back shortly.
          </p>
        )}
      </section>
    </SiteShell>
  );
}
