import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { formatKes, slugify } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: AdminProducts,
});

type Draft = {
  name: string;
  price: string;
  compareAt: string;
  stock: string;
  lowStock: string;
  material: string;
  description: string;
  categoryId: string;
  featured: boolean;
};

const emptyDraft: Draft = {
  name: "",
  price: "",
  compareAt: "",
  stock: "0",
  lowStock: "3",
  material: "",
  description: "",
  categoryId: "",
  featured: false,
};

function AdminProducts() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("sort_order");
      return data ?? [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, price, stock, low_stock_threshold, active, featured, product_images(url, sort_order)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin", "products"] });

  const create = async () => {
    if (!draft.name.trim() || !draft.price) {
      toast.error("Name and price are required");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("products")
      .insert({
        name: draft.name.trim(),
        slug: `${slugify(draft.name)}-${Math.random().toString(36).slice(2, 6)}`,
        price: Number(draft.price),
        compare_at_price: draft.compareAt ? Number(draft.compareAt) : null,
        stock: Number(draft.stock || 0),
        low_stock_threshold: Number(draft.lowStock || 3),
        material: draft.material || null,
        description: draft.description || null,
        category_id: draft.categoryId || null,
        featured: draft.featured,
      })
      .select("id")
      .single();
    if (error || !data) {
      setSaving(false);
      toast.error(error?.message ?? "Could not save product");
      return;
    }
    if (images.length) {
      await supabase
        .from("product_images")
        .insert(images.map((url, i) => ({ product_id: data.id, url, sort_order: i })));
    }
    setSaving(false);
    setDraft(emptyDraft);
    setImages([]);
    toast.success("Product added");
    refresh();
  };

  const patch = async (id: string, values: Record<string, unknown>) => {
    const { error } = await supabase.from("products").update(values as never).eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add pieces, drop in photos and keep stock honest.</p>
      </div>

      <div className="grid gap-4 rounded-sm border border-border p-4 md:grid-cols-3">
        <Input placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <Input
          placeholder="Price (KES)"
          type="number"
          value={draft.price}
          onChange={(e) => setDraft({ ...draft, price: e.target.value })}
        />
        <Input
          placeholder="Compare at (optional)"
          type="number"
          value={draft.compareAt}
          onChange={(e) => setDraft({ ...draft, compareAt: e.target.value })}
        />
        <Input
          placeholder="Stock"
          type="number"
          value={draft.stock}
          onChange={(e) => setDraft({ ...draft, stock: e.target.value })}
        />
        <Input
          placeholder="Low-stock alert at"
          type="number"
          value={draft.lowStock}
          onChange={(e) => setDraft({ ...draft, lowStock: e.target.value })}
        />
        <Input
          placeholder="Material e.g. Full-grain croc"
          value={draft.material}
          onChange={(e) => setDraft({ ...draft, material: e.target.value })}
        />
        <Select value={draft.categoryId} onValueChange={(v) => setDraft({ ...draft, categoryId: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-3">
          <Switch checked={draft.featured} onCheckedChange={(v) => setDraft({ ...draft, featured: v })} />
          <span className="text-xs tracking-luxe text-muted-foreground">Featured</span>
        </div>
        <Textarea
          className="md:col-span-3"
          placeholder="Description"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
        <div className="md:col-span-3">
          <ImageUploader multiple label="Upload product photos" onUploaded={(p) => setImages((s) => [...s, p])} />
          {images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {images.map((p) => (
                <img key={p} src={mediaUrl(p)} alt="" className="size-16 rounded-sm object-cover" />
              ))}
            </div>
          )}
        </div>
        <Button disabled={saving} onClick={create} className="bg-gold-gradient text-accent-foreground md:col-span-3">
          <Plus className="mr-2 size-4" /> {saving ? "Saving…" : "Add product"}
        </Button>
      </div>

      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-[10px] tracking-luxe text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Piece</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Live</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {products?.map((p) => {
              const threshold = p.low_stock_threshold ?? 3;
              const state = p.stock === 0 ? "Out of stock" : p.stock <= threshold ? "Low stock" : "In stock";
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="flex items-center gap-3 px-4 py-3">
                    {p.product_images?.[0] && (
                      <img src={mediaUrl(p.product_images[0].url)} alt="" className="size-10 rounded-sm object-cover" />
                    )}
                    {p.name}
                  </td>
                  <td className="px-4 py-3">{formatKes(Number(p.price))}</td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      defaultValue={p.stock}
                      className="h-8 w-20"
                      onBlur={(e) => void patch(p.id, { stock: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-[10px] tracking-luxe",
                        state === "In stock" && "bg-success/15 text-success",
                        state === "Low stock" && "bg-accent/20 text-accent",
                        state === "Out of stock" && "bg-destructive/15 text-destructive",
                      )}
                    >
                      {state}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Switch checked={p.active} onCheckedChange={(v) => void patch(p.id, { active: v })} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      aria-label="Delete product"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={async () => {
                        await supabase.from("products").delete().eq("id", p.id);
                        refresh();
                      }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {products?.length === 0 && <p className="p-6 text-sm text-muted-foreground">No products yet.</p>}
      </div>
    </div>
  );
}
