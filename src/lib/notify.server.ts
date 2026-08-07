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
    const unpaid = row.payment_status !== "paid";
    const cta =
      key === "payment_failed" || (key === "order_placed" && unpaid)
        ? { label: "Complete payment", url: values["pay_url"]! }
        : { label: "Track your order", url: values["track_url"]! };

    await sendSmtpMail(cfg, {
      to: row.email,
      subject: renderTokens(tpl.subject, values),
      text: `${text}\n\n${cta.label}: ${cta.url}`,
      html: emailHtml(values["site_name"]!, text, base, {
        preheader: renderTokens(tpl.subject, values),
        title: EMAIL_TITLES[key],
        cta,
        meta: [
          ["Order", row.order_code],
          ["Total", values["total"]!],
          ["Payment", row.payment_status.toUpperCase()],
          ["Status", values["status"]!],
        ],
        supportEmail: values["support_email"]!,
        supportPhone: values["support_phone"]!,
      }),
    });
    return { sent: true };
  } catch (err) {
    console.error("[notify] email failed", err);
    return { sent: false, reason: err instanceof Error ? err.message : "Unknown error" };
  }
}

const EMAIL_TITLES: Record<NotifyKey, string> = {
  order_placed: "Order received",
  payment_received: "Payment confirmed",
  payment_failed: "Payment not completed",
  order_packed: "Your order is packed",
  courier_assigned: "Courier assigned",
  in_transit: "On the way to you",
  delivered: "Delivered",
  cancelled: "Order cancelled",
};

type EmailOpts = {
  preheader?: string;
  title?: string;
  cta?: { label: string; url: string } | null;
  meta?: [string, string][];
  supportEmail?: string;
  supportPhone?: string;
};

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Responsive, brand-styled email shell. Table based so it renders everywhere. */
export function emailHtml(siteName: string, text: string, base: string, opts: EmailOpts = {}) {
  const body = text
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t) return `<div style="height:10px;line-height:10px">&nbsp;</div>`;
      if (/^https?:\/\//.test(t))
        return `<p style="margin:0 0 10px;word-break:break-all"><a href="${esc(t)}" style="color:#8a6a2f">${esc(t)}</a></p>`;
      if (/^[•\-*]\s/.test(t))
        return `<p style="margin:0 0 6px;padding-left:10px;color:#4a3a2a">${esc(t.replace(/^[•\-*]\s/, "• "))}</p>`;
      return `<p style="margin:0 0 10px;color:#3b2a1c">${esc(t)}</p>`;
    })
    .join("");

  const meta = (opts.meta ?? []).filter(([, v]) => v);
  const metaRows = meta.length
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border:1px solid #ece5da;border-radius:10px;overflow:hidden">
        ${meta
          .map(
            ([k, v], i) =>
              `<tr style="background:${i % 2 ? "#ffffff" : "#faf7f2"}">
                 <td style="padding:10px 14px;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#8b7a66">${esc(k)}</td>
                 <td align="right" style="padding:10px 14px;font-size:13px;color:#2b1d12;font-weight:600">${esc(v)}</td>
               </tr>`,
          )
          .join("")}
      </table>`
    : "";

  const cta = opts.cta?.url
    ? `<table cellpadding="0" cellspacing="0" style="margin:6px 0 4px"><tr>
        <td align="center" style="border-radius:999px;background:linear-gradient(135deg,#d8b46a,#a9822f)">
          <a href="${esc(opts.cta.url)}" style="display:inline-block;padding:13px 30px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#2b1d12;text-decoration:none;font-weight:700">${esc(opts.cta.label)}</a>
        </td></tr></table>`
    : "";

  const support = [
    opts.supportPhone ? `<a href="tel:${esc(opts.supportPhone)}" style="color:#8a6a2f">${esc(opts.supportPhone)}</a>` : "",
    opts.supportEmail
      ? `<a href="mailto:${esc(opts.supportEmail)}" style="color:#8a6a2f">${esc(opts.supportEmail)}</a>`
      : "",
  ]
    .filter(Boolean)
    .join(" &nbsp;·&nbsp; ");

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${esc(siteName)}</title>
<style>
  @media only screen and (max-width:600px){
    .kd-card{width:100%!important;border-radius:0!important}
    .kd-pad{padding:20px!important}
    .kd-title{font-size:22px!important}
  }
</style></head>
<body style="margin:0;padding:0;background:#f2ede5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#2b1d12">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader ?? "")}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f2ede5"><tr><td align="center" style="padding:26px 12px">
  <table class="kd-card" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(43,29,18,.10)">
    <tr><td style="background:linear-gradient(140deg,#2b1d12,#43301d);padding:26px 24px;text-align:center">
      <div style="font-size:24px;letter-spacing:6px;color:#d8b46a;font-weight:700">${esc(siteName.toUpperCase())}</div>
      <div style="margin-top:6px;font-size:10px;letter-spacing:3px;color:#c9b79a;text-transform:uppercase">Luxury leather · Nairobi</div>
    </td></tr>
    ${
      opts.title
        ? `<tr><td class="kd-pad" style="padding:26px 28px 0">
             <h1 class="kd-title" style="margin:0;font-size:26px;line-height:1.2;color:#2b1d12;font-weight:600">${esc(opts.title)}</h1>
           </td></tr>`
        : ""
    }
    <tr><td class="kd-pad" style="padding:18px 28px 24px;font-size:14px;line-height:22px">
      ${body}
      ${metaRows}
      ${cta}
    </td></tr>
    <tr><td style="padding:18px 24px;background:#faf7f2;text-align:center;font-size:11px;line-height:18px;color:#8b7a66">
      ${support ? `${support}<br>` : ""}
      ${base ? `<a href="${esc(base)}" style="color:#8a6a2f">${esc(base.replace(/^https?:\/\//, ""))}</a><br>` : ""}
      © ${new Date().getFullYear()} ${esc(siteName)}. Every piece carries a numbered authenticity certificate.
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}
