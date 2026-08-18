import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Search, SlidersHorizontal, X, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteShell } from "@/components/layout/SiteShell";
import { ProductCard, type ProductCardData } from "@/components/products/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "name"]).optional(),
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
  material: z.string().optional(),
  instock: z.coerce.boolean().optional(),
  sale: z.coerce.boolean().optional(),
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

type ShopProduct = ProductCardData & {
  description: string | null;
  created_at: string;
  compare_at_price: number | null;
  material: string | null;
  stock: number;
};

function Shop() {
  const search = Route.useSearch();
  const { category, q, sort = "newest", min, max, material, instock, sale } = search;
  const navigate = Route.useNavigate();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const setSearch = (patch: Record<string, unknown>) =>
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
      return (data ?? []) as unknown as ShopProduct[];
    },
  });

  const materials = useMemo(
    () => Array.from(new Set((products ?? []).map((p) => p.material).filter(Boolean) as string[])).sort(),
    [products],
  );

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
    if (material) list = list.filter((p) => p.material === material);
    if (instock) list = list.filter((p) => Number(p.stock) > 0);
    if (sale) list = list.filter((p) => p.compare_at_price && Number(p.compare_at_price) > Number(p.price));
    if (sort === "price_asc") list.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "price_desc") list.sort((a, b) => Number(b.price) - Number(a.price));
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, q, min, max, material, instock, sale, sort]);

  const activeCount =
    (category ? 1 : 0) +
    (q ? 1 : 0) +
    (min !== undefined || max !== undefined ? 1 : 0) +
    (material ? 1 : 0) +
    (instock ? 1 : 0) +
    (sale ? 1 : 0);

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-[10px] tracking-luxe transition-colors",
      active ? "border-accent bg-gold-gradient text-accent-foreground" : "border-border hover:border-accent",
    );

  const clearAll = () =>
    navigate({ search: {} as never, replace: true });

  const panel = (
    <div className="space-y-7">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q ?? ""}
          onChange={(e) => setSearch({ q: e.target.value || undefined })}
          placeholder="Search bags, leather…"
          className="pl-9"
          aria-label="Search products"
        />
      </div>

      <section>
        <p className="mb-2 text-[10px] tracking-luxe text-muted-foreground">Collection</p>
        <div className="flex flex-wrap gap-2">
          <button className={chip(!category)} onClick={() => setSearch({ category: undefined })}>
            All
          </button>
          {categories?.map((c) => (
            <button key={c.slug} className={chip(category === c.slug)} onClick={() => setSearch({ category: c.slug })}>
              {c.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 text-[10px] tracking-luxe text-muted-foreground">Price</p>
        <div className="flex flex-wrap gap-2">
          <button
            className={chip(min === undefined && max === undefined)}
            onClick={() => setSearch({ min: undefined, max: undefined })}
          >
            Any
          </button>
          {PRICE_BANDS.map((b) => (
            <button key={b.label} className={chip(min === b.min && max === b.max)} onClick={() => setSearch(b)}>
              {b.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Min"
            className="h-9"
            value={min ?? ""}
            onChange={(e) => setSearch({ min: e.target.value ? Number(e.target.value) : undefined })}
          />
          <span className="text-xs text-muted-foreground">—</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="Max"
            className="h-9"
            value={max ?? ""}
            onChange={(e) => setSearch({ max: e.target.value ? Number(e.target.value) : undefined })}
          />
        </div>
      </section>

      {materials.length > 0 && (
        <section>
          <p className="mb-2 text-[10px] tracking-luxe text-muted-foreground">Leather</p>
          <div className="flex flex-wrap gap-2">
            <button className={chip(!material)} onClick={() => setSearch({ material: undefined })}>
              Any
            </button>
            {materials.map((m) => (
              <button key={m} className={chip(material === m)} onClick={() => setSearch({ material: m })}>
                {m}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <label className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">In stock only</span>
          <Switch checked={!!instock} onCheckedChange={(v) => setSearch({ instock: v || undefined })} />
        </label>
        <label className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">On offer</span>
          <Switch checked={!!sale} onCheckedChange={(v) => setSearch({ sale: v || undefined })} />
        </label>
      </section>

      <section>
        <p className="mb-2 text-[10px] tracking-luxe text-muted-foreground">Sort</p>
        <div className="flex flex-wrap gap-2">
          {SORTS.map((s) => (
            <button key={s.id} className={chip(sort === s.id)} onClick={() => setSearch({ sort: s.id })}>
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {activeCount > 0 && (
        <Button variant="outline" size="sm" className="w-full" onClick={clearAll}>
          <X className="mr-2 size-3" /> Clear all filters
        </Button>
      )}
    </div>
  );

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl">{activeCategory?.name ?? "The collection"}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {visible.length} piece{visible.length === 1 ? "" : "s"}
              {activeCount > 0 ? ` · ${activeCount} filter${activeCount === 1 ? "" : "s"} on` : ""}
            </p>
          </div>
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setOpen(true)}>
            <SlidersHorizontal className="mr-2 size-4" /> Filters
            {activeCount > 0 && (
              <span className="ml-2 rounded-full bg-accent px-2 text-[10px] text-accent-foreground">{activeCount}</span>
            )}
          </Button>
        </div>

        <div className="mt-8 flex gap-8">
          {/* Desktop collapsible rail */}
          <aside
            className={cn(
              "hidden shrink-0 transition-all duration-300 lg:block",
              collapsed ? "w-12" : "w-64",
            )}
          >
            <div className="sticky top-24 rounded-sm border border-border p-3">
              <button
                className="mb-3 flex w-full items-center justify-between text-[10px] tracking-luxe text-muted-foreground hover:text-accent"
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? "Expand filters" : "Collapse filters"}
              >
                {!collapsed && <span>Filters</span>}
                {collapsed ? (
                  <SlidersHorizontal className="mx-auto size-4" />
                ) : (
                  <ChevronLeft className="size-4" />
                )}
              </button>
              {!collapsed && <div className="px-1 pb-1">{panel}</div>}
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {!isLoading && visible.length === 0 && (
              <p className="mt-12 text-sm text-muted-foreground">
                Nothing matches that search.{" "}
                <button className="text-accent underline" onClick={clearAll}>
                  Clear filters
                </button>
              </p>
            )}
            {!isLoading && visible.length === 0 && (
              <Link to="/shop" className="mt-4 inline-block text-[10px] tracking-luxe text-accent">
                Browse everything
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile slide-over */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-background/80" aria-label="Close filters" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-xs overflow-y-auto border-r border-border bg-card p-5">
            <div className="mb-5 flex items-center justify-between">
              <p className="font-display text-2xl">Filters</p>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            {panel}
            <Button className="mt-6 w-full bg-gold-gradient text-accent-foreground" onClick={() => setOpen(false)}>
              Show {visible.length} piece{visible.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      )}
    </SiteShell>
  );
}
