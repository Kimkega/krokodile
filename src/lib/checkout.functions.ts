import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const itemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20),
});

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(9).max(20),
  county: z.string().trim().min(2).max(80),
  subCounty: z.string().trim().min(1).max(80),
  ward: z.string().trim().max(80).optional().default(""),
  town: z.string().trim().max(120).optional().default(""),
  addressNotes: z.string().trim().max(500).optional().default(""),
  items: z.array(itemSchema).min(1).max(30),
});

function code() {
  const letters = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += letters[Math.floor(Math.random() * letters.length)];
  return `KD-${out}`;
}

function normalize(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") || digits.startsWith("1")) return `254${digits}`;
  return digits;
}

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => checkoutSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadMpesaConfig, stkPush } = await import("./mpesa.server");
    const { getRequest } = await import("@tanstack/react-start/server");

    const phone = normalize(data.phone);
    if (!/^254(7|1)\d{8}$/.test(phone)) {
      return { ok: false as const, message: "Enter a valid Kenyan phone number." };
    }

    const ids = data.items.map((i) => i.productId);
    const { data: products, error: prodError } = await supabaseAdmin
      .from("products")
      .select("id, name, price, slug, active")
      .in("id", ids);
    if (prodError) throw new Error(prodError.message);
    const available = (products ?? []).filter((p) => p.active);
    if (available.length === 0) return { ok: false as const, message: "Your cart items are no longer available." };

    const { data: images } = await supabaseAdmin
      .from("product_images")
      .select("product_id, url, sort_order")
      .in("product_id", ids)
      .order("sort_order", { ascending: true });

    const lines = data.items
      .map((item) => {
        const product = available.find((p) => p.id === item.productId);
        if (!product) return null;
        return {
          product_id: product.id,
          name: product.name,
          unit_price: Number(product.price),
          quantity: item.quantity,
          image_url: images?.find((i) => i.product_id === product.id)?.url ?? null,
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);

    const subtotal = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0);

    const { data: zone } = await supabaseAdmin
      .from("shipping_zones")
      .select("fee")
      .eq("county", data.county)
      .maybeSingle();
    const { data: settings } = await supabaseAdmin
      .from("site_settings")
      .select("free_shipping_threshold")
      .limit(1)
      .maybeSingle();

    const threshold = Number(settings?.free_shipping_threshold ?? 0);
    const baseFee = zone ? Number(zone.fee) : 350;
    const shippingFee = threshold > 0 && subtotal >= threshold ? 0 : baseFee;
    const total = subtotal + shippingFee;

    const orderCode = code();
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        order_code: orderCode,
        customer_name: data.customerName,
        email: data.email.toLowerCase(),
        phone,
        county: data.county,
        sub_county: data.subCounty,
        ward: data.ward,
        town: data.town,
        address_notes: data.addressNotes,
        subtotal,
        shipping_fee: shippingFee,
        total,
      })
      .select("id, order_code")
      .single();
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("order_items").insert(lines.map((l) => ({ ...l, order_id: order.id })));
    await supabaseAdmin
      .from("order_events")
      .insert({ order_id: order.id, status: "pending", note: "Order placed, awaiting M-Pesa payment." });

    const cfg = await loadMpesaConfig();
    if (!cfg || !cfg.enabled || !cfg.consumer_key || !cfg.consumer_secret || !cfg.passkey) {
      await supabaseAdmin
        .from("orders")
        .update({ payment_message: "M-Pesa is not configured yet. The store will contact you." })
        .eq("id", order.id);
      return {
        ok: true as const,
        orderCode,
        paymentStarted: false,
        message: "Order saved. M-Pesa payments are not configured yet — the store will contact you.",
      };
    }

    const origin = (() => {
      try {
        return new URL(getRequest().url).origin;
      } catch {
        return "";
      }
    })();
    const callbackUrl = cfg.callback_url?.trim() || `${origin}/api/public/mpesa/callback`;

    try {
      const push = await stkPush({
        cfg,
        phone,
        amount: total,
        reference: orderCode,
        description: `KROKO DILE ${orderCode}`,
        callbackUrl,
      });
      await supabaseAdmin
        .from("orders")
        .update({
          checkout_request_id: push.checkoutRequestId ?? null,
          merchant_request_id: push.merchantRequestId ?? null,
          payment_message: push.message,
          payment_status: push.ok ? "processing" : "failed",
        })
        .eq("id", order.id);
      return { ok: true as const, orderCode, paymentStarted: push.ok, message: push.message };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment could not be started";
      console.error("[checkout] stk push error", message);
      await supabaseAdmin
        .from("orders")
        .update({ payment_status: "failed", payment_message: message })
        .eq("id", order.id);
      return { ok: true as const, orderCode, paymentStarted: false, message };
    }
  });

export const getOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ orderCode: z.string().trim().min(4).max(20) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadMpesaConfig, stkQuery } = await import("./mpesa.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_code, customer_name, email, phone, county, sub_county, ward, town, address_notes, subtotal, shipping_fee, total, status, payment_status, payment_message, mpesa_receipt, checkout_request_id, tracking_ref, created_at, couriers(name, phone)",
      )
      .eq("order_code", data.orderCode.toUpperCase())
      .maybeSingle();
    if (!order) return { ok: false as const, message: "Order not found." };

    // Fallback reconciliation when the Daraja callback has not arrived yet.
    if (order.payment_status === "processing" && order.checkout_request_id) {
      const cfg = await loadMpesaConfig();
      if (cfg?.enabled) {
        try {
          const q = await stkQuery(cfg, order.checkout_request_id);
          if (q.resultCode === "0") {
            await supabaseAdmin
              .from("orders")
              .update({ payment_status: "paid", status: "paid", payment_message: q.description })
              .eq("id", order.id);
            order.payment_status = "paid";
            order.status = "paid";
            order.payment_message = q.description;
          } else if (q.resultCode && q.resultCode !== "0" && q.resultCode !== "1032" && q.resultCode !== "1037") {
            await supabaseAdmin
              .from("orders")
              .update({ payment_status: "failed", payment_message: q.description })
              .eq("id", order.id);
            order.payment_status = "failed";
            order.payment_message = q.description;
          } else if (q.resultCode === "1032" || q.resultCode === "1037") {
            await supabaseAdmin
              .from("orders")
              .update({ payment_status: "failed", payment_message: q.description || "Payment cancelled." })
              .eq("id", order.id);
            order.payment_status = "failed";
            order.payment_message = q.description || "Payment cancelled.";
          }
        } catch (err) {
          console.error("[checkout] stk query error", err);
        }
      }
    }

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("name, unit_price, quantity, image_url")
      .eq("order_id", order.id);

    const { data: events } = await supabaseAdmin
      .from("order_events")
      .select("status, note, created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    const { id: _id, ...safeOrder } = order;
    return { ok: true as const, order: safeOrder, items: items ?? [], events: events ?? [] };
  });

export const trackOrders = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ email: z.string().trim().email().max(200), phone: z.string().trim().min(9).max(20) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = normalize(data.phone);
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select(
        "order_code, status, payment_status, total, created_at, tracking_ref, county, sub_county, town, couriers(name, phone)",
      )
      .eq("email", data.email.trim().toLowerCase())
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(25);
    return { ok: true as const, orders: orders ?? [] };
  });
