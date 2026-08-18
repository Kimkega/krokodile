// Server-only certificate helpers. Never import from client code.

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const rand = (n: number) =>
  Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

export function newCertificateCode() {
  return `KD-${rand(4)}-${rand(4)}`;
}

export type OrderCertificate = {
  code: string;
  serial: string | null;
  product_name: string | null;
  issued_to: string | null;
  buyer_name: string | null;
  order_code: string | null;
  paid_at: string | null;
  status: string;
};

/**
 * Binds an authenticity certificate to every line of a paid order and stamps
 * the buyer's own details onto it, so a scan proves *who* the piece was made
 * for — not just that the code exists. Idempotent: re-running never
 * double-issues for the same order.
 */
export async function assignCertificatesToOrder(orderId: string): Promise<OrderCertificate[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select(
      "id, order_code, customer_name, email, phone, county, sub_county, ward, town, payment_status, updated_at, created_at",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return [];

  const address = [order.town, order.ward, order.sub_county, order.county].filter(Boolean).join(", ");
  const paidAt = (order.updated_at as string) ?? (order.created_at as string) ?? new Date().toISOString();

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("id, product_id, name, quantity")
    .eq("order_id", orderId);

  const { data: existing } = await supabaseAdmin
    .from("certificates")
    .select("code, serial, product_name, issued_to, buyer_name, order_code, paid_at, status, product_id")
    .eq("order_id", orderId);

  const already = existing ?? [];
  const needed: { product_id: string | null; name: string }[] = [];
  for (const item of items ?? []) {
    const count = item.quantity ?? 1;
    const have = already.filter((c) => c.product_id === item.product_id).length;
    for (let i = have; i < count; i++) needed.push({ product_id: item.product_id, name: item.name });
  }

  const issued: OrderCertificate[] = already.map((c) => ({
    code: c.code,
    serial: c.serial,
    product_name: c.product_name,
    issued_to: c.issued_to,
    buyer_name: c.buyer_name,
    order_code: c.order_code,
    paid_at: c.paid_at,
    status: c.status,
  }));

  for (const line of needed) {
    const stamp = {
      order_id: orderId,
      order_code: order.order_code,
      issued_to: order.customer_name,
      buyer_name: order.customer_name,
      customer_email: order.email,
      customer_phone: order.phone,
      delivery_address: address,
      paid_at: paidAt,
      assigned_at: new Date().toISOString(),
      status: "active",
    };

    // Prefer a certificate that was auto-issued when the product was created.
    let claimed: { code: string; serial: string | null; product_name: string | null } | null = null;
    if (line.product_id) {
      const { data: free } = await supabaseAdmin
        .from("certificates")
        .select("code, serial, product_name")
        .eq("product_id", line.product_id)
        .is("order_id", null)
        .limit(1)
        .maybeSingle();
      if (free) {
        const { data: updated } = await supabaseAdmin
          .from("certificates")
          .update(stamp)
          .eq("code", free.code)
          .is("order_id", null)
          .select("code, serial, product_name")
          .maybeSingle();
        claimed = updated ?? null;
      }
    }

    if (!claimed) {
      const { data: created } = await supabaseAdmin
        .from("certificates")
        .insert({
          ...stamp,
          code: newCertificateCode(),
          serial: `${new Date().getFullYear()}-${order.order_code.replace(/^KD-/, "")}-${issued.length + 1}`,
          product_id: line.product_id,
          product_name: line.name,
          notes: "Issued on payment.",
        })
        .select("code, serial, product_name")
        .maybeSingle();
      claimed = created ?? null;
    }

    if (claimed) {
      issued.push({
        code: claimed.code,
        serial: claimed.serial,
        product_name: claimed.product_name ?? line.name,
        issued_to: order.customer_name,
        buyer_name: order.customer_name,
        order_code: order.order_code,
        paid_at: paidAt,
        status: "active",
      });
    }
  }

  return issued;
}
