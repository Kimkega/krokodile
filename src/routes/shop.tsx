import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { z } from "zod";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/layout/SiteShell";
import { ProductCard, type ProductCardData } from "@/components/products/ProductCard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ShopSearch = {
  category?: string;
  q?: string;
  sort?: "newest" | "price_asc" | "price_desc" | "name";
  min?: number;
  max?: number;
};

const searchSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "name"]).optional(),
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
});

export const Route = createFileRoute("/shop")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Shop Luxury Bags — KROKO DILE" },
      {
        name: "description",
        content:
          "Search, filter and sort the full KROKO DILE collection of men's and women's luxury leather bags.",
      },
      { property: "og:title", content: "Shop Luxury Bags — KROKO DILE" },
      { property: "og:description", content: "Men's and women's luxury leather bags, made in Kenya." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Shop,
});

const SORTS = [
  { id: "newest", label: "Newest" },
  { id: "price_asc", label: "Price ↑" },
  { id: "price_desc", label: "Price ↓" },
  { id: "name", label: "A–Z" },
] as const;

const PRICE_BANDS = [
  { label: "Under 5K", min: undefined, max: 5000 },
  { label: "5K – 15K", min: 5000, max: 15000 },
  { label: "15K – 30K", min: 15000, max: 30000 },
  { label: "30K+", min: 30000, max: undefined },
] as const;

function Shop() {
  const search = Route.useSearch();
  const { category, q, sort = "newest", min, max } = search;
  const navigate = Route.useNavigate();

  const setSearch = (patch: Partial<typeof search>) =>
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, ...patch }), replace: true });

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
      let query = supabase
        .from("products")
        .select(
          "id, name, slug, price, compare_at_price, material, description, stock, created_at, product_images(url, sort_order)",
        )
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (activeCategory) query = query.eq("category_id", activeCategory.id);
      const { data } = await query;
      return (data ?? []) as (ProductCardData & {
        description: string | null;
        created_at: string;
      })[];
    },
  });

  const visible = useMemo(() => {
    let list = [...(products ?? [])];
    const term = (q ?? "").trim().toLowerCase();
    if (term) {
      list = list.filter((p) =>
        [p.name, p.material, p.description].some((v) => (v ?? "").toLowerCase().includes(term)),
      );
    }
    if (typeof min === "number") list = list.filter((p) => Number(p.price) >= min);
    if (typeof max === "number") list = list.filter((p) => Number(p.price) <= max);
    if (sort === "price_asc") list.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "price_desc") list.sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, q, min, max, sort]);

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-4 py-2 text-[10px] tracking-luxe transition-colors",
      active ? "border-accent bg-gold-gradient text-accent-foreground" : "border-border hover:border-accent",
    );

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-6 py-14">
        <h1 className="font-display text-5xl">{activeCategory?.name ?? "The collection"}</h1>

        <div className="mt-6 flex flex-col gap-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q ?? ""}
              onChange={(e) => setSearch({ q: e.target.value || undefined })}
              placeholder="Search bags, leather, styles…"
              className="pl-9"
              aria-label="Search products"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/shop" search={(prev: Record<string, unknown>) => ({ ...prev, category: undefined })} className={chip(!category)}>
              All
            </Link>
            {categories?.map((c) => (
              <Link
                key={c.slug}
                to="/shop"
                search={(prev: Record<string, unknown>) => ({ ...prev, category: c.slug })}
                className={chip(category === c.slug)}
              >
                {c.name}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] tracking-luxe text-muted-foreground">Price</span>
            <button className={chip(min === undefined && max === undefined)} onClick={() => setSearch({ min: undefined, max: undefined })}>
              Any
            </button>
            {PRICE_BANDS.map((b) => (
              <button
                key={b.label}
                className={chip(min === b.min && max === b.max)}
                onClick={() => setSearch({ min: b.min, max: b.max })}
              >
                {b.label}
              </button>
            ))}
            <span className="ml-4 text-[10px] tracking-luxe text-muted-foreground">Sort</span>
            {SORTS.map((s) => (
              <button key={s.id} className={chip(sort === s.id)} onClick={() => setSearch({ sort: s.id })}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          {visible.length} piece{visible.length === 1 ? "" : "s"}
        </p>

        <div className="mt-4 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        {!isLoading && visible.length === 0 && (
          <p className="mt-12 text-sm text-muted-foreground">
            Nothing matches that search. Try clearing filters.
          </p>
        )}
      </div>
    </SiteShell>
  );
}
