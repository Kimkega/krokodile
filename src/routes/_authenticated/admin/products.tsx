import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Save, X, QrCode, Star, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { formatKes, slugify } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { downloadCertificatePdf } from "@/lib/pdf-cards";
import { siteOrigin, verifyUrl } from "@/lib/site-url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  active: boolean;
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
  active: true,
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  stock: number;
  low_stock_threshold: number | null;
  material: string | null;
  description: string | null;
  category_id: string | null;
  active: boolean;
  featured: boolean;
  product_images: { id: string; url: string; sort_order: number }[];
};

function AdminProducts() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [search, setSearch] = useState("");

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
        .select(
          "id, name, slug, price, compare_at_price, stock, low_stock_threshold, material, description, category_id, active, featured, product_images(id, url, sort_order)",
        )
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as ProductRow[];
    },
  });

  const { data: certs } = useQuery({
    queryKey: ["admin", "product-certs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("certificates")
        .select("code, serial, product_id, product_name, order_code")
        .order("created_at", { ascending: false })
        .limit(500);
      return data ?? [];
    },
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin", "products"] });
    void qc.invalidateQueries({ queryKey: ["admin", "product-certs"] });
  };

  const certFor = (productId: string) => certs?.find((c) => c.product_id === productId && !c.order_code) ?? null;

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
        active: draft.active,
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
    toast.success("Product added — authenticity certificate issued automatically");
    refresh();
  };

  const patch = async (id: string, values: Record<string, unknown>) => {
    const { error } = await supabase.from("products").update(values as never).eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  };

  const downloadQr = async (code: string) => {
    const dataUrl = await QRCode.toDataURL(verifyUrl(code), { margin: 1, width: 1024 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${code}-qr.png`;
    a.click();
  };

  const filtered = (products ?? []).filter((p) =>
    search ? p.name.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add pieces, drop in as many photos as you like and keep stock honest. Every new product gets its own
          authenticity QR the moment it is saved.
        </p>
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
                <div key={p} className="relative">
                  <img src={mediaUrl(p)} alt="" className="size-16 rounded-sm object-cover" />
                  <button
                    className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-primary-foreground"
                    onClick={() => setImages((s) => s.filter((x) => x !== p))}
                    aria-label="Remove photo"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <Button disabled={saving} onClick={create} className="bg-gold-gradient text-accent-foreground md:col-span-3">
          <Plus className="mr-2 size-4" /> {saving ? "Saving…" : "Add product"}
        </Button>
      </div>

      <Input
        placeholder="Search products…"
        className="max-w-xs"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="overflow-x-auto rounded-sm border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left text-[10px] tracking-luxe text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Piece</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Certificate</th>
              <th className="px-4 py-3">Live</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const threshold = p.low_stock_threshold ?? 3;
              const state = p.stock === 0 ? "Out of stock" : p.stock <= threshold ? "Low stock" : "In stock";
              const cert = certFor(p.id);
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.product_images?.[0] && (
                        <img
                          src={mediaUrl(
                            [...p.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]!.url,
                          )}
                          alt=""
                          className="size-10 rounded-sm object-cover"
                        />
                      )}
                      <span>
                        {p.name}
                        <span className="ml-2 text-[10px] text-muted-foreground">
                          {p.product_images?.length ?? 0} photo{(p.product_images?.length ?? 0) === 1 ? "" : "s"}
                        </span>
                      </span>
                    </div>
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
                    {cert ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px]">{cert.code}</span>
                        <button
                          className="text-muted-foreground hover:text-accent"
                          aria-label="Download QR"
                          onClick={() => void downloadQr(cert.code)}
                        >
                          <QrCode className="size-4" />
                        </button>
                        <button
                          className="text-[10px] tracking-luxe text-accent"
                          onClick={() =>
                            void downloadCertificatePdf(
                              [{ code: cert.code, serial: cert.serial, productName: cert.product_name }],
                              { brand: "KROKO DILE", origin: siteOrigin() },
                            )
                          }
                        >
                          PDF
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Switch checked={p.active} onCheckedChange={(v) => void patch(p.id, { active: v })} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button
                        aria-label="Edit product"
                        className="text-muted-foreground hover:text-accent"
                        onClick={() => setEditing(p)}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        aria-label="Delete product"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={async () => {
                          if (!confirm(`Delete ${p.name}?`)) return;
                          await supabase.from("products").delete().eq("id", p.id);
                          refresh();
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-6 text-sm text-muted-foreground">No products yet.</p>}
      </div>

      {editing && (
        <EditProductDialog
          product={editing}
          categories={categories ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function EditProductDialog({
  product,
  categories,
  onClose,
  onSaved,
}: {
  product: ProductRow;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Draft>({
    name: product.name,
    price: String(product.price),
    compareAt: product.compare_at_price ? String(product.compare_at_price) : "",
    stock: String(product.stock),
    lowStock: String(product.low_stock_threshold ?? 3),
    material: product.material ?? "",
    description: product.description ?? "",
    categoryId: product.category_id ?? "",
    featured: product.featured,
    active: product.active,
  });
  const [gallery, setGallery] = useState(
    [...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setGallery([...(product.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order));
  }, [product]);

  const addImage = async (url: string) => {
    const { data, error } = await supabase
      .from("product_images")
      .insert({ product_id: product.id, url, sort_order: gallery.length })
      .select("id, url, sort_order")
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Upload failed");
      return;
    }
    setGallery((g) => [...g, data]);
  };

  const removeImage = async (id: string) => {
    await supabase.from("product_images").delete().eq("id", id);
    setGallery((g) => g.filter((i) => i.id !== id));
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...gallery];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setGallery(next);
    await Promise.all(
      next.map((img, i) => supabase.from("product_images").update({ sort_order: i }).eq("id", img.id)),
    );
  };

  const save = async () => {
    if (!form.name.trim() || !form.price) {
      toast.error("Name and price are required");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("products")
      .update({
        name: form.name.trim(),
        price: Number(form.price),
        compare_at_price: form.compareAt ? Number(form.compareAt) : null,
        stock: Number(form.stock || 0),
        low_stock_threshold: Number(form.lowStock || 3),
        material: form.material || null,
        description: form.description || null,
        category_id: form.categoryId || null,
        featured: form.featured,
        active: form.active,
      })
      .eq("id", product.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Product updated");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl">Edit {product.name}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Material</Label>
            <Input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} />
          </div>
          <div>
            <Label>Price (KES)</Label>
            <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </div>
          <div>
            <Label>Compare at</Label>
            <Input
              type="number"
              value={form.compareAt}
              onChange={(e) => setForm({ ...form, compareAt: e.target.value })}
            />
          </div>
          <div>
            <Label>Stock</Label>
            <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </div>
          <div>
            <Label>Low-stock alert at</Label>
            <Input
              type="number"
              value={form.lowStock}
              onChange={(e) => setForm({ ...form, lowStock: e.target.value })}
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-6 pb-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} /> Featured
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} /> Live
            </label>
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-2">
          <p className="mb-2 text-[10px] tracking-luxe text-muted-foreground">
            Gallery — first photo is the cover
          </p>
          <div className="flex flex-wrap gap-3">
            {gallery.map((img, i) => (
              <div key={img.id} className="relative">
                <img src={mediaUrl(img.url)} alt="" className="size-24 rounded-sm object-cover" />
                {i === 0 && (
                  <span className="absolute left-1 top-1 rounded-full bg-gold-gradient px-1.5 py-0.5 text-[8px] text-accent-foreground">
                    <Star className="inline size-2.5" /> Cover
                  </span>
                )}
                <div className="mt-1 flex items-center justify-between gap-1">
                  <button onClick={() => void move(i, -1)} aria-label="Move left">
                    <ArrowLeft className="size-3 text-muted-foreground hover:text-accent" />
                  </button>
                  <button onClick={() => void removeImage(img.id)} aria-label="Remove photo">
                    <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                  </button>
                  <button onClick={() => void move(i, 1)} aria-label="Move right">
                    <ArrowRight className="size-3 text-muted-foreground hover:text-accent" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <ImageUploader
            className="mt-3"
            multiple
            label="Add more photos"
            onUploaded={(p) => void addImage(p)}
          />
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={busy} className="bg-gold-gradient text-accent-foreground" onClick={() => void save()}>
            <Save className="mr-2 size-4" /> {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
