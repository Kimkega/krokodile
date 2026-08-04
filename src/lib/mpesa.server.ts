// Server-only M-Pesa Daraja helpers. Never import from client code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type MpesaConfig = {
  id: string;
  environment: string;
  short_code: string | null;
  paybill: string | null;
  party_b: string | null;
  passkey: string | null;
  consumer_key: string | null;
  consumer_secret: string | null;
  account_reference: string | null;
  callback_url: string | null;
  enabled: boolean;
};

export async function loadMpesaConfig(): Promise<MpesaConfig | null> {
  const { data } = await supabaseAdmin
    .from("mpesa_config")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as MpesaConfig | null) ?? null;
}

function baseUrl(env: string) {
  return env === "live" || env === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function timestamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function accessToken(cfg: MpesaConfig): Promise<string> {
  const creds = btoa(`${cfg.consumer_key}:${cfg.consumer_secret}`);
  const res = await fetch(`${baseUrl(cfg.environment)}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${creds}` },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`M-Pesa auth failed [${res.status}]: ${body}`);
  const json = JSON.parse(body) as { access_token?: string };
  if (!json.access_token) throw new Error(`M-Pesa auth returned no token: ${body}`);
  return json.access_token;
}

export async function stkPush(params: {
  cfg: MpesaConfig;
  phone: string;
  amount: number;
  reference: string;
  description: string;
  callbackUrl: string;
}): Promise<{ ok: boolean; checkoutRequestId?: string; merchantRequestId?: string; message: string }> {
  const { cfg, phone, amount, reference, description, callbackUrl } = params;
  const ts = timestamp();
  const shortCode = (cfg.short_code || cfg.paybill || "").trim();
  const partyB = (cfg.party_b || cfg.paybill || shortCode).trim();
  const password = btoa(`${shortCode}${cfg.passkey}${ts}`);
  const token = await accessToken(cfg);

  const res = await fetch(`${baseUrl(cfg.environment)}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: ts,
      TransactionType: cfg.paybill ? "CustomerPayBillOnline" : "CustomerBuyGoodsOnline",
      Amount: Math.max(1, Math.round(amount)),
      PartyA: phone,
      PartyB: partyB,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: reference.slice(0, 12),
      TransactionDesc: description.slice(0, 60),
    }),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* keep raw text */
  }
  if (!res.ok) {
    console.error(`[mpesa] stk push failed [${res.status}]: ${text}`);
    return { ok: false, message: String(json["errorMessage"] ?? `Request failed (${res.status})`) };
  }
  if (String(json["ResponseCode"]) !== "0") {
    return { ok: false, message: String(json["ResponseDescription"] ?? "STK push rejected") };
  }
  return {
    ok: true,
    checkoutRequestId: String(json["CheckoutRequestID"] ?? ""),
    merchantRequestId: String(json["MerchantRequestID"] ?? ""),
    message: "STK push sent. Enter your M-Pesa PIN on your phone.",
  };
}

export async function stkQuery(
  cfg: MpesaConfig,
  checkoutRequestId: string,
): Promise<{ resultCode: string | null; description: string }> {
  const ts = timestamp();
  const shortCode = (cfg.short_code || cfg.paybill || "").trim();
  const password = btoa(`${shortCode}${cfg.passkey}${ts}`);
  const token = await accessToken(cfg);
  const res = await fetch(`${baseUrl(cfg.environment)}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: ts,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* keep raw */
  }
  if (!res.ok) return { resultCode: null, description: `Query failed (${res.status})` };
  const code = json["ResultCode"];
  return {
    resultCode: code === undefined || code === null ? null : String(code),
    description: String(json["ResultDesc"] ?? ""),
  };
}
