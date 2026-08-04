import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const configSchema = z.object({
  environment: z.enum(["sandbox", "live"]),
  shortCode: z.string().trim().max(20).optional().default(""),
  paybill: z.string().trim().max(20).optional().default(""),
  partyB: z.string().trim().max(20).optional().default(""),
  passkey: z.string().trim().max(300).optional().default(""),
  consumerKey: z.string().trim().max(300).optional().default(""),
  consumerSecret: z.string().trim().max(300).optional().default(""),
  accountReference: z.string().trim().max(20).optional().default("KROKODILE"),
  callbackUrl: z.string().trim().max(300).optional().default(""),
  enabled: z.boolean(),
});

function mask(value: string | null | undefined) {
  if (!value) return "";
  return `••••••••${value.slice(-4)}`;
}

export const getMpesaConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("mpesa_config")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return { exists: false as const };
    return {
      exists: true as const,
      environment: data.environment,
      shortCode: data.short_code ?? "",
      paybill: data.paybill ?? "",
      partyB: data.party_b ?? "",
      accountReference: data.account_reference ?? "",
      callbackUrl: data.callback_url ?? "",
      enabled: data.enabled,
      passkeyMasked: mask(data.passkey),
      consumerKeyMasked: mask(data.consumer_key),
      consumerSecretMasked: mask(data.consumer_secret),
    };
  });

export const saveMpesaConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => configSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("mpesa_config")
      .select("id, passkey, consumer_key, consumer_secret")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload = {
      environment: data.environment,
      short_code: data.shortCode || null,
      paybill: data.paybill || null,
      party_b: data.partyB || null,
      account_reference: data.accountReference || "KROKODILE",
      callback_url: data.callbackUrl || null,
      enabled: data.enabled,
      passkey: data.passkey || existing?.passkey || null,
      consumer_key: data.consumerKey || existing?.consumer_key || null,
      consumer_secret: data.consumerSecret || existing?.consumer_secret || null,
    };

    if (existing) {
      const { error } = await supabaseAdmin.from("mpesa_config").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("mpesa_config").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });
