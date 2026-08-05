import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { slugify } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/admin/categories")({
  component: AdminCategories,
});

function AdminCategories() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["admin", "categories", "full"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, description, image_url, sort_order, active")
        .order("sort_order");
      return data ?? [];
    },
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin", "categories"] });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Categories</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Men, women or any new house you invent — customers filter the shop by these.
        </p>
      </div>

      <div className="grid gap-4 rounded-sm border border-border p-4 md:grid-cols-3">
        <Input placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          placeholder="Short description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <ImageUploader folder="categories" label="Cover image" onUploaded={setImage} />
        {image && <img src={mediaUrl(image)} alt="" className="h-20 w-32 rounded-sm object-cover" />}
        <Button
          className="bg-gold-gradient text-accent-foreground md:col-span-3"
          onClick={async () => {
            if (!name.trim()) return toast.error("Name is required");
            const { error } = await supabase.from("categories").insert({
              name: name.trim(),
              slug: slugify(name),
              description: description || null,
              image_url: image || null,
              sort_order: (categories?.length ?? 0) + 1,
            });
            if (error) return toast.error(error.message);
            setName("");
            setDescription("");
            setImage("");
            toast.success("Category added");
            refresh();
          }}
        >
          <Plus className="mr-2 size-4" /> Add category
        </Button>
      </div>

      <div className="space-y-2">
        {categories?.map((c) => (
          <div key={c.id} className="flex items-center gap-4 rounded-sm border border-border px-4 py-3">
            {c.image_url && <img src={mediaUrl(c.image_url)} alt="" className="size-10 rounded-sm object-cover" />}
            <div className="flex-1">
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.description}</p>
            </div>
            <Switch
              checked={c.active}
              onCheckedChange={async (v) => {
                await supabase.from("categories").update({ active: v }).eq("id", c.id);
                refresh();
              }}
            />
            <button
              aria-label="Delete category"
              className="text-muted-foreground hover:text-destructive"
              onClick={async () => {
                await supabase.from("categories").delete().eq("id", c.id);
                refresh();
              }}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
