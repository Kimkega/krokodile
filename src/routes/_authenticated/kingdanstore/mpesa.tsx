import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getMpesaConfig, saveMpesaConfig } from "@/lib/mpesa-admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/kingdanstore/mpesa")({
  component: AdminMpesa,
});

function AdminMpesa() {
  const load = useServerFn(getMpesaConfig);
  const save = useServerFn(saveMpesaConfig);
  const { data, refetch } = useQuery({ queryKey: ["admin", "mpesa"], queryFn: () => load() });

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [environment, setEnvironment] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const existing = data && data.exists ? data : null;
  const val = (k: string, fallback = "") => draft[k] ?? fallback;

  const submit = async () => {
    setBusy(true);
    try {
      await save({
        data: {
          environment: (environment ?? existing?.environment ?? "sandbox") as "sandbox" | "live",
          shortCode: val("shortCode", existing?.shortCode ?? ""),
          paybill: val("paybill", existing?.paybill ?? ""),
          partyB: val("partyB", existing?.partyB ?? ""),
          passkey: val("passkey"),
          consumerKey: val("consumerKey"),
          consumerSecret: val("consumerSecret"),
          accountReference: val("accountReference", existing?.accountReference ?? "KROKODILE"),
          callbackUrl: val("callbackUrl", existing?.callbackUrl ?? ""),
          enabled: enabled ?? existing?.enabled ?? false,
        },
      });
      toast.success("M-Pesa settings saved");
      setDraft({});
      void refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const field = (key: string, label: string, fallback?: string, placeholder?: string) => (
    <div key={key}>
      <label className="text-[10px] tracking-luxe text-muted-foreground">{label}</label>
      <Input
        className="mt-1"
        placeholder={placeholder}
        value={val(key, fallback ?? "")}
        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
      />
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">M-Pesa Express</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daraja credentials for STK push. Secrets are write-only — existing values stay unless you replace them.
        </p>
      </div>

      <div className="grid gap-4 rounded-sm border border-border p-4 md:grid-cols-2">
        <div>
          <label className="text-[10px] tracking-luxe text-muted-foreground">Environment</label>
          <Select
            value={environment ?? existing?.environment ?? "sandbox"}
            onValueChange={setEnvironment}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sandbox">Sandbox</SelectItem>
              <SelectItem value="live">Live</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-3">
          <Switch checked={enabled ?? existing?.enabled ?? false} onCheckedChange={setEnabled} />
          <span className="pb-2 text-xs tracking-luxe text-muted-foreground">Enable M-Pesa checkout</span>
        </div>
        {field("shortCode", "Short code", existing?.shortCode)}
        {field("paybill", "Paybill", existing?.paybill)}
        {field("partyB", "Party B", existing?.partyB)}
        {field("accountReference", "Account reference", existing?.accountReference)}
        {field("passkey", "Passkey", "", existing?.passkeyMasked || "Enter passkey")}
        {field("consumerKey", "Consumer key", "", existing?.consumerKeyMasked || "Enter consumer key")}
        {field("consumerSecret", "Consumer secret", "", existing?.consumerSecretMasked || "Enter consumer secret")}
        {field("callbackUrl", "Callback URL", existing?.callbackUrl, "https://yourdomain/api/public/mpesa/callback")}
        <Button
          disabled={busy}
          className="bg-gold-gradient text-accent-foreground md:col-span-2"
          onClick={() => void submit()}
        >
          {busy ? "Saving…" : "Save M-Pesa settings"}
        </Button>
      </div>
    </div>
  );
}
