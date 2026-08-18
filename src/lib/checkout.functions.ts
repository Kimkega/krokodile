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
      const { sendOrderEmail } = await import("./notify.server");
      await sendOrderEmail("order_placed", order.id, origin);
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
        "id, order_code, customer_name, email, phone, county, sub_county, ward, town, address_notes, subtotal, shipping_fee, total, status, payment_status, payment_message, mpesa_receipt, checkout_request_id, tracking_ref, courier_contact, delivery_note_no, created_at, couriers(name, phone)",
      )
      .eq("order_code", data.orderCode.toUpperCase())
      .maybeSingle();
    if (!order) return { ok: false as const, message: "Order not found." };

    // Fallback reconciliation when the Daraja callback has not arrived yet.
    // The STK prompt lives for ~60s on the handset, so we never declare failure
    // before the customer has had a chance to enter their PIN.
    const ageMs = Date.now() - new Date(order.created_at as string).getTime();
    if (order.payment_status === "processing" && order.checkout_request_id && ageMs > 12_000) {
      const cfg = await loadMpesaConfig();
      if (cfg?.enabled) {
        try {
          const q = await stkQuery(cfg, order.checkout_request_id);
          // null  -> Daraja is still processing (HTTP 500 / 500.001.1001). Keep waiting.
          // "0"   -> paid.
          // 1032  -> cancelled by user, 1037 -> no response, 1 -> insufficient funds, 2001 -> wrong PIN.
          const terminalFailure = ["1", "1032", "1037", "1001", "2001", "1019", "1025", "9999"];
          if (q.resultCode === "0") {
            const patch = { payment_status: "paid", status: "paid", payment_message: q.description };
            await supabaseAdmin.from("orders").update(patch).eq("id", order.id);
            await supabaseAdmin
              .from("order_events")
              .insert({ order_id: order.id, status: "paid", note: q.description || "M-Pesa payment confirmed." });
            const { sendOrderEmail } = await import("./notify.server");
            await sendOrderEmail("payment_received", order.id);
            const { assignCertificatesToOrder } = await import("./certificates.server");
            await assignCertificatesToOrder(order.id);
            Object.assign(order, patch);
          } else if (q.resultCode && terminalFailure.includes(q.resultCode) && ageMs > 45_000) {
            const message = q.description || "Payment was not completed.";
            await supabaseAdmin
              .from("orders")
              .update({ payment_status: "failed", payment_message: message })
              .eq("id", order.id);
            order.payment_status = "failed";
            order.payment_message = message;
          }
        } catch (err) {
          // A query error is not a payment failure — stay in "processing".
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

    if (order.payment_status === "paid") {
      const { assignCertificatesToOrder } = await import("./certificates.server");
      await assignCertificatesToOrder(order.id);
    }

    const { data: certificates } = await supabaseAdmin
      .from("certificates")
      .select("code, serial, product_name, issued_to, buyer_name, paid_at, status")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    const { id: _id, ...safeOrder } = order;
    return {
      ok: true as const,
      order: safeOrder,
      items: items ?? [],
      events: events ?? [],
      certificates: certificates ?? [],
    };
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
        "id, order_code, status, payment_status, payment_message, total, created_at, tracking_ref, courier_contact, county, sub_county, town, couriers(name, phone)",
      )
      .eq("email", data.email.trim().toLowerCase())
      .eq("phone", phone)
      .order("created_at", { ascending: false })
      .limit(25);

    const rows = orders ?? [];
    const ids = rows.map((o) => o.id);
    const { data: events } = ids.length
      ? await supabaseAdmin
          .from("order_events")
          .select("order_id, status, note, created_at")
          .in("order_id", ids)
          .order("created_at", { ascending: true })
      : { data: [] as { order_id: string; status: string; note: string | null; created_at: string }[] };
    const { data: certificates } = ids.length
      ? await supabaseAdmin
          .from("certificates")
          .select("order_id, code, product_name")
          .in("order_id", ids)
      : { data: [] as { order_id: string; code: string; product_name: string | null }[] };

    return {
      ok: true as const,
      orders: rows.map(({ id, ...rest }) => ({
        ...rest,
        events: (events ?? [])
          .filter((e) => e.order_id === id)
          .map((e) => ({ status: e.status, note: e.note, created_at: e.created_at })),
        certificates: (certificates ?? [])
          .filter((c) => c.order_id === id)
          .map((c) => ({ code: c.code, product_name: c.product_name })),
      })),
    };
  });

/** Re-sends the M-Pesa STK push for an order that has not been paid yet. */
export const retryPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        orderCode: z.string().trim().min(4).max(20),
        phone: z.string().trim().max(20).optional().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadMpesaConfig, stkPush } = await import("./mpesa.server");
    const { getRequest } = await import("@tanstack/react-start/server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, order_code, phone, total, payment_status")
      .eq("order_code", data.orderCode.toUpperCase())
      .maybeSingle();
    if (!order) return { ok: false as const, message: "Order not found." };
    if (order.payment_status === "paid") return { ok: false as const, message: "This order is already paid." };

    const phone = normalize(data.phone || order.phone);
    if (!/^254(7|1)\d{8}$/.test(phone)) return { ok: false as const, message: "Enter a valid Kenyan phone number." };

    const cfg = await loadMpesaConfig();
    if (!cfg || !cfg.enabled) return { ok: false as const, message: "M-Pesa is not configured yet." };

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
        amount: Number(order.total),
        reference: order.order_code,
        description: `KROKO DILE ${order.order_code}`,
        callbackUrl,
      });
      await supabaseAdmin
        .from("orders")
        .update({
          phone,
          checkout_request_id: push.checkoutRequestId ?? null,
          merchant_request_id: push.merchantRequestId ?? null,
          payment_message: push.message,
          payment_status: push.ok ? "processing" : "failed",
        })
        .eq("id", order.id);
      await supabaseAdmin
        .from("order_events")
        .insert({ order_id: order.id, status: "pending", note: "Payment retried — STK push re-sent." });
      return { ok: push.ok, message: push.message };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment could not be restarted";
      return { ok: false as const, message };
    }
  });

/** Public link that always points at the store's own domain. */
export const getPayLink = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ orderCode: z.string().trim().min(4).max(20) }).parse(data))
  .handler(async ({ data }) => {
    const { publicBaseUrl } = await import("./notify.server");
    const { getRequest } = await import("@tanstack/react-start/server");
    let origin = "";
    try {
      origin = new URL(getRequest().url).origin;
    } catch {
      /* ignore */
    }
    const base = await publicBaseUrl(origin);
    return { url: `${base}/order/${data.orderCode.toUpperCase()}` };
  });
