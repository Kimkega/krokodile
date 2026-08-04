import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/layout/SiteShell";
import { ProductCard, type ProductCardData } from "@/components/products/ProductCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shop")({
  validateSearch: z.object({ category: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Shop Luxury Bags — KROKO DILE" },
      {
        name: "description",
        content: "Browse the full KROKO DILE collection of men's and women's luxury leather bags.",
      },
      { property: "og:title", content: "Shop Luxury Bags — KROKO DILE" },
      { property: "og:description", content: "Men's and women's luxury leather bags, made in Kenya." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { category } = Route.useSearch();

  const { data: categories } = useQuery({
    queryKey: ["categories", "shop"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("active", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  const activeCategory = categories?.find((c) => c.slug === category);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "shop", activeCategory?.id ?? category ?? "all"],
    enabled: !category || !!categories,
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("id, name, slug, price, compare_at_price, material, product_images(url, sort_order)")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (activeCategory) q = q.eq("category_id", activeCategory.id);
      const { data } = await q;
      return (data ?? []) as ProductCardData[];
    },
  });

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-6 py-14">
        <h1 className="font-display text-5xl">{activeCategory?.name ?? "The collection"}</h1>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            to="/shop"
            className={cn(
              "rounded-full border px-4 py-2 text-[10px] tracking-luxe",
              !category ? "border-accent bg-gold-gradient text-accent-foreground" : "border-border",
            )}
          >
            All
          </Link>
          {categories?.map((c) => (
            <Link
              key={c.slug}
              to="/shop"
              search={{ category: c.slug }}
              className={cn(
                "rounded-full border px-4 py-2 text-[10px] tracking-luxe",
                category === c.slug
                  ? "border-accent bg-gold-gradient text-accent-foreground"
                  : "border-border",
              )}
            >
              {c.name}
            </Link>
          ))}
        </div>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {products?.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
        {!isLoading && products?.length === 0 && (
          <p className="mt-12 text-sm text-muted-foreground">No pieces in this house yet.</p>
        )}
      </div>
    </SiteShell>
  );
}
