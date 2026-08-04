import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/layout/SiteShell";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { formatKes } from "@/lib/format";
import { mediaUrl } from "@/lib/media";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — KROKO DILE` },
      { name: "description", content: "A hand-finished luxury leather piece from the KROKO DILE house." },
      { property: "og:title", content: `${params.slug.replace(/-/g, " ")} — KROKO DILE` },
      { property: "og:description", content: "A hand-finished luxury leather piece from KROKO DILE." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { add, setOpen } = useCart();
  const [active, setActive] = useState(0);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select(
          "id, name, slug, description, price, compare_at_price, material, colors, stock, product_images(url, sort_order), categories(name, slug)",
        )
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();
      return data;
    },
  });

  if (isLoading) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-7xl px-6 py-24 text-sm text-muted-foreground">Loading piece…</div>
      </SiteShell>
    );
  }

  if (!product) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="font-display text-4xl">This piece is no longer available</h1>
          <Link to="/shop" className="mt-6 inline-block text-[10px] tracking-luxe text-accent">
            Back to the collection
          </Link>
        </div>
      </SiteShell>
    );
  }

  const images = [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const hero = images[active]?.url ?? null;

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <Link to="/shop" className="inline-flex items-center gap-2 text-[10px] tracking-luxe text-muted-foreground">
          <ArrowLeft className="size-3" /> Collection
        </Link>

        <div className="mt-6 grid gap-12 md:grid-cols-2">
          <div>
            <div className="aspect-4/5 overflow-hidden rounded-sm bg-secondary">
              {hero ? (
                <img src={mediaUrl(hero)} alt={product.name} className="size-full object-cover" />
              ) : (
                <div className="croc-texture size-full bg-cocoa-gradient" />
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-3">
                {images.map((img, i) => (
                  <button
                    key={img.url}
                    onClick={() => setActive(i)}
                    className={`size-20 overflow-hidden rounded-sm border ${i === active ? "border-accent" : "border-border"}`}
                  >
                    <img src={mediaUrl(img.url)} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] tracking-luxe text-muted-foreground">
              {product.categories?.name ?? "KROKO DILE"}
            </p>
            <h1 className="mt-3 font-display text-5xl leading-tight">{product.name}</h1>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-display text-3xl text-accent">{formatKes(product.price)}</span>
              {product.compare_at_price && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatKes(product.compare_at_price)}
                </span>
              )}
            </div>
            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
              {product.description}
            </p>

            <dl className="mt-8 grid grid-cols-2 gap-4 border-y border-border py-5 text-sm">
              <div>
                <dt className="text-[10px] tracking-luxe text-muted-foreground">Material</dt>
                <dd>{product.material ?? "Full-grain leather"}</dd>
              </div>
              <div>
                <dt className="text-[10px] tracking-luxe text-muted-foreground">Colours</dt>
                <dd>{(product.colors ?? []).join(", ") || "Cocoa / Gold"}</dd>
              </div>
            </dl>

            <Button
              className="mt-8 w-full bg-gold-gradient py-6 text-accent-foreground shadow-gold hover:opacity-90"
              disabled={product.stock !== null && product.stock <= 0}
              onClick={() => {
                add({
                  productId: product.id,
                  slug: product.slug,
                  name: product.name,
                  price: Number(product.price),
                  image: images[0]?.url ?? null,
                });
                toast.success("Added to your selection");
                setOpen(true);
              }}
            >
              <ShoppingBag className="mr-2 size-4" />
              {product.stock !== null && product.stock <= 0 ? "Sold out" : "Add to bag"}
            </Button>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
