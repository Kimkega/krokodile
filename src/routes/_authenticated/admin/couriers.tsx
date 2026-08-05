import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/couriers")({
  component: AdminCouriers,
});

const KINDS = ["courier", "sacco", "rider", "post"] as const;

function AdminCouriers() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<string>("courier");
  const [phone, setPhone] = useState("");
  const [filter, setFilter] = useState("");

  const { data: couriers } = useQuery({
    queryKey: ["admin", "couriers", "full"],
    queryFn: async () => {
      const { data } = await supabase.from("couriers").select("id, name, kind, phone, active").order("name");
      return data ?? [];
    },
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin", "couriers"] });
  const visible = (couriers ?? []).filter((c) => c.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Couriers &amp; SACCOs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everyone who moves a bag — from G4S to your local matatu SACCO.
        </p>
      </div>

      <div className="grid gap-3 rounded-sm border border-border p-4 md:grid-cols-4">
        <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Button
          className="bg-gold-gradient text-accent-foreground"
          onClick={async () => {
            if (!name.trim()) return toast.error("Name is required");
            const { error } = await supabase
              .from("couriers")
              .insert({ name: name.trim(), kind, phone: phone || null });
            if (error) return toast.error(error.message);
            setName("");
            setPhone("");
            toast.success("Courier added");
            refresh();
          }}
        >
          <Plus className="mr-2 size-4" /> Add
        </Button>
      </div>

      <Input
        placeholder="Search couriers…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-sm"
      />

      <div className="grid gap-2 sm:grid-cols-2">
        {visible.map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-sm border border-border px-4 py-3">
            <div className="flex-1">
              <p className="text-sm font-medium">{c.name}</p>
              <p className="text-[10px] tracking-luxe text-muted-foreground">
                {c.kind}
                {c.phone ? ` · ${c.phone}` : ""}
              </p>
            </div>
            <Switch
              checked={c.active}
              onCheckedChange={async (v) => {
                await supabase.from("couriers").update({ active: v }).eq("id", c.id);
                refresh();
              }}
            />
            <button
              aria-label="Delete courier"
              className="text-muted-foreground hover:text-destructive"
              onClick={async () => {
                await supabase.from("couriers").delete().eq("id", c.id);
                refresh();
              }}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{visible.length} partners</p>
    </div>
  );
}
