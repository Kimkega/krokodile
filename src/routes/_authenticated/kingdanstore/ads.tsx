import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatKes } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/kingdanstore/ads")({
  component: AdminAds,
});

function AdminAds() {
  const qc = useQueryClient();
  const { data: ads } = useQuery({
    queryKey: ["admin", "ads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("ads")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin", "ads"] });

  const setStatus = async (id: string, status: string, days: number) => {
    const now = new Date();
    const patch =
      status === "approved"
        ? {
            status,
            starts_at: now.toISOString(),
            ends_at: new Date(now.getTime() + days * 86400000).toISOString(),
          }
        : { status };
    const { error } = await supabase.from("ads").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Advert ${status}`);
      refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Adverts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Guest-purchased placements. Approve once payment lands to put them live.
        </p>
      </div>

      <div className="space-y-3">
        {ads?.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center gap-4 rounded-sm border border-border p-4">
            {a.image_url && <img src={mediaUrl(a.image_url)} alt="" className="h-16 w-24 rounded-sm object-cover" />}
            <div className="min-w-40 flex-1">
              <p className="font-medium">{a.title}</p>
              <p className="text-xs text-muted-foreground">
                {a.ad_code} · {a.advertiser_name} · {a.phone}
              </p>
              <p className="text-xs text-muted-foreground">
                {a.placement} · {a.days} days · {formatKes(Number(a.amount))}
              </p>
            </div>
            <span className="rounded-full border border-border px-3 py-1 text-[10px] tracking-luxe">
              {a.payment_status}
            </span>
            <span className="text-[10px] tracking-luxe text-accent">{a.status}</span>
            <div className="flex gap-2">
              <Button size="sm" className="bg-gold-gradient text-accent-foreground" onClick={() => void setStatus(a.id, "approved", a.days)}>
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => void setStatus(a.id, "rejected", a.days)}>
                Reject
              </Button>
            </div>
          </div>
        ))}
        {ads?.length === 0 && <p className="text-sm text-muted-foreground">No adverts purchased yet.</p>}
      </div>
    </div>
  );
}
