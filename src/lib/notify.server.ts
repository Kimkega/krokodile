// Server-only notification helpers: resolves the public site URL, renders email
// templates and delivers them over the admin-configured SMTP server.
import { formatKes, orderStatusLabel } from "@/lib/format";

export type NotifyKey =
  | "order_placed"
  | "payment_received"
  | "payment_failed"
  | "order_packed"
  | "courier_assigned"
  | "in_transit"
  | "delivered"
  | "cancelled";

export const NOTIFY_KEYS: NotifyKey[] = [
  "order_placed",
  "payment_received",
  "payment_failed",
  "order_packed",
  "courier_assigned",
  "in_transit",
  "delivered",
  "cancelled",
];

export const STATUS_EMAIL: Record<string, NotifyKey> = {
  paid: "payment_received",
  packed: "order_packed",
  assigned: "courier_assigned",
  in_transit: "in_transit",
  delivered: "delivered",
  cancelled: "cancelled",
};

/** The canonical public origin — always the domain the store was bought on. */
export async function publicBaseUrl(requestOrigin?: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("public_base_url")
    .limit(1)
    .maybeSingle();
  const configured = (data?.public_base_url ?? "").trim().replace(/\/+$/, "");
  if (configured) return configured.startsWith("http") ? configured : `https://${configured}`;
  return (requestOrigin ?? "").replace(/\/+$/, "");
}

type OrderRow = {
  id: string;
  order_code: string;
  customer_name: string;
  email: string;
  phone: string;
  county: string | null;
  sub_county: string | null;
  ward: string | null;
  town: string | null;
  subtotal: number;
  shipping_fee: number;
  total: number;
  status: string;
  payment_status: string;
  mpesa_receipt: string | null;
  tracking_ref: string | null;
  courier_contact: string | null;
  couriers?: { name: string; phone: string | null } | null;
};

export function renderTokens(text: string, values: Record<string, string>) {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, k: string) => values[k] ?? "");
}

/**
 * Sends one of the stored templates for an order. Never throws — email problems
 * must not break checkout or an admin status update.
 */
export async function sendOrderEmail(
  key: NotifyKey,
  orderId: string,
  requestOrigin?: string,
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadSmtpConfig, sendSmtpMail } = await import("./smtp.server");

    const cfg = await loadSmtpConfig();
    if (!cfg || !cfg.enabled || !cfg.host) return { sent: false, reason: "SMTP not configured" };

    const { data: tpl } = await supabaseAdmin
      .from("email_templates")
      .select("subject, body, enabled")
      .eq("key", key)
      .maybeSingle();
    if (!tpl || !tpl.enabled) return { sent: false, reason: "Template disabled" };

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_code, customer_name, email, phone, county, sub_county, ward, town, subtotal, shipping_fee, total, status, payment_status, mpesa_receipt, tracking_ref, courier_contact, couriers(name, phone)",
      )
      .eq("id", orderId)
      .maybeSingle();
    if (!order?.email) return { sent: false, reason: "No recipient" };
    const row = order as unknown as OrderRow;

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("name, quantity, unit_price")
      .eq("order_id", orderId);

    const { data: settings } = await supabaseAdmin
      .from("site_settings")
      .select("site_name, contact_phone, contact_email")
      .limit(1)
      .maybeSingle();

    const base = await publicBaseUrl(requestOrigin);
    const values: Record<string, string> = {
      site_name: settings?.site_name ?? "KROKO DILE",
      order_code: row.order_code,
      customer_name: row.customer_name,
      phone: row.phone,
      email: row.email,
      items: (items ?? [])
        .map((i) => `• ${i.name} x${i.quantity} — ${formatKes(Number(i.unit_price) * i.quantity)}`)
        .join("\n"),
      subtotal: formatKes(Number(row.subtotal)),
      shipping_fee: formatKes(Number(row.shipping_fee)),
      total: formatKes(Number(row.total)),
      address: [row.town, row.ward, row.sub_county, row.county].filter(Boolean).join(", "),
      payment_status: row.payment_status,
      mpesa_receipt: row.mpesa_receipt ?? "",
      status: orderStatusLabel(row.status),
      courier: row.couriers?.name ?? "",
      courier_contact: row.courier_contact ?? row.couriers?.phone ?? "",
      tracking_ref: row.tracking_ref ?? "",
      pay_url: `${base}/order/${row.order_code}`,
      track_url: `${base}/order/${row.order_code}`,
      verify_url: `${base}/verify`,
      support_phone: settings?.contact_phone ?? "",
      support_email: settings?.contact_email ?? "",
    };

    const text = renderTokens(tpl.body, values);
    await sendSmtpMail(cfg, {
      to: row.email,
      subject: renderTokens(tpl.subject, values),
      text,
      html: emailHtml(values["site_name"]!, text, base),
    });
    return { sent: true };
  } catch (err) {
    console.error("[notify] email failed", err);
    return { sent: false, reason: err instanceof Error ? err.message : "Unknown error" };
  }
}

export function emailHtml(siteName: string, text: string, base: string) {
  const body = text
    .split("\n")
    .map((line) =>
      /^https?:\/\//.test(line.trim())
        ? `<p style="margin:0 0 10px"><a href="${line.trim()}" style="color:#8a6a2f">${line.trim()}</a></p>`
        : `<p style="margin:0 0 10px">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;") || "&nbsp;"}</p>`,
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f6f3ee;font-family:Helvetica,Arial,sans-serif;color:#2b1d12">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
    <table width="100%" style="max-width:560px;background:#ffffff;border-radius:10px;overflow:hidden">
      <tr><td style="background:#2b1d12;padding:22px;text-align:center">
        <span style="font-size:22px;letter-spacing:4px;color:#d8b46a">${siteName.toUpperCase()}</span>
      </td></tr>
      <tr><td style="padding:24px;font-size:14px;line-height:22px">${body}</td></tr>
      <tr><td style="padding:16px;background:#f6f3ee;text-align:center;font-size:11px;color:#7a6a58">
        ${base ? `<a href="${base}" style="color:#8a6a2f">${base}</a>` : siteName}
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}
